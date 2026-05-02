import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;

  // For build time or when DATABASE_URL is not available, create a simple client without adapter
  if (!databaseUrl || process.env.NEXT_PHASE === "phase-production-build") {
    console.warn("Creating Prisma client without adapter (build time or no DATABASE_URL)");
    return new PrismaClient({
      log: ["error", "warn"],
    });
  }

  const pool = new Pool({
    connectionString: databaseUrl,
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: ["error", "warn"],
  });
}

// Lazy-load prisma to avoid initialization during build
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient();
      if (process.env.NODE_ENV !== "production") {
        globalForPrisma.prisma = globalForPrisma.prisma;
      }
    }
    return (globalForPrisma.prisma as any)[prop];
  },
});

export default prisma;
