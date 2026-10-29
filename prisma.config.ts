import "dotenv/config";
import { defineConfig } from "prisma/config";

// The CLI (migrations) uses the direct, non-pooled Neon URL.
// Runtime queries go through the Neon adapter in src/lib/db.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DIRECT_URL ?? "" },
});
