"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Video } from "@/lib/collector";

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
        <div className="w-full py-20 flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-sm text-white/40">多源异步并发并行检索中...</div>
        </div>
      ) : list.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center border border-white/5">
          <svg className="w-12 h-12 text-white/20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <h2 className="text-sm font-bold text-white/70 mt-4">未找到相关影视资源</h2>
          <p className="text-xs text-white/30 mt-1.5">请尝试缩短搜索词或搜索其他关键字</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-6 gap-4">
          {list.map((v) => (
            <Link
              key={v.id}
              href={`/play?title=${encodeURIComponent(v.title)}&type=${v.type}`}
              className="group block relative overflow-hidden rounded-2xl transition-all duration-300"
            >
              <div className="aspect-[3/4] relative overflow-hidden rounded-2xl bg-white/5 border border-white/5 group-hover:border-indigo-500/30 transition-all">
                <img
                  src={v.pic || "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=400&auto=format&fit=crop"}
                  alt={v.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=400&auto=format&fit=crop";
                  }}
                />

                {v.note && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[9px] font-bold glass-card text-pink-400 bg-black/60 border border-white/10 scale-90 origin-top-right">
                    {v.note}
                  </span>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                  <span className="text-[10px] font-bold text-indigo-300 tracking-wider">点击开始播放</span>
                </div>
              </div>

              <div className="mt-2.5 px-1">
                <h3 className="text-xs font-bold text-white/80 group-hover:text-indigo-400 transition-colors truncate">
                  {v.title}
                </h3>
                <span className="text-[9px] font-semibold text-white/30 block mt-0.5">
                  {v.sources.length}个播放源
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="w-full py-20 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-sm text-white/40">检索系统激活中...</div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
