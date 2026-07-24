import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrl } from "@/lib/database-url";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: {
      db: { url: resolveDatabaseUrl() },
    },
  });

globalForPrisma.prisma = prisma;

/** Libera conexiones para que Neon entre en escala a cero cuanto antes. */
export async function disconnectDb() {
  await prisma.$disconnect();
  globalForPrisma.prisma = undefined;
}
