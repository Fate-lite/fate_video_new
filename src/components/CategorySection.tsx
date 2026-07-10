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
      className="group block relative overflow-hidden rounded-xl transition-all duration-300"
    >
      {/* 海报图层 */}
      <div className="aspect-[3/4] relative overflow-hidden rounded-xl bg-white/5 shadow-md group-hover:shadow-indigo-500/20 transition-all duration-300">
        <img
          src={v.pic || FALLBACK_IMG}
          alt={v.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = FALLBACK_IMG;
          }}
        />

        {/* 备注小角标 */}
        {v.note && (
          <span className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wide glass-card text-pink-400 bg-black/60 border border-white/10 scale-90 origin-top-right">
            {v.note}
          </span>
        )}

        {/* 悬停光晕蒙版 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2.5">
          <span className="text-[10px] font-bold text-indigo-300 tracking-wider">
            点击立刻播放
          </span>
        </div>
      </div>

      {/* 信息图层 */}
      <div className="mt-2.5 px-0.5">
        <h3 className="text-xs font-bold text-white/80 group-hover:text-indigo-400 transition-colors truncate">
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
