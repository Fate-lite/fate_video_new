import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/session";
import { userDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("session_token")?.value;
    const userId = verifySessionToken(token);

    if (!userId) {
      return NextResponse.json({ success: false, msg: "未登录" }, { status: 401 });
    }

    const user = await userDb.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        created_at: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, msg: "用户不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    return NextResponse.json({ success: false, msg: error.message || "内部服务器错误" }, { status: 500 });
  }
}
