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

export default function CategoryFilterList({ initialList, typeName }: CategoryFilterListProps) {
  // 前端维护当前的影视库状态，允许按需 lazy-collect 追加数据
  const [videoList, setVideoList] = useState<Video[]>(initialList);
  const [selectedYear, setSelectedYear] = useState("全部");
  const [selectedArea, setSelectedArea] = useState("全部");
  
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

      return true;
    });
  }, [videoList, selectedYear, selectedArea]);

  // 监听过滤结果数量。如果特定年份地区下的影视资源过少 (少于 12 部)，且我们还没有为该分类触发过深度懒拉取，则自动开启静默后台深度采集
  useEffect(() => {
    const triggerLazyCollect = async () => {
      setIsLazyLoading(true);
      try {
        const res = await fetch(`/api/video/lazy-collect?type=${categoryParam}`);
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

    const isFilterActive = selectedYear !== "全部" || selectedArea !== "全部";
    if (isFilterActive && filteredList.length < 12 && !hasLazyFetched && !isLazyLoading) {
      triggerLazyCollect();
    }
  }, [filteredList, selectedYear, selectedArea, hasLazyFetched, isLazyLoading, categoryParam]);

  // PC 端限制默认展示 24 个视频，布局更加对称协调（如 6 列 * 4 行）
  const displayList = useMemo(() => {
    return filteredList.slice(0, 24);
  }, [filteredList]);

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* 栏目头部 */}
      <div className="border-b border-white/5 pb-4">
        <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
          <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-indigo-500 to-pink-500 animate-pulse"></span>
          <span>{typeName}大厅</span>
        </h1>
        <p className="text-xs text-white/40 mt-1">聚合多源去重，为您实时呈递最新上线的优质{typeName}资源</p>
      </div>

      {/* 极简精致的毛玻璃分类筛选面板 */}
      <div className="glass-card rounded-2xl p-4 md:p-5 border border-white/5 flex flex-col gap-4 text-xs select-none">
        
        {/* 按年份筛选 */}
        <div className="flex items-start gap-4">
          <span className="text-white/30 font-bold shrink-0 py-1">年份：</span>
          <div className="flex flex-wrap gap-1.5">
            {YEARS.map((y) => (
              <button
                key={y}
                onClick={() => {
                  setSelectedYear(y);
                  setHasLazyFetched(false); // 改变条件，允许再次为新条件触发懒加载
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

        {/* 按地区筛选 */}
        <div className="flex items-start gap-4 border-t border-white/5 pt-4">
          <span className="text-white/30 font-bold shrink-0 py-1">地区：</span>
          <div className="flex flex-wrap gap-1.5">
            {AREAS.map((a) => (
              <button
                key={a}
                onClick={() => {
                  setSelectedArea(a);
                  setHasLazyFetched(false); // 改变条件，允许再次为新条件触发懒加载
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

      </div>

      {/* 筛选过滤与懒加载状态提示 */}
      <div className="flex items-center justify-between text-xs text-white/40 font-semibold px-1 mt-2">
        <div className="flex items-center gap-2">
          <span>筛选结果:</span>
          <span className="text-indigo-400 font-bold">{filteredList.length}</span>
          <span>部符合条件</span>
          
          {/* 正在进行深度懒采集抓取时的精美提示 */}
          {isLazyLoading && (
            <span className="text-indigo-400 font-bold flex items-center gap-1.5 ml-4 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full text-[10px] animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></span>
              <span>🔍 正在为您深度检索各大源站历史资源库，请稍候...</span>
            </span>
          )}
          
          {filteredList.length > 24 && !isLazyLoading && (
            <span className="text-[10px] text-white/20"> (PC端默认推荐前 24 部)</span>
          )}
        </div>
        
        {(selectedYear !== "全部" || selectedArea !== "全部") && (
          <button
            onClick={() => {
              setSelectedYear("全部");
              setSelectedArea("全部");
              setHasLazyFetched(false);
            }}
            className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors cursor-pointer"
          >
            重置筛选 ✕
          </button>
        )}
      </div>

      {/* 影视卡片网格 */}
      {displayList.length === 0 ? (
        <div className="glass-card rounded-3xl p-16 text-center border border-white/5 text-white/30 text-xs">
          {isLazyLoading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="animate-pulse">正在穿透抓取底层第 3、4 页的隐藏资源，请稍候...</div>
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
