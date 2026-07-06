import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true, msg: "退出登录成功" });
  response.cookies.delete("session_token");
  return response;
}

export async function GET() {
  const response = NextResponse.json({ success: true, msg: "退出登录成功" });
  response.cookies.delete("session_token");
  return response;
}
