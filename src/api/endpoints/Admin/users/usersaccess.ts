import { Request, ResponseToolkit } from "@hapi/hapi";
import { executeQuery } from "../../../../common/db";
import { logger } from "../../../../common/logger";

interface UserAccessRequest {
  username: string;
  mnewsAccess: boolean;
  mnewsDuration: number; // in years
  additionalCopiesAccess: boolean;
  additionalCopiesCount: number;
  additionalCopiesEmails: string[];
  seaAccess: boolean;
  seaDuration: number; // 3, 6, 12, or 24 months
  sdaAccess: boolean;
  sdaDuration: number; // in years
  otherReportsAccess: boolean;
  centralEuropeanReport: boolean;
  polishChemicalReport: boolean;
  removeMnews: boolean;
  removeAdditionalCopies: boolean;
  removeSea: boolean;
  removeSda: boolean;
  removeOtherReports: boolean;
}

/**
 * Get user access information
 */
export async function getUserAccessInfoHandler(request: Request, h: ResponseToolkit) {
  try {
    const userId = request.params.userId as string;
    
    // Get user info
    const userResult = await executeQuery(
      "SELECT us_username, us_type FROM cr_user WHERE us_id = @userId",
      { userId }
    );
    
    if (userResult.recordset.length === 0) {
      return h.response({
        success: false,
        message: "User not found"
      }).code(404);
    }
    
    const username = userResult.recordset[0].us_username;
    const userType = userResult.recordset[0].us_type;
    
    // Get monthly news access
    const mnewsResult = await executeQuery(
      "SELECT COUNT(*) as count, MAX(um_end_date) as end_date FROM cr_user_mnews WHERE um_us_username = @username AND um_end_date >= GETDATE()",
      { username }
    );
    
    // Get additional copies access
    const mneResult = await executeQuery(
      "SELECT COUNT(*) as count, MAX(umne_copies) as copies FROM cr_user_mne WHERE umne_us_username = @username",
      { username }
    );
    
    // Get additional copies emails
    const mneEmailsResult = await executeQuery(
      "SELECT umne_email FROM cr_user_mne WHERE umne_us_username = @username",
      { username }
    );
    
    // Get search engine access
    const seaResult = await executeQuery(
      "SELECT COUNT(*) as count, MAX(usea_end_date) as end_date FROM cr_user_sea WHERE usea_us_username = @username AND usea_end_date >= GETDATE()",
      { username }
    );
    
    // Get statistical database access
    const sdaResult = await executeQuery(
      "SELECT COUNT(*) as count, MAX(usda_end_date) as end_date FROM cr_user_sda WHERE usda_us_username = @username AND usda_end_date >= GETDATE()",
      { username }
    );
    
    // Get other reports access
    const centralEuropeanResult = await executeQuery(
      "SELECT COUNT(*) as count FROM cr_user_sda WHERE usda_us_username = @username AND usda_central_european = 'Y'",
      { username }
    );
    
    const polishChemicalResult = await executeQuery(
      "SELECT COUNT(*) as count FROM cr_user_sda WHERE usda_us_username = @username AND usda_polish_chemical = 'Y'",
      { username }
    );
    
    // Format user type
    let userTypeLabel = "";
    if (userType === null || userType === "" || userType === "N") {
      userTypeLabel = "Normal";
    } else if (userType === "C") {
      userTypeLabel = "Corporate";
    } else if (userType === "S") {
      userTypeLabel = "Single";
    }
    
    // Extract additional copies emails
    const additionalEmails = mneEmailsResult.recordset.map(record => record.umne_email);
    
    return h.response({
      success: true,
      data: {
        userId,
        username,
        userType: userTypeLabel,
        access: {
          monthlyNews: {
            hasAccess: mnewsResult.recordset[0].count > 0,
            endDate: mnewsResult.recordset[0].end_date
          },
          additionalCopies: {
            hasAccess: mneResult.recordset[0].count > 0,
            copies: mneResult.recordset[0].copies || 0,
            emails: additionalEmails
          },
          searchEngineAccess: {
            hasAccess: seaResult.recordset[0].count > 0,
            endDate: seaResult.recordset[0].end_date
          },
          statisticalDatabaseAccess: {
            hasAccess: sdaResult.recordset[0].count > 0,
            endDate: sdaResult.recordset[0].end_date
          },
          otherReports: {
            centralEuropeanOlefins: centralEuropeanResult.recordset[0].count > 0,
            polishChemicalProduction: polishChemicalResult.recordset[0].count > 0
          }
        }
      }
    }).code(200);
  } catch (error) {
    logger.error("admin-user-access", `Failed to get user access info: ${error}`);
    return h.response({
      success: false,
      message: "Failed to get user access info"
    }).code(500);
  }
}

/**
 * Update user access information
 */
export async function updateUserAccessHandler(request: Request, h: ResponseToolkit) {
  try {
    const userId = request.params.userId as string;
    const payload = request.payload as UserAccessRequest;
    
    // Verify user exists
    const userResult = await executeQuery(
      "SELECT us_username FROM cr_user WHERE us_id = @userId",
      { userId }
    );
    
    if (userResult.recordset.length === 0) {
      return h.response({
        success: false,
        message: "User not found"
      }).code(404);
    }
    
    const username = userResult.recordset[0].us_username;
    
    // Begin transaction
    await executeQuery("BEGIN TRANSACTION");
    
    try {
      // Handle Monthly News access
      if (payload.removeMnews) {
        await executeQuery(
          "DELETE FROM cr_user_mnews WHERE um_us_username = @username",
          { username }
        );
      } else if (payload.mnewsAccess) {
        // Calculate end date based on duration (in years)
        const endDateQuery = `
          INSERT INTO cr_user_mnews (um_us_username, um_start_date, um_end_date)
          VALUES (@username, GETDATE(), DATEADD(year, @duration, GETDATE()))
        `;
        
        await executeQuery(endDateQuery, { 
          username, 
          duration: payload.mnewsDuration 
        });
      }
      
      // Handle Additional Copies access
      if (payload.removeAdditionalCopies) {
        await executeQuery(
          "DELETE FROM cr_user_mne WHERE umne_us_username = @username",
          { username }
        );
      } else if (payload.additionalCopiesAccess && payload.additionalCopiesEmails.length > 0) {
        // First remove existing entries
        await executeQuery(
          "DELETE FROM cr_user_mne WHERE umne_us_username = @username",
          { username }
        );
        
        // Add new entries for each email
        for (const email of payload.additionalCopiesEmails) {
          await executeQuery(
            "INSERT INTO cr_user_mne (umne_us_username, umne_email, umne_copies) VALUES (@username, @email, @copies)",
            { 
              username, 
              email,
              copies: payload.additionalCopiesCount || 1
            }
          );
        }
      }
      
      // Handle Search Engine Access
      if (payload.removeSea) {
        await executeQuery(
          "DELETE FROM cr_user_sea WHERE usea_us_username = @username",
          { username }
        );
      } else if (payload.seaAccess) {
        // Calculate end date based on duration (in months)
        const seaDurationMap: Record<number, number> = {
            1: 3,
            2: 6,
            3: 12,
            4: 24
          };
          
        
        const duration = seaDurationMap[payload.seaDuration] || 3;
        
        const endDateQuery = `
          INSERT INTO cr_user_sea (usea_us_username, usea_start_date, usea_end_date)
          VALUES (@username, GETDATE(), DATEADD(month, @duration, GETDATE()))
        `;
        
        await executeQuery(endDateQuery, { 
          username, 
          duration 
        });
      }
      
      // Handle Statistical Database Access
      if (payload.removeSda) {
        await executeQuery(
          "DELETE FROM cr_user_sda WHERE usda_us_username = @username",
          { username }
        );
      } else if (payload.sdaAccess) {
        // Calculate end date based on duration (in years)
        const endDateQuery = `
          INSERT INTO cr_user_sda (
            usda_us_username, 
            usda_start_date, 
            usda_end_date, 
            usda_central_european, 
            usda_polish_chemical
          )
          VALUES (
            @username, 
            GETDATE(), 
            DATEADD(year, @duration, GETDATE()), 
            @centralEuropean,
            @polishChemical
          )
        `;
        
        await executeQuery(endDateQuery, { 
          username, 
          duration: payload.sdaDuration,
          centralEuropean: payload.centralEuropeanReport ? 'Y' : 'N',
          polishChemical: payload.polishChemicalReport ? 'Y' : 'N'
        });
      }
      
      // Commit transaction
      await executeQuery("COMMIT TRANSACTION");
      
      return h.response({
        success: true,
        message: "User access updated successfully"
      }).code(200);
      
    } catch (error) {
      // Rollback transaction on error
      await executeQuery("ROLLBACK TRANSACTION");
      throw error;
    }
  } catch (error) {
    logger.error("admin-user-access", `Failed to update user access: ${error}`);
    return h.response({
      success: false,
      message: "Failed to update user access"
    }).code(500);
  }
}