import { ResponseToolkit, Request, RouteOptions } from "@hapi/hapi";
import { executeQuery } from "../../../../common/db";
import { logger } from "../../../../common/logger";
import Joi from "joi";


interface IssuePayload {
  title: string;
  content: string;
  month: number;
  year: number;
}

export const getInitialDataHandler = async (request: Request, h: ResponseToolkit) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    // Generate years from 1998 to 2050
    const years = [];
    for (let i = 1998; i <= 2050; i++) {
      years.push({
        valueField: i,
        textField: i.toString()
      });
    }
    
    // Generate months
    const months = [
      { valueField: 1, textField: "JAN" },
      { valueField: 2, textField: "FEB" },
      { valueField: 3, textField: "MAR" },
      { valueField: 4, textField: "APR" },
      { valueField: 5, textField: "MAY" },
      { valueField: 6, textField: "JUN" },
      { valueField: 7, textField: "JUL" },
      { valueField: 8, textField: "AUG" },
      { valueField: 9, textField: "SEP" },
      { valueField: 10, textField: "OCT" },
      { valueField: 11, textField: "NOV" },
      { valueField: 12, textField: "DEC" }
    ];
    
    return h.response({
      success: true,
      years,
      months,
      currentYear,
      currentMonth
    }).code(200);
  } catch (error) {
    logger.error("issue-initial-data", `Failed to get initial data: ${error}`);
    return h.response({
      success: false,
      message: "Failed to get initial data"
    }).code(500);
  }
};

export const getIssueHandler = async (request: Request, h: ResponseToolkit) => {
  try {
    const { year, month } = request.params as { year: string; month: string };
    
    const result = await executeQuery(
      `
      SELECT iss_content, iss_title 
      FROM cr_issue 
      WHERE iss_month = @month 
      AND iss_year = @year
      `,
      {
        month: parseInt(month),
        year: parseInt(year)
      }
    );
    
    if (result.recordset.length > 0) {
      return h.response({
        success: true,
        content: result.recordset[0].iss_content,
        title: result.recordset[0].iss_title
      }).code(200);
    } else {
      return h.response({
        success: true,
        content: "",
        title: ""
      }).code(200);
    }
  } catch (error) {
    logger.error("issue-get", `Failed to get issue: ${error}`);
    return h.response({
      success: false,
      message: "Failed to get issue"
    }).code(500);
  }
};

export const createOrUpdateIssueHandler = async (request: Request, h: ResponseToolkit) => {
  try {
    const payload = request.payload as IssuePayload;
    const { title, content, month, year } = payload;
    
    // Clean content (replace single quotes)
    const cleanContent = content.replace(/'/g, " ");
    
    // Check if issue exists
    const countResult = await executeQuery(
      `
      SELECT COUNT(*) as count 
      FROM cr_issue 
      WHERE iss_month = @month 
      AND iss_year = @year
      `,
      {
        month,
        year
      }
    );
    
    const count = countResult.recordset[0].count;
    
    if (count === 0) {
      // Get max ID for auto-increment
      const maxIdResult = await executeQuery(
        `
        SELECT MAX(iss_id) as maxId 
        FROM cr_issue
        `,
        {}
      );
      
      const maxId = (maxIdResult.recordset[0].maxId || 0) + 1;
      const datetime = `${month}/1/${year}`;
      
      // Calculate issue number
      let issueNumber = 0;
      const yearDiff = year - 1998;
      
      if (yearDiff === 0) {
        issueNumber = month;
      } else {
        issueNumber = (yearDiff * 12) + month;
      }
      
      // Insert new issue
      await executeQuery(
        `
        INSERT INTO cr_issue (
          iss_id, iss_title, iss_issue_no, iss_content, 
          iss_month, iss_year, iss_datetime
        ) 
        VALUES (
          @maxId, @title, @issueNumber, @content,
          @month, @year, @datetime
        )
        `,
        {
          maxId,
          title,
          issueNumber,
          content: cleanContent,
          month,
          year,
          datetime
        }
      );
      
      return h.response({
        success: true,
        message: "Issue created successfully",
        issueNumber
      }).code(201);
    } else {
      // Update existing issue
      await executeQuery(
        `
        UPDATE cr_issue 
        SET iss_content = @content, iss_title = @title 
        WHERE iss_month = @month AND iss_year = @year
        `,
        {
          content: cleanContent,
          title,
          month,
          year
        }
      );
      
      return h.response({
        success: true,
        message: "Issue updated successfully"
      }).code(200);
    }
  } catch (error) {
    logger.error("issue-create-update", `Failed to create/update issue: ${error}`);
    return h.response({
      success: false,
      message: "Failed to create/update issue"
    }).code(500);
  }
};


export const getInitialDataOptions: RouteOptions = {
    description: "Get years and months for issue management",
    tags: ["api", "Issues"],
    handler: getInitialDataHandler
  };
  
  export const getIssueOptions: RouteOptions = {
    description: "Get issue by year and month",
    tags: ["api", "Issues"],
    validate: {
      params: Joi.object({
        year: Joi.number().integer().min(1998).max(2050).required(),
        month: Joi.number().integer().min(1).max(12).required()
      })
    },
    handler: getIssueHandler
  };
  
  export const createOrUpdateIssueOptions: RouteOptions = {
    description: "Create or update an issue",
    tags: ["api", "Issues"],
    validate: {
      payload: Joi.object({
        title: Joi.string().required(),
        content: Joi.string().required(),
        month: Joi.number().integer().min(1).max(12).required(),
        year: Joi.number().integer().min(1998).max(2050).required()
      })
    },
    handler: createOrUpdateIssueHandler
  };