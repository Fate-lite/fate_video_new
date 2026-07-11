import { NextRequest, NextResponse } from "next/server";
import { cacheDb } from "@/lib/db";

function checkAdminAuth(req: NextRequest): boolean {
  const token = req.cookies.get("fate_admin_token")?.value;
  return token === "authorized_session_key";
}

export async function POST(req: NextRequest) {
  // 1. 安全拦截
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ success: false, msg: "未授权，请先登录" }, { status: 401 });
  }

  try {
    const { type } = await req.json();

    if (type === "all" || type === "cache") {
      // 清空影视缓存
      await cacheDb.cache.deleteMany();
    }
    
    if (type === "all" || type === "search") {
      // 清空搜索历史
      await cacheDb.search_history.deleteMany();
    }

    return NextResponse.json({ success: true, msg: "缓存已清理完毕" });
  } catch (error: any) {
    return NextResponse.json({ success: false, msg: error.message || "清理缓存失败" }, { status: 500 });
  }
}
