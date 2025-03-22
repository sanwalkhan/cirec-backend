import { executeQuery } from "../../../../common/db";
import { logger } from "../../../../common/logger";
import { Request, ResponseToolkit } from "@hapi/hapi";


interface User {
  id: string;
  title: string;
  firstName: string;
  lastName: string;
  company: string;
  department: string;
  address1: string;
  address2: string;
  countryId: string;
  phone: string;
  sectorInterest: string;
  email: string;
  username: string;
  password: string;
  type: string;
  status: boolean;
  paymentAmount: number;
  date: string;
  fullName: string;
  paid: boolean;
  isNew: boolean;
}

/**
 * Get all users
 */
export async function getAllUsersHandler(request: Request, h: ResponseToolkit) {
  try {
    const query = `
      SELECT 
        us_id as id, 
        us_title as title, 
        us_fname as firstName, 
        us_lname as lastName, 
        us_comp as company, 
        us_dept as department, 
        us_add1 as address1, 
        us_add2 as address2, 
        us_cu_id as countryId, 
        us_phone as phone, 
        us_sec_interest as sectorInterest, 
        us_email as email, 
        us_username as username, 
        us_pass as password,
        us_type as type,
        us_status as status, 
        ISNULL(us_pay, 0) as paymentAmount, 
        us_date as date,
        [us_title] + ' ' + [us_fname] + ' ' + [us_lname] as fullName,
        us_paid as paid,
        CASE WHEN us_status='False' THEN 'New' ELSE '' END as isNew 
      FROM cr_user 
      ORDER BY us_date DESC, us_fname
    `;
    
    const result = await executeQuery(query);
    
    // Transform the recordset to match the interface
    const users = result.recordset.map((record: any) => ({
      id: record.id,
      title: record.title,
      firstName: record.firstName,
      lastName: record.lastName,
      company: record.company,
      department: record.department,
      address1: record.address1,
      address2: record.address2,
      countryId: record.countryId,
      phone: record.phone,
      sectorInterest: record.sectorInterest,
      email: record.email,
      username: record.username,
      password: record.password,
      type: record.type,
      // Convert string values to boolean
      status: record.status === 'True' || record.status === '1' || record.status === 1 || record.status === true,
      paymentAmount: parseFloat(record.paymentAmount),
      date: record.date,
      fullName: record.fullName,
      // Convert string values to boolean
      paid: record.paid === 'True' || record.paid === '1' || record.paid === 1 || record.paid === true,
      // Handle isNew field
      isNew: record.isNew === 'New' || record.isNew === true
    }));
    
    // Log the transformed data for debugging
    // console.log("Transformed users data:", users);
    
    return h.response({
      success: true,
      data: users
    }).code(200);
  } catch (error) {
    logger.error("admin-users", `Failed to get users: ${error}`);
    return h.response({
      success: false,
      message: "Failed to get users"
    }).code(500);
  }
}

/**
 * Get a single user by ID
 */
export async function getUserByIdHandler(request: Request, h: ResponseToolkit) {
  try {
    const userId = request.params.userId as string;
    
    const query = `
      SELECT 
        us_id as id, 
        us_title as title, 
        us_fname as firstName, 
        us_lname as lastName, 
        us_comp as company, 
        us_dept as department, 
        us_add1 as address1, 
        us_add2 as address2, 
        us_cu_id as countryId, 
        us_phone as phone, 
        us_sec_interest as sectorInterest, 
        us_email as email, 
        us_username as username, 
        us_pass as password,
        us_type as type,
        us_status as status, 
        ISNULL(us_pay, 0) as paymentAmount, 
        us_date as date,
        [us_title] + ' ' + [us_fname] + ' ' + [us_lname] as fullName,
        us_paid as paid
      FROM cr_user 
      WHERE us_id = @userId
    `;
    
    const result = await executeQuery(query, { userId });
    
    if (result.recordset.length === 0) {
      return h.response({
        success: false,
        message: "User not found"
      }).code(404);
    }
    
    const user = {
      id: result.recordset[0].id,
      title: result.recordset[0].title,
      firstName: result.recordset[0].firstName,
      lastName: result.recordset[0].lastName,
      company: result.recordset[0].company,
      department: result.recordset[0].department,
      address1: result.recordset[0].address1,
      address2: result.recordset[0].address2,
      countryId: result.recordset[0].countryId,
      phone: result.recordset[0].phone,
      sectorInterest: result.recordset[0].sectorInterest,
      email: result.recordset[0].email,
      username: result.recordset[0].username,
      password: result.recordset[0].password,
      type: result.recordset[0].type,
      status: result.recordset[0].status === 'True' || result.recordset[0].status === '1' || 
              result.recordset[0].status === 1 || result.recordset[0].status === true,
      paymentAmount: parseFloat(result.recordset[0].paymentAmount),
      date: result.recordset[0].date,
      fullName: result.recordset[0].fullName,
      paid: result.recordset[0].paid === 'True' || result.recordset[0].paid === '1' || 
            result.recordset[0].paid === 1 || result.recordset[0].paid === true,
    };
    
    return h.response({
      success: true,
      data: user
    }).code(200);
  } catch (error) {
    logger.error("admin-users", `Failed to get user: ${error}`);
    return h.response({
      success: false,
      message: "Failed to get user"
    }).code(500);
  }
}

/**
 * Create a new user
 */
export async function createUserHandler(request: Request, h: ResponseToolkit) {
  try {
    const user = request.payload as User;
    
    // Check if username already exists
    const checkQuery = `
      SELECT COUNT(*) as count FROM cr_user WHERE us_username = @username
    `;
    
    const checkResult = await executeQuery(checkQuery, { username: user.username });
    
    if (checkResult.recordset[0].count > 0) {
      return h.response({
        success: false,
        message: "Username already exists"
      }).code(409);
    }
    
    const insertQuery = `
      INSERT INTO cr_user (
        us_title, us_fname, us_lname, us_comp, us_dept, 
        us_add1, us_add2, us_cu_id, us_phone, us_sec_interest, 
        us_email, us_username, us_pass, us_type, us_status, 
        us_pay, us_date, us_paid
      ) VALUES (
        @title, @firstName, @lastName, @company, @department, 
        @address1, @address2, @countryId, @phone, @sectorInterest, 
        @email, @username, @password, @type, @status, 
        @paymentAmount, GETDATE(), @paid
      );
      SELECT SCOPE_IDENTITY() as id;
    `;
    
    // Convert boolean values to strings for database
    const status = user.status ? '1' : '0';
    const paid = user.paid ? '1' : '0';
    
    const insertResult = await executeQuery(insertQuery, {
      title: user.title,
      firstName: user.firstName,
      lastName: user.lastName,
      company: user.company,
      department: user.department,
      address1: user.address1 || '',
      address2: user.address2 || '',
      countryId: user.countryId || '',
      phone: user.phone,
      sectorInterest: user.sectorInterest || '',
      email: user.email,
      username: user.username,
      password: user.password,
      type: user.type || 'N',
      status: status,
      paymentAmount: user.paymentAmount || 0,
      paid: paid
    });
    
    const newUserId = insertResult.recordset[0].id;
    
    return h.response({
      success: true,
      message: "User created successfully",
      data: {
        id: newUserId
      }
    }).code(201);
  } catch (error) {
    logger.error("admin-users", `Failed to create user: ${error}`);
    return h.response({
      success: false,
      message: "Failed to create user"
    }).code(500);
  }
}

/**
 * Update an existing user
 */
export async function updateUserHandler(request: Request, h: ResponseToolkit) {
  try {
    const userId = request.params.userId as string;
    const user = request.payload as User;
    
    // Check if user exists
    const checkQuery = `
      SELECT COUNT(*) as count FROM cr_user WHERE us_id = @userId
    `;
    
    const checkResult = await executeQuery(checkQuery, { userId });
    
    if (checkResult.recordset[0].count === 0) {
      return h.response({
        success: false,
        message: "User not found"
      }).code(404);
    }
    
    // Convert boolean values to strings for database
    const status = user.status ? '1' : '0';
    const paid = user.paid ? '1' : '0';
    
    // Update user
    const updateQuery = `
      UPDATE cr_user SET
        us_title = @title,
        us_fname = @firstName,
        us_lname = @lastName,
        us_comp = @company,
        us_dept = @department,
        us_add1 = @address1,
        us_add2 = @address2,
        us_cu_id = @countryId,
        us_phone = @phone,
        us_sec_interest = @sectorInterest,
        us_email = @email,
        us_username = @username,
        us_pass = @password,
        us_type = @type,
        us_status = @status,
        us_pay = @paymentAmount,
        us_paid = @paid
      WHERE us_id = @userId
    `;
    
    await executeQuery(updateQuery, {
      userId,
      title: user.title,
      firstName: user.firstName,
      lastName: user.lastName,
      company: user.company,
      department: user.department,
      address1: user.address1 || '',
      address2: user.address2 || '',
      countryId: user.countryId || '',
      phone: user.phone,
      sectorInterest: user.sectorInterest || '',
      email: user.email,
      username: user.username,
      password: user.password,
      type: user.type || 'N',
      status: status,
      paymentAmount: user.paymentAmount || 0,
      paid: paid
    });
    
    return h.response({
      success: true,
      message: "User updated successfully"
    }).code(200);
  } catch (error) {
    logger.error("admin-users", `Failed to update user: ${error}`);
    return h.response({
      success: false,
      message: "Failed to update user"
    }).code(500);
  }
}

/**
 * Delete a user
 */
/**

/**
 * Delete a user
 */
export async function deleteUserHandler(request: Request, h: ResponseToolkit): Promise<any> {
  try {
    const userId = request.params.userId as string;
    
    // Get the username associated with the userId
    const usernameQuery = `
      SELECT us_username FROM cr_user WHERE us_id = @userId
    `;
    
    const usernameResult = await executeQuery(usernameQuery, { userId });
    
    if (usernameResult.recordset.length === 0) {
      return h.response({
        success: false,
        message: "User not found"
      }).code(404);
    }
    
    const username = usernameResult.recordset[0].us_username;
    
    // Execute all queries in sequence without using BEGIN/COMMIT/ROLLBACK
    console.log("Deleting user-related data...");
    await executeQuery("DELETE FROM cr_user_mne WHERE umne_us_username = @username", { username });
    await executeQuery("DELETE FROM cr_user_mnews WHERE um_us_username = @username", { username });
    await executeQuery("DELETE FROM cr_user_sda WHERE usda_us_username = @username", { username });
    await executeQuery("DELETE FROM cr_user_sea WHERE usea_us_username = @username", { username });
    await executeQuery("DELETE FROM cr_user_seat WHERE seat_us_username = @username", { username });
    await executeQuery("DELETE FROM cr_user WHERE us_id = @userId", { userId });
    
    return h.response({
      success: true,
      message: "User deleted successfully"
    }).code(200);
    
  } catch (error) {
    console.error("Error in user deletion:", error instanceof Error ? error.message : error);
    
    return h.response({
      success: false,
      message: "Failed to delete user"
    }).code(500);
  }
}

/**
 * Update user status
 */
export async function updateUserStatusHandler(request: Request, h: ResponseToolkit) {
  try {
    const userId = request.params.userId as string;
    const { status } = request.payload as { status: boolean };
    
    const query = `
      UPDATE cr_user 
      SET us_status = @status 
      WHERE us_id = @userId
    `;
    
    await executeQuery(query, { 
      userId, 
      status: status ? '1' : '0'
    });
    
    return h.response({
      success: true,
      message: "User status updated successfully"
    }).code(200);
  } catch (error) {
    logger.error("admin-users", `Failed to update user status: ${error}`);
    return h.response({
      success: false,
      message: "Failed to update user status"
    }).code(500);
  }
}

/**
 * Update user payment status
 */
export async function updateUserPaymentStatusHandler(request: Request, h: ResponseToolkit) {
  try {
    const userId = request.params.userId as string;
    const { paid } = request.payload as { paid: boolean };
    
    const query = `
      UPDATE cr_user 
      SET us_paid = @paid 
      WHERE us_id = @userId
    `;
    
    await executeQuery(query, { 
      userId, 
      paid: paid ? '1' : '0'
    });
    
    return h.response({
      success: true,
      message: "User payment status updated successfully"
    }).code(200);
  } catch (error) {
    logger.error("admin-users", `Failed to update user payment status: ${error}`);
    return h.response({
      success: false,
      message: "Failed to update user payment status"
    }).code(500);
  }
}