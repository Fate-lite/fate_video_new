"use client";

import React from "react";
import Link from "next/link";
import type { Video } from "@/lib/collector";

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=400&auto=format&fit=crop";

export function VideoCard({ v }: { v: Video }) {
  return (
    <Link
      key={v.id}
      href={`/play?title=${encodeURIComponent(v.title)}&type=${v.type}`}
      className="group block relative overflow-hidden rounded-2xl transition-all duration-500 ease-out hover:-translate-y-1"
    >
      {/* 海报图层 (带高阶圆角与细腻内白边) */}
      <div className="aspect-[2/3] relative overflow-hidden rounded-2xl bg-white/5 border border-white/5 shadow-lg group-hover:shadow-[0_12px_40px_-15px_rgba(99,102,241,0.4)] group-hover:border-indigo-500/30 transition-all duration-500">
        <img
          src={v.pic || FALLBACK_IMG}
          alt={v.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-106 group-hover:brightness-90"
          onError={(e) => {
            (e.target as HTMLImageElement).src = FALLBACK_IMG;
          }}
        />

        {/* 霓虹磨砂质感角标 */}
        {v.note && (
          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg text-[9px] font-black tracking-widest glass-card text-pink-400 border border-pink-500/20 scale-90 origin-top-right">
            {v.note}
          </span>
        )}

        {/* 极光扫光流光图层 */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none"></div>

        {/* 正中心磨砂播放按钮 (弹性缩放弹入动效) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-white/15 border border-white/25 backdrop-blur-md flex items-center justify-center shadow-2xl transform scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1)">
            {/* 播放三角图标 */}
            <svg 
              className="w-5 h-5 text-white ml-0.5 drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* 底部霓虹渐变蒙版 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
          <span className="text-[10px] font-black text-indigo-300 tracking-widest uppercase">
            点击立刻播放
          </span>
        </div>
      </div>

      {/* 影片标题 (悬停时平滑变为彩虹渐变色) */}
      <div className="mt-3 px-1">
        <h3 className="text-xs font-bold text-white/80 transition-colors duration-300 truncate group-hover:text-indigo-400">
          {v.title}
        </h3>
      </div>
    </Link>
  );
}

interface CategorySectionProps {
  title: string;
  keyName: string;
  videos: Video[];
}

export default function CategorySection({
  title,
  keyName,
  videos,
}: CategorySectionProps) {
  return (
    <section className="mt-12">
      <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-6">
        <h2 className="text-lg font-extrabold tracking-wide text-white/90 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-gradient-to-b from-indigo-500 to-pink-500"></span>
          {title}
        </h2>
        <Link
          href={`/list/${keyName}`}
          className="text-xs font-semibold text-white/40 hover:text-indigo-400 transition-colors flex items-center gap-0.5"
        >
          查看更多 <span className="text-[10px]">→</span>
        </Link>
      </div>

      {videos.length === 0 ? (
        <div className="glass-card rounded-2xl py-12 text-center text-xs text-white/30 border border-white/5">
          暂无影视数据，请检查资源站在线状态
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-5">
          {videos.map((v) => (
            <VideoCard key={v.id} v={v} />
          ))}
        </div>
      )}
    </section>
  );
}
