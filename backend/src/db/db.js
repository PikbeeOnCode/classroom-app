import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const db = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" 
    ? { rejectUnauthorized: false } 
    : false  // ← no SSL for local!
});

export const connectDB = async () => {
  await db.connect();
  console.log("Postgres connected!");
};


export default db;