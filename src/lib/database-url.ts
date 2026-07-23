/**
 * Ajusta la URL de Neon para entornos serverless (Vercel):
 * - Pooler (-pooler) para conexiones cortas
 * - connection_limit=1 para no mantener el compute despierto
 * - pool_timeout=0 para liberar conexiones de inmediato
 */
export function resolveDatabaseUrl(raw = process.env.DATABASE_URL): string {
  if (!raw) {
    throw new Error("DATABASE_URL no está configurada");
  }

  if (!raw.includes("neon.tech")) {
    return raw;
  }

  try {
    const parsed = new URL(raw);

    if (!parsed.hostname.includes("-pooler")) {
      const [endpoint, ...rest] = parsed.hostname.split(".");
      parsed.hostname = [`${endpoint}-pooler`, ...rest].join(".");
    }

    parsed.searchParams.set("sslmode", parsed.searchParams.get("sslmode") ?? "require");
    parsed.searchParams.set("connect_timeout", "10");
    parsed.searchParams.set("pool_timeout", "0");
    parsed.searchParams.set("connection_limit", "1");

    return parsed.toString();
  } catch {
    return raw;
  }
}
