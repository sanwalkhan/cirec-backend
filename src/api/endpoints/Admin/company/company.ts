import { RouteOptions } from "@hapi/hapi";
import Joi from "joi";
import { executeQuery } from "../../../../common/db";
import { logger } from "../../../../common/logger";

/**
 * Route to get all companies
 */
export const getCompaniesOptions: RouteOptions = {
  description: "Get All Companies",
  tags: ["api", "Companies"],
  handler: async (request, h) => {
    try {
      // Query only cr_rep_companies table
      const result = await executeQuery(
        `SELECT comp_id, comp_name, comp_display 
         FROM cr_rep_companies`,
        {}
      );
      
      // Debug the raw data from database
      // console.log("Raw company data:", result.recordset);
      
      // IMPORTANT: Don't transform comp_display if it's already a boolean
      const companies = result.recordset.map(company => ({
        ...company,
        // Keep the original boolean value
        comp_location: '-'
      }));
      
      // Debug the transformed data
      // console.log("Transformed companies:", companies);

      return h.response({
        success: true,
        companies: companies
      }).code(200);
    } catch (error) {
      // logger.error("get-companies", `Failed to fetch companies: ${error}`);
      return h.response({
        success: false,
        message: "Failed to fetch companies"
      }).code(500);
    }
  }
};

/**
 * Route to update company display status
 */
export const updateCompanyDisplayOptions: RouteOptions = {
  description: "Update Company Display Status",
  tags: ["api", "Companies"],
  validate: {
    payload: Joi.object({
      compId: Joi.string().required(),
      display: Joi.boolean().required()
    })
  },
  handler: async (request, h) => {
    try {
      const { compId, display } = request.payload as { compId: string, display: boolean };
      
      // Log the update parameters
      // console.log("Updating company display:", { compId, display });
      
      // Execute the update query - use the boolean directly
      const result = await executeQuery(
        "UPDATE cr_rep_companies SET comp_display = @status WHERE comp_id = @id",
        {
          status: display, // Use the boolean directly
          id: compId
        }
      );
      
      // Log the result to verify rows affected
      // console.log("Update result:", result);
      
      // Check if any rows were affected
      if (result.rowsAffected && result.rowsAffected[0] === 0) {
        // logger.warn("update-company-display", `No rows updated for company ID: ${compId}`);
        return h.response({
          success: false,
          message: "No company found with the specified ID"
        }).code(404);
      }
      
      return h.response({
        success: true,
        message: "Company display status updated"
      }).code(200);
    } catch (error) {
      // logger.error("update-company-display", `Failed to update company display: ${error}`);
      return h.response({
        success: false,
        message: "Failed to update company display status"
      }).code(500);
    }
  }
};

/**
 * Route to get all countries for dropdown
 */
export const getCountriesOptions: RouteOptions = {
  description: "Get All Countries",
  tags: ["api", "Countries"],
  handler: async (request, h) => {
    try {
      const result = await executeQuery(
        "SELECT * FROM cr_countries ORDER BY cu_name",
        {}
      );
      
      return h.response({
        success: true,
        countries: result.recordset
      }).code(200);
    } catch (error) {
      // logger.error("get-countries", `Failed to fetch countries: ${error}`);
      return h.response({
        success: false,
        message: "Failed to fetch countries"
      }).code(500);
    }
  }
};

/**
 * Route to add a new company
 */
export const addCompanyOptions: RouteOptions = {
  description: "Add New Company",
  tags: ["api", "Companies"],
  validate: {
    payload: Joi.object({
      companyName: Joi.string().required(),
      companyLocation: Joi.string().required(),
      countryId: Joi.number().integer().required()
    })
  },
  handler: async (request, h) => {
    try {
      const { companyName, companyLocation, countryId } = request.payload as { 
        companyName: string, 
        companyLocation: string, 
        countryId: number 
      };
      
      // Get max ID from cr_rep_companies
      const maxIdResult = await executeQuery(
        "SELECT ISNULL(MAX(comp_id), 0) as maxId FROM cr_rep_companies",
        {}
      );
      
      let maxId = 1;
      if (maxIdResult.recordset[0].maxId) {
        maxId = parseInt(maxIdResult.recordset[0].maxId) + 1;
      }
      
      // Insert into cr_rep_companies only
      try {
        // Insert into cr_rep_companies with display set to true by default
        await executeQuery(
          "INSERT INTO cr_rep_companies(comp_id, comp_name, comp_display) VALUES (@id, @name, @display)",
          {
            id: maxId,
            name: companyName,
            display: true // Use boolean directly
          }
        );
        
        // Log the location and country information
        // logger.info("add-company", `Company location: ${companyLocation}, Country ID: ${countryId}`);
        
        return h.response({
          success: true,
          message: "Company added successfully",
          companyId: maxId
        }).code(201);
      } catch (err) {
        throw err;
      }
    } catch (error) {
      // logger.error("add-company", `Failed to add company: ${error}`);
      return h.response({
        success: false,
        message: "Failed to add company"
      }).code(500);
    }
  }
};