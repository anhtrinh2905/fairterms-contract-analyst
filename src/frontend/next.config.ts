import type { NextConfig } from "next";
import { config } from "dotenv";
import path from "path";

// Next.js loads frontend-local env files before evaluating this config.
// Fill in any missing values from the monorepo's shared root `.env`.
config({
  path: path.join(__dirname, "../..", ".env"),
  override: false,
  quiet: true,
});

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_CLAUSE_CONCURRENCY:
      process.env.NEXT_PUBLIC_CLAUSE_CONCURRENCY || "3",
  },
};

export default nextConfig;
