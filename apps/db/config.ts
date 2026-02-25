export type DbConfig = {
  connectionString: string;
  pool: {
    max: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
  };
};

const defaultDatabaseUrl = "postgresql://localhost:5432/link_shortener";

export const dbConfig: DbConfig = {
  connectionString: process.env.DATABASE_URL ?? defaultDatabaseUrl,
  pool: {
    max: Number(process.env.PG_POOL_MAX ?? 10),
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS ?? 30000),
    connectionTimeoutMillis: Number(process.env.PG_CONN_TIMEOUT_MS ?? 10000),
  },
};
