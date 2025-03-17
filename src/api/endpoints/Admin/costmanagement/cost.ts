// src/routes/admin/costManagement/types.ts
export interface RegOption {
    reg_op_id: number;
    reg_op_name: string;
  }
  
  export interface RegPrice {
    reg_pid: number;
    reg_pname: string;
    reg_pprice: number;
    reg_op_id: number;
  }
  import { executeQuery } from "../../../../common/db";
  import { logger } from "../../../../common/logger";


  import { Request, ResponseToolkit } from "@hapi/hapi";
 
  export const getOptionsHandler = async (request: Request, h: ResponseToolkit) => {
    try {
      const result = await executeQuery(
        "SELECT * FROM cr_reg_option",
        {}
      );
  
      return h.response({
        success: true,
        data: result.recordset as RegOption[]
      }).code(200);
    } catch (error) {
      logger.error("get-options", `Failed to retrieve options: ${error}`);
      return h.response({
        success: false,
        message: "Failed to retrieve options"
      }).code(500);
    }
  };
  
  export const getPriceOptionsHandler = async (request: Request, h: ResponseToolkit) => {
    try {
      const optionId = request.params.optionId;
      
      const result = await executeQuery(
        "SELECT reg_pid, reg_pname FROM cr_reg_price WHERE reg_op_id = @optionId",
        { optionId }
      );
  
      return h.response({
        success: true,
        data: result.recordset
      }).code(200);
    } catch (error) {
      logger.error("get-price-options", `Failed to retrieve price options: ${error}`);
      return h.response({
        success: false,
        message: "Failed to retrieve price options"
      }).code(500);
    }
  };
  
  export const getPriceHandler = async (request: Request, h: ResponseToolkit) => {
    try {
      const priceId = request.params.priceId;
      
      const result = await executeQuery(
        "SELECT reg_pprice FROM cr_reg_price WHERE reg_pid = @priceId",
        { priceId }
      );
  
      if (result.recordset.length === 0) {
        return h.response({
          success: false,
          message: "Price not found"
        }).code(404);
      }
  
      return h.response({
        success: true,
        data: {
          price: result.recordset[0].reg_pprice
        }
      }).code(200);
    } catch (error) {
      logger.error("get-price", `Failed to retrieve price: ${error}`);
      return h.response({
        success: false,
        message: "Failed to retrieve price"
      }).code(500);
    }
  };
  
  export const updatePriceHandler = async (request: Request, h: ResponseToolkit) => {
    try {
      const priceId = request.params.priceId;
      const { price } = request.payload as { price: number };
      
      const updateResult = await executeQuery(
        "UPDATE cr_reg_price SET reg_pprice = @price WHERE reg_pid = @priceId",
        { price, priceId }
      );
  
      if (updateResult.rowsAffected && updateResult.rowsAffected[0] > 0) {
        return h.response({
          success: true,
          message: "Price updated successfully"
        }).code(200);
      } else {
        return h.response({
          success: false,
          message: "Price not found or no changes made"
        }).code(404);
      }
    } catch (error) {
      logger.error("update-price", `Failed to update price: ${error}`);
      return h.response({
        success: false,
        message: "Failed to update price"
      }).code(500);
    }
  };
  
