import { NextRequest, NextResponse } from "next/server";

import { dbPool } from "@/lib/db";

type CreateShortLinkBody = {
  originalUrl?: string;
  expiresAt?: string | null;
};

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // try {
  //   const body = (await request.json()) as CreateShortLinkBody;
  //   const originalUrl = body.originalUrl?.trim();
  //   if (!originalUrl) {
  //     return NextResponse.json(
  //       { error: "originalUrl is required" },
  //       { status: 400 },
  //     );
  //   }
  //   let normalizedUrl: string;
  //   try {
  //     normalizedUrl = new URL(originalUrl).toString();
  //   } catch {
  //     return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  //   }
  //   let expiresAt: Date | null = null;
  //   if (body.expiresAt) {
  //     expiresAt = new Date(body.expiresAt);
  //     if (Number.isNaN(expiresAt.getTime())) {
  //       return NextResponse.json(
  //         { error: "expiresAt must be a valid ISO date string" },
  //         { status: 400 },
  //       );
  //     }
  //   }
  //   const result = await dbPool.query<{
  //     id: number;
  //     short_code: string;
  //     original_url: string;
  //     created_at: Date;
  //     expires_at: Date | null;
  //   }>(
  //     `
  //       INSERT INTO links (original_url, expires_at)
  //       VALUES ($1, $2)
  //       RETURNING id, trim(short_code) AS short_code, original_url, created_at, expires_at
  //     `,
  //     [normalizedUrl, expiresAt],
  //   );
  //   const created = result.rows[0];
  //   const shortPath = `/${created.short_code}`;
  //   return NextResponse.json(
  //     {
  //       id: created.id,
  //       shortCode: created.short_code,
  //       originalUrl: created.original_url,
  //       createdAt: created.created_at,
  //       expiresAt: created.expires_at,
  //       shortPath,
  //       shortUrl: new URL(shortPath, request.nextUrl.origin).toString(),
  //     },
  //     { status: 201 },
  //   );
  // } catch (error) {
  //   console.error("Failed to create short link", error);
  //   return NextResponse.json(
  //     { error: "Failed to create short link" },
  //     { status: 500 },
  //   );
  // }
}
