import { NextRequest, NextResponse } from "next/server";
import { resetPassword } from "@/lib/user";

export async function POST(req: NextRequest) {
  try {
    const { email, password, code } = await req.json();
    if (!email || !password || !code) {
      return NextResponse.json({ success: false, msg: "邮箱、密码和验证码均不能为空" }, { status: 400 });
    }

    const res = await resetPassword(email, password, code);
    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ success: false, msg: error.message || "内部服务器错误" }, { status: 500 });
  }
}
