import { NextRequest, NextResponse } from "next/server";
import { cacheDb } from "@/lib/db";
import { getActiveSources, fetchAndMergeFromSources, Video } from "@/lib/collector";
import { addAdminLog } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "dianying";
  
  // 深度页码默认并发拉取第 3 和第 4 页，以扩大筛选的候选池
  const pgs = [3, 4];
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

    addAdminLog("INFO", `[按需懒加载] 分类 [${type}] 下内容较少，正在并发调取各大源站第 3, 4 页数据...`);

    // 2. 并发向 6 个源站拉取第 3, 4 页的数据详情
    const activeSources = await getActiveSources(6);
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

    const pagesResults = await Promise.all(pagePromises);

    // 3. 将新拉取的数据与数据库现存的数据进行全去重合并
    const mergedMap = new Map<string, Video>();
    
    // 先把已有的老数据塞入 map
    for (const v of existingList) {
      mergedMap.set(v.id, v);
    }

    // 再将第 3, 4 页的数据合并进去，若有重复电影则合并播放链接
    let newItemsCount = 0;
    for (const pageList of pagesResults) {
      for (const v of pageList) {
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
    }

    const finalList = Array.from(mergedMap.values());
    const now = Math.floor(Date.now() / 1000);

    // 4. 重写数据库缓存，让未来用户共享这一次深度抓取的结果
    if (newItemsCount > 0) {
      await cacheDb.cache.upsert({
        where: { cache_key: cacheKey },
        update: {
          data: JSON.stringify(finalList),
          created_at: now,
          expire_at: now + 6 * 3600, // 延长 6 小时过期
        },
        create: {
          cache_key: cacheKey,
          data: JSON.stringify(finalList),
          created_at: now,
          expire_at: now + 6 * 3600,
        },
      });
      addAdminLog("SUCCESS", `[按需懒加载] 成功追加第 3, 4 页数据，新增 [${newItemsCount}] 部独特影视，已写入数据库！`);
    } else {
      addAdminLog("INFO", `[按需懒加载] 抓取完成，未发现更多独特影视`);
    }

    return NextResponse.json({
      success: true,
      list: finalList,
      addedCount: newItemsCount,
    });

  } catch (error: any) {
    addAdminLog("ERROR", `[按需懒加载] 后台更新任务异常: ${error.message || error}`);
    return NextResponse.json({ success: false, msg: error.message }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
