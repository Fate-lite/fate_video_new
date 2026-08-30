import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/session";
import { addPlayHistory, getPlayHistory } from "@/lib/user";

// 获取观看历史
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("session_token")?.value;
    const userId = verifySessionToken(token);

    if (!userId) {
      return NextResponse.json({ success: false, msg: "请先登录" }, { status: 401 });
    }

    const history = await getPlayHistory(userId);
    return NextResponse.json({ success: true, history });
  } catch (error: any) {
    return NextResponse.json({ success: false, msg: error.message || "内部服务器错误" }, { status: 500 });
  }
}

// 记录或更新观看历史
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("session_token")?.value;
    const userId = verifySessionToken(token);

    if (!userId) {
      return NextResponse.json({ success: false, msg: "请先登录" }, { status: 401 });
    }

    const { vid, title, pic, site, episode, progress } = await req.json();
    if (!vid || !title || !episode) {
      return NextResponse.json({ success: false, msg: "缺少参数" }, { status: 400 });
    }

    const history = await addPlayHistory(userId, vid, title, pic || "", site || "", episode, progress || 0);
    return NextResponse.json({ success: true, history });
  } catch (error: any) {
    return NextResponse.json({ success: false, msg: error.message || "内部服务器错误" }, { status: 500 });
  }
}

// 删除或清空观看历史
export async function DELETE(req: NextRequest) {
  try {
    const token = req.cookies.get("session_token")?.value;
    const userId = verifySessionToken(token);

    if (!userId) {
      return NextResponse.json({ success: false, msg: "请先登录" }, { status: 401 });
    }

    const { id, clearAll } = await req.json();

    if (clearAll) {
      const { clearPlayHistory } = await import("@/lib/user");
      await clearPlayHistory(userId);
      return NextResponse.json({ success: true, msg: "观看历史已全部清空" });
    }

    if (id) {
      const { removePlayHistory } = await import("@/lib/user");
      await removePlayHistory(userId, Number(id));
      return NextResponse.json({ success: true, msg: "记录已成功删除" });
    }

    return NextResponse.json({ success: false, msg: "缺少参数" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, msg: error.message || "内部服务器错误" }, { status: 500 });
  }
}
