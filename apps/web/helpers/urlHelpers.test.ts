import { describe, expect, it } from "vitest";

import { isSelfDomainTarget, normalizeHostname } from "./urlHelpers";

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
