import { NextResponse } from "next/server";
import {
  authorizeImportOperator,
  buildBatchReportCsv,
} from "@/server/imports/service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string; batchId: string }> },
) {
  const { slug, batchId } = await context.params;
  const auth = await authorizeImportOperator(slug);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.reason },
      { status: auth.status },
    );
  }

  const report = await buildBatchReportCsv(auth.context, batchId);
  if (!report.ok) {
    return NextResponse.json(
      { error: report.error },
      { status: report.status ?? 404 },
    );
  }

  return new NextResponse(report.data.csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${report.data.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
