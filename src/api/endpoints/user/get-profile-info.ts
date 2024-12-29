import { Request, ResponseToolkit, RouteOptions } from "@hapi/hapi";
import Joi from "joi";
import { executeQuery } from "../../../common/db";
import { logger } from "../../../common/logger";

export const getUserInfoOptions: RouteOptions = {
    description: "Get User Information",
    tags: ["api", "Users"],
    plugins: {
        "hapi-swagger": {
            order: 1,
        },
    },
    validate: {
        query: Joi.object({
            username: Joi.string().required().trim().messages({
                "any.required": "Username is required to fetch user information",
            }),
        }),
    },
    handler: async (request: Request, h: ResponseToolkit) => {
        try {
            const { username } = request.query as { username: string };

            // Execute database query to fetch user information
            const result = await executeQuery(
                `SELECT 
          us_title as title,
          us_fname as firstName, 
          us_lname as lastName, 
          us_email as email, 
          us_phone as phone, 
          us_comp as company, 
          us_type as accountType, 
          us_dept as department
        FROM and_cirec.cr_user
        WHERE @username = @username`,
                {username}
            );

            // Check if user exists
            if (result.recordset.length === 0) {
                return h.response({
                    success: false,
                    message: "User not found"
                }).code(404);
            }

            // Return user information
            return h.response({
                success: true,
                user: result.recordset[0]
            }).code(200);

        } catch (error) {
            logger.error(`get-user-info`, `Handler failure: ${error}`);
            return h.response({
                success: false,
                error: "Failed to retrieve user information",
                message: error instanceof Error ? error.message : "Unknown error occurred"
            }).code(500);
        }
    }
};