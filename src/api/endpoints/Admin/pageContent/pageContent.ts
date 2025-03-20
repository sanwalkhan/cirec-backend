import { RouteOptions } from "@hapi/hapi";
import Joi from "joi";
import { executeQuery } from "../../../../common/db";
import { logger } from "../../../../common/logger";

// Get all pages route
export const getPagesOptions: RouteOptions = {
  description: "Get All Pages",
  tags: ["api", "Pages"],
  handler: async (request, h) => {
    try {
      const result = await executeQuery(
        `
        SELECT pg_id, pg_name 
        FROM cr_pages
        ORDER BY pg_name
        `,
        {}
      );

      return h.response({
        success: true,
        pages: result.recordset
      }).code(200);
    } catch (error) {
      logger.error("get-pages", `Failed to fetch pages: ${error}`);
      return h.response({
        success: false,
        message: "Failed to fetch pages"
      }).code(500);
    }
  }
};

// Get page content route
export const getPageContentOptions: RouteOptions = {
  description: "Get Page Content",
  tags: ["api", "PageContent"],
  validate: {
    params: Joi.object({
      pageId: Joi.number().required()
    })
  },
  handler: async (request, h) => {
    try {
      const { pageId } = request.params;

      const result = await executeQuery(
        `
        SELECT pgc_id, pgc_content
        FROM cr_pagecontent
        WHERE pg_id = @pageId
        ORDER BY pgc_id
        `,
        {
          pageId: pageId
        }
      );

      return h.response({
        success: true,
        contents: result.recordset
      }).code(200);
    } catch (error) {
      logger.error("get-page-content", `Failed to fetch page content: ${error}`);
      return h.response({
        success: false,
        message: "Failed to fetch page content"
      }).code(500);
    }
  }
};

// Update page content route
export const updatePageContentOptions: RouteOptions = {
  description: "Update Page Content",
  tags: ["api", "PageContent"],
  validate: {
    payload: Joi.object({
      contents: Joi.array().items(
        Joi.object({
          pgc_id: Joi.number().required(),
          pgc_content: Joi.string().allow('').required()
        })
      ).required()
    })
  },
  handler: async (request, h) => {
    try {
      const { contents } = request.payload as { contents: Array<{ pgc_id: number, pgc_content: string }> };
      
      // Process each content update
      for (const content of contents) {
        // Sanitize content to prevent SQL injection
        const sanitizedContent = content.pgc_content.replace(/'/g, " ");
        
        await executeQuery(
          `
          UPDATE cr_pagecontent
          SET pgc_content = @content
          WHERE pgc_id = @contentId
          `,
          {
            content: sanitizedContent,
            contentId: content.pgc_id
          }
        );
      }

      return h.response({
        success: true,
        message: "Content updated successfully"
      }).code(200);
    } catch (error) {
      logger.error("update-page-content", `Failed to update page content: ${error}`);
      return h.response({
        success: false,
        message: "Failed to update page content"
      }).code(500);
    }
  }
};

// Add new page content route
export const addPageContentOptions: RouteOptions = {
  description: "Add New Page Content",
  tags: ["api", "PageContent"],
  validate: {
    payload: Joi.object({
      pg_id: Joi.number().required()
    })
  },
  handler: async (request, h) => {
    try {
      const { pg_id } = request.payload as { pg_id: number };
      
      // Get max ID for auto-increment
      const maxIdResult = await executeQuery(
        `
        SELECT MAX(pgc_id) as maxId
        FROM cr_pagecontent
        `,
        {}
      );
      
      const maxId = maxIdResult.recordset[0].maxId ? maxIdResult.recordset[0].maxId + 1 : 1;
      
      // Insert new content
      await executeQuery(
        `
        INSERT INTO cr_pagecontent (pgc_id, pg_id)
        VALUES (@contentId, @pageId)
        `,
        {
          contentId: maxId,
          pageId: pg_id
        }
      );

      return h.response({
        success: true,
        message: "New content added successfully",
        pgc_id: maxId
      }).code(201);
    } catch (error) {
      logger.error("add-page-content", `Failed to add new page content: ${error}`);
      return h.response({
        success: false,
        message: "Failed to add new page content"
      }).code(500);
    }
  }
};

// Delete page content route
export const deletePageContentOptions: RouteOptions = {
  description: "Delete Page Content",
  tags: ["api", "PageContent"],
  validate: {
    params: Joi.object({
      contentId: Joi.number().required()
    })
  },
  handler: async (request, h) => {
    try {
      const { contentId } = request.params;
      
      await executeQuery(
        `
        DELETE FROM cr_pagecontent
        WHERE pgc_id = @contentId
        `,
        {
          contentId: contentId
        }
      );

      return h.response({
        success: true,
        message: "Content deleted successfully"
      }).code(200);
    } catch (error) {
      logger.error("delete-page-content", `Failed to delete page content: ${error}`);
      return h.response({
        success: false,
        message: "Failed to delete page content"
      }).code(500);
    }
  }
};