import "dotenv/config";

// Docker / production migrate — plain JS, no prisma/config or effect deps.
export default {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
};
