import { RouteOptions } from "@hapi/hapi";
import Joi from "joi";
import { executeQuery } from "../../../../common/db";
import { logger } from "../../../../common/logger";

export const getProductsOptions: RouteOptions = {
  description: "Get All Products",
  tags: ["api", "Products"],
  handler: async (request, h) => {
    try {
      // Equivalent to the .NET binddata() function
      const result = await executeQuery(
        "SELECT * FROM cr_rep_products",
        {}
      );
      
      // Transform data to match frontend expectations
      const products = result.recordset.map(product => ({
        pr_id: product.pr_id,
        pr_name: product.pr_name,
        pr_group: product.pr_group || "",
        // Convert numeric display to boolean for frontend
        pr_display: product.pr_display === "1" || product.pr_display === true
      }));
      
      return h.response({
        success: true,
        products: products
      }).code(200);
    } catch (error) {
      logger.error("get-products", `Failed to fetch products: ${error}`);
      return h.response({
        success: false,
        message: "Failed to fetch products"
      }).code(500);
    }
  }
};

export const updateProductDisplayOptions: RouteOptions = {
  description: "Update Product Display Status",
  tags: ["api", "Products"],
  validate: {
    payload: Joi.object({
      prId: Joi.string().required(),
      display: Joi.boolean().required()
    })
  },
  handler: async (request, h) => {
    try {
      const { prId, display } = request.payload as { prId: string, display: boolean };
      
      // Convert boolean to string '0' or '1' like in the .NET code
      const displayStatus = display ? "1" : "0";
      
      // Log the query parameters
      console.log("Updating product:", { prId, display, displayStatus });
      
      // Ensure prId is treated as a number if your database expects an integer
      const numericId = parseInt(prId, 10);
      
      // Add additional logging to verify query execution
      const result = await executeQuery(
        "UPDATE cr_rep_products SET pr_display = @status WHERE pr_id = @id",
        {
          status: displayStatus,
          id: numericId  // Use numeric ID instead of string
        }
      );
      
      // Log the result to verify rows affected
      console.log("Update result:", result);
      
      // Check if any rows were affected
      if (result.rowsAffected && result.rowsAffected[0] === 0) {
        logger.warn("update-product-display", `No rows updated for product ID: ${prId}`);
        return h.response({
          success: false,
          message: "No product found with the specified ID"
        }).code(404);
      }
      
      return h.response({
        success: true,
        message: "Product display status updated"
      }).code(200);
    } catch (error) {
      logger.error("update-product-display", `Failed to update product display: ${error}`);
      return h.response({
        success: false,
        message: "Failed to update product display status"
      }).code(500);
    }
  }
};

export const addProductOptions: RouteOptions = {
  description: "Add New Product",
  tags: ["api", "Products"],
  validate: {
    payload: Joi.object({
      productName: Joi.string().required()
    })
  },
  handler: async (request, h) => {
    try {
      const { productName } = request.payload as { productName: string };
      
      // Get max ID (similar to the .NET getAutoId function)
      const maxIdResult = await executeQuery(
        "SELECT MAX(pr_id) as maxId FROM cr_rep_products",
        {}
      );
      
      let maxId = 1;
      if (maxIdResult.recordset[0].maxId) {
        maxId = parseInt(maxIdResult.recordset[0].maxId) + 1;
      }
      
      // Insert new product
      await executeQuery(
        "INSERT INTO cr_rep_products(pr_id, pr_name, pr_display) VALUES (@id, @name, @display)",
        {
          id: maxId,
          name: productName,
          display: "1" // Set new products as visible by default
        }
      );
      
      return h.response({
        success: true,
        message: "Product added successfully",
        productId: maxId
      }).code(201);
    } catch (error) {
      logger.error("add-product", `Failed to add product: ${error}`);
      return h.response({
        success: false,
        message: "Failed to add product"
      }).code(500);
    }
  }
};