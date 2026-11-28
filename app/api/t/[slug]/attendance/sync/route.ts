import { NextResponse } from "next/server";
import { syncOfflineAttendanceQueue } from "@/server/attendance/service";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Malformed JSON request body." },
      {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const result = await syncOfflineAttendanceQueue(slug, body);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      {
        status: result.status ?? 400,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  return NextResponse.json(result.data, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
