import { NextRequest, NextResponse } from "next/server";
import { cacheDb } from "@/lib/db";
import { addAdminLog } from "@/lib/logger";

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
      await cacheDb.cache.deleteMany();
      try {
        await cacheDb.$executeRawUnsafe("VACUUM");
      } catch {}
      addAdminLog("WARN", "管理员手动清空了全站已下载的影视接口缓存并执行物理整理 (cache & VACUUM)");
    }
    
    if (type === "all" || type === "search") {
      await cacheDb.search_history.deleteMany();
      try {
        await cacheDb.$executeRawUnsafe("VACUUM");
      } catch {}
      addAdminLog("WARN", "管理员手动清空了全站搜索排行词历史并执行物理整理 (search_history & VACUUM)");
    }

    return NextResponse.json({ success: true, msg: "缓存已清理完毕" });
  } catch (error: any) {
    return NextResponse.json({ success: false, msg: error.message || "清理缓存失败" }, { status: 500 });
  }
}
