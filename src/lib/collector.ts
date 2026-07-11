import crypto from "crypto";
import { cacheDb } from "./db";
import { getSources, VideoSource } from "./sources";

export interface PlayLink {
  name: string;
  url: string;
}

export interface VideoPlayGroup {
  sourceName: string;
  sourceUrl: string;
  from: string;
  links: PlayLink[];
}

export interface Video {
  id: string; // md5(title + type)
  title: string;
  type: string; // dianying | dianshi | zongyi | dongman
  pic: string;
  lang: string;
  area: string;
  year: string;
  note: string;
  actor: string;
  director: string;
  des: string;
  last: string;
  sources: VideoPlayGroup[];
}

// 辅助函数：生成 MD5 唯一标识
export function getMd5(text: string): string {
  return crypto.createHash("md5").update(text).digest("hex");
}

// 映射分类名称到标准化类型
export function normalizeType(typeName: string): string {
  if (!typeName) return "dianying";
  if (typeName.includes("电影") || typeName.includes("片") || typeName.includes("福利")) return "dianying";
  if (typeName.includes("剧") || typeName.includes("美剧") || typeName.includes("韩剧")) return "dianshi";
  if (typeName.includes("综艺") || typeName.includes("晚会")) return "zongyi";
  if (typeName.includes("动漫") || typeName.includes("动画")) return "dongman";
  return "dianying";
}

// 解析资源站集数播放列表
function parsePlayUrl(playFrom: string, playUrl: string, sourceName: string, sourceUrl: string): VideoPlayGroup[] {
  const groups: VideoPlayGroup[] = [];
  const froms = playFrom.split("$$$");
  const urls = playUrl.split("$$$");

  for (let i = 0; i < froms.length; i++) {
    const fromName = froms[i] || "m3u8";
    const urlStr = urls[i] || "";
    if (!urlStr) continue;

    const episodes = urlStr.split("#");
    const links: PlayLink[] = [];

    for (const ep of episodes) {
      if (!ep) continue;
      const parts = ep.split("$");
      const epName = parts[0] || "播放";
      const epUrl = parts[1] || parts[0];

      if (epUrl && (epUrl.startsWith("http") || epUrl.includes(".m3u8") || epUrl.includes(".mp4"))) {
        links.push({ name: epName, url: epUrl });
      }
    }

    if (links.length > 0) {
      groups.push({
        sourceName: `${sourceName} (${fromName})`,
        sourceUrl,
        from: fromName,
        links,
      });
    }
  }
  return groups;
}

// 向单个资源站发起请求 (带超时容错)
async function requestSource(url: string, params: Record<string, string>, timeout = 3000): Promise<any> {
  const parsedUrl = new URL(url);
  Object.entries(params).forEach(([k, v]) => parsedUrl.searchParams.append(k, v));

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(parsedUrl.toString(), { signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    clearTimeout(id);
    return null;
  }
}

// 融合与合并多源的视频列表数据
export function mergeVideos(rawList: any[], source: VideoSource): Video[] {
  const list: Video[] = [];
  if (!rawList || !Array.isArray(rawList)) return list;

  for (const item of rawList) {
    if (!item.vod_name) continue;
    const title = item.vod_name.trim();
    const type = normalizeType(item.type_name);
    const id = getMd5(`${title}_${type}`);

    const sources = parsePlayUrl(
      item.vod_play_from || "m3u8",
      item.vod_play_url || "",
      source.name,
      source.url
    );

    list.push({
      id,
      title,
      type,
      pic: item.vod_pic || "",
      lang: item.vod_lang || "国语",
      area: item.vod_area || "大陆",
      year: item.vod_year || new Date().getFullYear().toString(),
      note: item.vod_remarks || "",
      actor: item.vod_actor || "",
      director: item.vod_director || "",
      des: item.vod_content || "",
      last: item.vod_time || "",
      sources,
    });
  }
  return list;
}

// 并发请求多源，并执行深度去重融合
export async function fetchAndMergeFromSources(
  sources: VideoSource[],
  params: Record<string, string>,
  timeout = 3000
): Promise<Video[]> {
  const promises = sources.map(async (source) => {
    const data = await requestSource(source.url, params, timeout);
    if (data && data.list) {
      return mergeVideos(data.list, source);
    }
    return [];
  });

  const results = await Promise.all(promises);
  const videoMap: Record<string, Video> = {};

  // 执行深度去重融合
  for (const list of results) {
    for (const vid of list) {
      if (videoMap[vid.id]) {
        // 合并播放源
        videoMap[vid.id].sources.push(...vid.sources);
        // 如果原有海报或简介为空，用新的覆盖
        if (!videoMap[vid.id].pic && vid.pic) videoMap[vid.id].pic = vid.pic;
        if (!videoMap[vid.id].des && vid.des) videoMap[vid.id].des = vid.des;
        if (vid.note && vid.note.length > videoMap[vid.id].note.length) {
          videoMap[vid.id].note = vid.note;
        }
      } else {
        videoMap[vid.id] = vid;
      }
    }
  }

  return Object.values(videoMap);
}

// 获取在线且响应最快的几个资源站
export async function getActiveSources(limit = 6): Promise<VideoSource[]> {
  const dbStatuses = await cacheDb.source_status.findMany({
    where: { is_online: 1 },
    orderBy: { latency: "asc" },
    take: limit,
  });

  const sources = getSources();

  if (dbStatuses.length > 0) {
    const activeUrls = new Set(dbStatuses.map((s) => s.api_url));
    const list = sources.filter((s) => activeUrls.has(s.url));
    if (list.length > 0) return list;
  }

  // 兜底返回前 limit 个默认源
  return sources.slice(0, limit);
}

// 获取影视分类映射ID
// 不同的资源站对应的分类ID略有差异，通常：1-电影, 2-电视剧, 3-综艺, 4-动漫
function getTypeId(type: string): string {
  switch (type) {
    case "dianying": return "1";
    case "dianshi": return "2";
    case "zongyi": return "3";
    case "dongman": return "4";
    default: return "1";
  }
}

// 核心业务：获取首页/大栏目数据（含高强度缓存读写）
export async function getCategoryVideos(type: string, limit = 18): Promise<Video[]> {
  const cacheKey = `category_${type}`;
  
  // 1. 读取数据库缓存
  const cached = await cacheDb.cache.findUnique({
    where: { cache_key: cacheKey },
  });

  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.expire_at > now) {
    try {
      return JSON.parse(cached.data).slice(0, limit);
    } catch {
      // 缓存损坏，继续穿透
    }
  }

  // 2. 缓存失效，穿透抓取
  const activeSources = await getActiveSources(6);
  const typeId = getTypeId(type);
  
  // 并发拉取各大源站对应分类的最新电影详情
  const list = await fetchAndMergeFromSources(activeSources, {
    ac: "detail",
    t: typeId,
  });

  if (list.length > 0) {
    // 写入缓存 (缓存时间 6 小时)
    await cacheDb.cache.upsert({
      where: { cache_key: cacheKey },
      update: {
        data: JSON.stringify(list),
        created_at: now,
        expire_at: now + 6 * 3600,
      },
      create: {
        cache_key: cacheKey,
        data: JSON.stringify(list),
        created_at: now,
        expire_at: now + 6 * 3600,
      },
    });
  }

  return list.slice(0, limit);
}

// 核心业务：全局高并发多源搜索
export async function searchAllSources(keyword: string): Promise<Video[]> {
  const activeSources = await getActiveSources(12); // 搜索可以并发查更多源 (前12个)
  const list = await fetchAndMergeFromSources(activeSources, {
    ac: "detail",
    wd: keyword,
  }, 4000); // 搜索超时宽容到 4 秒

  // 搜索热词统计与累加
  if (list.length > 0) {
    const now = Math.floor(Date.now() / 1000);
    await cacheDb.search_history.upsert({
      where: { keyword },
      update: {
        count: { increment: 1 },
        updated_at: now,
      },
      create: {
        keyword,
        count: 1,
        updated_at: now,
      },
    });
  }

  return list;
}

// 核心业务：单片详情获取 (由于我们要拿完整播放源，我们需要在多源中并发定位该影片)
export async function getVideoDetail(title: string, type: string): Promise<Video | null> {
  const activeSources = await getActiveSources(10);
  const list = await fetchAndMergeFromSources(activeSources, {
    ac: "detail",
    wd: title,
  }, 3500);

  const targetId = getMd5(`${title}_${type}`);
  const match = list.find((v) => v.id === targetId);
  return match || null;
}
