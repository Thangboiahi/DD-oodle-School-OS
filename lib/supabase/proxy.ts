import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getOptionalPublicSupabaseEnv } from "@/lib/supabase/env";
import { resolveTenantHint } from "@/lib/tenancy/resolve-tenant-hint";

export const TENANT_HINT_HEADER = "x-dd-oodle-tenant-hint";

function buildRequestHeadersWithTenantHint(request: NextRequest): Headers {
  const requestHeaders = new Headers(request.headers);
  // Strip any incoming client-spoofed tenant hint header before parsing host.
  requestHeaders.delete(TENANT_HINT_HEADER);

  const hint = resolveTenantHint({
    host: request.headers.get("host"),
    pathname: "/",
    baseDomain: process.env.NEXT_PUBLIC_APP_DOMAIN ?? "dd-oodle.com",
  });

  if (
    hint.kind === "tenant" &&
    (hint.source === "subdomain" || hint.source === "local-subdomain")
  ) {
    // Informational UNTRUSTED routing hint only; Server Components, Actions, and RLS always authorize.
    requestHeaders.set(TENANT_HINT_HEADER, hint.slug);
  }

  return requestHeaders;
}

export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  const requestHeaders = buildRequestHeadersWithTenantHint(request);
  const env = getOptionalPublicSupabaseEnv();
  if (!env) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        supabaseResponse = NextResponse.next({
          request: { headers: requestHeaders },
        });

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
