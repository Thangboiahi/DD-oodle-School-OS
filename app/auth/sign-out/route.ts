import { NextResponse } from "next/server";
import { getOptionalPublicSupabaseEnv } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const env = getOptionalPublicSupabaseEnv();

  if (env) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut();
    } catch {
      // Proceed with clearing active tenant cookie and returning no-store JSON.
    }
  }

  const response = NextResponse.json(
    { ok: true },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );

  response.cookies.set("dd_oodle_active_slug", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
