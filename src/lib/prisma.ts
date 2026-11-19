import { PrismaClient } from "@prisma/client";

function getRuntimeDatabaseUrl() {
  const configuredUrl = process.env.DATABASE_URL;
  if (!configuredUrl) return undefined;

  try {
    const url = new URL(configuredUrl);
    const usesTransactionPooler =
      url.hostname.endsWith(".pooler.supabase.com") && url.port === "6543";

    if (usesTransactionPooler) {
      // Supabase's transaction pooler is the recommended mode for Vercel
      // functions. Keep each warm serverless instance's Prisma pool small.
      url.searchParams.set("pgbouncer", "true");
      if (!url.searchParams.has("connection_limit")) {
        url.searchParams.set("connection_limit", "1");
      }
    }

    return url.toString();
  } catch {
    // Preserve Prisma's normal URL validation error for malformed config.
    return configuredUrl;
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(getRuntimeDatabaseUrl()
      ? { datasources: { db: { url: getRuntimeDatabaseUrl() } } }
      : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;

