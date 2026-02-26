import { NextRequest, NextResponse } from "next/server";

import { dbPool } from "@/lib/db";

export const runtime = "nodejs";

type ResolveLinkRow = {
  original_url: string;
};

const shortCodePattern = /^[a-z0-9]{4,}$/;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ shortCode: string }> },
) {
  const { shortCode } = await context.params;
  const normalizedShortCode = shortCode.toLowerCase();

  if (!shortCodePattern.test(normalizedShortCode)) {
    return NextResponse.json({ error: "Invalid short code" }, { status: 404 });
  }

  try {
    const result = await dbPool.query<ResolveLinkRow>(
      `
        SELECT original_url
        FROM links
        WHERE short_code = $1
          AND (expires_at IS NULL OR expires_at > NOW())
        LIMIT 1
      `,
      [normalizedShortCode],
    );

    const row = result.rows[0];

    if (!row) {
      return NextResponse.json({ error: "Link expired or not found" }, { status: 404 });
    }

    return NextResponse.redirect(row.original_url, { status: 307 });
  } catch (error) {
    console.error("Failed to resolve short link", error);
    return NextResponse.json({ error: "Failed to resolve short link" }, { status: 500 });
  }
}
