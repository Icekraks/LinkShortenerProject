import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { isSameOriginRequest, isSelfDomainTarget, normalizeHostname } from "./urlHelpers";

describe("normalizeHostname", () => {
  it("normalizes case", () => {
    expect(normalizeHostname("Example.COM")).toBe("example.com");
  });

  it("removes trailing dot", () => {
    expect(normalizeHostname("example.com.")).toBe("example.com");
  });
});

describe("isSelfDomainTarget", () => {
  const appUrl = new URL("https://snipr.dev");

  it("returns true for exact hostname", () => {
    expect(isSelfDomainTarget(new URL("https://snipr.dev/path"), appUrl)).toBe(true);
  });

  it("returns true for subdomain", () => {
    expect(isSelfDomainTarget(new URL("https://api.snipr.dev/path"), appUrl)).toBe(true);
  });

  it("returns false for different hostname", () => {
    expect(isSelfDomainTarget(new URL("https://example.com"), appUrl)).toBe(false);
  });
});

describe("isSameOriginRequest", () => {
  const makeRequest = (headers: Record<string, string>) =>
    new NextRequest("http://localhost:3000/api/test", { headers });

  it("returns true when origin header matches", () => {
    const request = makeRequest({ origin: "http://localhost:3000" });
    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("returns false when origin header differs", () => {
    const request = makeRequest({ origin: "https://evil.com" });
    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("returns true when referer origin matches and no origin header", () => {
    const request = makeRequest({ referer: "http://localhost:3000/some-page" });
    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("returns false when referer origin differs and no origin header", () => {
    const request = makeRequest({ referer: "https://evil.com/page" });
    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("returns false when neither origin nor referer header is present", () => {
    const request = makeRequest({});
    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("returns false when referer is not a valid URL", () => {
    const request = makeRequest({ referer: "not-a-url" });
    expect(isSameOriginRequest(request)).toBe(false);
  });
});
