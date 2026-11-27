import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("returns 200 ok payload without exposing secrets or environment values", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    const body = await response.json();
    expect(body).toEqual({
      status: "ok",
      app: "dd-oodle",
    });
    expect(Object.keys(body)).toEqual(["status", "app"]);
  });
});
