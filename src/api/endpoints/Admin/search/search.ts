import { RouteOptions } from "@hapi/hapi";
import Joi from "joi";
import { executeQuery } from "../../../../common/db";
import { logger } from "../../../../common/logger";

interface SearchKeyword {
  sk_id: number;
  sk_userkey: string;
  sk_suggestedkey: string;
  sk_display: number | boolean;
}

interface AddKeywordPayload {
  userKeyword: string;
  suggestedKeyword: string;
  enabled: boolean;
}

interface UpdateKeywordPayload {
  suggestedKeyword: string;
  enabled: boolean;
}

interface ToggleKeywordPayload {
  enabled: boolean;
}

// Get all search keywords
export const getSearchKeywordsOptions: RouteOptions = {
  description: "Get all search keywords",
  tags: ["api", "Admin", "Search Keywords"],
  handler: async (request, h) => {
    try {
      const result = await executeQuery(
        "SELECT sk_id, sk_userkey, sk_suggestedkey, sk_display FROM cr_searchkeyword ORDER BY sk_id",
        {}
      );
      
      // Transform the data to match the expected format
      const keywords = result.recordset.map((row: any) => ({
        id: row.sk_id,
        userKeyword: row.sk_userkey,
        suggestedKeyword: row.sk_suggestedkey,
        enabled: row.sk_display === 1 || row.sk_display === true
      }));
      
      return h.response({
        success: true,
        data: keywords
      }).code(200);
    } catch (error) {
      logger.error("search-keywords", `Failed to get search keywords: ${error}`);
      return h.response({
        success: false,
        message: "Failed to get search keywords"
      }).code(500);
    }
  }
};

// Add a new search keyword
export const addSearchKeywordOptions: RouteOptions = {
  description: "Add a new search keyword",
  tags: ["api", "Admin", "Search Keywords"],
  validate: {
    payload: Joi.object({
      userKeyword: Joi.string().required(),
      suggestedKeyword: Joi.string().allow(''),
      enabled: Joi.boolean().default(false)
    })
  },
  handler: async (request, h) => {
    try {
      const { userKeyword, suggestedKeyword, enabled } = request.payload as AddKeywordPayload;
      
      // Check if the user keyword already exists
      const existsResult = await executeQuery(
        "SELECT COUNT(*) as count FROM cr_searchkeyword WHERE sk_userkey = @userKeyword",
        { userKeyword }
      );
      
      if (existsResult.recordset[0].count > 0) {
        return h.response({
          success: false,
          message: "User keyword already exists. Try another."
        }).code(400);
      }
      
      // Get the next ID
      const idResult = await executeQuery(
        "SELECT dbo.getAutoId('cr_searchkeyword', 'sk_id') as id",
        {}
      );
      const newId = idResult.recordset[0].id;
      
      // Insert the new keyword
      await executeQuery(
        "INSERT INTO cr_searchkeyword (sk_id, sk_userkey, sk_suggestedkey, sk_display) VALUES (@id, @userKeyword, @suggestedKeyword, @enabled)",
        {
          id: newId,
          userKeyword,
          suggestedKeyword,
          enabled: enabled ? 1 : 0
        }
      );
      
      return h.response({
        success: true,
        message: "Search keyword added successfully",
        data: {
          id: newId,
          userKeyword,
          suggestedKeyword,
          enabled
        }
      }).code(201);
    } catch (error) {
      logger.error("search-keywords", `Failed to add search keyword: ${error}`);
      return h.response({
        success: false,
        message: "Failed to add search keyword"
      }).code(500);
    }
  }
};

// Update a search keyword
export const updateSearchKeywordOptions: RouteOptions = {
  description: "Update a search keyword",
  tags: ["api", "Admin", "Search Keywords"],
  validate: {
    params: Joi.object({
      id: Joi.number().required()
    }),
    payload: Joi.object({
      suggestedKeyword: Joi.string().allow(''),
      enabled: Joi.boolean()
    })
  },
  handler: async (request, h) => {
    try {
      const id = parseInt(request.params.id);
      const { suggestedKeyword, enabled } = request.payload as UpdateKeywordPayload;
      
      // Check if the keyword exists
      const existsResult = await executeQuery(
        "SELECT COUNT(*) as count FROM cr_searchkeyword WHERE sk_id = @id",
        { id }
      );
      
      if (existsResult.recordset[0].count === 0) {
        return h.response({
          success: false,
          message: "Search keyword not found"
        }).code(404);
      }
      
      // Update the keyword
      await executeQuery(
        "UPDATE cr_searchkeyword SET sk_suggestedkey = @suggestedKeyword, sk_display = @enabled WHERE sk_id = @id",
        {
          id,
          suggestedKeyword,
          enabled: enabled ? 1 : 0
        }
      );
      
      return h.response({
        success: true,
        message: "Search keyword updated successfully"
      }).code(200);
    } catch (error) {
      logger.error("search-keywords", `Failed to update search keyword: ${error}`);
      return h.response({
        success: false,
        message: "Failed to update search keyword"
      }).code(500);
    }
  }
};

// Toggle search keyword enabled status
export const toggleSearchKeywordOptions: RouteOptions = {
  description: "Toggle search keyword enabled status",
  tags: ["api", "Admin", "Search Keywords"],
  validate: {
    params: Joi.object({
      id: Joi.number().required()
    }),
    payload: Joi.object({
      enabled: Joi.boolean().required()
    })
  },
  handler: async (request, h) => {
    try {
      const id = parseInt(request.params.id);
      const { enabled } = request.payload as ToggleKeywordPayload;
      
      // Check if the keyword exists
      const existsResult = await executeQuery(
        "SELECT COUNT(*) as count FROM cr_searchkeyword WHERE sk_id = @id",
        { id }
      );
      
      if (existsResult.recordset[0].count === 0) {
        return h.response({
          success: false,
          message: "Search keyword not found"
        }).code(404);
      }
      
      // Update the enabled status
      await executeQuery(
        "UPDATE cr_searchkeyword SET sk_display = @enabled WHERE sk_id = @id",
        {
          id,
          enabled: enabled ? 1 : 0
        }
      );
      
      return h.response({
        success: true,
        message: "Search keyword status updated successfully"
      }).code(200);
    } catch (error) {
      logger.error("search-keywords", `Failed to toggle search keyword status: ${error}`);
      return h.response({
        success: false,
        message: "Failed to toggle search keyword status"
      }).code(500);
    }
  }
};

// Delete a search keyword
export const deleteSearchKeywordOptions: RouteOptions = {
  description: "Delete a search keyword",
  tags: ["api", "Admin", "Search Keywords"],
  validate: {
    params: Joi.object({
      id: Joi.number().required()
    })
  },
  handler: async (request, h) => {
    try {
      const id = parseInt(request.params.id);
      
      // Check if the keyword exists
      const existsResult = await executeQuery(
        "SELECT COUNT(*) as count FROM cr_searchkeyword WHERE sk_id = @id",
        { id }
      );
      
      if (existsResult.recordset[0].count === 0) {
        return h.response({
          success: false,
          message: "Search keyword not found"
        }).code(404);
      }
      
      // Delete the keyword
      await executeQuery(
        "DELETE FROM cr_searchkeyword WHERE sk_id = @id",
        { id }
      );
      
      return h.response({
        success: true,
        message: "Search keyword deleted successfully"
      }).code(200);
    } catch (error) {
      logger.error("search-keywords", `Failed to delete search keyword: ${error}`);
      return h.response({
        success: false,
        message: "Failed to delete search keyword"
      }).code(500);
    }
  }
};