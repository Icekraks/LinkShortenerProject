import { NextRequest, NextResponse } from "next/server";

import { dbPool } from "@/lib/db";
import type { CreateShortLinkBody } from "@/types/short-link";

export const runtime = "nodejs";

const CREATE_LINK_RATE_LIMIT = {
  maxRequests: 10,
  windowSeconds: 60,
};

const ALLOWED_EXPIRY_HOURS = new Set([1, 4, 6, 12, 24]);

const CREATE_LINK_ENDPOINT = "create-shortlink";

const getClientIdentifier = (request: NextRequest) => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return "unknown";
};

const isCreateLinkRateLimited = async (request: NextRequest) => {
  const identifier = getClientIdentifier(request);

  const result = await dbPool.query<{ request_count: number }>(
    `
      WITH inserted AS (
        INSERT INTO rate_limit_events (endpoint, identifier)
        VALUES ($1, $2)
      )
      SELECT COUNT(*)::int AS request_count
      FROM rate_limit_events
      WHERE endpoint = $1
        AND identifier = $2
        AND created_at > NOW() - ($3 * INTERVAL '1 second')
    `,
    [CREATE_LINK_ENDPOINT, identifier, CREATE_LINK_RATE_LIMIT.windowSeconds],
  );

  const requestCount = result.rows[0]?.request_count ?? 0;
  return requestCount > CREATE_LINK_RATE_LIMIT.maxRequests;
};

export async function POST(request: NextRequest) {
  try {
    const rateLimited = await isCreateLinkRateLimited(request);

    if (rateLimited) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again shortly.",
          retryAfterSeconds: CREATE_LINK_RATE_LIMIT.windowSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(CREATE_LINK_RATE_LIMIT.windowSeconds),
          },
        },
      );
    }

    const body = (await request.json()) as CreateShortLinkBody;
    const originalUrl = body.originalUrl?.trim();
    const expiryHours = body.expiryHours ?? 24;

    if (!originalUrl) {
      return NextResponse.json({ error: "Valid URL is required" }, { status: 400 });
    }

    if (!Number.isInteger(expiryHours) || !ALLOWED_EXPIRY_HOURS.has(expiryHours)) {
      return NextResponse.json(
        { error: "expiryHours must be one of: 1, 4, 6, 12, 24" },
        { status: 400 },
      );
    }

    let normalizedUrl: string;

    try {
      normalizedUrl = new URL(originalUrl).toString();
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + expiryHours);

    const result = await dbPool.query<{
      id: number;
      short_code: string;
      original_url: string;
      created_at: Date;
      expires_at: Date | null;
    }>(
      `
        INSERT INTO links (original_url, expires_at)
        VALUES ($1, $2)
        RETURNING id, trim(short_code) AS short_code, original_url, created_at, expires_at
      `,
      [normalizedUrl, expiryDate],
    );

    const created = result.rows[0];
    const shortPath = `/${created.short_code}`;
    return NextResponse.json(
      {
        id: created.id,
        shortCode: created.short_code,
        originalUrl: created.original_url,
        createdAt: created.created_at,
        expiryHours,
        expiresAt: created.expires_at,
        shortPath,
        shortUrl: new URL(shortPath, request.nextUrl.origin).toString(),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create short link", error);
    return NextResponse.json({ error: "Failed to create short link" }, { status: 500 });
  }
}
