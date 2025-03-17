import { executeQuery } from "../../../../common/db";
import { logger } from "../../../../common/logger";
import { Request, ResponseToolkit, ServerRoute } from "@hapi/hapi";

// Get All Events Handler
export async function getEventsHandler(request: Request, h: ResponseToolkit) {
  try {
    const result = await executeQuery("SELECT * FROM cr_events", {});
    
    return h.response({
      success: true,
      data: result.recordset
    }).code(200);
  } catch (error) {
    logger.error("admin-events", `Failed to fetch events: ${error}`);
    return h.response({
      success: false,
      message: "Failed to fetch events"
    }).code(500);
  }
}

// Update Event Display Status Handler
export async function updateEventDisplayHandler(request: Request, h: ResponseToolkit) {
  try {
    const { evId, display } = request.payload as { evId: string; display: string };
    
    // Update event display status
    await executeQuery(
      "UPDATE cr_events SET ev_display = @display WHERE ev_id = @evId",
      {
        display,
        evId
      }
    );
    
    return h.response({
      success: true,
      message: "Event display status updated successfully"
    }).code(200);
  } catch (error) {
    logger.error("admin-events", `Failed to update event display status: ${error}`);
    return h.response({
      success: false,
      message: "Failed to update event display status"
    }).code(500);
  }
}

// Delete Event Handler
export async function deleteEventHandler(request: Request, h: ResponseToolkit) {
  try {
    const evId = request.params.evId as string;
    
    // Delete the event
    await executeQuery(
      "DELETE FROM cr_events WHERE ev_id = @evId",
      { evId }
    );
    
    return h.response({
      success: true,
      message: "Event deleted successfully"
    }).code(200);
  } catch (error) {
    logger.error("admin-events", `Failed to delete event: ${error}`);
    return h.response({
      success: false,
      message: "Failed to delete event"
    }).code(500);
  }
}

// Add Event Redirect Handler
export async function addEventRedirectHandler(request: Request, h: ResponseToolkit) {
  // This is just an API indication of the route that would redirect in UI
  return h.response({
    success: true,
    message: "Navigate to add event form",
    redirect: "/admin/addevent"
  }).code(200);
}

// Edit Event Redirect Handler
export async function editEventRedirectHandler(request: Request, h: ResponseToolkit) {
  const evId = request.params.evId as string;
  
  // This is just an API indication of the route that would redirect in UI
  return h.response({
    success: true,
    message: "Navigate to edit event form",
    redirect: `/admin/editevent/${evId}`
  }).code(200);
}