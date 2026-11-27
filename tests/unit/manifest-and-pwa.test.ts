import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function readPngDimensions(filePath: string): { width: number; height: number } {
  const bytes = fs.readFileSync(filePath);
  expect(bytes.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true);
  expect(bytes.subarray(12, 16).toString("ascii")).toBe("IHDR");
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

describe("PWA manifest, icons, offline page, and service worker", () => {
  it("exports valid Next.js manifest metadata", () => {
    const data = manifest();

    expect(data.name).toBe("DD-oodle School OS");
    expect(data.short_name).toBe("DD-oodle");
    expect(data.start_url).toBe("/");
    expect(data.display).toBe("standalone");
    expect(data.background_color).toBe("#F8FAFC");
    expect(data.theme_color).toBe("#1D4ED8");
    expect(data.orientation).toBe("any");
    expect(data.icons).toEqual([
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ]);
  });

  it("verifies referenced binary PNG icons exist with exact dimensions", () => {
    const publicDir = path.resolve(process.cwd(), "public");
    expect(
      readPngDimensions(path.join(publicDir, "icons/icon-192x192.png")),
    ).toEqual({ width: 192, height: 192 });
    expect(
      readPngDimensions(path.join(publicDir, "icons/icon-512x512.png")),
    ).toEqual({ width: 512, height: 512 });
    expect(
      readPngDimensions(path.join(publicDir, "icons/maskable-512x512.png")),
    ).toEqual({ width: 512, height: 512 });
  });

  it("provides a self-contained offline fallback page", () => {
    const offlineHtml = fs.readFileSync(
      path.resolve(process.cwd(), "public/offline.html"),
      "utf8",
    );
    expect(offlineHtml).toContain("<style>");
    expect(offlineHtml).not.toContain("<script src=");
    expect(offlineHtml).toContain("offline");
    expect(offlineHtml).toContain("active network connection");
  });

  it("enforces auditable network-first navigation and cache-purge rules in sw.js", () => {
    const swSource = fs.readFileSync(
      path.resolve(process.cwd(), "public/sw.js"),
      "utf8",
    );
    expect(swSource).toContain('const CACHE_NAME = "dd-oodle-shell-v1"');
    expect(swSource).toContain('const OFFLINE_URL = "/offline.html"');
    expect(swSource).toContain('request.method !== "GET"');
    expect(swSource).toContain('request.mode !== "navigate"');
    expect(swSource).toContain('url.pathname.startsWith("/api/")');
    expect(swSource).toContain("DD_OODLE_CLEAR_CACHES");
    expect(swSource).toContain("caches.match(OFFLINE_URL)");
  });
});
