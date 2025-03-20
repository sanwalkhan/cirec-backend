import { Request, ResponseToolkit } from "@hapi/hapi";
import * as path from "path";
import * as fs from "fs";
import { format } from "date-fns";
import { executeQuery } from "../../../../common/db";
import { logger } from "../../../../common/logger";


const UPLOAD_DIR = path.resolve(__dirname, "../../public/crpdfnet/cis");

export const newsHandlers = {
  /**
   * Get all news items
   */
  getAllRussianNews: async (request: Request, h: ResponseToolkit) => {
    try {
      const result = await executeQuery(
        "SELECT * FROM cr_news2 ORDER BY nw_year, nw_month",
        {}
      );
      
      return h.response({ success: true, data: result.recordset }).code(200);
    } catch (error) {
      logger.error("get-all-news", `Failed to fetch news: ${error}`);
      return h.response({ success: false, message: "Failed to retrieve news" }).code(500);
    }
  },

  /**
   * Get news by ID
   */
  getRussianNewsById: async (request: Request, h: ResponseToolkit) => {
    try {
      const id = parseInt(request.params.id);
      
      const result = await executeQuery(
        "SELECT nw_id, nw_title, nw_issue_no, nw_pdf_link, nw_for_sample, nw_month, nw_year FROM cr_news2 WHERE nw_id = @id",
        { id }
      );
      
      if (result.recordset.length === 0) {
        return h.response({ success: false, message: "News not found" }).code(404);
      }
      
      return h.response({ success: true, data: result.recordset[0] }).code(200);
    } catch (error) {
      logger.error("get-news-by-id", `Failed to fetch news: ${error}`);
      return h.response({ success: false, message: "Failed to retrieve news" }).code(500);
    }
  },

  /**
   * Add new news item
   */
  addRussianNews: async (request: Request, h: ResponseToolkit) => {
    try {
      const payload = request.payload as any;
      const month = parseInt(payload.month);
      const year = parseInt(payload.year);
      const forSample = payload.forSample === "true";
      const pdfFile = payload.pdfFile;
      
      // Check if file is PDF
      if (!pdfFile.hapi.filename.toLowerCase().endsWith('.pdf')) {
        return h.response({ success: false, message: "Please upload a PDF file" }).code(400);
      }
      
      // Check if news exists for this month/year
      const checkResult = await executeQuery(
        "SELECT COUNT(*) as count FROM cr_news2 WHERE nw_month = @month AND nw_year = @year",
        { month, year }
      );
      
      if (checkResult.recordset[0].count > 0) {
        return h.response({ 
          success: false, 
          message: "News already uploaded for this month. Please try to edit instead." 
        }).code(409);
      }
      
      // Create upload directory if it doesn't exist
      if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      }
      
      // Generate filename
      const date = new Date(year, month - 1, 1);
      const monthName = format(date, 'MMM');
      const filename = `${month.toString().padStart(2, '0')}-${monthName} ${year}.pdf`;
      const filepath = path.join(UPLOAD_DIR, filename);
      
      // Save file
      await new Promise<void>((resolve, reject) => {
        const writeStream = fs.createWriteStream(filepath);
        writeStream.on('error', reject);
        writeStream.on('finish', resolve);
        pdfFile.pipe(writeStream);
      });
      
      // Calculate issue number and title
      const yearDiff = year - 2011;
      const issueNo = yearDiff === 0 ? month : ((yearDiff * 12) + month);
      const title = `Issue no ${issueNo}`;
      
      // Get next ID
      const idResult = await executeQuery(
        "SELECT ISNULL(MAX(nw_id), 0) + 1 as nextId FROM cr_news2",
        {}
      );
      const nextId = idResult.recordset[0].nextId;
      
      // Create datetime string
      const datetime = `${month}/${month}/${year}`;
      
      // Insert news
      const insertResult = await executeQuery(
        `INSERT INTO cr_news2 (
          nw_id, nw_title, nw_issue_no, nw_pdf_link, 
          nw_for_sample, nw_month, nw_year, nw_datetime
        ) VALUES (
          @id, @title, @issueNo, @pdfLink, 
          @forSample, @month, @year, @datetime
        )`,
        {
          id: nextId,
          title,
          issueNo,
          pdfLink: filename,
          forSample: forSample ? 1 : 0,
          month,
          year,
          datetime
        }
      );
      
      if (insertResult.rowsAffected[0] === 0) {
        return h.response({ success: false, message: "Failed to add news" }).code(500);
      }
      
      return h.response({ success: true, message: "News added successfully" }).code(201);
    } catch (error) {
      logger.error("add-news", `Failed to add news: ${error}`);
      return h.response({ success: false, message: "Failed to add news" }).code(500);
    }
  },

  /**
   * Update existing news
   */
  updateRussianNews: async (request: Request, h: ResponseToolkit) => {
    try {
      const id = parseInt(request.params.id);
      const payload = request.payload as any;
      const month = parseInt(payload.month);
      const year = parseInt(payload.year);
      const forSample = payload.forSample === "true";
      const pdfFile = payload.pdfFile;
      
      // Check if news exists
      const checkResult = await executeQuery(
        "SELECT nw_pdf_link FROM cr_news2 WHERE nw_id = @id",
        { id }
      );
      
      if (checkResult.recordset.length === 0) {
        return h.response({ success: false, message: "News not found" }).code(404);
      }
      
      let filename = checkResult.recordset[0].nw_pdf_link;
      
      // If new file uploaded
      if (pdfFile) {
        if (!pdfFile.hapi.filename.toLowerCase().endsWith('.pdf')) {
          return h.response({ success: false, message: "Please upload a PDF file" }).code(400);
        }
        
        // Generate filename
        const date = new Date(year, month - 1, 1);
        const monthName = format(date, 'MMM');
        filename = `${month.toString().padStart(2, '0')}-${monthName} ${year}.pdf`;
        const filepath = path.join(UPLOAD_DIR, filename);
        
        // Save file
        await new Promise<void>((resolve, reject) => {
          const writeStream = fs.createWriteStream(filepath);
          writeStream.on('error', reject);
          writeStream.on('finish', resolve);
          pdfFile.pipe(writeStream);
        });
      }
      
      // Calculate issue number and title
      const yearDiff = year - 2011;
      const issueNo = yearDiff === 0 ? month : ((yearDiff * 12) + month);
      const title = `Issue no ${issueNo}`;
      
      // Update news
      const updateResult = await executeQuery(
        `UPDATE cr_news2 SET 
          nw_title = @title,
          nw_issue_no = @issueNo,
          nw_pdf_link = @pdfLink,
          nw_for_sample = @forSample,
          nw_month = @month,
          nw_year = @year
        WHERE nw_id = @id`,
        {
          id,
          title,
          issueNo,
          pdfLink: filename,
          forSample: forSample ? 1 : 0,
          month,
          year
        }
      );
      
      if (updateResult.rowsAffected[0] === 0) {
        return h.response({ success: false, message: "Failed to update news" }).code(500);
      }
      
      return h.response({ success: true, message: "News updated successfully" }).code(200);
    } catch (error) {
      logger.error("update-news", `Failed to update news: ${error}`);
      return h.response({ success: false, message: "Failed to update news" }).code(500);
    }
  },

  /**
   * Update sample status
   */
  updateRussianSampleStatus: async (request: Request, h: ResponseToolkit) => {
    try {
      const id = parseInt(request.params.id);
      const status = request.payload as any;
      const isSample = status.forSample ? 1 : 0;
      
      const result = await executeQuery(
        "UPDATE cr_news2 SET nw_for_sample = @status WHERE nw_id = @id",
        { id, status: isSample }
      );
      
      if (result.rowsAffected[0] === 0) {
        return h.response({ success: false, message: "News not found or no changes made" }).code(404);
      }
      
      return h.response({ success: true, message: "Sample status updated successfully" }).code(200);
    } catch (error) {
      logger.error("update-sample-status", `Failed to update sample status: ${error}`);
      return h.response({ success: false, message: "Failed to update sample status" }).code(500);
    }
  },

  /**
   * Delete news
   */
  deleteRussianNews: async (request: Request, h: ResponseToolkit) => {
    try {
      const id = parseInt(request.params.id);
      
      const result = await executeQuery(
        "DELETE FROM cr_news2 WHERE nw_id = @id",
        { id }
      );
      
      if (result.rowsAffected[0] === 0) {
        return h.response({ success: false, message: "News not found" }).code(404);
      }
      
      return h.response({ success: true, message: "News deleted successfully" }).code(200);
    } catch (error) {
      logger.error("delete-news", `Failed to delete news: ${error}`);
      return h.response({ success: false, message: "Failed to delete news" }).code(500);
    }
  }
};