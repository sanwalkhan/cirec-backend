import sql from 'mssql';

// Production configuration
const config: sql.config = {
  server: '109.203.112.112',
  database: 'cir126_cirec',
  user: 'and_cirec',
  password: '78ati!8E3',
  options: {
    encrypt: true, // For Azure
    trustServerCertificate: true, // Change to false in production if you have proper SSL certificates
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Create a reusable connection pool
let connectionPool: sql.ConnectionPool | null = null;

export const getSqlConnection = async (): Promise<sql.ConnectionPool> => {
  if (!connectionPool) {
    try {
      connectionPool = await new sql.ConnectionPool(config).connect();
      console.log("SQL Server connected successfully!");
    } catch (err) {
      console.error("Error connecting to SQL Server:", err);
      throw err;
    }
  }
  return connectionPool;
};

export const executeQuery = async <T = any>(
  query: string, 
  params?: { [key: string]: any }
): Promise<sql.IResult<T>> => {
  try {
    const pool = await getSqlConnection();
    const request = pool.request();

    // Add parameters if any
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        request.input(key, value);
      });
    }

    return await request.query(query);
  } catch (err) {
    console.error("Error executing query:", err);
    throw err;
  }
};

export const fetchTables = async (): Promise<void> => {
  try {
    const result = await executeQuery(`
      SELECT TABLE_SCHEMA, TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
    `);

    console.log(
      "Available tables:",
      result.recordset.map(
        (table: { TABLE_SCHEMA: string; TABLE_NAME: string }) => 
          `${table.TABLE_SCHEMA}.${table.TABLE_NAME}`
      )
    );
  } catch (err) {
    console.error("Error fetching tables:", err);
  }
};