import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/session";
import { toggleFavorite, getFavorites, checkFavorite } from "@/lib/user";

// 获取追剧收藏列表
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("session_token")?.value;
    const userId = verifySessionToken(token);

    if (!userId) {
      return NextResponse.json({ success: false, msg: "请先登录" }, { status: 401 });
    }

    const favorites = await getFavorites(userId);
    return NextResponse.json({ success: true, favorites });
  } catch (error: any) {
    return NextResponse.json({ success: false, msg: error.message || "内部服务器错误" }, { status: 500 });
  }
}

// 切换收藏状态 (POST)
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("session_token")?.value;
    const userId = verifySessionToken(token);

    if (!userId) {
      return NextResponse.json({ success: false, msg: "请先登录" }, { status: 401 });
    }

    const { vid, title, pic } = await req.json();
    if (!vid || !title) {
      return NextResponse.json({ success: false, msg: "缺少必要参数" }, { status: 400 });
    }

    const { isFavorited } = await toggleFavorite(userId, vid, title, pic || "");
    return NextResponse.json({ success: true, isFavorited });
  } catch (error: any) {
    return NextResponse.json({ success: false, msg: error.message || "内部服务器错误" }, { status: 500 });
  }
}
