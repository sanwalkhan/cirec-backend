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
      const result = await executeQuery(
        "SELECT * FROM cr_rep_companies",
        {}
      );
      
      return h.response({
        success: true,
        companies: result.recordset
      }).code(200);
    } catch (error) {
      logger.error("get-companies", `Failed to fetch companies: ${error}`);
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
      
      // Convert boolean to string '0' or '1' as in the .NET code
      const displayStatus = display ? "1" : "0";
      
      await executeQuery(
        "UPDATE cr_rep_companies SET comp_display = @status WHERE comp_id = @id",
        {
          status: displayStatus,
          id: compId
        }
      );
      
      return h.response({
        success: true,
        message: "Company display status updated"
      }).code(200);
    } catch (error) {
      logger.error("update-company-display", `Failed to update company display: ${error}`);
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
      logger.error("get-countries", `Failed to fetch countries: ${error}`);
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
      
      // Get max ID (similar to the .NET getAutoId function)
      const maxIdResult = await executeQuery(
        "SELECT MAX(comp_id) as maxId FROM cr_companies",
        {}
      );
      
      let maxId = 1;
      if (maxIdResult.recordset[0].maxId) {
        maxId = maxIdResult.recordset[0].maxId + 1;
      }
      
      // Insert new company
      await executeQuery(
        "INSERT INTO cr_companies(comp_id, comp_name, comp_location, comp_country_id) VALUES (@id, @name, @location, @countryId)",
        {
          id: maxId,
          name: companyName,
          location: companyLocation,
          countryId: countryId
        }
      );
      
      // Also insert into rep_companies for display management
      await executeQuery(
        "INSERT INTO cr_rep_companies(comp_id, comp_name, comp_display) VALUES (@id, @name, @display)",
        {
          id: maxId,
          name: companyName,
          display: "1" // Set new companies as visible by default
        }
      );
      
      return h.response({
        success: true,
        message: "Company added successfully",
        companyId: maxId
      }).code(201);
    } catch (error) {
      logger.error("add-company", `Failed to add company: ${error}`);
      return h.response({
        success: false,
        message: "Failed to add company"
      }).code(500);
    }
  }
};
