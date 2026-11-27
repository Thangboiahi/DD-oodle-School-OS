import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getOptionalPublicSupabaseEnv,
  getPublicSupabaseEnv,
  getServerSupabaseSecretEnv,
} from "@/lib/supabase/env";

describe("lib/supabase/env", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.SUPABASE_SECRET_KEY;
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  it("returns null for optional public env when unconfigured", () => {
    expect(getOptionalPublicSupabaseEnv()).toBeNull();
  });

  it("validates public Supabase env vars and rejects invalid URLs", () => {
    expect(() => getPublicSupabaseEnv()).toThrow();

    process.env.NEXT_PUBLIC_SUPABASE_URL = "not-a-url";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    expect(() => getOptionalPublicSupabaseEnv()).toThrow();
    expect(() => getPublicSupabaseEnv()).toThrow();

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    expect(getPublicSupabaseEnv()).toEqual({
      url: "https://example.supabase.co",
      publishableKey: "sb_publishable_test",
    });
  });

  it("enforces server-only guard and presence checks for SUPABASE_SECRET_KEY", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    expect(() => getServerSupabaseSecretEnv()).toThrow();

    process.env.SUPABASE_SECRET_KEY = "sb_secret_test_only";
    expect(getServerSupabaseSecretEnv()).toEqual({
      url: "https://example.supabase.co",
      secretKey: "sb_secret_test_only",
    });

    vi.stubGlobal("window", {});
    expect(() => getServerSupabaseSecretEnv()).toThrow(
      /must never be accessed from browser/i,
    );
  });
});
