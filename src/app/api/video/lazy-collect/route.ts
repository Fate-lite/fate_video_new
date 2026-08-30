import { NextRequest, NextResponse } from "next/server";
import { cacheDb } from "@/lib/db";
import { getActiveSources, fetchAndMergeFromSources, Video } from "@/lib/collector";
import { addAdminLog } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "dianying";
  const genre = searchParams.get("genre") || "";
  
  const cacheKey = `category_${type}`;

  try {
    // 1. 获取现有缓存
    const cached = await cacheDb.cache.findUnique({
      where: { cache_key: cacheKey },
    });

    let existingList: Video[] = [];
    if (cached) {
      try {
        existingList = JSON.parse(cached.data);
      } catch {}
    }

    const activeSources = await getActiveSources(6);
    let incomingList: Video[] = [];

    // 2. 核心智能兼容机制：如果筛选的是“短剧”或“AI漫剧/AI动漫”，各大采集源站有专属的独立子分类。
    // 我们采用【子分类 ID 精准直采 + 全局热词并发检索】双轨穿透机制，瞬间注入海量高品质短剧与AI漫剧！
    if (genre === "短剧") {
      addAdminLog("INFO", `[智能懒加载] 正在为短剧大类发起【子分类直采 + 关键词穿透】...`);
      const kws = ["短剧", "微短剧", "爽剧", "逆袭", "战神", "重生", "总裁"];
      
      // 轨道 1: 关键词并发搜索
      const searchPromises = kws.map((kw) =>
        fetchAndMergeFromSources(activeSources, {
          ac: "detail",
          wd: kw,
        }, 3500)
      );
      
      // 轨道 2: 电视剧及短剧子分类前 2 页深度并发直采
      const pagePromises = [1, 2].map((pg) =>
        fetchAndMergeFromSources(
          activeSources,
          {
            ac: "detail",
            pg: pg.toString(),
          },
          3500,
          "dianshi"
        )
      );

      const [searchResults, pageResults] = await Promise.all([
        Promise.all(searchPromises),
        Promise.all(pagePromises),
      ]);

      incomingList = [...searchResults.flat(), ...pageResults.flat()].map((v) => ({ ...v, type: "dianshi" }));
    } else if (genre === "AI漫剧" || genre === "AI动漫" || genre === "动态漫") {
      addAdminLog("INFO", `[智能懒加载] 正在为 AI漫剧 类别发起【子分类直采 + 关键词穿透】...`);
      const kws = ["AI", "AI漫剧", "AI动漫", "动态漫", "漫剧", "修仙", "重生"];
      
      // 轨道 1: 关键词并发搜索
      const searchPromises = kws.map((kw) =>
        fetchAndMergeFromSources(activeSources, {
          ac: "detail",
          wd: kw,
        }, 3500)
      );

      // 轨道 2: 动漫及 AI漫剧子分类前 2 页深度并发直采
      const pagePromises = [1, 2].map((pg) =>
        fetchAndMergeFromSources(
          activeSources,
          {
            ac: "detail",
            pg: pg.toString(),
          },
          3500,
          "dongman"
        )
      );

      const [searchResults, pageResults] = await Promise.all([
        Promise.all(searchPromises),
        Promise.all(pagePromises),
      ]);

      incomingList = [...searchResults.flat(), ...pageResults.flat()].map((v) => ({ ...v, type: "dongman" }));
    } else {
      // 其他普通标签少于 12 部时，常规并发拉取各大源站第 3, 4 页数据
      addAdminLog("INFO", `[懒加载采集] 分类 [${type}] 标签 [${genre}] 内容较少，正在并发调取各大源站第 3, 4 页数据...`);
      const pgs = [3, 4];
      const pagePromises = pgs.map((pg) =>
        fetchAndMergeFromSources(
          activeSources,
          {
            ac: "detail",
            pg: pg.toString(),
          },
          3000,
          type
        )
      );
      const results = await Promise.all(pagePromises);
      incomingList = results.flat();
    }

    // 3. 将新拉取/搜索的数据与数据库现存的数据进行深度去重合并
    const mergedMap = new Map<string, Video>();
    
    // 先塞入老数据
    for (const v of existingList) {
      mergedMap.set(v.id, v);
    }

    // 再合并新拉取/搜索到的数据并去重 sources 线路
    let newItemsCount = 0;
    for (const v of incomingList) {
      if (mergedMap.has(v.id)) {
        const existing = mergedMap.get(v.id)!;
        existing.sources.push(...v.sources);
        
        // 播放源链接去重
        const seenUrls = new Set();
        existing.sources = existing.sources.filter((s) => {
          if (seenUrls.has(s.sourceUrl)) return false;
          seenUrls.add(s.sourceUrl);
          return true;
        });

        if (!existing.pic && v.pic) existing.pic = v.pic;
        if (!existing.des && v.des) existing.des = v.des;
        if (v.note && v.note.length > existing.note.length) {
          existing.note = v.note;
        }
      } else {
        mergedMap.set(v.id, v);
        newItemsCount++;
      }
    }

    const finalList = Array.from(mergedMap.values());
    const now = Math.floor(Date.now() / 1000);

    // 4. 重写数据库缓存，让未来用户共享这一次深度抓取/检索的结果
    if (newItemsCount > 0) {
      await cacheDb.cache.upsert({
        where: { cache_key: cacheKey },
        update: {
          data: JSON.stringify(finalList),
          created_at: now,
          expire_at: now + 6 * 3600,
        },
        create: {
          cache_key: cacheKey,
          data: JSON.stringify(finalList),
          created_at: now,
          expire_at: now + 6 * 3600,
        },
      });
      addAdminLog("SUCCESS", `[懒加载采集] 成功注入新数据，新增 [${newItemsCount}] 部独特影视并入库！`);
    } else {
      addAdminLog("INFO", `[懒加载采集] 抓取检索完成，未发现更多独特影视`);
    }

    return NextResponse.json({
      success: true,
      list: finalList,
      addedCount: newItemsCount,
    });

  } catch (error: any) {
    addAdminLog("ERROR", `[懒加载采集] 后台任务异常: ${error.message || error}`);
    return NextResponse.json({ success: false, msg: error.message }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
