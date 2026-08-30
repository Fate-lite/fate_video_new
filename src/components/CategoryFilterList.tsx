"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { VideoCard } from "@/components/CategorySection";
import type { Video } from "@/lib/collector";

interface CategoryFilterListProps {
  initialList: Video[];
  typeName: string;
}

const YEARS = ["全部", "2026", "2025", "2024", "2023", "2022", "2021", "2020", "2019", "更早"];
const AREAS = ["全部", "中国大陆", "中国香港", "美国", "日本", "韩国", "欧洲", "其他"];
const VERSIONS = ["全部", "蓝光/超清", "国语版", "粤语/原声", "连载中", "已完结"];

// 各分类专属的影视类型标签列表 (规范命名，与主流源站精准对齐)
const GENRES_MAP: Record<string, string[]> = {
  "电影": ["全部", "动作", "喜剧", "爱情", "科幻", "悬疑", "惊悚", "恐怖", "犯罪", "战争", "纪录"],
  "电视剧": ["全部", "短剧", "古装", "都市", "青春", "悬疑", "科幻", "喜剧", "武侠", "战争", "历史"],
  "综艺": ["全部", "真人秀", "选秀", "脱口秀", "访谈", "情感", "搞笑", "美食", "音乐"],
  "动漫": ["全部", "AI漫剧", "热血", "冒险", "科幻", "奇幻", "青春", "搞笑", "推理", "治愈"],
};

function FilterListContent({ initialList, typeName }: CategoryFilterListProps) {
  const searchParams = useSearchParams();

  // 从 URL 查询参数中读取初始状态，实现 URL 深度定位 (Deep Linking)
  const initialYear = searchParams.get("year") || "全部";
  const initialArea = searchParams.get("area") || "全部";
  const initialGenre = searchParams.get("genre") || "全部";
  const initialVersion = searchParams.get("version") || "全部";
  const initialSort = searchParams.get("sort") || "default";

  // 前端维护当前的影视库状态
  const [videoList, setVideoList] = useState<Video[]>(initialList);
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [selectedArea, setSelectedArea] = useState(initialArea);
  const [selectedGenre, setSelectedGenre] = useState(initialGenre);
  const [selectedVersion, setSelectedVersion] = useState(initialVersion);
  const [selectedSort, setSelectedSort] = useState(initialSort); // default | score | hot
  
  const [isLazyLoading, setIsLazyLoading] = useState(false);
  const fetchedGenresRef = useRef<Set<string>>(new Set());

  // 根据中文大厅名映射出对应的 API 参数分类名
  const categoryParam = useMemo(() => {
    switch (typeName) {
      case "电影": return "dianying";
      case "电视剧": return "dianshi";
      case "综艺": return "zongyi";
      case "动漫": return "dongman";
      default: return "dianying";
    }
  }, [typeName]);

  // 同步状态到浏览器 URL 查询参数，便于复制分享与刷新还原
  const updateUrl = useCallback((
    year: string,
    genre: string,
    area: string,
    version: string,
    sort: string
  ) => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (year && year !== "全部") params.set("year", year);
    if (genre && genre !== "全部") params.set("genre", genre);
    if (area && area !== "全部") params.set("area", area);
    if (version && version !== "全部") params.set("version", version);
    if (sort && sort !== "default") params.set("sort", sort);

    const qs = params.toString();
    const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", newUrl);
  }, []);

  // 路由/传入列表切换时重置状态
  useEffect(() => {
    setVideoList(initialList);
  }, [initialList]);

  // 深度穿透采集函数
  const triggerLazyCollect = useCallback(async (targetGenre: string) => {
    if (fetchedGenresRef.current.has(targetGenre) || isLazyLoading) return;
    fetchedGenresRef.current.add(targetGenre);
    setIsLazyLoading(true);

    try {
      const res = await fetch(
        `/api/video/lazy-collect?type=${categoryParam}&genre=${encodeURIComponent(targetGenre)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.list) && data.list.length > 0) {
          setVideoList((prev) => {
            const map = new Map<string, Video>();
            prev.forEach((v) => map.set(v.id, v));
            data.list.forEach((v: Video) => {
              if (map.has(v.id)) {
                const exist = map.get(v.id)!;
                exist.sources.push(...v.sources);
                if (!exist.typeName && v.typeName) exist.typeName = v.typeName;
                if (!exist.pic && v.pic) exist.pic = v.pic;
              } else {
                map.set(v.id, v);
              }
            });
            return Array.from(map.values());
          });
        }
      }
    } catch {}
    setIsLazyLoading(false);
  }, [categoryParam, isLazyLoading]);

  // 获取当前分类所拥有的类型标签
  const genres = useMemo(() => {
    return GENRES_MAP[typeName] || ["全部"];
  }, [typeName]);

  // 前端极速实时去重与多维度交叉过滤 (支持原始 typeName 精准匹配与近义词扩展)
  const filteredList = useMemo(() => {
    return videoList.filter((v) => {
      // 1. 年份过滤
      if (selectedYear !== "全部") {
        if (selectedYear === "更早") {
          const y = parseInt(v.year);
          if (isNaN(y) || y >= 2019) return false;
        } else {
          if (!v.year || !v.year.includes(selectedYear)) return false;
        }
      }

      // 2. 地区过滤
      if (selectedArea !== "全部") {
        if (selectedArea === "其他") {
          const majorAreas = ["大陆", "中国", "美国", "日本", "韩国", "香港", "欧洲", "英国", "法国", "德国"];
          const match = majorAreas.some((a) => v.area && v.area.includes(a));
          if (match) return false;
        } else if (selectedArea === "欧洲") {
          const euroAreas = ["欧洲", "英国", "法国", "德国", "意大利", "西班牙"];
          const match = euroAreas.some((a) => v.area && v.area.includes(a));
          if (!match) return false;
        } else {
          const matchKeyword = selectedArea.replace("中国", ""); // 兼容“中国大陆”与“大陆”
          if (!v.area || !v.area.includes(matchKeyword)) return false;
        }
      }

      // 3. 类型过滤 (优先精准对比原始细分类目 typeName，辅以简介、演员、标题多维度智能扩展判定)
      if (selectedGenre !== "全部") {
        const rawType = (v.typeName || "").toLowerCase();
        const searchText = `${v.typeName || ""} ${v.des || ""} ${v.note || ""} ${v.actor || ""} ${v.title || ""}`.toLowerCase();
        
        if (selectedGenre === "AI漫剧" || selectedGenre === "AI动漫") {
          // AI漫剧专项增强匹配：包含 AI漫剧, AI动漫, AI动画, 动态漫, 漫剧, 动态漫画 或 标题/简介含 AI
          const isAi = rawType.includes("ai") || rawType.includes("漫剧") || rawType.includes("动态漫") || rawType.includes("动漫") ||
                       searchText.includes("ai漫剧") || searchText.includes("ai动漫") || searchText.includes("动态漫") || searchText.includes("漫剧") || searchText.includes("ai");
          if (!isAi) return false;
        } else if (selectedGenre === "短剧") {
          // 短剧专项增强匹配：包含 短剧, 爽文短剧, 反转爽剧, 爽剧, 微短剧, 现代都市(短剧), 古装仙侠(短剧), 总裁, 重生 等
          const isShortDrama = rawType.includes("短剧") || rawType.includes("爽剧") || rawType.includes("反转") || rawType.includes("总裁") || rawType.includes("重生") || rawType.includes("仙侠") ||
                               searchText.includes("短剧") || searchText.includes("微短剧") || searchText.includes("爽剧") || searchText.includes("反转爽剧");
          if (!isShortDrama) return false;
        } else {
          if (!searchText.includes(selectedGenre.toLowerCase())) {
            return false;
          }
        }
      }

      // 4. 版本/清晰度/状态过滤
      if (selectedVersion !== "全部") {
        const searchText = `${v.des} ${v.note} ${v.lang}`.toLowerCase();
        if (selectedVersion === "蓝光/超清") {
          if (!searchText.includes("蓝光") && !searchText.includes("bd") && !searchText.includes("1080p") && !searchText.includes("hd") && !searchText.includes("超清")) return false;
        } else if (selectedVersion === "国语版") {
          if (!searchText.includes("国语") && !searchText.includes("普通话")) return false;
        } else if (selectedVersion === "粤语/原声") {
          if (!searchText.includes("粤语") && !searchText.includes("原声") && !searchText.includes("英语") && !searchText.includes("韩语") && !searchText.includes("日语")) return false;
        } else if (selectedVersion === "连载中") {
          if (!v.note.includes("更新至") && !v.note.includes("连载") && !v.note.includes("第") && v.type !== "dianshi" && v.type !== "zongyi" && v.type !== "dongman") return false;
        } else if (selectedVersion === "已完结") {
          if (v.note.includes("更新至") || v.note.includes("连载")) return false;
        }
      }

      return true;
    });
  }, [videoList, selectedYear, selectedArea, selectedGenre, selectedVersion]);

  // 当进入页面或切换到某一特定分类时，如果该分类下的视频数量过少，自动触发针对该标签的穿透拉取
  useEffect(() => {
    if (selectedGenre !== "全部" && filteredList.length < 18 && !fetchedGenresRef.current.has(selectedGenre)) {
      triggerLazyCollect(selectedGenre);
    }
  }, [selectedGenre, filteredList.length, triggerLazyCollect]);

  // 对过滤后的列表执行智能排序打分
  const sortedList = useMemo(() => {
    const listCopy = [...filteredList];
    if (selectedSort === "score") {
      const getScore = (v: Video) => {
        const match = v.note.match(/(\d+\.\d+|\d+)分/);
        if (match) return parseFloat(match[1]);
        if (v.note.includes("HD") || v.note.includes("蓝光") || v.note.includes("超清")) return 8.0;
        return 7.0;
      };
      return listCopy.sort((a, b) => getScore(b) - getScore(a));
    } else if (selectedSort === "hot") {
      const getHotScore = (v: Video) => {
        let score = v.sources.length * 15;
        if (v.note.includes("完结") || v.note.includes("全")) score += 20;
        if (v.des && v.des.length > 200) score += 10;
        return score;
      };
      return listCopy.sort((a, b) => getHotScore(b) - getHotScore(a));
    }
    return listCopy;
  }, [filteredList, selectedSort]);

  // 默认展示较多视频（如 36 部）
  const displayList = useMemo(() => {
    return sortedList.slice(0, 36);
  }, [sortedList]);

  // 交互处理：切换年份
  const handleYearChange = (y: string) => {
    setSelectedYear(y);
    updateUrl(y, selectedGenre, selectedArea, selectedVersion, selectedSort);
  };

  // 交互处理：切换类型
  const handleGenreChange = (g: string) => {
    setSelectedGenre(g);
    updateUrl(selectedYear, g, selectedArea, selectedVersion, selectedSort);
    if (g !== "全部") {
      triggerLazyCollect(g);
    }
  };

  // 交互处理：切换地区
  const handleAreaChange = (a: string) => {
    setSelectedArea(a);
    updateUrl(selectedYear, selectedGenre, a, selectedVersion, selectedSort);
  };

  // 交互处理：切换版本
  const handleVersionChange = (v: string) => {
    setSelectedVersion(v);
    updateUrl(selectedYear, selectedGenre, selectedArea, v, selectedSort);
  };

  // 交互处理：切换排序
  const handleSortChange = (s: string) => {
    setSelectedSort(s);
    updateUrl(selectedYear, selectedGenre, selectedArea, selectedVersion, s);
  };

  // 交互处理：重置所有筛选
  const handleReset = () => {
    setSelectedYear("全部");
    setSelectedArea("全部");
    setSelectedGenre("全部");
    setSelectedVersion("全部");
    setSelectedSort("default");
    updateUrl("全部", "全部", "全部", "全部", "default");
  };

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* 栏目头部 */}
      <div className="border-b border-white/5 pb-4">
        <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
          <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-indigo-500 to-pink-500 animate-pulse"></span>
          <span>{typeName}大厅</span>
        </h1>
      </div>

      {/* 极简精致的毛玻璃分类筛选面板 */}
      <div className="glass-card rounded-2xl p-4 md:p-5 border border-white/5 flex flex-col gap-4 text-xs select-none">
        
        {/* 按年份筛选 (排第一行) */}
        <div className="flex items-start gap-4">
          <span className="text-white/30 font-bold shrink-0 py-1">年份：</span>
          <div className="flex flex-wrap gap-1.5">
            {YEARS.map((y) => (
              <button
                key={y}
                onClick={() => handleYearChange(y)}
                className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                  selectedYear === y
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        {/* 按类型筛选 (排第二行) */}
        <div className="flex items-start gap-4 border-t border-white/5 pt-4">
          <span className="text-white/30 font-bold shrink-0 py-1">类型：</span>
          <div className="flex flex-wrap gap-1.5">
            {genres.map((g) => (
              <button
                key={g}
                onClick={() => handleGenreChange(g)}
                className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                  selectedGenre === g
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* 按地区筛选 */}
        <div className="flex items-start gap-4 border-t border-white/5 pt-4">
          <span className="text-white/30 font-bold shrink-0 py-1">地区：</span>
          <div className="flex flex-wrap gap-1.5">
            {AREAS.map((a) => (
              <button
                key={a}
                onClick={() => handleAreaChange(a)}
                className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                  selectedArea === a
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* 按版本/清晰度/连载状态筛选 */}
        <div className="flex items-start gap-4 border-t border-white/5 pt-4">
          <span className="text-white/30 font-bold shrink-0 py-1">版本：</span>
          <div className="flex flex-wrap gap-1.5">
            {VERSIONS.map((v) => (
              <button
                key={v}
                onClick={() => handleVersionChange(v)}
                className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                  selectedVersion === v
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* 排序条与筛选结果状态提示 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-white/40 font-semibold px-1 mt-2 select-none">
        
        {/* 左侧：筛选数量与懒加载状态 */}
        <div className="flex flex-wrap items-center gap-2">
          <span>筛选结果:</span>
          <span className="text-indigo-400 font-bold">{filteredList.length}</span>
          <span>部符合条件</span>
          
          {isLazyLoading && (
            <span className="text-indigo-400 font-bold flex items-center gap-1.5 ml-2 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full text-[10px] animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></span>
              <span>🔍 正在为您深度检索各大源站历史资源库，请稍候...</span>
            </span>
          )}
          
          {filteredList.length > 36 && !isLazyLoading && (
            <span className="text-[10px] text-white/20"> (默认展示前 36 部)</span>
          )}
        </div>

        {/* 右侧：高水准智能排序控制与重置 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="text-white/25">排序:</span>
            <div className="flex bg-white/5 border border-white/5 rounded-lg p-0.5">
              <button
                onClick={() => handleSortChange("default")}
                className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer text-[10px] ${
                  selectedSort === "default" ? "bg-indigo-600 text-white" : "text-white/40 hover:text-white/80"
                }`}
              >
                🕒 最近更新
              </button>
              <button
                onClick={() => handleSortChange("hot")}
                className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer text-[10px] ${
                  selectedSort === "hot" ? "bg-indigo-600 text-white" : "text-white/40 hover:text-white/80"
                }`}
              >
                🔥 热门排行
              </button>
              <button
                onClick={() => handleSortChange("score")}
                className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer text-[10px] ${
                  selectedSort === "score" ? "bg-indigo-600 text-white" : "text-white/40 hover:text-white/80"
                }`}
              >
                ⭐ 评分最高
              </button>
            </div>
          </div>
          
          {(selectedYear !== "全部" || selectedArea !== "全部" || selectedGenre !== "全部" || selectedVersion !== "全部" || selectedSort !== "default") && (
            <button
              onClick={handleReset}
              className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors cursor-pointer border-l border-white/10 pl-4"
            >
              重置筛选 ✕
            </button>
          )}
        </div>
      </div>

      {/* 影视卡片网格 */}
      {displayList.length === 0 ? (
        <div className="glass-card rounded-3xl p-16 text-center border border-white/5 text-white/30 text-xs">
          {isLazyLoading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="animate-pulse">正在穿透抓取底层的隐藏资源，请稍候...</div>
            </div>
          ) : (
            "没有找到该筛选条件下的影视资源，请尝试重置筛选条件。"
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-5 animate-in fade-in duration-300">
          {displayList.map((v) => (
            <VideoCard key={v.id} v={v} />
          ))}
        </div>
      )}

    </div>
  );
}

export default function CategoryFilterList(props: CategoryFilterListProps) {
  return (
    <Suspense fallback={
      <div className="w-full flex flex-col gap-6">
        <div className="h-6 bg-white/10 rounded-md w-48 mb-4"></div>
        <div className="h-40 bg-white/5 rounded-2xl"></div>
      </div>
    }>
      <FilterListContent {...props} />
    </Suspense>
  );
}
