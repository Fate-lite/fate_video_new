import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const adminPassword = process.env.ADMIN_PASSWORD || "admin888";

    if (password === adminPassword) {
      const response = NextResponse.json({ success: true, msg: "后台管理员认证成功" });
      // 设置 Cookie，有效期 1 天
      response.cookies.set("fate_admin_token", "authorized_session_key", {
        httpOnly: true,
        path: "/",
        maxAge: 60 * 60 * 24,
        sameSite: "lax",
      });
      return response;
    } else {
      return NextResponse.json({ success: false, msg: "密码错误，拒绝访问" }, { status: 401 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, msg: error.message || "请求处理失败" }, { status: 500 });
  }
}
