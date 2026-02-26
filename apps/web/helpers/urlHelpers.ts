import type { NextRequest } from "next/server";

export const normalizeHostname = (hostname: string) => hostname.toLowerCase().replace(/\.$/, "");

export const isSelfDomainTarget = (targetUrl: URL, appUrl: URL) => {
  const appHostname = normalizeHostname(appUrl.hostname);
  const targetHostname = normalizeHostname(targetUrl.hostname);

  return targetHostname === appHostname || targetHostname.endsWith(`.${appHostname}`);
};

export const isSameOriginRequest = (request: NextRequest) => {
  const appOrigin = request.nextUrl.origin;
  const originHeader = request.headers.get("origin");

  if (originHeader) {
    return originHeader === appOrigin;
  }

  const refererHeader = request.headers.get("referer");

  if (!refererHeader) {
    return false;
  }

  try {
    return new URL(refererHeader).origin === appOrigin;
  } catch {
    return false;
  }
};
