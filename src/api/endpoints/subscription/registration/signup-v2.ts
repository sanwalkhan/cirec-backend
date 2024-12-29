/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, RouteOptions } from "@hapi/hapi";
import Joi from "joi";
import { executeQuery } from "../../../../common/db";
import { EmailType, sendEmail } from "../../../../common/handlers";
import { config } from "../../../../common/index";
import { logger } from "../../../../common/logger";

export const signUpUserOptions: RouteOptions = {
    description: "User Subscription Sign Up",
    tags: ["api", "Users"],
    plugins: {
        "hapi-swagger": {
            order: 1,
        },
    },
    validate: {
        payload: Joi.object({
            // Personal Details (mostly kept the same)
            title: Joi.string().max(50).optional().trim().messages({
                "string.max": "Title cannot exceed 50 characters.",
            }),
            firstName: Joi.string().max(50).required().trim().messages({
                "string.max": "First Name cannot exceed 50 characters.",
                "any.required": "First Name is required.",
            }),
            lastName: Joi.string().max(50).required().trim().messages({
                "string.max": "Last Name cannot exceed 50 characters.",
                "any.required": "Last Name is required.",
            }),
            company: Joi.string().max(100).optional().trim().messages({
                "string.max": "Company name cannot exceed 100 characters.",
            }),
            telephoneNumber: Joi.string()
                .pattern(/^\+?[0-9]{7,15}$/)
                .optional()
                .messages({
                    "string.pattern.base": "Telephone number must be valid, containing 7 to 15 digits.",
                }),
            emailAddress: Joi.string().email().required().lowercase().trim().messages({
                "string.email": "E-Mail address must be a valid email.",
                "any.required": "E-Mail address is required.",
            }),
            userName: Joi.string().min(3).max(30).required().trim().messages({
                "string.min": "User Name must be at least 3 characters.",
                "string.max": "User Name cannot exceed 30 characters.",
                "any.required": "User Name is required.",
            }),
            password: Joi.string().min(8).max(200).required().messages({
                "string.min": "Password must be at least 8 characters.",
                "string.max": "Password cannot exceed 200 characters.",
                "any.required": "Password is required.",
            }),
            retypePassword: Joi.string().required().valid(Joi.ref("password")).messages({
                "any.only": "Passwords do not match.",
                "any.required": "Retype Password is required.",
            }),

            // Account and Service Details (with some modifications)
            accountType: Joi.string().valid("Corporate", "Single").required().messages({
                "any.only": "Please select a valid account type.",
                "any.required": "Account Type is required.",
            }),

            // Monthly News - allow more flexible selection
            monthlyNews: Joi.object({
                selected: Joi.boolean().required(),
                duration: Joi.when('selected', {
                    is: true,
                    then: Joi.string().valid("1 year", "2 years").required(),
                    otherwise: Joi.forbidden()
                })
            }).optional(),

            additionalCopies: Joi.when('selected', {
                is: true,
                then: Joi.number().integer().min(0).max(4).optional().default(0),
                otherwise: Joi.forbidden()
            }),
            additionalEmails: Joi.when('additionalCopies', {
                is: Joi.number().greater(0),
                then: Joi.array().items(
                    Joi.string().email()
                ).length(Joi.ref('additionalCopies')).optional(),
                otherwise: Joi.forbidden()
            }),

            // Search Engine Access - modified to be more flexible
            searchEngineAccess: Joi.object({
                selected: Joi.boolean().required(),
                duration: Joi.when('selected', {
                    is: true,
                    then: Joi.string().valid("3 months", "6 months", "12 months", "24 months").required(),
                    otherwise: Joi.forbidden()
                })
            }).optional(),

            // Statistical Database Access - similar approach
            statisticalDatabaseAccess: Joi.object({
                selected: Joi.boolean().required(),
                duration: Joi.when('selected', {
                    is: true,
                    then: Joi.string().valid("1 year", "2 years").required(),
                    otherwise: Joi.forbidden()
                })
            }).optional(),

            // Other Reports - allow selecting multiple
            otherReports: Joi.array().items(
                Joi.string().valid(
                    "Central European Olefins & Polyolefin Production",
                    "Polish Chemical Production"
                )
            ).optional(),

            // Payment Type
            paymentType: Joi.string().valid("Credit card", "Through invoice").required().messages({
                "any.only": "Payment Type must be Credit card or Through invoice.",
                "any.required": "Payment Type selection is required.",
            }),
        }).unknown(false),
    },

    response: {
        schema: Joi.object({
            token: Joi.string(),
            user: Joi.object().unknown(),
            error: Joi.string(),
            success: Joi.boolean(),
            message: Joi.string(),
        }),
    },
    handler: async (request: Request, h) => {
        try {
            const {
                title,
                firstName,
                lastName,
                company,
                telephoneNumber,
                emailAddress,
                userName,
                password,
                retypePassword,
                accountType,
                monthlyNews,
                searchEngineAccess,
                statisticalDatabaseAccess,
                otherReports,
                paymentType,
            } = request.payload as any;

            // Check if passwords match
            if (password !== retypePassword) {
                return h.response({ error: "Passwords do not match!" }).code(400);
            }

            // Check username for spaces
            if (/\s/.test(userName)) {
                return h.response({ error: "User Name should not contain any spaces!" }).code(400);
            }

            // Check if the username or email already exists
            const uscntResult = await executeQuery(
                "SELECT COUNT(*) as count FROM and_cirec.cr_user WHERE us_username = @username",
                { username: userName }
            );
            const uscnt = uscntResult.recordset[0].count;

            const emailcntResult = await executeQuery(
                "SELECT COUNT(*) as count FROM and_cirec.cr_user WHERE us_email = @email",
                { email: emailAddress }
            );
            const emailcnt = emailcntResult.recordset[0].count;

            // Handle errors based on username and email existence
            if (uscnt !== 0 || emailcnt !== 0) {
                if (uscnt !== 0 && emailcnt !== 0) {
                    return h.response({ error: "User name and Email already exists in the database" }).code(400);
                } else if (uscnt !== 0) {
                    return h.response({ error: "User name already exists in the database" }).code(400);
                } else {
                    return h.response({ error: "Email already exists in the database" }).code(400);
                }
            }

            // Generate the next user ID
            const maxIdResult = await executeQuery("SELECT ISNULL(MAX(us_id), 0) + 1 as maxId FROM and_cirec.cr_user");
            const maxId = maxIdResult.recordset[0].maxId;

            // Calculate total price and services
            let totalPrice = 0;
            const startDate = new Date();
            let userGroups = "A,B,C,D,E,F,G";
            let accountTypeCode = accountType === "Corporate" ? "C" : "S";

            // Insert the new user into the database
            await executeQuery(
                `
            INSERT INTO and_cirec.cr_user (
                us_id, us_title, us_fname, us_lname, us_comp, 
                us_phone, us_email, us_username, us_pass, 
                us_type, us_grp, us_pay
            )
            VALUES (
                @id, @title, @firstName, @lastName, @company, 
                @phone, @email, @username, @password, 
                @accountType, @userGroups, @totalPrice
            )
            `,
                {
                    id: maxId,
                    title: title || null,
                    firstName: firstName,
                    lastName: lastName,
                    company: company || null,
                    phone: telephoneNumber || null,
                    email: emailAddress,
                    username: userName,
                    password: password,
                    accountType: accountTypeCode,
                    userGroups: userGroups,
                    totalPrice: totalPrice
                }
            );

            //send sign up alert mail to admin
            try {
                await sendEmail(
                    config.enviornment === "development" ? config.supportEmailReceiver : "andrew@cirec.net",
                    "Test Developemt: New Cirec Account Registration",
                    "new-registration-alter",
                    EmailType.NEW_REGISTRATION_ALERT,
                    {
                        fname: firstName,
                        lname: lastName,
                    }
                );
            } catch (error) {
                return h.response({ success: false, message: "Invalid email address No such User" }).code(400);
            }


            // Handle Monthly News Registration
            if (monthlyNews?.selected) {
                const mnEndDate = new Date(startDate);
                mnEndDate.setFullYear(
                    startDate.getFullYear() + (monthlyNews.duration === "1 year" ? 1 : 2)
                );

                const maxMnId = await executeQuery("SELECT ISNULL(MAX(um_id), 0) + 1 as maxId FROM and_cirec.cr_user_mnews");

                await executeQuery(
                    `INSERT INTO and_cirec.cr_user_mnews (
                            um_id, um_us_username, um_extra_copies, 
                            um_start_date, um_end_date
                        ) VALUES (
                            @mnId, @username, @extraCopies, 
                            @startDate, @endDate
                        )`,
                    {
                        mnId: maxMnId.recordset[0].maxId,
                        username: userName,
                        extraCopies: monthlyNews.additionalCopies || 0,
                        startDate: startDate,
                        endDate: mnEndDate
                    }
                );

                // TODO: Handle additional email registrations for copies
                if (monthlyNews.additionalEmails) {
                    // Implement email registration logic
                }
            }

            // Handle Search Engine Access Registration
            if (searchEngineAccess?.selected) {
                const seaEndDate = new Date(startDate);
                switch (searchEngineAccess.duration) {
                    case "3 months": seaEndDate.setMonth(startDate.getMonth() + 3); break;
                    case "6 months": seaEndDate.setMonth(startDate.getMonth() + 6); break;
                    case "12 months": seaEndDate.setFullYear(startDate.getFullYear() + 1); break;
                    case "24 months": seaEndDate.setFullYear(startDate.getFullYear() + 2); break;
                }

                const maxSeaId = await executeQuery("SELECT ISNULL(MAX(usea_id), 0) + 1 as maxId FROM and_cirec.cr_user_sea");

                await executeQuery(
                    `INSERT INTO and_cirec.cr_user_sea (
                        usea_id, usea_us_username, 
                        usea_start_date, usea_end_date
                        ) VALUES (
                            @seaId, @username, 
                            @startDate, @endDate
                        )`,
                    {
                        seaId: maxSeaId.recordset[0].maxId,
                        username: userName,
                        startDate: startDate,
                        endDate: seaEndDate
                    }
                );
            }

            // Handle Statistical Database Access Registration
            if (statisticalDatabaseAccess?.selected) {
                const sdaEndDate = new Date(startDate);
                sdaEndDate.setFullYear(
                    startDate.getFullYear() + (statisticalDatabaseAccess.duration === "1 year" ? 1 : 2)
                );

                const maxSdaId = await executeQuery("SELECT ISNULL(MAX(usda_id), 0) + 1 as maxId FROM and_cirec.cr_user_sda");

                await executeQuery(
                    `INSERT INTO and_cirec.cr_user_sda (
                        usda_id, usda_us_username, 
                        usda_start_date, usda_end_date
                    ) VALUES (
                        @sdaId, @username, 
                        @startDate, @endDate
                    )`,
                    {
                        sdaId: maxSdaId.recordset[0].maxId,
                        username: userName,
                        startDate: startDate,
                        endDate: sdaEndDate
                    }
                );
            }

            // Handle Other Reports
            if (otherReports && otherReports.length > 0) {
                const maxSeatId = await executeQuery("SELECT ISNULL(MAX(seat_id), 0) + 1 as maxId FROM and_cirec.cr_user_seat");

                await executeQuery(
                    `INSERT INTO and_cirec.cr_user_seat (
                        seat_id, seat_us_username, 
                        seat_sep, seat_rtpa
                    ) VALUES (
                        @seatId, @username, 
                        @sep, @rtpa
                    )`,
                    {
                        seatId: maxSeatId.recordset[0].maxId,
                        username: userName,
                        sep: otherReports.includes("Central European Olefins & Polyolefin Production") ? "Y" : "N",
                        rtpa: otherReports.includes("Polish Chemical Production") ? "Y" : "N"
                    }
                );
            }

            // Send confirmation email (placeholder)
            // You would replace this with actual email sending logic
            try {
                // Simulate email sending
                logger.info('sing-up', `Confirmation email sent to ${emailAddress}`);
            } catch (emailError) {
                logger.error('sing-up', `Failed to send confirmation email: ${emailError}`);
            }

            //@todo bill calculation functionality is incomplete 

            return {
                user: {
                    userName: userName,
                    firstName: firstName,
                    lastName: lastName,
                    email: emailAddress,
                    accountType: accountType,
                },
                message: "Registration Successful! Please check your email for confirmation.",
            };
        } catch (error) {
            logger.error(`signup-handler`, `Handler failure: ${error}`);
            return h.response({
                error: "Registration failed",
                message: error instanceof Error ? error.message : "Unknown error occurred"
            }).code(500);
        }
    },
};