"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { VideoGridSkeleton } from "@/components/Skeletons";
import { VideoCard } from "@/components/CategorySection";
import type { Video } from "@/lib/collector";

function SearchContent() {
  const searchParams = useSearchParams();
  const keyword = searchParams.get("wd") || "";

  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<Video[]>([]);

  useEffect(() => {
    if (!keyword.trim()) return;

    setLoading(true);
    fetch(`/api/video/search?wd=${encodeURIComponent(keyword.trim())}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.list) {
          setList(data.list);
        } else {
          setList([]);
        }
        setLoading(false);
      })
      .catch(() => {
        setList([]);
        setLoading(false);
      });
  }, [keyword]);

  return (
    <div className="w-full">
      {/* 搜索状态 Header */}
      <div className="border-b border-white/5 pb-4 mb-8">
        <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
          <span>关于“<span className="text-indigo-400 font-extrabold">{keyword}</span>”的搜索结果</span>
        </h1>
        <p className="text-xs text-white/40 mt-1">共找到 {list.length} 部融合去重后的影片资源</p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-6">
          <div className="text-xs text-white/40 font-semibold tracking-wider flex items-center gap-2 mb-2 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
            多源异步并发并行检索中，请稍后...
          </div>
          <VideoGridSkeleton count={12} />
        </div>
      ) : list.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center border border-white/5">
          <svg className="w-12 h-12 text-white/20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <h2 className="text-sm font-bold text-white/70 mt-4">未找到相关影视资源</h2>
          <p className="text-xs text-white/30 mt-1.5">请尝试缩短搜索词或搜索其他关键字</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-5">
          {list.map((v) => (
            <VideoCard key={v.id} v={v} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col gap-6">
        <div className="h-6 bg-white/10 rounded-md w-48 mb-6"></div>
        <VideoGridSkeleton count={12} />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
