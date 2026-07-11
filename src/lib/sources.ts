import fs from "fs";
import path from "path";

export interface VideoSource {
  id: number;
  url: string;
  name: string;
}

export const rawSources: string[] = [
  "https://360zy.com/api.php/provide/vod/",
  "https://cj.lziapi.com/api.php/provide/vod/",
  "https://ckzy.me/api.php/provide/vod/",
  "http://api.apibdzy.com/api.php/provide/vod/",
  "http://www.lovedan.net/api.php/provide/vod/",
  "http://ddmf.net/api.php/provide/vod/",
  "https://api.xinlangapi.com/xinlangapi.php/provide/vod/",
  "https://caiji.moduapi.cc/api.php/provide/vod/",
  "http://caiji.dyttzyapi.com/api.php/provide/vod/",
  "https://lz.118318.xyz/api.php/provide/vod/",
  "https://api.maoyanapi.top/api.php/provide/vod/",
  "https://api.zuidapi.com/api.php/provide/vod/",
  "https://api.wujinapi.me/api.php/provide/vod/",
  "https://api.guangsuapi.com/api.php/provide/vod/",
  "https://subocaiji.com/api.php/provide/vod/",
  "http://suboziyuan.net/api.php/provide/vod/",
  "https://jyzyapi.com/api.php/provide/vod/",
  "https://www.hongniuzy2.com/api.php/provide/vod/",
  "https://hhzyapi.com/api.php/provide/vod/",
  "https://www.huyaapi.com/api.php/provide/vod/",
  "https://jszyapi.com/api.php/provide/vod/",
  "https://api.ffzyapi.com/api.php/provide/vod/",
  "https://p2100.net/api.php/provide/vod/",
  "http://api.1080zyku.com/inc/api_mac10.php/provide/vod/",
  "https://api.yzzy-api.com/inc/apijson.php/provide/vod/",
  "https://api.1080zyku.com/inc/apijson.php/provide/vod/",
  "https://www.mdzyapi.com/api.php/provide/vod/",
  "http://cj.rycjapi.com/api.php/provide/vod/",
  "https://www.ryzyw.com/api.php/provide/vod/",
  "http://cj.ffzyapi.com/api.php/provide/vod/",
  "https://www.wyvod.com/api.php/provide/vod/",
];

const hostNameMap: Record<string, string> = {
  "360zy.com": "360资源",
  "cj.lziapi.com": "量子资源",
  "ckzy.me": "天空资源",
  "api.apibdzy.com": "百度资源",
  "lovedan.net": "爱弹幕",
  "ddmf.net": "动漫发布",
  "api.xinlangapi.com": "新浪资源",
  "caiji.moduapi.cc": "魔都资源",
  "caiji.dyttzyapi.com": "电影天堂",
  "lz.118318.xyz": "老量子",
  "api.maoyanapi.top": "猫眼资源",
  "api.zuidapi.com": "最大资源",
  "api.wujinapi.me": "无尽资源",
  "api.guangsuapi.com": "光速资源",
  "subocaiji.com": "速播资源",
  "suboziyuan.net": "速播2源",
  "jyzyapi.com": "金鹰资源",
  "hongniuzy2.com": "红牛资源",
  "hhzyapi.com": "豪华资源",
  "huyaapi.com": "虎牙资源",
  "jszyapi.com": "极速资源",
  "api.ffzyapi.com": "非凡资源",
  "p2100.net": "P2100资源",
  "api.1080zyku.com": "1080资源库",
  "api.yzzy-api.com": "樱花资源",
  "mdzyapi.com": "秒播资源",
  "ryzyw.com": "如意资源",
  "wyvod.com": "卧龙资源",
  "cj.ffzyapi.com": "飞飞资源",
};

export function getSourceName(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace("www.", "");
    return hostNameMap[host] || host;
  } catch {
    return "未知源";
  }
}

// 动态读取 data/sources.json，支持后台热改写而无需重新打包 Next.js
export function getSources(): VideoSource[] {
  const sourcesFilePath = path.resolve(process.cwd(), "data/sources.json");
  let list = rawSources;
  try {
    if (fs.existsSync(sourcesFilePath)) {
      const fileData = fs.readFileSync(sourcesFilePath, "utf-8");
      const parsed = JSON.parse(fileData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed;
      }
    }
  } catch (err) {
    console.error("加载 sources.json 失败:", err);
  }
  return list.map((url, idx) => ({
    id: idx,
    url,
    name: getSourceName(url),
  }));
}

// 保存采集源配置
export function saveSources(newSources: string[]): boolean {
  const dataDir = path.resolve(process.cwd(), "data");
  const sourcesFilePath = path.resolve(dataDir, "sources.json");
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    // 过滤去重
    const filtered = Array.from(new Set(newSources.map(s => s.trim()).filter(s => s.startsWith("http"))));
    if (filtered.length === 0) return false;
    fs.writeFileSync(sourcesFilePath, JSON.stringify(filtered, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("保存 sources.json 失败:", err);
    return false;
  }
}
