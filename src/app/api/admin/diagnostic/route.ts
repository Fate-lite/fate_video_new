import { NextRequest, NextResponse } from "next/server";
import { cacheDb } from "@/lib/db";
import { getSources } from "@/lib/sources";
import { addAdminLog } from "@/lib/logger";

function checkAdminAuth(req: NextRequest): boolean {
  const token = req.cookies.get("fate_admin_token")?.value;
  return token === "authorized_session_key";
}

async function pingSource(url: string): Promise<{ api_url: string; is_online: number; latency: number }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 秒硬超时

    // 拼装轻量级检索请求测试连通性与响应速度
    const testUrl = `${url}${url.includes("?") ? "&" : "?"}ac=list&pg=1`;
    const res = await fetch(testUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) FateVideo/2.0",
      },
    });
    
    clearTimeout(timeoutId);

    const latency = Date.now() - start;
    if (res.status === 200) {
      addAdminLog("INFO", `源站 [${url.replace("https://", "").replace("http://", "").split("/")[0]}] 测速在线: ${latency}ms`);
      return { api_url: url, is_online: 1, latency };
    }
  } catch {
    // 捕获 Timeout 或 Abort
  }

  addAdminLog("WARN", `源站 [${url.replace("https://", "").replace("http://", "").split("/")[0]}] 测速离线或超时`);
  return { api_url: url, is_online: 0, latency: 9999 };
}

export async function POST(req: NextRequest) {
  // 1. 安全拦截
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ success: false, msg: "未授权，请先登录" }, { status: 401 });
  }

  try {
    addAdminLog("INFO", "开始运行采集源一键并发测速诊断流水线...");
    const sources = getSources();
    const now = Math.floor(Date.now() / 1000);

    // 2. 并发非阻塞测速
    const results = await Promise.all(sources.map((src) => pingSource(src.url)));

    // 3. 批量更新至 SQLite (Prisma 事务驱动)
    await cacheDb.$transaction(
      results.map((r) =>
        cacheDb.source_status.upsert({
          where: { api_url: r.api_url },
          update: { is_online: r.is_online, latency: r.latency, updated_at: now },
          create: { api_url: r.api_url, is_online: r.is_online, latency: r.latency, updated_at: now },
        })
      )
    );

    const onlineCount = results.filter((r) => r.is_online === 1).length;
    addAdminLog("SUCCESS", `诊断流水线执行完毕，共 ${sources.length} 个源。在线: ${onlineCount} 个，离线: ${sources.length - onlineCount} 个。`);

    return NextResponse.json({
      success: true,
      msg: "系统运行诊断及测速已完成",
      results: results.map((r) => ({
        url: r.api_url,
        is_online: r.is_online === 1,
        latency: r.latency,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, msg: error.message || "运行测速失败" }, { status: 500 });
  }
}
