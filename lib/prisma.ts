import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = global as unknown as { prisma: any };

// Validate DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is not set. Please add it to your .env file."
  );
}

// Prisma 7 requires an adapter for database connections
// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Create adapter with the pool
const adapter = new PrismaPg(pool);

// Initialize Prisma Client with adapter
let prismaClient: any;

try {
  prismaClient = new PrismaClient({
    // @ts-ignore - Prisma 7 adapter types compatibility issue
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
} catch (error) {
  console.error("Error initializing Prisma Client:", error);
  throw error;
}

// Ensure models are accessible
if (!prismaClient.directMessage) {
  console.warn("Warning: directMessage model not found on Prisma Client");
}

if (!prismaClient.invitation) {
  console.warn("Warning: invitation model not found on Prisma Client");
}

export const prisma =
  globalForPrisma.prisma ?? prismaClient;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
