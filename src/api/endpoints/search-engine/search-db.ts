import { RouteOptions } from "@hapi/hapi";
import Joi from "joi";
import { executeQuery } from "../../../common/db";
import { logger } from "../../../common/logger";

export const searchDatabaseOptions: RouteOptions = {
  description: "Search Articles Database",
  tags: ["api", "Search"],
  notes: "Handles article search with full-text and keyword matching",
  validate: {
    query: Joi.object({
      key: Joi.string().required(),
      page: Joi.number().optional().default(1),
      cb1: Joi.boolean().optional().default(false),
    }),
  },
  plugins: {
    "hapi-swagger": {
      order: 3,
    },
  },
  response: {
    schema: Joi.object({
      success: Joi.boolean(),
      totalArticles: Joi.number(),
      articles: Joi.array().items(
        Joi.object({
          ar_id: Joi.number(),
          ar_title: Joi.string(),
          ar_datetime: Joi.date(),
          rank: Joi.number().optional(),
        })
      ),
      pagination: Joi.object({
        currentPage: Joi.number(),
        totalPages: Joi.number(),
        pageSize: Joi.number(),
      }).optional(),
      suggestedKeyword: Joi.string().optional().allow(null),
    }),
  },
  handler: async (request, h) => {
    const { key: findWord, page = 1, cb1 = false } = request.query;

    try {
      const sanitizedWord = findWord.replace(/[&<>"']/g, "");
      const pageSize = 20;
      const offset = (Number(page) - 1) * pageSize;

      // Count total matching articles
      const countQuery = `
        SELECT COUNT(*) AS totalCount 
        FROM and_cirec.cr_articles 
        WHERE ${cb1 ? 'CONTAINS((ar_title, ar_content), @keyword)' : 'ar_title LIKE @keyword OR ar_content LIKE @keyword'}
      `;

      const countResult = await executeQuery(countQuery, {
        keyword: cb1 ? `"${sanitizedWord}"` : `%${sanitizedWord}%`,
      });
      const totalArticles = countResult.recordset[0].totalCount;

      // Search query
      const searchQuery = `
        WITH RankedArticles AS (
          SELECT 
            ar_id, 
            ar_title, 
            ar_datetime,
            ${cb1 ? 'KEY_TBL.RANK,' : ''}
            ROW_NUMBER() OVER (ORDER BY ${cb1 ? 'KEY_TBL.RANK DESC' : 'ar_datetime DESC'}) AS RowNum
          FROM and_cirec.cr_articles AS FT_TBL 
          ${cb1 ? `
            INNER JOIN CONTAINSTABLE(and_cirec.cr_articles, (ar_title, ar_content), @keyword) AS KEY_TBL 
            ON FT_TBL.ar_id = KEY_TBL.[KEY]
          ` : 'WHERE ar_title LIKE @keyword OR ar_content LIKE @keyword'}
        )
        SELECT ar_id, ar_title, ar_datetime${cb1 ? ', RANK' : ''}
        FROM RankedArticles
        WHERE RowNum BETWEEN @offset + 1 AND @offset + @pageSize
        ORDER BY ${cb1 ? 'RANK DESC' : 'ar_datetime DESC'}
      `;

      const articlesResult = await executeQuery(searchQuery, {
        keyword: cb1 ? `"${sanitizedWord}"` : `%${sanitizedWord}%`,
        offset,
        pageSize,
      });

      // Check for suggested keywords
      let suggestedKeyword = null;
      const suggestedQuery = `
        SELECT TOP 1 sk_suggestedkey 
        FROM and_cirec.cr_searchkeyword 
        WHERE sk_userkey = @keyword 
          AND sk_display = 'True' 
          AND sk_suggestedkey != ''
      `;
      const suggestedResult = await executeQuery(suggestedQuery, {
        keyword: sanitizedWord,
      });

      if (suggestedResult.recordset.length > 0) {
        suggestedKeyword = suggestedResult.recordset[0].sk_suggestedkey;
      }

      // If no results, insert the keyword for tracking
      if (totalArticles === 0) {
        const insertQuery = `
          IF NOT EXISTS (
            SELECT 1 FROM and_cirec.cr_searchkeyword 
            WHERE sk_userkey = @keyword
          )
          BEGIN
            INSERT INTO and_cirec.cr_searchkeyword 
            (sk_id, sk_userkey, sk_suggestedkey, sk_display) 
            VALUES 
            ((SELECT ISNULL(MAX(sk_id), 0) + 1 FROM and_cirec.cr_searchkeyword), @keyword, '', 'False')
          END
        `;
        await executeQuery(insertQuery, { keyword: sanitizedWord });
      }

      return h
        .response({
          success: totalArticles > 0,
          totalArticles,
          articles: articlesResult.recordset,
          pagination: {
            currentPage: Number(page),
            totalPages: Math.ceil(totalArticles / pageSize),
            pageSize,
          },
          suggestedKeyword,
        })
        .code(totalArticles > 0 ? 200 : 404);
    } catch (error) {
      logger.error("search-route", `Search process failed: ${error}`);
      return h
        .response({
          success: false,
          message: "Search process failed",
        })
        .code(500);
    }
  },
};
