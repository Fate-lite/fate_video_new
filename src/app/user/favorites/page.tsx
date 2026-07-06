"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

interface FavoriteItem {
  id: number;
  vid: string;
  title: string;
  pic: string;
  created_at: number;
}

export default function FavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    if (!authLoading && user) {
      setLoading(true);
      fetch("/api/favorite")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.favorites) {
            setList(data.favorites);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading]);

  // 取消追剧功能
  const handleRemoveFavorite = async (vid: string, title: string) => {
    if (!confirm(`确定要取消追剧《${title}》吗？`)) return;

    try {
      const res = await fetch("/api/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vid, title }),
      });
      const data = await res.json();
      if (data.success && !data.isFavorited) {
        setList(list.filter((item) => item.vid !== vid));
      }
    } catch {}
  };

  if (authLoading || (loading && list.length === 0)) {
    return (
      <div className="w-full py-20 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-sm text-white/40">加载我的追剧清单中...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full max-w-md mx-auto my-20 text-center glass-card rounded-3xl border border-white/5 p-8">
        <h2 className="text-lg font-bold text-white/90">请先登录您的账号</h2>
        <p className="text-xs text-white/35 mt-2">登录后即可同步云端追剧，在任意设备都不遗漏最新一集。</p>
        <Link
          href="/auth"
          className="inline-block mt-6 px-6 py-2.5 rounded-full text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20"
        >
          去登录
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="border-b border-white/5 pb-4 mb-8">
        <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
          <span>我的追剧</span>
        </h1>
        <p className="text-xs text-white/40 mt-1">云端为您珍藏并实时跟踪每一部心仪的好片</p>
      </div>

      {list.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center border border-white/5">
          <span className="text-4xl block text-white/10 mb-4">♥</span>
          <h2 className="text-sm font-bold text-white/70">还没有添加追剧收藏哦</h2>
          <p className="text-xs text-white/30 mt-1.5">在播放详情页点击“追剧”按钮，好片将永远汇聚在此处。</p>
          <Link
            href="/"
            className="inline-block mt-6 px-6 py-2 rounded-full text-xs font-bold text-indigo-400 border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10"
          >
            去搜寻好片
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {list.map((item) => (
            <div
              key={item.id}
              className="group block relative overflow-hidden rounded-2xl transition-all duration-300"
            >
              <div className="aspect-[3/4] relative overflow-hidden rounded-2xl bg-white/5 border border-white/5 group-hover:border-indigo-500/30 transition-all duration-300">
                <img
                  src={item.pic || "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=400&auto=format&fit=crop"}
                  alt={item.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=400&auto=format&fit=crop";
                  }}
                />

                {/* 点击进入播放 */}
                <Link
                  href={`/play?title=${encodeURIComponent(item.title)}&type=dianying`}
                  className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3"
                >
                  <span className="text-[10px] font-bold text-indigo-300 tracking-wider">点击开始播放</span>
                </Link>

                {/* 取消收藏按钮 */}
                <button
                  onClick={() => handleRemoveFavorite(item.vid, item.title)}
                  className="absolute top-2 right-2 p-1.5 rounded-md text-[9px] font-bold glass-card text-red-400 bg-black/60 border border-white/10 hover:text-white hover:bg-red-500/20 transition-all select-none cursor-pointer"
                >
                  ✕ 取消
                </button>
              </div>

              <div className="mt-2.5 px-1">
                <h3 className="text-xs font-bold text-white/80 group-hover:text-indigo-400 transition-colors truncate">
                  {item.title}
                </h3>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
