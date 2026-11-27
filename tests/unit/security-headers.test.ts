import { describe, expect, it } from "vitest";
import { buildSecurityHeaders } from "@/lib/security/headers";

describe("lib/security/headers", () => {
  it("configures baseline global headers and strict /sw.js headers", () => {
    const rules = buildSecurityHeaders();

    const globalRule = rules.find((rule) => rule.source === "/(.*)");
    expect(globalRule).toBeDefined();
    expect(globalRule?.headers).toEqual(
      expect.arrayContaining([
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ]),
    );

    const swRule = rules.find((rule) => rule.source === "/sw.js");
    expect(swRule).toBeDefined();
    expect(swRule?.headers).toEqual(
      expect.arrayContaining([
        {
          key: "Content-Type",
          value: "application/javascript; charset=utf-8",
        },
        {
          key: "Cache-Control",
          value: "no-cache, no-store, must-revalidate",
        },
        { key: "Service-Worker-Allowed", value: "/" },
        {
          key: "Content-Security-Policy",
          value: "default-src 'self'; script-src 'self'",
        },
      ]),
    );
  });
});
