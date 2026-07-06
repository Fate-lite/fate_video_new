import { NextRequest, NextResponse } from "next/server";
import { loginUser } from "@/lib/user";
import { createSessionToken } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ success: false, msg: "邮箱和密码不能为空" }, { status: 400 });
    }

    const res = await loginUser(email, password);
    if (!res.success || !res.user) {
      return NextResponse.json(res);
    }

    // 登录成功，设置 Hmac 加密 Cookie
    const token = createSessionToken(res.user.id);
    const response = NextResponse.json({
      success: true,
      msg: "登录成功",
      user: res.user,
    });

    response.cookies.set({
      name: "session_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 3600, // 7天有效
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, msg: error.message || "内部服务器错误" }, { status: 500 });
  }
}
