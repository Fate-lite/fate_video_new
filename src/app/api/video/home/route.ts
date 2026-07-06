import { NextRequest, NextResponse } from "next/server";
import { getCategoryVideos } from "@/lib/collector";

export async function GET(req: NextRequest) {
  try {
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "12");

    // 高并发并发读取四个核心版块数据
    const [dianying, dianshi, zongyi, dongman] = await Promise.all([
      getCategoryVideos("dianying", limit),
      getCategoryVideos("dianshi", limit),
      getCategoryVideos("zongyi", limit),
      getCategoryVideos("dongman", limit),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        dianying,
        dianshi,
        zongyi,
        dongman,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, msg: error.message || "内部服务器错误" }, { status: 500 });
  }
}
