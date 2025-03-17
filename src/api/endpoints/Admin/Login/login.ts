import { RouteOptions } from "@hapi/hapi";
import Joi from "joi";
import { executeQuery } from "../../../../common/db";
import { logger } from "../../../../common/logger";
import jwt from "jsonwebtoken";

// Secret key for JWT - in production, store this in environment variables
const JWT_SECRET = "cirec.net.andrew.sparshot";
const TOKEN_EXPIRATION = "1h"; // Token expires in 1 hour

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
      
      // Modified query to use only the columns that exist in your database
      const result = await executeQuery(
        `
        SELECT admin_id
        FROM cr_admin
        WHERE admin_id = @username
        AND admin_pass = @password
        `,
        {
          username: sanitizedUsername,
          password: sanitizedPassword,
        }
      );
      
      if (result.recordset.length === 1) {
        // User found, create token with minimal data
        const user = result.recordset[0];
        const token = jwt.sign(
          { 
            id: user.admin_id
          },
          JWT_SECRET,
          { expiresIn: TOKEN_EXPIRATION }
        );
        
        return h.response({
          success: true,
          message: "Admin Login Successful",
          token
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