import { ServerRoute, Request, ResponseToolkit } from "@hapi/hapi";
import { executeQuery } from "../../../../common/db";
import { logger } from "../../../../common/logger";

// Types
interface Event {
  ev_id: number;
  ev_title: string;
  ev_link: string;
  ev_venue: string;
  ev_display: number | boolean;
}

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
    
    // Fetch updated events
    const result = await executeQuery("SELECT * FROM cr_events", {});
    
    return h.response({
      success: true,
      message: "Event display status updated successfully",
      data: result.recordset
    }).code(200);
  } catch (error) {
    logger.error("admin-events", `Failed to update event display status: ${error}`);
    return h.response({
      success: false,
      message: "Failed to update event display status"
    }).code(500);
  }
}

// Get Single Event Handler (for editing)
export async function getEventByIdHandler(request: Request, h: ResponseToolkit) {
  try {
    const evId = request.params.evId as string;
    
    const result = await executeQuery(
      "SELECT ev_id, ev_venue, ev_title, ev_link, ev_display FROM cr_events WHERE ev_id = @evId",
      { evId }
    );
    
    if (result.recordset.length === 0) {
      return h.response({
        success: false,
        message: "Event not found"
      }).code(404);
    }
    
    return h.response({
      success: true,
      data: result.recordset[0]
    }).code(200);
  } catch (error) {
    logger.error("admin-events", `Failed to fetch event: ${error}`);
    return h.response({
      success: false,
      message: "Failed to fetch event"
    }).code(500);
  }
}

// Update Event Handler
export async function updateEventHandler(request: Request, h: ResponseToolkit) {
  try {
    const evId = request.params.evId as string;
    const { ev_venue, ev_title, ev_link, ev_display } = request.payload as Event;
    
    // Convert boolean to integer if needed
    const displayValue = typeof ev_display === 'boolean' ? (ev_display ? 1 : 0) : ev_display;
    
    await executeQuery(
      "UPDATE cr_events SET ev_venue = @venue, ev_title = @title, ev_link = @link, ev_display = @display WHERE ev_id = @evId",
      {
        venue: ev_venue,
        title: ev_title,
        link: ev_link,
        display: displayValue,
        evId
      }
    );
    
    return h.response({
      success: true,
      message: "Event updated successfully"
    }).code(200);
  } catch (error) {
    logger.error("admin-events", `Failed to update event: ${error}`);
    return h.response({
      success: false,
      message: "Failed to update event"
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
    
    // Fetch updated events list
    const result = await executeQuery("SELECT * FROM cr_events", {});
    
    return h.response({
      success: true,
      message: "Event deleted successfully",
      data: result.recordset
    }).code(200);
  } catch (error) {
    logger.error("admin-events", `Failed to delete event: ${error}`);
    return h.response({
      success: false,
      message: "Failed to delete event"
    }).code(500);
  }
}

// Add Event Handler
export async function addEventHandler(request: Request, h: ResponseToolkit) {
  try {
    const { ev_title, ev_link, ev_venue, ev_display } = request.payload as Event;
    
    // Get the maximum ID and increment it
    const maxIdResult = await executeQuery(
      "SELECT MAX(ev_id) as maxId FROM cr_events",
      {}
    );
    
    const maxId = (maxIdResult.recordset[0].maxId || 0) + 1;
    
    // Convert boolean to integer if needed
    const displayValue = typeof ev_display === 'boolean' ? (ev_display ? 1 : 0) : ev_display;
    
    // Insert the new event
    await executeQuery(
      "INSERT INTO cr_events (ev_id, ev_title, ev_link, ev_venue, ev_display) VALUES (@evId, @title, @link, @venue, @display)",
      {
        evId: maxId,
        title: ev_title,
        link: ev_link,
        venue: ev_venue,
        display: displayValue
      }
    );
    
    return h.response({
      success: true,
      message: "Event added successfully",
      evId: maxId
    }).code(201);
  } catch (error) {
    logger.error("admin-events", `Failed to add event: ${error}`);
    return h.response({
      success: false,
      message: "Failed to add event"
    }).code(500);
  }
}

