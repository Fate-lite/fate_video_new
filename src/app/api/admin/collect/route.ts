import { NextRequest, NextResponse } from "next/server";
import { warmupAllCategories } from "@/lib/collector";

function checkAdminAuth(req: NextRequest): boolean {
  const token = req.cookies.get("fate_admin_token")?.value;
  return token === "authorized_session_key";
}

export async function POST(req: NextRequest) {
  // 1. 安全拦截
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ success: false, msg: "未授权" }, { status: 401 });
  }

  // 2. 异步执行预热任务，防止 HTTP 阻塞请求超时
  // 我们直接调用，不加 await 让其在后台线程静默去抓，接口立即使 200 返回，前台在日志终端里看刷屏即可！
  warmupAllCategories().catch(console.error);

  return NextResponse.json({
    success: true,
    msg: "后台手动全站主动采集任务已成功触发，请在右侧终端日志查看进度",
  });
}
