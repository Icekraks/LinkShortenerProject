import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const queryMock = vi.fn();

vi.mock("@/lib/db", () => ({
  dbPool: {
    query: queryMock,
  },
}));

describe("GET /[shortCode]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 for invalid short code", async () => {
    const { GET } = await import("./route");

    const request = new NextRequest("http://localhost:3000/abc");
    const response = await GET(request, { params: Promise.resolve({ shortCode: "abc" }) });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Invalid short code");
  });

  it("returns 404 when link not found", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    const { GET } = await import("./route");

    const request = new NextRequest("http://localhost:3000/abcd");
    const response = await GET(request, { params: Promise.resolve({ shortCode: "abcd" }) });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Link expired or not found");
  });

  it("redirects when link exists", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ original_url: "https://example.com" }] });

    const { GET } = await import("./route");

    const request = new NextRequest("http://localhost:3000/abcd");
    const response = await GET(request, { params: Promise.resolve({ shortCode: "abcd" }) });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.com/");
  });
});
