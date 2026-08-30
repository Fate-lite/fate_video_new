"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Video } from "@/lib/collector";

interface SpotlightSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const POPULAR_SEARCHES = [
  "仙逆",
  "神墓",
  "完美世界",
  "凡人修仙传",
  "斗罗大陆",
  "美国老爸",
  "死神",
  "海贼王",
];

export default function SpotlightSearch({ isOpen, onClose }: SpotlightSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // 1. 初始化读取本地搜索历史
  useEffect(() => {
    try {
      const saved = localStorage.getItem("fate_search_history");
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch {}
  }, []);

  // 2. 自动聚焦与快捷键监听
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      setSelectedIndex(0);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  // 3. 防抖即时搜索 API
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/video/search?wd=${encodeURIComponent(query.trim())}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.list) {
            setResults(data.list.slice(0, 8));
          } else {
            setResults([]);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // 4. 保存搜索词到本地历史
  const saveSearchHistory = (keyword: string) => {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    const nextHistory = [trimmed, ...history.filter((h) => h !== trimmed)].slice(0, 8);
    setHistory(nextHistory);
    try {
      localStorage.setItem("fate_search_history", JSON.stringify(nextHistory));
    } catch {}
  };

  // 5. 清除单条/全部历史
  const removeHistoryItem = (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    const nextHistory = history.filter((h) => h !== item);
    setHistory(nextHistory);
    try {
      localStorage.setItem("fate_search_history", JSON.stringify(nextHistory));
    } catch {}
  };

  const clearAllHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem("fate_search_history");
    } catch {}
  };

  // 6. 提交全量搜索
  const handleSubmitSearch = (keyword: string) => {
    if (!keyword.trim()) return;
    saveSearchHistory(keyword);
    onClose();
    router.push(`/search?wd=${encodeURIComponent(keyword.trim())}`);
  };

  // 7. 键盘快捷导航 (上下键与 Enter)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (results.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % results.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results.length > 0 && results[selectedIndex]) {
        const item = results[selectedIndex];
        saveSearchHistory(item.title);
        onClose();
        router.push(`/play?title=${encodeURIComponent(item.title)}&type=${item.type}`);
      } else if (query.trim()) {
        handleSubmitSearch(query);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md flex items-start justify-center pt-16 md:pt-24 px-4 select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-[#0d0a1a]/95 border border-white/15 rounded-3xl shadow-[0_25px_60px_-15px_rgba(99,102,241,0.35)] overflow-hidden flex flex-col backdrop-blur-xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* 顶部搜索输入框栏 */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 relative">
          <svg className="w-5 h-5 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="搜索全网海量电影、电视剧、动漫、短剧..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm md:text-base text-white placeholder-white/40 focus:outline-none"
          />
          {query && (
            <button 
              onClick={() => setQuery("")}
              className="text-white/40 hover:text-white transition-colors p-1 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <span className="text-[10px] font-black text-white/30 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 hidden md:inline-block">
            ESC 退出
          </span>
        </div>

        {/* 下方搜索内容 / 实时推荐列表 */}
        <div className="max-h-[60vh] overflow-y-auto p-4 flex flex-col gap-4">
          
          {/* A. 实时搜索结果列表 */}
          {query.trim() ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between px-2 text-[11px] font-black text-white/40 uppercase tracking-widest">
                <span>实时匹配 ({results.length})</span>
                {loading && <span className="text-indigo-400 animate-pulse">正在多源检索中...</span>}
              </div>

              {results.length > 0 ? (
                results.map((item, idx) => (
                  <Link
                    key={item.id || idx}
                    href={`/play?title=${encodeURIComponent(item.title)}&type=${item.type}`}
                    onClick={() => {
                      saveSearchHistory(item.title);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between p-3 rounded-2xl transition-all duration-200 cursor-pointer ${
                      selectedIndex === idx
                        ? "bg-indigo-600/30 border border-indigo-500/40 text-white shadow-lg shadow-indigo-500/10 scale-[1.01]"
                        : "hover:bg-white/5 text-white/80 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-14 rounded-lg bg-white/10 overflow-hidden shrink-0 border border-white/10">
                        {item.pic ? (
                          <img src={item.pic} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[9px] text-white/30">无图</div>
                        )}
                      </div>
                      <div className="min-w-0 flex flex-col gap-1">
                        <div className="text-xs md:text-sm font-black truncate">{item.title}</div>
                        <div className="flex items-center gap-2 text-[10px] text-white/40">
                          <span className="bg-white/5 px-1.5 py-0.5 rounded">{item.year || "未知"}</span>
                          <span className="bg-white/5 px-1.5 py-0.5 rounded">{item.area || "未知"}</span>
                          {item.typeName && <span className="text-indigo-300 font-semibold">{item.typeName}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-pink-400 font-bold px-2 py-0.5 rounded-full bg-pink-500/10 border border-pink-500/20">
                        {item.note || "高清"}
                      </span>
                      <span className="text-white/30 text-xs hidden md:inline">➔</span>
                    </div>
                  </Link>
                ))
              ) : !loading ? (
                <div className="text-center py-10 flex flex-col items-center gap-2">
                  <span className="text-white/30 text-xs">未找到包含 &quot;{query}&quot; 的精确影片</span>
                  <button
                    onClick={() => handleSubmitSearch(query)}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 underline cursor-pointer mt-1"
                  >
                    在全网深度搜索 &quot;{query}&quot; ➔
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              {/* B. 历史搜索记录 */}
              {history.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between px-2 text-[11px] font-black text-white/40 uppercase tracking-widest">
                    <span>最近搜索</span>
                    <button 
                      onClick={clearAllHistory}
                      className="text-white/30 hover:text-red-400 transition-colors text-[10px] cursor-pointer"
                    >
                      清空历史
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {history.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSubmitSearch(item)}
                        className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/5 hover:bg-indigo-600/30 border border-white/10 hover:border-indigo-500/40 text-white/70 hover:text-white transition-all cursor-pointer"
                      >
                        <span className="text-white/30 text-[10px]">🕒</span>
                        <span>{item}</span>
                        <button
                          onClick={(e) => removeHistoryItem(e, item)}
                          className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity ml-0.5 text-[10px]"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* C. 热门推荐榜单 */}
              <div className="flex flex-col gap-2">
                <div className="px-2 text-[11px] font-black text-white/40 uppercase tracking-widest flex items-center gap-1">
                  <span>🔥 今日热搜推荐</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {POPULAR_SEARCHES.map((keyword, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSubmitSearch(keyword)}
                      className="flex items-center gap-2 p-2.5 rounded-2xl bg-white/5 hover:bg-gradient-to-r hover:from-indigo-600/30 hover:to-pink-600/20 border border-white/5 hover:border-indigo-500/30 text-white/80 hover:text-white transition-all text-xs font-black truncate cursor-pointer group"
                    >
                      <span className={`w-4 h-4 rounded-md text-[10px] flex items-center justify-center font-black ${
                        idx === 0 ? "bg-red-500 text-white" : idx === 1 ? "bg-orange-500 text-white" : idx === 2 ? "bg-amber-500 text-black" : "bg-white/10 text-white/50"
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="truncate group-hover:translate-x-0.5 transition-transform">{keyword}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

        </div>

        {/* 底部功能提示条 */}
        <div className="px-5 py-3 border-t border-white/5 bg-black/40 flex items-center justify-between text-[10px] text-white/40">
          <div className="flex items-center gap-4">
            <span>按 <strong className="text-white/70">↑ ↓</strong> 选择</span>
            <span>按 <strong className="text-white/70">Enter</strong> 快速直达播放</span>
          </div>
          <span className="text-indigo-400 font-bold">FATE.TV 深度联想引擎</span>
        </div>

      </div>
    </div>
  );
}
