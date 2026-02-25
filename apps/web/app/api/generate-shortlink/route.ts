import { NextRequest, NextResponse } from "next/server";

import { dbPool } from "@/lib/db";
import type { CreateShortLinkBody } from "@/types/short-link";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  console.log(request);
  try {
    const body = (await request.json()) as CreateShortLinkBody;
    const originalUrl = body.originalUrl?.trim();
    console.log("Received body:", body);
    if (!originalUrl) {
      return NextResponse.json({ error: "Valid URL is required" }, { status: 400 });
    }
    let normalizedUrl: string;
    try {
      normalizedUrl = new URL(originalUrl).toString();
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 1);
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
        expiresAt: created.expires_at,
        shortPath,
        shortUrl: new URL(shortPath, request.nextUrl.origin).toString(),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to parse request body as JSON", error);
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 500 });
  }
}
