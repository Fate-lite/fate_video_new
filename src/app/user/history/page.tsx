"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { VideoGridSkeleton } from "@/components/Skeletons";

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

const FALLBACK_IMG = "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=400&auto=format&fit=crop";

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<HistoryItem[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchHistory = () => {
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
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchHistory();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading]);

  // 删除单条
  const handleDeleteItem = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (actionLoading) return;
    setActionLoading(true);

    try {
      const res = await fetch("/api/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setList((prev) => prev.filter((item) => item.id !== id));
      }
    } catch {}
    setActionLoading(false);
  };

  // 一键清空
  const handleClearAll = async () => {
    if (!confirm("确定要清空全部播放历史记录吗？")) return;
    if (actionLoading) return;
    setActionLoading(true);

    try {
      const res = await fetch("/api/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearAll: true }),
      });
      const data = await res.json();
      if (data.success) {
        setList([]);
      }
    } catch {}
    setActionLoading(false);
  };

  if (!authLoading && !user) {
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
      <div className="border-b border-white/5 pb-4 mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
            <span>播放历史</span>
          </h1>
          <p className="text-xs text-white/40 mt-1">系统为您保存最近观看的 50 条视频记录</p>
        </div>

        {list.length > 0 && (
          <button
            onClick={handleClearAll}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white/60 hover:text-red-400 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 transition-all cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>清空全部</span>
          </button>
        )}
      </div>

      {authLoading || (loading && list.length === 0) ? (
        <div className="flex flex-col gap-6">
          <div className="text-xs text-white/40 font-semibold tracking-wider flex items-center gap-2 mb-2 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
            正在努力加载您的云端播放记录，请稍后...
          </div>
          <VideoGridSkeleton count={10} />
        </div>
      ) : list.length === 0 ? (
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
              className="group glass-card rounded-2xl overflow-hidden border border-white/5 hover:border-indigo-500/20 transition-all flex flex-col relative"
            >
              {/* 单条删除悬浮按钮 */}
              <button
                onClick={(e) => handleDeleteItem(e, item.id)}
                title="从历史中移除"
                className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/70 hover:bg-red-500/90 text-white/70 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer backdrop-blur-md border border-white/10"
              >
                ✕
              </button>

              {/* 海报 */}
              <div className="aspect-[3/4] relative overflow-hidden bg-white/5">
                <img
                  src={item.pic || FALLBACK_IMG}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = FALLBACK_IMG;
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
                  href={`/play?title=${encodeURIComponent(item.title)}&type=dianying`}
                  className="w-full text-center py-2 rounded-xl bg-gradient-to-r from-indigo-500/15 to-pink-500/15 hover:from-indigo-500/30 hover:to-pink-500/30 text-indigo-300 border border-indigo-500/20 text-xs font-black transition-all"
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
