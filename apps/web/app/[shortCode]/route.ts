import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { RESOLVE_LINK_RATE_LIMIT, isResolveLinkRateLimited } from "@/helpers/rateLimitHelpers";
import { getActiveLinkByShortCode } from "@/helpers/shortLinkHelpers";

export const runtime = "nodejs";

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
    const rateLimited = await isResolveLinkRateLimited(request);

    if (rateLimited) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again shortly.",
          retryAfterSeconds: RESOLVE_LINK_RATE_LIMIT.windowSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(RESOLVE_LINK_RATE_LIMIT.windowSeconds),
          },
        },
      );
    }

    const row = await getActiveLinkByShortCode(normalizedShortCode);

    if (!row) {
      return NextResponse.json({ error: "Link expired or not found" }, { status: 404 });
    }

    return NextResponse.redirect(row.original_url, { status: 307 });
  } catch (error) {
    console.error("Failed to resolve short link", error);
    return NextResponse.json({ error: "Failed to resolve short link" }, { status: 500 });
  }
}
