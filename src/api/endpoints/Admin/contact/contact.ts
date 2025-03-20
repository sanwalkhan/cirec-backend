import { RouteOptions, ServerRoute } from "@hapi/hapi";
import Joi from "joi";
import { executeQuery } from "../../../../common/db";
import { logger } from "../../../../common/logger";

/**
 * Get paginated contacts endpoint
 */
export const getPaginatedContactsOptions: RouteOptions = {
  description: "Get Paginated Contact Submissions",
  tags: ["api", "Contacts"],
  validate: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10)
    })
  },
  handler: async (request, h) => {
    try {
      const { page, limit } = request.query;
      const offset = (page - 1) * limit;

      // Get total count of contacts
      const countResult = await executeQuery(
        `SELECT COUNT(*) AS total FROM cr_contactus`,
        {}
      );
      
      const totalContacts = countResult.recordset[0].total;
      
      // Get paginated contacts
      const result = await executeQuery(
        `SELECT * FROM cr_contactus 
         ORDER BY cr_contact_id DESC 
         OFFSET @offset ROWS 
         FETCH NEXT @limit ROWS ONLY`,
        {
          offset,
          limit
        }
      );

      return h.response({
        success: true,
        data: result.recordset,
        pagination: {
          total: totalContacts,
          page: page,
          limit: limit,
          totalPages: Math.ceil(totalContacts / limit)
        }
      }).code(200);
    } catch (error) {
      logger.error("get-paginated-contacts", `Failed to retrieve contacts: ${error}`);
      return h.response({
        success: false,
        message: "Failed to retrieve contact submissions"
      }).code(500);
    }
  }
};

/**
 * Get all contacts endpoint (keeping for backward compatibility)
 */
export const getAllContactsOptions: RouteOptions = {
  description: "Get All Contact Submissions",
  tags: ["api", "Contacts"],
  handler: async (request, h) => {
    try {
      const result = await executeQuery(
        `SELECT * FROM cr_contactus ORDER BY cr_contact_id DESC`,
        {}
      );
      
      return h.response({
        success: true,
        data: result.recordset
      }).code(200);
    } catch (error) {
      logger.error("get-all-contacts", `Failed to retrieve contacts: ${error}`);
      return h.response({
        success: false,
        message: "Failed to retrieve contact submissions"
      }).code(500);
    }
  }
};

/**
 * Delete contact endpoint
 */
export const deleteContactOptions: RouteOptions = {
  description: "Delete Contact Submission",
  tags: ["api", "Contacts"],
  validate: {
    params: Joi.object({
      id: Joi.number().required()
    })
  },
  handler: async (request, h) => {
    try {
      const contactId = request.params.id;
      
      const deleteResult = await executeQuery(
        `DELETE FROM cr_contactus WHERE cr_contact_id = @contactId`,
        {
          contactId
        }
      );
      
      if (deleteResult.rowsAffected && deleteResult.rowsAffected[0] > 0) {
        return h.response({
          success: true,
          message: "Contact submission deleted successfully"
        }).code(200);
      } else {
        return h.response({
          success: false,
          message: "Contact not found or already deleted"
        }).code(404);
      }
    } catch (error) {
      logger.error("delete-contact", `Failed to delete contact: ${error}`);
      return h.response({
        success: false,
        message: "Failed to delete contact submission"
      }).code(500);
    }
  }
};