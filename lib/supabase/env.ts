import { z } from "zod";

const publicSupabaseEnvSchema = z.object({
  url: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  publishableKey: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required"),
});

const serverSecretEnvSchema = z.object({
  url: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  secretKey: z.string().min(1, "SUPABASE_SECRET_KEY is required"),
});

export interface PublicSupabaseEnv {
  url: string;
  publishableKey: string;
}

export interface ServerSupabaseSecretEnv {
  url: string;
  secretKey: string;
}

export function getOptionalPublicSupabaseEnv(): PublicSupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url && !publishableKey) {
    return null;
  }

  return publicSupabaseEnvSchema.parse({
    url,
    publishableKey,
  });
}

export function getPublicSupabaseEnv(): PublicSupabaseEnv {
  return publicSupabaseEnvSchema.parse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

export function getServerSupabaseSecretEnv(): ServerSupabaseSecretEnv {
  if (typeof window !== "undefined") {
    throw new Error(
      "SUPABASE_SECRET_KEY must never be accessed from browser context.",
    );
  }

  return serverSecretEnvSchema.parse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    secretKey: process.env.SUPABASE_SECRET_KEY,
  });
}
