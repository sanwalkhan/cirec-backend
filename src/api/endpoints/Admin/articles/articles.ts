// src/routes/admin/articles/types.ts
export interface Article {
  ar_id: number;
  ar_title: string;
  ar_content: string;
  ar_issueno: number;
  ar_month: number;
  ar_year: number;
  ar_datetime: string;
  ar_scrolling: string;
}
import { Request, ResponseToolkit } from "@hapi/hapi";
import { executeQuery } from "../../../../common/db";
import { logger } from "../../../../common/logger";

/**
 * Get all articles handler with pagination
 */
export const getAllArticlesHandler = async (request: Request, h: ResponseToolkit) => {
  try {
    // Extract pagination parameters from query
    const page = Number.parseInt(request.query.page as string) || 1
    const limit = Number.parseInt(request.query.limit as string) || 10

    // Calculate offset
    const offset = (page - 1) * limit

    // Add debug logging
    // logger.debug("get-all-articles", `Fetching articles with pagination: page=${page}, limit=${limit}`)

    // Use Promise.all to run both queries in parallel
    const [countResult, result] = await Promise.all([
      // Get total count of articles - use COUNT(*) which is faster
      executeQuery("SELECT COUNT(*) as total FROM cr_articles", {}),

      // Get paginated articles - optimize query with specific column selection
      executeQuery(
        `SELECT ar_id, ar_title, ar_issueno, ar_datetime, ar_scrolling 
        FROM cr_articles 
        ORDER BY ar_issueno DESC, ar_id 
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
        { offset, limit },
      ),
    ])

    const totalArticles = countResult.recordset[0].total
    const totalPages = Math.ceil(totalArticles / limit)

    return h
      .response({
        success: true,
        data: result.recordset as Article[],
        pagination: {
          page,
          limit,
          totalItems: totalArticles,
          totalPages,
        },
      })
      .code(200)
  } catch (error) {
    logger.error("get-all-articles", `Failed to retrieve articles: ${error}`)
    return h
      .response({
        success: false,
        message: "Failed to retrieve articles",
      })
      .code(500)
  }
}

/**
 * Get article by ID handler
 */
export const getArticleByIdHandler = async (request: Request, h: ResponseToolkit) => {
  try {
    const articleId = request.params.id;
    
    const result = await executeQuery(
      "SELECT ar_id, ar_title, ar_issueno, ar_content, ar_datetime FROM cr_articles WHERE ar_id = @articleId",
      { articleId }
    );

    if (result.recordset.length === 0) {
      return h.response({
        success: false,
        message: "Article not found"
      }).code(404);
    }

    return h.response({
      success: true,
      data: result.recordset[0] as Article
    }).code(200);
  } catch (error) {
    logger.error("get-article", `Failed to retrieve article: ${error}`);
    return h.response({
      success: false,
      message: "Failed to retrieve article"
    }).code(500);
  }
};

/**
 * Add article handler
 */
export const addArticleHandler = async (request: Request, h: ResponseToolkit) => {
  try {
    const payload = request.payload as {
      content: string;
      issueNo: number;
      date: string;
    };
    
    const { content, issueNo, date } = payload;
    
    if (!content) {
      return h.response({
        success: false,
        message: "Content field should not be blank"
      }).code(400);
    }
    
    // Split date in the format MM/DD/YYYY
    const datetime = date.split('/');
    const month = parseInt(datetime[0]);
    const year = parseInt(datetime[2]);
    
    // Parse the content for <h4> tags, similar to the original code
    const sanitizedContent = content.replace(/'/g, " ");
    
    // Regular expression for finding sections with <h4> tags
    const h4Regex = /<h4>(.*?)<\/h4>([\s\S]*?)(?=<h4>|$)/g;
    let match;
    let inserted = false;
    
    // Get next ID from database
    const idResult = await executeQuery("SELECT MAX(ar_id) + 1 as nextId FROM cr_articles", {});
    const nextId = idResult.recordset[0].nextId || 1;
    
    // Find all <h4> sections and insert them as separate articles
    while ((match = h4Regex.exec(sanitizedContent)) !== null) {
      const title = match[1].replace(/<[^>]*>/g, ''); // Remove any HTML tags from title
      const articleContent = match[2];
      
      await executeQuery(
        `INSERT INTO cr_articles 
         (ar_id, ar_issueno, ar_title, ar_content, ar_month, ar_year, ar_datetime) 
         VALUES (@id, @issueNo, @title, @content, @month, @year, @date)`,
        {
          id: nextId + (inserted ? 1 : 0),
          issueNo,
          title,
          content: articleContent,
          month,
          year,
          date
        }
      );
      
      inserted = true;
    }

    // If no <h4> tags were found, check for the encoded version
    if (!inserted) {
      const encodedH4Regex = /&lt;h4&gt;(.*?)&lt;\/h4&gt;([\s\S]*?)(?=&lt;h4&gt;|$)/g;
      
      while ((match = encodedH4Regex.exec(sanitizedContent)) !== null) {
        const title = match[1].replace(/&lt;[^&]*&gt;/g, ''); // Remove any encoded HTML tags
        const articleContent = match[2];
        
        await executeQuery(
          `INSERT INTO cr_articles 
           (ar_id, ar_issueno, ar_title, ar_content, ar_month, ar_year, ar_datetime) 
           VALUES (@id, @issueNo, @title, @content, @month, @year, @date)`,
          {
            id: nextId + (inserted ? 1 : 0),
            issueNo,
            title,
            content: articleContent,
            month,
            year,
            date
          }
        );
        
        inserted = true;
      }
    }

    if (!inserted) {
      return h.response({
        success: false,
        message: "No valid article sections found with <h4> tags"
      }).code(400);
    }

    return h.response({
      success: true,
      message: "Articles added successfully"
    }).code(201);
  } catch (error) {
    logger.error("add-article", `Failed to add article: ${error}`);
    return h.response({
      success: false,
      message: "Failed to add article"
    }).code(500);
  }
};

/**
 * Update article handler
 */
export const updateArticleHandler = async (request: Request, h: ResponseToolkit) => {
  try {
    const articleId = request.params.id;
    const payload = request.payload as {
      title: string;
      issueNo: number;
      content: string;
      date: string;
    };
    
    const { title, issueNo, content, date } = payload;
    
    // Convert date string to datetime parts
    const dateObj = new Date(date);
    const month = dateObj.getMonth() + 1; // JavaScript months are 0-indexed
    const year = dateObj.getFullYear();
    
    // Sanitize content
    const sanitizedContent = content.replace(/'/g, " ");
    
    const updateResult = await executeQuery(
      `UPDATE cr_articles 
       SET ar_title = @title, 
           ar_issueno = @issueNo, 
           ar_content = @content, 
           ar_month = @month, 
           ar_year = @year, 
           ar_datetime = @date 
       WHERE ar_id = @articleId`,
      {
        title,
        issueNo,
        content: sanitizedContent,
        month,
        year,
        date,
        articleId
      }
    );

    if (updateResult.rowsAffected && updateResult.rowsAffected[0] > 0) {
      return h.response({
        success: true,
        message: "Article updated successfully"
      }).code(200);
    } else {
      return h.response({
        success: false,
        message: "Article not found or no changes made"
      }).code(404);
    }
  } catch (error) {
    logger.error("update-article", `Failed to update article: ${error}`);
    return h.response({
      success: false,
      message: "Failed to update article"
    }).code(500);
  }
};

/**
 * Delete article handler
 */
export const deleteArticleHandler = async (request: Request, h: ResponseToolkit) => {
  try {
    const articleId = request.params.id;
    
    const deleteResult = await executeQuery(
      "DELETE FROM cr_articles WHERE ar_id = @articleId",
      { articleId }
    );

    if (deleteResult.rowsAffected && deleteResult.rowsAffected[0] > 0) {
      return h.response({
        success: true,
        message: "Article deleted successfully"
      }).code(200);
    } else {
      return h.response({
        success: false,
        message: "Article not found or already deleted"
      }).code(404);
    }
  } catch (error) {
    logger.error("delete-article", `Failed to delete article: ${error}`);
    return h.response({
      success: false,
      message: "Failed to delete article"
    }).code(500);
  }
};

/**
 * Delete multiple articles handler
 */
export const deleteBulkArticlesHandler = async (request: Request, h: ResponseToolkit) => {
  try {
    const payload = request.payload as {
      articleIds: number[];
    };
    
    const { articleIds } = payload;
    
    if (!articleIds || articleIds.length === 0) {
      return h.response({
        success: false,
        message: "No article IDs provided"
      }).code(400);
    }
    
    // Create placeholders for the IN clause
    const placeholders = articleIds.map((_, index) => `@id${index}`).join(', ');
    
    // Create parameters object
    const params: Record<string, any> = {};
    articleIds.forEach((id, index) => {
      params[`id${index}`] = id;
    });
    
    const deleteResult = await executeQuery(
      `DELETE FROM cr_articles WHERE ar_id IN (${placeholders})`,
      params
    );

    return h.response({
      success: true,
      message: "Articles deleted successfully",
      count: deleteResult.rowsAffected ? deleteResult.rowsAffected[0] : 0
    }).code(200);
  } catch (error) {
    logger.error("delete-bulk-articles", `Failed to delete articles: ${error}`);
    return h.response({
      success: false,
      message: "Failed to delete articles"
    }).code(500);
  }
};

/**
 * Update article scrolling status handler
 */
export const updateScrollingStatusHandler = async (request: Request, h: ResponseToolkit) => {
  try {
    const articleId = request.params.id;
    const payload = request.payload as {
      scrolling: boolean;
    };
    
    const { scrolling } = payload;
    const status = scrolling ? "1" : "0";
    
    const updateResult = await executeQuery(
      "UPDATE cr_articles SET ar_scrolling = @status WHERE ar_id = @articleId",
      { status, articleId }
    );

    if (updateResult.rowsAffected && updateResult.rowsAffected[0] > 0) {
      return h.response({
        success: true,
        message: "Article scrolling status updated successfully"
      }).code(200);
    } else {
      return h.response({
        success: false,
        message: "Article not found or no changes made"
      }).code(404);
    }
  } catch (error) {
    logger.error("update-scrolling", `Failed to update article scrolling status: ${error}`);
    return h.response({
      success: false,
      message: "Failed to update article scrolling status"
    }).code(500);
  }
};
