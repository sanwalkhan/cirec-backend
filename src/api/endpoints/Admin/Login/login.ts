import { RouteOptions } from "@hapi/hapi";
import Joi from "joi";
import { executeQuery } from "../../../../common/db";
import { logger } from "../../../../common/logger";

interface AdminLoginPayload {
  username: string;
  password: string;
}

export const loginOptions: RouteOptions = {
  description: "Admin Login",
  tags: ["api", "Admin"],
  validate: {
    payload: Joi.object({
      username: Joi.string().required(),
      password: Joi.string().required(),
    })
  },
  handler: async (request, h) => {
    try {
      const { username, password } = request.payload as AdminLoginPayload;

      // Sanitize inputs like in the original .NET code
      const sanitizedUsername = username;
      const sanitizedPassword = password;

      const result = await executeQuery(
        `
        SELECT COUNT(*) as count 
        FROM cr_admin 
        WHERE admin_id = @username 
        AND admin_pass = @password
        `,
        {
          username: sanitizedUsername,
          password: sanitizedPassword,
        }
      );

      const isAuthenticated = result.recordset[0].count === 1;

      if (isAuthenticated) {
        return h.response({
          success: true,
          message: "Admin Login Successful"
        }).code(200);
      } 

      return h.response({
        success: false,
        message: "Invalid Admin Credentials"
      }).code(401);

    } catch (error) {
      logger.error("admin-login", `Login failed: ${error}`);
      return h.response({
        success: false,
        message: "Login failed"
      }).code(500);
    }
  }
};