import { beforeEach, describe, expect, it, vi } from "vitest";

describe("encodeLinkIdToShortCode", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.HASHIDS_SALT = "test-salt-for-short-code";
  });

  it("returns lowercase alphanumeric code with minimum length of 4", async () => {
    const { encodeLinkIdToShortCode } = await import("./shortCode");

    const code = encodeLinkIdToShortCode(12345);

    expect(code).toMatch(/^[a-z0-9]{4,}$/);
  });

  it("throws on invalid id", async () => {
    const { encodeLinkIdToShortCode } = await import("./shortCode");

    expect(() => encodeLinkIdToShortCode(-1)).toThrow("Invalid link id for short code generation");
  });
});
