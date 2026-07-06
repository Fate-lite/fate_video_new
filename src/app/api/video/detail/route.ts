import { NextRequest, NextResponse } from "next/server";
import { getVideoDetail } from "@/lib/collector";
import { checkFavorite } from "@/lib/user";
import { verifySessionToken } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const title = req.nextUrl.searchParams.get("title") || "";
    const type = req.nextUrl.searchParams.get("type") || "";

    if (!title || !type) {
      return NextResponse.json({ success: false, msg: "标题或分类参数不能为空" }, { status: 400 });
    }

    const video = await getVideoDetail(title, type);
    if (!video) {
      return NextResponse.json({ success: false, msg: "未找到该影片详情" }, { status: 404 });
    }

    // 检查该用户是否已收藏本片 (若已登录)
    const token = req.cookies.get("session_token")?.value;
    const userId = verifySessionToken(token);
    let isFavorited = false;
    if (userId) {
      isFavorited = await checkFavorite(userId, video.id);
    }

    return NextResponse.json({
      success: true,
      video,
      isFavorited,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, msg: error.message || "内部服务器错误" }, { status: 500 });
  }
}
