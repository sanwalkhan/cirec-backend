import { RouteOptions, ServerRoute } from "@hapi/hapi";
import Joi from "joi";
import { executeQuery } from "../../../../common/db";
import { logger } from "../../../../common/logger";

/**
 * Get all contacts endpoint
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