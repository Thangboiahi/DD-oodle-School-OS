import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getOptionalPublicSupabaseEnv } from "@/lib/supabase/env";

export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  const env = getOptionalPublicSupabaseEnv();
  if (!env) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        supabaseResponse = NextResponse.next({ request });

        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  // Verify/refresh session claims server-side on SSR requests without trusting raw cookie claims.
  await supabase.auth.getClaims();

  return supabaseResponse;
}
