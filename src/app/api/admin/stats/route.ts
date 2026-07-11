import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { cacheDb } from "@/lib/db";
import { getSources } from "@/lib/sources";

function checkAdminAuth(req: NextRequest): boolean {
  const token = req.cookies.get("fate_admin_token")?.value;
  return token === "authorized_session_key";
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  } else if (bytes >= 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  } else if (bytes >= 1024) {
    return (bytes / 1024).toFixed(2) + " KB";
  } else {
    return bytes + " Bytes";
  }
}

export async function GET(req: NextRequest) {
  // 1. 安全拦截
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ success: false, msg: "未授权，请先登录后台" }, { status: 401 });
  }

  try {
    // 2. 统计缓存总记录数
    const cacheCount = await cacheDb.cache.count();

    // 3. 统计数据库物理文件大小 (fate.db 和 user.db)
    const dataDir = path.resolve(process.cwd(), "data");
    let totalDbSize = 0;
    
    ["fate.db", "user.db"].forEach((dbName) => {
      const dbPath = path.resolve(dataDir, dbName);
      if (fs.existsSync(dbPath)) {
        totalDbSize += fs.statSync(dbPath).size;
      }
    });

    const dbSizeFormatted = formatBytes(totalDbSize);

    // 4. 获取当前配置的源列表及其在数据库中的最新测速快照
    const sources = getSources();
    const dbStatuses = await cacheDb.source_status.findMany();
    const statusMap = new Map(dbStatuses.map((s) => [s.api_url, s]));

    const sourceList = sources.map((src) => {
      const status = statusMap.get(src.url);
      return {
        id: src.id,
        name: src.name,
        url: src.url,
        status: status ? (status.is_online === 1 ? "Online" : "Offline") : "Unknown",
        latency: status ? status.latency : null,
      };
    });

    // 5. 热门检索统计 (从 fate.db 获取真实的 search_history)
    const dbHotSearches = await cacheDb.search_history.findMany({
      orderBy: { count: "desc" },
      take: 10,
    });
    
    const hotSearches = dbHotSearches.map((h) => ({
      wd: h.keyword,
      count: h.count,
    }));

    return NextResponse.json({
      success: true,
      stats: {
        cacheCount,
        dbSizeFormatted,
        sourceCount: sources.length,
        sourceList,
        hotSearches,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, msg: error.message || "获取后台状态失败" }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
