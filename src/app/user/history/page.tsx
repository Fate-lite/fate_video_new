"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

interface HistoryItem {
  id: number;
  vid: string;
  title: string;
  pic: string;
  site: string;
  episode: string;
  progress: number;
  updated_at: number;
}

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<HistoryItem[]>([]);

  useEffect(() => {
    if (!authLoading && user) {
      setLoading(true);
      fetch("/api/history")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.history) {
            setList(data.history);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading]);

  if (authLoading || (loading && list.length === 0)) {
    return (
      <div className="w-full py-20 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-sm text-white/40">加载播放历史记录中...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full max-w-md mx-auto my-20 text-center glass-card rounded-3xl border border-white/5 p-8">
        <h2 className="text-lg font-bold text-white/90">请先登录您的账号</h2>
        <p className="text-xs text-white/35 mt-2">登录后即可同步云端播放记录，并在所有设备同步播放历史。</p>
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
          <span>播放历史</span>
        </h1>
        <p className="text-xs text-white/40 mt-1">系统为您保存最近观看的 50 条视频记录</p>
      </div>

      {list.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center border border-white/5">
          <svg className="w-12 h-12 text-white/20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <h2 className="text-sm font-bold text-white/70 mt-4">暂无播放历史</h2>
          <p className="text-xs text-white/30 mt-1">您看过的视频会记录在这里，方便随时续播。</p>
          <Link
            href="/"
            className="inline-block mt-6 px-6 py-2 rounded-full text-xs font-bold text-indigo-400 border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10"
          >
            去首页逛逛
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {list.map((item) => (
            <div
              key={item.id}
              className="group glass-card rounded-2xl overflow-hidden border border-white/5 hover:border-indigo-500/20 transition-all flex flex-col"
            >
              {/* 海报 */}
              <div className="aspect-[3/4] relative overflow-hidden bg-white/5">
                <img
                  src={item.pic || "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=400&auto=format&fit=crop"}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=400&auto=format&fit=crop";
                  }}
                />
                
                {/* 观看至 xx 集的小贴条 */}
                <span className="absolute bottom-2 left-2 right-2 px-2 py-1 rounded-md text-[10px] font-bold glass-card text-indigo-300 bg-black/70 border border-white/10 truncate text-center">
                  已看: {item.episode}
                </span>
              </div>

              {/* 信息 */}
              <div className="p-3.5 flex flex-col justify-between flex-1 gap-2">
                <div>
                  <h3 className="text-xs font-bold text-white/80 group-hover:text-indigo-400 transition-colors truncate">
                    {item.title}
                  </h3>
                  <div className="text-[9px] text-white/30 truncate mt-1">
                    源: {item.site || "未知"}
                  </div>
                </div>

                <Link
                  href={`/play?title=${encodeURIComponent(item.title)}&type=dianying`} // 容错处理
                  className="w-full text-center py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-bold transition-all"
                >
                  继续续播 →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
