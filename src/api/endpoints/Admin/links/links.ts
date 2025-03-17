import { executeQuery } from "../../../../common/db";
import { logger } from "../../../../common/logger";
import { Request, ResponseToolkit, ServerRoute } from "@hapi/hapi";
import Joi from "joi";
import jwt from "jsonwebtoken";


const JWT_SECRET = "cirec.net.andrew.sparshot";


// Get All Links Handler
export async function getLinksHandler(request: Request, h: ResponseToolkit) {
  try {
    const result = await executeQuery("SELECT * FROM cr_links", {});
    
    return h.response({
      success: true,
      data: result.recordset
    }).code(200);
  } catch (error) {
    logger.error("admin-links", `Failed to fetch links: ${error}`);
    return h.response({
      success: false,
      message: "Failed to fetch links"
    }).code(500);
  }
}

// Update Link Display Status Handler
export async function updateLinkDisplayHandler(request: Request, h: ResponseToolkit) {
  try {
    const { lkId, display } = request.payload as { lkId: string; display: string };
    
    // Update link display status
    await executeQuery(
      "UPDATE cr_links SET lk_display = @display WHERE lk_id = @lkId",
      {
        display,
        lkId
      }
    );
    
    return h.response({
      success: true,
      message: "Link display status updated successfully"
    }).code(200);
  } catch (error) {
    logger.error("admin-links", `Failed to update link display status: ${error}`);
    return h.response({
      success: false,
      message: "Failed to update link display status"
    }).code(500);
  }
}

// Delete Link Handler
export async function deleteLinkHandler(request: Request, h: ResponseToolkit) {
  try {
    const lkId = request.params.lkId as string;
    
    // Delete the link
    await executeQuery(
      "DELETE FROM cr_links WHERE lk_id = @lkId",
      { lkId }
    );
    
    return h.response({
      success: true,
      message: "Link deleted successfully"
    }).code(200);
  } catch (error) {
    logger.error("admin-links", `Failed to delete link: ${error}`);
    return h.response({
      success: false,
      message: "Failed to delete link"
    }).code(500);
  }
}

// Add Link Redirect Handler
export async function addLinkRedirectHandler(request: Request, h: ResponseToolkit) {
  // This is just an API indication of the route that would redirect in UI
  return h.response({
    success: true,
    message: "Navigate to add link form",
    redirect: "/admin/addlink"
  }).code(200);
}

// Edit Link Redirect Handler
export async function editLinkRedirectHandler(request: Request, h: ResponseToolkit) {
  const lkId = request.params.lkId as string;
  
  // This is just an API indication of the route that would redirect in UI
  return h.response({
    success: true,
    message: "Navigate to edit link form",
    redirect: `/admin/editlink/${lkId}`
  }).code(200);
}
