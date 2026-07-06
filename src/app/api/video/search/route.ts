import { NextRequest, NextResponse } from "next/server";
import { searchAllSources } from "@/lib/collector";

export async function GET(req: NextRequest) {
  try {
    const keyword = req.nextUrl.searchParams.get("wd") || "";
    if (!keyword.trim()) {
      return NextResponse.json({ success: false, msg: "搜索关键词不能为空" }, { status: 400 });
    }

    const list = await searchAllSources(keyword);
    return NextResponse.json({ success: true, list });
  } catch (error: any) {
    return NextResponse.json({ success: false, msg: error.message || "内部服务器错误" }, { status: 500 });
  }
}
