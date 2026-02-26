import fs from "node:fs";
import path from "node:path";

import { NextRequest } from "next/server";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const integrationDatabaseUrl = process.env.INTEGRATION_DATABASE_URL;
const describeIfIntegration = integrationDatabaseUrl ? describe : describe.skip;

describeIfIntegration("Route integration", () => {
  let pool: Pool | undefined;

  beforeAll(async () => {
    process.env.DATABASE_URL = integrationDatabaseUrl;
    process.env.HASHIDS_SALT = process.env.HASHIDS_SALT ?? "integration-test-salt";

    const schemaFilePath = path.resolve(__dirname, "../../db/schema.sql");
    const schemaSql = fs.readFileSync(schemaFilePath, "utf8");

    pool = new Pool({ connectionString: integrationDatabaseUrl });
    await pool.query(schemaSql);
  });

  beforeEach(async () => {
    if (!pool) {
      throw new Error("Integration pool was not initialized");
    }

    await pool.query("TRUNCATE TABLE rate_limit_events, links RESTART IDENTITY");
    vi.resetModules();
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  it("creates and resolves a short link", async () => {
    const { POST } = await import("./api/generate-shortlink/route");
    const postRequest = new NextRequest("http://localhost:3000/api/generate-shortlink", {
      method: "POST",
      body: JSON.stringify({
        originalUrl: "https://example.com/some/page",
        expiryHours: 24,
      }),
      headers: {
        "Content-Type": "application/json",
        origin: "http://localhost:3000",
      },
    });

    const createResponse = await POST(postRequest);
    const createBody = await createResponse.json();

    expect(createResponse.status).toBe(201);
    expect(createBody.shortCode).toMatch(/^[a-z0-9]{4,}$/);

    const { GET } = await import("./[shortCode]/route");
    const getRequest = new NextRequest(`http://localhost:3000/${createBody.shortCode}`);

    const redirectResponse = await GET(getRequest, {
      params: Promise.resolve({ shortCode: createBody.shortCode }),
    });

    expect(redirectResponse.status).toBe(307);
    expect(redirectResponse.headers.get("location")).toBe("https://example.com/some/page");
  });

  it("returns 404 for expired short links", async () => {
    if (!pool) {
      throw new Error("Integration pool was not initialized");
    }

    await pool.query(
      `
        INSERT INTO links (short_code, original_url, expires_at)
        VALUES ($1, $2, NOW() - INTERVAL '1 hour')
      `,
      ["zzzz", "https://example.com/expired"],
    );

    const { GET } = await import("./[shortCode]/route");
    const request = new NextRequest("http://localhost:3000/zzzz");

    const response = await GET(request, {
      params: Promise.resolve({ shortCode: "zzzz" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Link expired or not found");
  });
});
