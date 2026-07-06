import { NextRequest, NextResponse } from "next/server";
import { registerUser } from "@/lib/user";

export async function POST(req: NextRequest) {
  try {
    const { email, password, code } = await req.json();
    if (!email || !password || !code) {
      return NextResponse.json({ success: false, msg: "请完整填写注册信息" }, { status: 400 });
    }

    const res = await registerUser(email, password, code);
    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ success: false, msg: error.message || "内部服务器错误" }, { status: 500 });
  }
}
