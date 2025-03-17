import { RouteOptions } from "@hapi/hapi";
import Joi from "joi";
import { executeQuery } from "../../../../common/db";
import { logger } from "../../../../common/logger";

interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

export const changePasswordOptions: RouteOptions = {
  description: "Admin Change Password",
  tags: ["api", "Admin"],
  validate: {
    payload: Joi.object({
      oldPassword: Joi.string().required(),
      newPassword: Joi.string().required(),
    })
  },
  handler: async (request, h) => {
    try {
      const { oldPassword, newPassword } = request.payload as ChangePasswordPayload;
      
      // Sanitize inputs
      const sanitizedOldPassword = oldPassword;
      const sanitizedNewPassword = newPassword;
      
      // First verify the old password is correct
      const verifyResult = await executeQuery(
        `
        SELECT admin_id 
        FROM cr_admin 
        WHERE admin_pass = @oldPassword 
        AND id = '1'
        `,
        {
          oldPassword: sanitizedOldPassword
        }
      );
      
      if (verifyResult.recordset.length === 1) {
        // Old password is correct, update to new password
        const updateResult = await executeQuery(
          `
          UPDATE cr_admin 
          SET admin_pass = @newPassword 
          WHERE id = '1'
          `,
          {
            newPassword: sanitizedNewPassword
          }
        );
        
        if (updateResult.rowsAffected && updateResult.rowsAffected[0] > 0) {
          return h.response({
            success: true,
            message: "Password Successfully Changed"
          }).code(200);
        } else {
          return h.response({
            success: false,
            message: "Password update failed"
          }).code(500);
        }
      } else {
        return h.response({
          success: false,
          message: "Please check your old password"
        }).code(400);
      }
    } catch (error) {
      logger.error("admin-change-password", `Password change failed: ${error}`);
      return h.response({
        success: false,
        message: "Password change failed"
      }).code(500);
    }
  }
};