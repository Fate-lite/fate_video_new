"use client";

import React, { useState, useMemo, useEffect } from "react";
import { VideoCard } from "@/components/CategorySection";
import type { Video } from "@/lib/collector";

interface CategoryFilterListProps {
  initialList: Video[];
  typeName: string;
}

const YEARS = ["全部", "2026", "2025", "2024", "2023", "2022", "2021", "2020", "2019", "更早"];
const AREAS = ["全部", "中国大陆", "中国香港", "美国", "日本", "韩国", "欧洲", "其他"];
const VERSIONS = ["全部", "蓝光/超清", "国语版", "粤语/原声", "连载中", "已完结"];

// 各分类专属的影视类型标签列表
const GENRES_MAP: Record<string, string[]> = {
  "电影": ["全部", "动作", "喜剧", "爱情", "科幻", "悬疑", "惊悚", "恐怖", "犯罪", "战争", "纪录"],
  "电视剧": ["全部", "短剧", "古装", "都市", "青春", "悬疑", "科幻", "喜剧", "武侠", "战争", "历史"],
  "综艺": ["全部", "真人秀", "选秀", "脱口秀", "访谈", "情感", "搞笑", "美食", "音乐"],
  "动漫": ["全部", "AI漫剧", "热血", "冒险", "科幻", "奇幻", "青春", "搞笑", "推理", "治愈"],
};

export default function CategoryFilterList({ initialList, typeName }: CategoryFilterListProps) {
  // 前端维护当前的影视库状态，允许按需 lazy-collect 追加数据
  const [videoList, setVideoList] = useState<Video[]>(initialList);
  const [selectedYear, setSelectedYear] = useState("全部");
  const [selectedArea, setSelectedArea] = useState("全部");
  const [selectedGenre, setSelectedGenre] = useState("全部");
  const [selectedVersion, setSelectedVersion] = useState("全部");
  const [selectedSort, setSelectedSort] = useState("default"); // default | score | hot
  
  const [isLazyLoading, setIsLazyLoading] = useState(false);
  const [hasLazyFetched, setHasLazyFetched] = useState(false);

  // 路由/传入列表切换时重置状态
  useEffect(() => {
    setVideoList(initialList);
    setHasLazyFetched(false);
  }, [initialList]);

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

  // 获取当前分类所拥有的类型标签
  const genres = useMemo(() => {
    return GENRES_MAP[typeName] || ["全部"];
  }, [typeName]);

  // 前端极速实时去重与多维度交叉过滤
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

  // 对过滤后的列表执行智能排序打分
  const sortedList = useMemo(() => {
    const listCopy = [...filteredList];
    if (selectedSort === "score") {
      // 智能提取评分 (如 "8.5分" -> 8.5)
      const getScore = (v: Video) => {
        const match = v.note.match(/(\d+\.\d+|\d+)分/);
        if (match) return parseFloat(match[1]);
        if (v.note.includes("HD") || v.note.includes("蓝光") || v.note.includes("超清")) return 8.0;
        return 7.0;
      };
      return listCopy.sort((a, b) => getScore(b) - getScore(a));
    } else if (selectedSort === "hot") {
      // 智能提取热度评分 (被越多资源站收录采集，说明该片越火爆，且包含完结字眼额外加分)
      const getHotScore = (v: Video) => {
        let score = v.sources.length * 15; // 线路融合越多，热度越高
        if (v.note.includes("完结") || v.note.includes("全")) score += 20;
        if (v.des && v.des.length > 200) score += 10;
        return score;
      };
      return listCopy.sort((a, b) => getHotScore(b) - getHotScore(a));
    }
    // 默认按最后更新时间排序 (即原列表的顺序)
    return listCopy;
  }, [filteredList, selectedSort]);

  // 监听过滤结果数量。如果特定筛选条件下的影视资源过少 (少于 12 部)，且我们还没有为该分类触发过深度懒拉取，则自动开启静默后台深度采集
  useEffect(() => {
    const triggerLazyCollect = async () => {
      setIsLazyLoading(true);
      try {
        const res = await fetch(
          `/api/video/lazy-collect?type=${categoryParam}&genre=${encodeURIComponent(selectedGenre)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.list)) {
            // 将深度拉回的数据合并更新到当前的影视卡片池中
            setVideoList(data.list);
          }
        }
      } catch {}
      setHasLazyFetched(true);
      setIsLazyLoading(false);
    };

    const isFilterActive = selectedYear !== "全部" || selectedArea !== "全部" || selectedGenre !== "全部" || selectedVersion !== "全部";
    if (isFilterActive && filteredList.length < 12 && !hasLazyFetched && !isLazyLoading) {
      triggerLazyCollect();
    }
  }, [filteredList, selectedYear, selectedArea, selectedGenre, selectedVersion, hasLazyFetched, isLazyLoading, categoryParam]);

  // PC 端限制默认展示 24 个视频，布局更加对称协调（如 6 列 * 4 行）
  const displayList = useMemo(() => {
    return sortedList.slice(0, 24);
  }, [sortedList]);

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
                onClick={() => {
                  setSelectedYear(y);
                  setHasLazyFetched(false);
                }}
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
                onClick={() => {
                  setSelectedGenre(g);
                  setHasLazyFetched(false);
                }}
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
                onClick={() => {
                  setSelectedArea(a);
                  setHasLazyFetched(false);
                }}
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
                onClick={() => {
                  setSelectedVersion(v);
                  setHasLazyFetched(false);
                }}
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
          
          {filteredList.length > 24 && !isLazyLoading && (
            <span className="text-[10px] text-white/20"> (PC端默认推荐前 24 部)</span>
          )}
        </div>

        {/* 右侧：高水准智能排序控制与重置 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="text-white/25">排序:</span>
            <div className="flex bg-white/5 border border-white/5 rounded-lg p-0.5">
              <button
                onClick={() => setSelectedSort("default")}
                className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer text-[10px] ${
                  selectedSort === "default" ? "bg-indigo-600 text-white" : "text-white/40 hover:text-white/80"
                }`}
              >
                🕒 最近更新
              </button>
              <button
                onClick={() => setSelectedSort("hot")}
                className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer text-[10px] ${
                  selectedSort === "hot" ? "bg-indigo-600 text-white" : "text-white/40 hover:text-white/80"
                }`}
              >
                🔥 热门排行
              </button>
              <button
                onClick={() => setSelectedSort("score")}
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
              onClick={() => {
                setSelectedYear("全部");
                setSelectedArea("全部");
                setSelectedGenre("全部");
                setSelectedVersion("全部");
                setSelectedSort("default");
                setHasLazyFetched(false);
              }}
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
