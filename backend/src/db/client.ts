// src/db/client.ts
import { Pool } from "pg";

const connectionString = process.env.PG_URL;
if (!connectionString) {
  throw new Error("PG_URL is not defined in .env");
}

// connection pool
export const Client = new Pool({
  connectionString,
});

// listen for error events on the pool
Client.on("error", (err) => {
  console.error("Unexpected error on idle Postgres client:", err);
});
