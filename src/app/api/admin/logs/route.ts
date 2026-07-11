import { NextRequest, NextResponse } from "next/server";
import { getAdminLogs } from "@/lib/logger";

function checkAdminAuth(req: NextRequest): boolean {
  const token = req.cookies.get("fate_admin_token")?.value;
  return token === "authorized_session_key";
}

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ success: false, msg: "未授权" }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    logs: getAdminLogs(),
  });
}
export const dynamic = "force-dynamic";
