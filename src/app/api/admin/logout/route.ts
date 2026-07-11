import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true, msg: "管理员已退出" });
  response.cookies.delete("fate_admin_token");
  return response;
}
