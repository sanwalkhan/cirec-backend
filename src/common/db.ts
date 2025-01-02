import sql from "mssql/msnodesqlv8";

// Configuration for SQL Server
//local configuration
// const config = {
//   connectionString:
//     "Driver={SQL Server Native Client 11.0};Server=effii\\SQLEXPRESS;Database=cir126_cirec_2;Trusted_Connection=yes;",
// };

// const config = {
//   connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=${process.env.DB_SERVER};Database=${process.env.DB_NAME};user=${process.env.DB_USER};password=${process.env.DB_PASSWORD};`
// };

//production configuration
const config = {
  connectionString: 
    "Driver={ODBC Driver 17 for SQL Server};" +
    "Server=109.203.112.112;" +
    "Database=cir126_cirec;" +
    "UID=and_cirec;" +  // Note: Changed 'user=' to 'UID='
    "PWD=78ati!8E3;"    // Note: Changed 'password=' to 'PWD='
};



// Create a reusable connection pool
let connectionPool: sql.ConnectionPool | null = null;

export const getSqlConnection = async (): Promise<sql.ConnectionPool> => {
  if (!connectionPool) {
    try {
      connectionPool = await sql.connect(config as any);
      console.log("SQL Server connected successfully!");
    } catch (err) {
      console.error("Error connecting to SQL Server:", err);
      throw err; // Rethrow to ensure the calling code is aware of connection failures
    }
  }
  return connectionPool;
};

// Query wrapper for convenience
export const executeQuery = async (query: string, params?: { [key: string]: any }): Promise<sql.IResult<any>> => {
  try {
    const pool = await getSqlConnection();
    const request = pool.request();

    // Add parameters if any
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        request.input(key, value);
      });
    }

    return (await request.query(query));
  } catch (err) {
    console.error("Error executing query:", err);
    throw err;
  }
};

// export const temp = async () => {
//   const result = await executeQuery(`SELECT
// 	    p.pr_name, pc.pc_year, SUM(pc.pc_amount) as total_amount 
// 		FROM and_cirec.cr_rep_products p
// 		LEFT JOIN cr_rep_polishchemical_export pc ON p.pr_id = pc.pro_id
// 		WHERE p.pr_id IN(32)
// 		AND pc_year >= '2010' AND pc_year <= '2024'
//     GROUP BY p.pr_name, pc.pc_year
// 		ORDER BY p.pr_name, pc.pc_year
//     `)

//   console.log(result.recordset);

// }


// Example usage
export async function fetchTables() {
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
