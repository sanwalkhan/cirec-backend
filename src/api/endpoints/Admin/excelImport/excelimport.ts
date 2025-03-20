import { RouteOptions } from "@hapi/hapi";
import Joi from "joi";
import { executeQuery } from "../../../../common/db";
import { logger } from "../../../../common/logger";
import * as XLSX from 'xlsx';

interface ExcelImportPayload {
  file: any; // This will be a file buffer from Hapi
  importType: string;
}

// Define interfaces for row types
interface ProductRow {
  Product: string;
  Group?: string;
  [key: string]: any;
}

interface CompanyRow {
  Producer: string;
  Location?: string;
  Country?: string;
  [key: string]: any;
}

// Helper function to read Excel file from buffer
async function readExcelFile(buffer: Buffer): Promise<XLSX.WorkBook> {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    return workbook;
  } catch (error) {
    logger.error("excel-import", `Failed to parse Excel file: ${error}`);
    throw new Error('Failed to parse Excel file');
  }
}

// Process products import (type 1)
async function processProducts(workbook: XLSX.WorkBook): Promise<{ rowsImported: number }> {
  try {
    // Get the first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON
    const rows = XLSX.utils.sheet_to_json(worksheet) as ProductRow[];
    
    // Clear existing products
    await executeQuery('DELETE FROM cr_rep_products', {});
    
    // Insert new products
    let insertedCount = 0;
    
    for (const row of rows) {
      if (row.Product && row.Product !== 'Product') {
        const productIdResult = await executeQuery('SELECT dbo.getAutoId(\'cr_rep_products\', \'pr_id\') as id', {});
        const productId = productIdResult.recordset[0].id;
        
        await executeQuery(
          'INSERT INTO cr_rep_products (pr_id, pr_name, pr_group, pr_display) VALUES (@productId, @productName, @productGroup, @display)',
          {
            productId,
            productName: row.Product,
            productGroup: row.Group || 'z',
            display: 0
          }
        );
        
        insertedCount++;
      }
    }
    
    return { rowsImported: insertedCount };
  } catch (error) {
    logger.error("excel-import", `Product import error: ${error}`);
    throw new Error('Failed to import products');
  }
}

// Process companies import (type 2)
async function processCompanies(workbook: XLSX.WorkBook): Promise<{ rowsImported: number }> {
  try {
    // Get the first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON
    const rows = XLSX.utils.sheet_to_json(worksheet) as CompanyRow[];
    
    // Clear existing companies
    await executeQuery('DELETE FROM cr_rep_companies', {});
    
    // Insert new companies
    let insertedCount = 0;
    
    for (const row of rows) {
      if (row.Producer && row.Producer !== 'Producer') {
        const companyIdResult = await executeQuery('SELECT dbo.getAutoId(\'cr_rep_companies\', \'comp_id\') as id', {});
        const companyId = companyIdResult.recordset[0].id;
        
        let countryId = 0;
        if (row.Country) {
          const countryResult = await executeQuery(
            'SELECT cu_id FROM cr_countries WHERE cu_name = @countryName',
            { countryName: row.Country }
          );
          if (countryResult.recordset.length > 0) {
            countryId = countryResult.recordset[0].cu_id;
          }
        }
        
        await executeQuery(
          'INSERT INTO cr_rep_companies (comp_id, comp_name, comp_location, comp_country_id, comp_display) VALUES (@companyId, @companyName, @location, @countryId, @display)',
          {
            companyId,
            companyName: row.Producer,
            location: row.Location || '',
            countryId,
            display: 0
          }
        );
        
        insertedCount++;
      }
    }
    
    return { rowsImported: insertedCount };
  } catch (error) {
    logger.error("excel-import", `Company import error: ${error}`);
    throw new Error('Failed to import companies');
  }
}

// Process period data import (type 3)
async function processPeriodData(workbook: XLSX.WorkBook): Promise<{ rowsImported: number }> {
  try {
    // Get the first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON with header row
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    // Check if we have products and companies
    const productCountResult = await executeQuery('SELECT COUNT(*) as count FROM cr_rep_products', {});
    const companyCountResult = await executeQuery('SELECT COUNT(*) as count FROM cr_rep_companies', {});
    
    const productCount = productCountResult.recordset[0].count;
    const companyCount = companyCountResult.recordset[0].count;
    
    if (productCount === 0 || companyCount === 0) {
      throw new Error('Products and companies must be imported first');
    }
    
    // Clear existing period data
    await executeQuery('DELETE FROM cr_rep_period', {});
    
    // Process the data
    let productId = 0;
    let insertedCount = 0;
    let quarters: string[] = [];
    let years: string[] = [];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      if (row[0] === 'Product' && row[1]) {
        // Get product ID
        const productResult = await executeQuery(
          'SELECT pr_id FROM cr_rep_products WHERE pr_name = @productName',
          { productName: row[1] }
        );
        
        if (productResult.recordset.length > 0) {
          productId = productResult.recordset[0].pr_id;
        } else {
          productId = 0;
        }
      } 
      else if (row[0] === 'Producer') {
        // Extract quarters and years from header row
        for (let j = 3; j < row.length; j++) {
          const header = row[j] as string;
          if (header) {
            const quarter = header.substring(0, 2);
            let year = header.substring(3, 5);
            
            // Convert 2-digit year to 4-digit
            if (parseInt(year) <= 99 && parseInt(year) >= 97) {
              year = '19' + year;
            } else {
              year = '20' + year;
            }
            
            quarters[j - 3] = quarter;
            years[j - 3] = year;
          }
        }
      }
      else if (row[0] && row[0] !== 'Total' && productId !== 0) {
        // This is a data row
        const companyName = row[0];
        const companyLocation = row[2];
        
        // Look up company ID
        const companyResult = await executeQuery(
          'SELECT comp_id FROM cr_rep_companies WHERE comp_name = @companyName AND comp_location = @companyLocation',
          { companyName, companyLocation }
        );
        
        if (companyResult.recordset.length > 0) {
          const companyId = companyResult.recordset[0].comp_id;
          
          // Insert period data for each quarter/year
          for (let q = 0; q < years.length; q++) {
            const amount = row[q + 3] || 0;
            const periodIdResult = await executeQuery('SELECT dbo.getAutoId(\'cr_rep_period\', \'period_id\') as id', {});
            const periodId = periodIdResult.recordset[0].id;
            
            await executeQuery(
              'INSERT INTO cr_rep_period (period_id, period_year, period_quarter, pro_id, comp_id, period_amount) VALUES (@periodId, @year, @quarter, @productId, @companyId, @amount)',
              {
                periodId,
                year: years[q],
                quarter: quarters[q],
                productId,
                companyId,
                amount
              }
            );
            
            insertedCount++;
          }
        }
      }
    }
    
    return { rowsImported: insertedCount };
  } catch (error) {
    logger.error("excel-import", `Period data import error: ${error}`);
    throw new Error('Failed to import period data');
  }
}

// Process capacity data import (type 4 and 41)
async function processCapacityData(workbook: XLSX.WorkBook, extendedCapacity: boolean = false): Promise<{ rowsImported: number }> {
  try {
    // Get the first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON with header row
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    // Check if we have products and companies
    const productCountResult = await executeQuery('SELECT COUNT(*) as count FROM cr_rep_products', {});
    const companyCountResult = await executeQuery('SELECT COUNT(*) as count FROM cr_rep_companies', {});
    
    const productCount = productCountResult.recordset[0].count;
    const companyCount = companyCountResult.recordset[0].count;
    
    if (productCount === 0 || companyCount === 0) {
      throw new Error('Products and companies must be imported first');
    }
    
    // Clear existing capacity data
    const tablePrefix = extendedCapacity ? 'cr_rep2' : 'cr_rep';
    await executeQuery(`DELETE FROM ${tablePrefix}_capacity`, {});
    await executeQuery(`DELETE FROM ${tablePrefix}_comp_desc`, {});
    
    if (extendedCapacity) {
      await executeQuery('DELETE FROM cr_rep2_period', {});
    }
    
    // Process the data
    let productId = 0;
    let insertedCount = 0;
    let quarters: string[] = [];
    let years: string[] = [];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      if (row[0] === 'Product' && row[1]) {
        // Get product ID
        const productResult = await executeQuery(
          'SELECT pr_id FROM cr_rep_products WHERE pr_name = @productName',
          { productName: row[1] }
        );
        
        if (productResult.recordset.length > 0) {
          productId = productResult.recordset[0].pr_id;
        } else {
          productId = 0;
        }
      } 
      else if (row[0] === 'Producer') {
        // Extract quarters and years from header row
        for (let j = 6; j < row.length; j++) {
          const header = row[j] as string;
          if (header) {
            const quarter = header.substring(0, 2);
            let year = header.substring(3, 5);
            
            // Convert 2-digit year to 4-digit
            if (parseInt(year) <= 99 && parseInt(year) >= 97) {
              year = '19' + year;
            } else {
              year = '20' + year;
            }
            
            quarters[j - 6] = quarter;
            years[j - 6] = year;
          }
        }
      }
      else if (row[0] && row[0] !== 'Total' && productId !== 0) {
        // This is a data row
        const companyName = row[0];
        const companyLocation = row[1];
        
        // Look up company ID
        const companyResult = await executeQuery(
          'SELECT comp_id FROM cr_rep_companies WHERE comp_name = @companyName AND comp_location = @companyLocation',
          { companyName, companyLocation }
        );
        
        if (companyResult.recordset.length > 0) {
          const companyId = companyResult.recordset[0].comp_id;
          
          // Insert company description
          const compDescIdResult = await executeQuery(`SELECT dbo.getAutoId('${tablePrefix}_comp_desc', 'compturn_id') as id`, {});
          const compDescId = compDescIdResult.recordset[0].id;
          
          await executeQuery(
            `INSERT INTO ${tablePrefix}_comp_desc (compturn_id, comp_id, pr_id, start_date, comp_tech, comp_feed_stock) VALUES (@compDescId, @companyId, @productId, @startDate, @compTech, @feedStock)`,
            {
              compDescId,
              companyId,
              productId,
              startDate: row[3] || '',
              compTech: row[4] || '',
              feedStock: row[5] || ''
            }
          );
          
          // Insert capacity data for each quarter/year
          for (let q = 0; q < years.length; q++) {
            const amount = row[q + 6] || 0;
            const capIdResult = await executeQuery(`SELECT dbo.getAutoId('${tablePrefix}_capacity', 'cap_id') as id`, {});
            const capId = capIdResult.recordset[0].id;
            
            await executeQuery(
              `INSERT INTO ${tablePrefix}_capacity (cap_id, cap_year, cap_quarter, cap_pr_id, cap_comp_id, cap_amount) VALUES (@capId, @year, @quarter, @productId, @companyId, @amount)`,
              {
                capId,
                year: years[q],
                quarter: quarters[q],
                productId,
                companyId,
                amount
              }
            );
            
            // For extended capacity, also insert into period table
            if (extendedCapacity) {
              await executeQuery(
                'INSERT INTO cr_rep2_period (period_id, period_year, period_quarter, pro_id, comp_id, period_amount) VALUES (@periodId, @year, @quarter, @productId, @companyId, @amount)',
                {
                  periodId: capId,
                  year: years[q],
                  quarter: quarters[q],
                  productId,
                  companyId,
                  amount
                }
              );
            }
            
            insertedCount++;
          }
        }
      }
    }
    
    return { rowsImported: insertedCount };
  } catch (error) {
    logger.error("excel-import", `Capacity data import error: ${error}`);
    throw new Error('Failed to import capacity data');
  }
}

// Process finance data import (types 5, 6, 7)
async function processFinanceData(workbook: XLSX.WorkBook, financeType: string): Promise<{ rowsImported: number }> {
  try {
    // Get the first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON with header row
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    // Check if we have companies
    const companyCountResult = await executeQuery('SELECT COUNT(*) as count FROM cr_rep_companies', {});
    const companyCount = companyCountResult.recordset[0].count;
    
    if (companyCount === 0) {
      throw new Error('Companies must be imported first');
    }
    
    // Determine which table to use based on finance type
    let tableName = '';
    let idField = '';
    let amountField = '';
    let yearField = '';
    let quarterField = '';
    
    switch (financeType) {
      case '5':
        tableName = 'cr_rep_gross_finance';
        idField = 'gf_id';
        amountField = 'gf_amount';
        yearField = 'gf_year';
        quarterField = 'gf_quarter';
        break;
      case '6':
        tableName = 'cr_rep_net_finance';
        idField = 'nf_id';
        amountField = 'nf_amount';
        yearField = 'nf_year';
        quarterField = 'nf_quarter';
        break;
      case '7':
        tableName = 'cr_rep_turnover_finance';
        idField = 'tf_id';
        amountField = 'tf_amount';
        yearField = 'tf_year';
        quarterField = 'tf_quarter';
        break;
      default:
        throw new Error('Invalid finance type');
    }
    
    // Clear existing finance data
    await executeQuery(`DELETE FROM ${tableName}`, {});
    
    // Process the data
    let insertedCount = 0;
    let quarters: string[] = [];
    let years: string[] = [];
    let status = false;
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      if (!status) {
        // Extract quarters and years from header row
        for (let j = 2; j < row.length; j++) {
          const header = row[j] as string;
          if (header) {
            const quarter = header.substring(0, 2);
            let year = header.substring(3, 5);
            
            // Convert 2-digit year to 4-digit
            if (parseInt(year) <= 99 && parseInt(year) >= 97) {
              year = '19' + year;
            } else {
              year = '20' + year;
            }
            
            quarters[j - 2] = quarter;
            years[j - 2] = year;
          }
        }
        status = true;
      }
      else if (row[0] && row[0] !== ' ' && row[0] !== 'Total') {
        // This is a data row
        const companyName = row[0];
        const companyLocation = row[1];
        
        // Look up company ID
        const companyResult = await executeQuery(
          'SELECT comp_id FROM cr_rep_companies WHERE comp_name = @companyName AND comp_location = @companyLocation',
          { companyName, companyLocation }
        );
        
        if (companyResult.recordset.length > 0) {
          const companyId = companyResult.recordset[0].comp_id;
          
          // Insert finance data for each quarter/year
          for (let q = 0; q < years.length; q++) {
            let amount = row[q + 2] || 0;
            
            // Validate amount is a number
            try {
              amount = parseFloat(amount.toString());
            } catch {
              amount = 0;
            }
            
            const recordIdResult = await executeQuery(`SELECT dbo.getAutoId('${tableName}', '${idField}') as id`, {});
            const recordId = recordIdResult.recordset[0].id;
            
            await executeQuery(
              `INSERT INTO ${tableName} (${idField}, ${yearField}, ${quarterField}, comp_id, ${amountField}) VALUES (@recordId, @year, @quarter, @companyId, @amount)`,
              {
                recordId,
                year: years[q],
                quarter: quarters[q],
                companyId,
                amount
              }
            );
            
            insertedCount++;
          }
        }
      }
    }
    
    return { rowsImported: insertedCount };
  } catch (error) {
    logger.error("excel-import", `Finance data import error: ${error}`);
    throw new Error('Failed to import finance data');
  }
}

// Process Polish chemical data import (type 8)
async function processPolishChemicalData(workbook: XLSX.WorkBook): Promise<{ rowsImported: number }> {
  try {
    // Get the first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON with header row
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    // Check if we have products
    const productCountResult = await executeQuery('SELECT COUNT(*) as count FROM cr_rep_products', {});
    const productCount = productCountResult.recordset[0].count;
    
    if (productCount === 0) {
      throw new Error('Products must be imported first');
    }
    
    // Clear existing data
    await executeQuery('DELETE FROM cr_rep_polishchemical', {});
    
    // Process the data
    let productId = 0;
    let insertedCount = 0;
    let quarters: string[] = [];
    let years: string[] = [];
    let status = false;
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      if (row[0] === 'Product') {
        if (status === false) {
          // Extract quarters and years from header row
          for (let k = 2; k < row.length; k++) {
            const header = row[k] as string;
            if (header) {
              const quarter = header.substring(0, 2);
              let year = header.substring(3, 2);
              
              // Convert 2-digit year to 4-digit
              if (parseInt(year) <= 99 && parseInt(year) >= 97) {
                year = '19' + year;
              } else {
                year = '20' + year;
              }
              
              quarters[k - 2] = quarter;
              years[k - 2] = year;
            }
          }
          status = true;
        }
      }
      else if (row[0] && row[0] !== 'Total' && row[0] !== '') {
        // Get product ID
        const productResult = await executeQuery(
          'SELECT pr_id FROM cr_rep_products WHERE pr_name = @productName',
          { productName: row[0].trim() }
        );
        
        if (productResult.recordset.length > 0) {
          productId = productResult.recordset[0].pr_id;
          
          // Insert data for each quarter/year
          for (let q = 0; q < years.length; q++) {
            let amount = row[q + 2] || 0;
            
            // Validate amount is a number
            try {
              amount = parseFloat(amount.toString());
            } catch {
              amount = 0;
            }
            
            const pcIdResult = await executeQuery('SELECT dbo.getAutoId(\'cr_rep_polishchemical\', \'pc_id\') as id', {});
            const pcId = pcIdResult.recordset[0].id;
            
            await executeQuery(
              'INSERT INTO cr_rep_polishchemical (pc_id, pc_year, pc_quarter, pro_id, pc_amount) VALUES (@pcId, @year, @quarter, @productId, @amount)',
              {
                pcId,
                year: years[q],
                quarter: quarters[q],
                productId,
                amount
              }
            );
            
            insertedCount++;
          }
        }
      }
    }
    
    return { rowsImported: insertedCount };
  } catch (error) {
    logger.error("excel-import", `Polish chemical data import error: ${error}`);
    throw new Error('Failed to import Polish chemical data');
  }
}

// Main handler function to process Excel imports
async function processExcelImport(buffer: Buffer, importType: string): Promise<{ success: boolean; rowsImported: number; message: string }> {
  try {
    const workbook = await readExcelFile(buffer);
    let result;
    
    switch (importType) {
      case '1':
        result = await processProducts(workbook);
        break;
      case '2':
        result = await processCompanies(workbook);
        break;
      case '3':
        result = await processPeriodData(workbook);
        break;
      case '4':
        result = await processCapacityData(workbook, false);
        break;
      case '41':
        result = await processCapacityData(workbook, true);
        break;
      case '5':
      case '6':
      case '7':
        result = await processFinanceData(workbook, importType);
        break;
      case '8':
        result = await processPolishChemicalData(workbook);
        break;
      // Add other import types as needed
      default:
        throw new Error('Invalid import type');
    }
    
    return {
      success: true,
      rowsImported: result.rowsImported,
      message: `Successfully imported ${result.rowsImported} records`
    };
  } catch (error) {
    logger.error("excel-import", `Import error: ${error}`);
    throw error;
  }
}

// Helper function to convert stream to buffer
async function streamToBuffer(stream: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    
    stream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    
    stream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    
    stream.on('error', (err: Error) => {
      reject(err);
    });
  });
}

export const excelImportOptions: RouteOptions = {
  description: "Import Excel Data",
  tags: ["api", "Admin"],
  payload: {
    output: 'stream',
    parse: true,
    multipart: true,
    maxBytes: 20 * 1024 * 1024, // 20MB limit
  },
  validate: {
    payload: Joi.object({
      file: Joi.any().required(),
      importType: Joi.string().required().valid('1', '2', '3', '4', '41', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14')
    })
  },
  handler: async (request, h) => {
    try {
      const payload = request.payload as ExcelImportPayload;
      const file = payload.file;
      const importType = payload.importType;
      
      // Convert the file stream to a buffer
      const buffer = await streamToBuffer(file);
      
      // Process the Excel file
      const result = await processExcelImport(buffer, importType);
      
      return h.response(result).code(200);
    } catch (error) {
      logger.error("excel-import", `Import failed: ${error}`);
      return h.response({
        success: false,
        message: error instanceof Error ? error.message : "Import failed"
      }).code(500);
    }
  }
};