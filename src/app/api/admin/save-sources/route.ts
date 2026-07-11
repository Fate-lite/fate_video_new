import { NextRequest, NextResponse } from "next/server";
import { saveSources } from "@/lib/sources";
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
    const { sources } = await req.json();

    if (!Array.isArray(sources) || sources.length === 0) {
      return NextResponse.json({ success: false, msg: "必须保留至少一个有效的采集源" }, { status: 400 });
    }

    const success = saveSources(sources);
    if (success) {
      addAdminLog("SUCCESS", `采集源列表排序与增删已更新保存，当前激活源数量: ${sources.length} 个`);
      return NextResponse.json({ success: true, msg: "采集源配置已更新成功" });
    } else {
      addAdminLog("ERROR", "写入 sources.json 失败，请检查物理磁盘或目录读写权限");
      return NextResponse.json({ success: false, msg: "写入采集源配置文件失败" }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, msg: error.message || "更新配置失败" }, { status: 500 });
  }
}
