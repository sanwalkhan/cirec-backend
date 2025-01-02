import sql, { ConnectionPool, IResult } from 'mssql';

// Configuration for SQL Server
const config: sql.config = {
  driver: 'msnodesqlv8', // Use msnodesqlv8 for SQL Server
  server: '109.203.112.112',
  database: 'cir126_cirec',
  user: 'and_cirec',
  password: '78ati!8E3',
  options: {
    trustServerCertificate: true, // Important for self-signed certificates
  }
};

// Create a reusable connection pool
let connectionPool: ConnectionPool | null = null;

// Function to get the SQL connection pool
export const getSqlConnection = async (): Promise<ConnectionPool> => {
  if (!connectionPool) {
    try {
      // Establish a new connection if one doesn't exist
      connectionPool = await sql.connect(config);
      console.log("SQL Server connected successfully!");
    } catch (err) {
      console.error("Error connecting to SQL Server:", err);
      throw err; // Rethrow the error to notify calling code of the failure
    }
  }
  return connectionPool;
};

// Query wrapper for executing SQL queries
export const executeQuery = async (query: string, params?: { [key: string]: any }): Promise<IResult<any>> => {
  try {
    const pool = await getSqlConnection(); // Get the connection pool
    const request = pool.request(); // Create a new request from the pool

    // Add parameters if provided
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        request.input(key, value);
      });
    }

    // Execute the query and return the result
    return await request.query(query);
  } catch (err) {
    console.error("Error executing query:", err);
    throw err; // Rethrow the error
  }
};

// Example usage: Fetching table names from the database
export async function fetchTables(): Promise<void> {
  try {
    const result = await executeQuery(`
      SELECT TABLE_SCHEMA, TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
    `);

    console.log(
      "Available tables:",
      result.recordset.map(
        (table: { TABLE_SCHEMA: string; TABLE_NAME: string }) => `${table.TABLE_SCHEMA}.${table.TABLE_NAME}`
      )
    );
  } catch (err) {
    console.error("Error fetching tables:", err);
  }
}
