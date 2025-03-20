import { RouteOptions } from "@hapi/hapi";
import Joi from "joi";
import { executeQuery } from "../../../../common/db";
import { logger } from "../../../../common/logger";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

// Define interfaces for our data structures
interface NewsItem {
  nw_id: number;
  nw_title: string;
  nw_issue_no: number;
  nw_pdf_link: string;
  nw_for_sample: string | number;
  nw_month: number;
  nw_year: number;
  nw_datetime?: string;
}

interface AddNewsPayload {
  month: number;
  year: number;
  forSample: boolean;
  pdfFile: any; // File upload payload
}

interface UpdateNewsPayload extends AddNewsPayload {
  id: string;
}

// Get all news
export const getAllNewsOptions: RouteOptions = {
  description: "Get All News",
  tags: ["api", "News"],
  handler: async (request, h) => {
    try {
      const result = await executeQuery(
        `SELECT * FROM cr_news ORDER BY nw_year, nw_month`,
        {}
      );

      return h.response({
        success: true,
        data: result.recordset
      }).code(200);
    } catch (error) {
      logger.error("get-all-news", `Failed to fetch news: ${error}`);
      return h.response({
        success: false,
        message: "Failed to fetch news"
      }).code(500);
    }
  }
};

// Get news by ID
export const getNewsByIdOptions: RouteOptions = {
  description: "Get News By ID",
  tags: ["api", "News"],
  validate: {
    params: Joi.object({
      id: Joi.string().required()
    })
  },
  handler: async (request, h) => {
    try {
      const id = request.params.id;
      
      const result = await executeQuery(
        `SELECT nw_id, nw_title, nw_issue_no, nw_pdf_link, nw_for_sample, nw_month, nw_year 
         FROM cr_news 
         WHERE nw_id = @id`,
        { id }
      );

      if (result.recordset.length === 0) {
        return h.response({
          success: false,
          message: "News not found"
        }).code(404);
      }

      return h.response({
        success: true,
        data: result.recordset[0]
      }).code(200);
    } catch (error) {
      logger.error("get-news-by-id", `Failed to fetch news item: ${error}`);
      return h.response({
        success: false,
        message: "Failed to fetch news item"
      }).code(500);
    }
  }
};

// Add new news item
export const addNewsOptions: RouteOptions = {
  description: "Add News Item",
  tags: ["api", "News"],
  payload: {
    output: 'stream',
    parse: true,
    multipart: true,
    maxBytes: 10485760 // 10MB max file size
  },
  validate: {
    payload: Joi.object({
      month: Joi.number().integer().min(1).max(12).required(),
      year: Joi.number().integer().min(1998).max(2050).required(),
      pdfFile: Joi.any().required(),
      forSample: Joi.boolean().default(false)
    })
  },
  handler: async (request, h) => {
    try {
      const payload = request.payload as any;
      const month: number = payload.month;
      const year: number = payload.year;
      const pdfFile: any = payload.pdfFile;
      const forSample: boolean = payload.forSample;

      // Check if news already exists for this month and year
      const existingResult = await executeQuery(
        `SELECT COUNT(*) as count FROM cr_news WHERE nw_month = @month AND nw_year = @year`,
        { month, year }
      );

      if (existingResult.recordset[0].count > 0) {
        return h.response({
          success: false,
          message: "The News already uploaded for this month. Please try to Edit."
        }).code(400);
      }

      // Validate file is PDF
      const filename = pdfFile.hapi.filename;
      const fileExt = path.extname(filename).toLowerCase();
      
      if (fileExt !== '.pdf') {
        return h.response({
          success: false,
          message: "Please upload a PDF file"
        }).code(400);
      }

      // Generate new filename following the pattern in original code
      const monthNum = month.toString().padStart(2, '0');
      const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const monthName = monthNames[month - 1];
      const newFilename = `${monthNum}-${monthName} ${year}.pdf`;
      
      // Get upload directory path
      const uploadPath = path.join(process.cwd(), 'public', 'crpdfnet');
      
      // Ensure directory exists
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      
      // Full path to save the file
      const filePath = path.join(uploadPath, newFilename);
      
      // Save the file
      const fileStream = fs.createWriteStream(filePath);
      
      try {
        await new Promise<void>((resolve, reject) => {
          const readableStream = pdfFile._data as Readable;
          
          readableStream.pipe(fileStream);
          
          fileStream.on('finish', () => {
            resolve();
          });
          
          fileStream.on('error', (err) => {
            reject(err);
          });
        });
        
        // Calculate issue number and title
        let title: string;
        let issueNo: number;
        const yearDiff = year - 1991;
        
        if (yearDiff === 0) {
          issueNo = month;
          title = `Issue no ${month}`;
        } else {
          issueNo = ((yearDiff * 12) + month);
          title = `Issue no ${issueNo}`;
        }
        
        // Get next ID
        const maxIdResult = await executeQuery(
          `SELECT ISNULL(MAX(nw_id), 0) + 1 AS maxId FROM cr_news`,
          {}
        );
        const maxId = maxIdResult.recordset[0].maxId;
        
        // Format date
        const datetime = `${month}/${month}/${year}`;
        const forSampleValue = forSample ? 1 : 0;
        
        // Insert into database
        await executeQuery(
          `INSERT INTO cr_news (nw_id, nw_title, nw_issue_no, nw_pdf_link, nw_for_sample, nw_month, nw_year, nw_datetime)
           VALUES (@maxId, @title, @issueNo, @newFilename, @forSampleValue, @month, @year, @datetime)`,
          {
            maxId,
            title,
            issueNo,
            newFilename,
            forSampleValue,
            month,
            year,
            datetime
          }
        );
        
        return h.response({
          success: true,
          message: "News added successfully",
          id: maxId
        }).code(201);
        
      } catch (fileError) {
        logger.error("add-news-file", `Failed to save file: ${fileError}`);
        return h.response({
          success: false,
          message: "Failed to save file"
        }).code(500);
      }
      
    } catch (error) {
      logger.error("add-news", `Failed to add news: ${error}`);
      return h.response({
        success: false,
        message: "Failed to add news"
      }).code(500);
    }
  }
};

// Update news item
export const updateNewsOptions: RouteOptions = {
  description: "Update News Item",
  tags: ["api", "News"],
  payload: {
    output: 'stream',
    parse: true,
    multipart: true,
    maxBytes: 10485760 // 10MB max file size
  },
  validate: {
    params: Joi.object({
      id: Joi.string().required()
    }),
    payload: Joi.object({
      month: Joi.number().integer().min(1).max(12).required(),
      year: Joi.number().integer().min(1998).max(2050).required(),
      pdfFile: Joi.any().required(),
      forSample: Joi.boolean().default(false)
    })
  },
  handler: async (request, h) => {
    try {
      const id = request.params.id;
      const payload = request.payload as any;
      const month: number = payload.month;
      const year: number = payload.year;
      const pdfFile: any = payload.pdfFile;
      const forSample: boolean = payload.forSample;

      // Validate file is PDF
      const filename = pdfFile.hapi.filename;
      const fileExt = path.extname(filename).toLowerCase();
      
      if (fileExt !== '.pdf') {
        return h.response({
          success: false,
          message: "Please upload a PDF file"
        }).code(400);
      }

      // Generate new filename
      const monthNum = month.toString().padStart(2, '0');
      const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const monthName = monthNames[month - 1];
      const newFilename = `${monthNum}-${monthName} ${year}.pdf`;
      
      // Get upload directory path
      const uploadPath = path.join(process.cwd(), 'public', 'crpdfnet');
      
      // Ensure directory exists
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      
      // Full path to save the file
      const filePath = path.join(uploadPath, newFilename);
      
      // Save the file
      const fileStream = fs.createWriteStream(filePath);
      
      try {
        await new Promise<void>((resolve, reject) => {
          const readableStream = pdfFile._data as Readable;
          
          readableStream.pipe(fileStream);
          
          fileStream.on('finish', () => {
            resolve();
          });
          
          fileStream.on('error', (err) => {
            reject(err);
          });
        });
        
        // Calculate issue number and title
        let title: string;
        let issueNo: number;
        const yearDiff = year - 1991;
        
        if (yearDiff === 0) {
          issueNo = month;
          title = `Issue no ${month}`;
        } else {
          issueNo = ((yearDiff * 12) + month);
          title = `Issue no ${issueNo}`;
        }
        
        const forSampleValue = forSample ? 1 : 0;
        
        // Update database
        await executeQuery(
          `UPDATE cr_news 
           SET nw_title = @title, 
               nw_issue_no = @issueNo, 
               nw_pdf_link = @newFilename, 
               nw_for_sample = @forSampleValue, 
               nw_month = @month, 
               nw_year = @year 
           WHERE nw_id = @id`,
          {
            id,
            title,
            issueNo,
            newFilename,
            forSampleValue,
            month,
            year
          }
        );
        
        return h.response({
          success: true,
          message: "News updated successfully"
        }).code(200);
        
      } catch (fileError) {
        logger.error("update-news-file", `Failed to save file: ${fileError}`);
        return h.response({
          success: false,
          message: "Failed to save file"
        }).code(500);
      }
      
    } catch (error) {
      logger.error("update-news", `Failed to update news: ${error}`);
      return h.response({
        success: false,
        message: "Failed to update news"
      }).code(500);
    }
  }
};

// Delete news item
export const deleteNewsOptions: RouteOptions = {
  description: "Delete News Item",
  tags: ["api", "News"],
  validate: {
    params: Joi.object({
      id: Joi.string().required()
    })
  },
  handler: async (request, h) => {
    try {
      const id = request.params.id;
      
      // First get the news item to find the PDF filename
      const newsResult = await executeQuery(
        `SELECT nw_pdf_link FROM cr_news WHERE nw_id = @id`,
        { id }
      );
      
      if (newsResult.recordset.length === 0) {
        return h.response({
          success: false,
          message: "News not found"
        }).code(404);
      }
      
      const pdfFilename = newsResult.recordset[0].nw_pdf_link;
      
      // Delete from database
      await executeQuery(
        `DELETE FROM cr_news WHERE nw_id = @id`,
        { id }
      );
      
      // Try to delete the file (but don't fail if file deletion fails)
      try {
        const filePath = path.join(process.cwd(), 'public', 'crpdfnet', pdfFilename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fileError) {
        logger.warn("delete-news-file", `Failed to delete file: ${fileError}`);
        // Continue processing even if file deletion fails
      }
      
      return h.response({
        success: true,
        message: "News deleted successfully"
      }).code(200);
      
    } catch (error) {
      logger.error("delete-news", `Failed to delete news: ${error}`);
      return h.response({
        success: false,
        message: "Failed to delete news"
      }).code(500);
    }
  }
};

// Toggle sample status
export const toggleSampleStatusOptions: RouteOptions = {
  description: "Toggle News Sample Status",
  tags: ["api", "News"],
  validate: {
    params: Joi.object({
      id: Joi.string().required()
    }),
    payload: Joi.object({
      forSample: Joi.boolean().required()
    })
  },
  handler: async (request, h) => {
    try {
      const id = request.params.id;
      const { forSample } = request.payload as { forSample: boolean };
      
      const forSampleValue = forSample ? 1 : 0;
      
      await executeQuery(
        `UPDATE cr_news SET nw_for_sample = @forSampleValue WHERE nw_id = @id`,
        { id, forSampleValue }
      );
      
      return h.response({
        success: true,
        message: "Sample status updated successfully"
      }).code(200);
      
    } catch (error) {
      logger.error("toggle-sample-status", `Failed to update sample status: ${error}`);
      return h.response({
        success: false,
        message: "Failed to update sample status"
      }).code(500);
    }
  }
};