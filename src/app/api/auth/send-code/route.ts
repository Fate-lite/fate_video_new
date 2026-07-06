import { NextRequest, NextResponse } from "next/server";
import { sendVerificationCode } from "@/lib/user";

export async function POST(req: NextRequest) {
  try {
    const { email, type } = await req.json();
    if (!email) {
      return NextResponse.json({ success: false, msg: "邮箱不能为空" }, { status: 400 });
    }

    const res = await sendVerificationCode(email, type);
    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ success: false, msg: error.message || "内部服务器错误" }, { status: 500 });
  }
}
