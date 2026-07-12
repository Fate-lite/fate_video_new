"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { PlayDetailSkeleton } from "@/components/Skeletons";
import VideoPlayer from "@/components/VideoPlayer";
import type { Video } from "@/lib/collector";

function PlayContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const title = searchParams.get("title") || "";
  const type = searchParams.get("type") || "";

  const [loading, setLoading] = useState(true);
  const [video, setVideo] = useState<Video | null>(null);
  
  const [activeSourceIdx, setActiveSourceIdx] = useState(0);
  const [activeEpIdx, setActiveEpIdx] = useState(0);
  
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [showWarning, setShowWarning] = useState(true);

  // 1. 初始化拉取详情和收藏状态
  useEffect(() => {
    if (!title || !type) return;

    setLoading(true);
    fetch(`/api/video/detail?title=${encodeURIComponent(title)}&type=${type}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.video) {
          setVideo(data.video);
          setIsFavorited(data.isFavorited);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // 2. 初始化防骗警告横幅状态 (Session 缓存防骚扰)
    const hidden = sessionStorage.getItem("hide_safety_tip");
    if (hidden === "yes") {
      setShowWarning(false);
    }
  }, [title, type]);

  // 3. 上报播放历史逻辑
  const reportHistory = (progress: number) => {
    if (!user || !video) return;
    const currentGroup = video.sources[activeSourceIdx];
    const currentEp = currentGroup?.links[activeEpIdx];
    if (!currentEp) return;

    fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vid: video.id,
        title: video.title,
        pic: video.pic,
        site: currentGroup.sourceName,
        episode: currentEp.name,
        progress: Math.floor(progress),
      }),
    }).catch(() => {});
  };

  // 4. 一键切换追剧收藏
  const handleToggleFavorite = async () => {
    if (!user) {
      alert("请先登录账号，即可同步云端追剧！");
      return;
    }
    if (!video || favoriteLoading) return;

    setFavoriteLoading(true);
    try {
      const res = await fetch("/api/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vid: video.id,
          title: video.title,
          pic: video.pic,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsFavorited(data.isFavorited);
      }
    } catch {}
    setFavoriteLoading(false);
  };

  // 5. 关闭警告条
  const handleCloseWarning = () => {
    setShowWarning(false);
    sessionStorage.setItem("hide_safety_tip", "yes");
  };

  if (loading) {
    return <PlayDetailSkeleton />;
  }

  if (!video || video.sources.length === 0) {
    return (
      <div className="w-full text-center py-20 glass-card rounded-3xl border border-white/5 p-8">
        <h2 className="text-lg font-bold text-white/90">该影片未找到或资源已被删除</h2>
        <p className="text-xs text-white/30 mt-2">请尝试搜索其他关键词，或联系管理员添加采集源。</p>
      </div>
    );
  }

  const currentSource = video.sources[activeSourceIdx] || video.sources[0];
  const currentEpisode = currentSource?.links[activeEpIdx] || currentSource?.links[0];

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
      
      {/* 左侧：播放器与影片详情介绍 */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        
        {/* HLS 播放器 (影院流光溢彩氛围灯外罩) */}
        <div className="relative w-full aspect-video rounded-3xl overflow-hidden glass-card border border-white/10 shadow-[0_20px_50px_rgba(99,102,241,0.25)]">
          {/* 后置的高斯模糊氛围发光光晕 */}
          <div className="absolute -inset-10 bg-gradient-to-tr from-indigo-500/15 via-purple-500/10 to-pink-500/15 blur-3xl opacity-75 -z-10 pointer-events-none animate-pulse duration-[8000ms]"></div>
          
          {currentEpisode ? (
            <VideoPlayer
              url={currentEpisode.url}
              onTimeUpdate={(time) => {
                // 节流上报：每 10 秒上报一次进度，或在视频开始时上报
                if (Math.floor(time) % 10 === 0) {
                  reportHistory(time);
                }
              }}
            />
          ) : (
            <div className="w-full h-full bg-black/40 flex items-center justify-center text-xs text-white/30">
              该播放源下暂无集数链接
            </div>
          )}
        </div>

        {/* 精致防骗安全警示条 */}
        {showWarning && (
          <div className="w-full glass-card rounded-2xl p-4 bg-red-500/10 border border-red-500/20 backdrop-blur-md flex items-start justify-between gap-3 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-start gap-3">
              <span className="text-red-400 mt-0.5 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </span>
              <div className="text-[11px] md:text-xs text-red-200/80 leading-relaxed">
                <strong className="text-red-400 font-bold">防骗警示：</strong> 
                请勿轻信视频中内嵌的黄色水印广告、低俗跑马灯，切勿添加广告中的任何联系方式。防范网贷、杀猪盘及博彩诈骗！
              </div>
            </div>
            <button
              onClick={handleCloseWarning}
              className="text-red-400/40 hover:text-red-400 transition-colors p-1 rounded-full cursor-pointer shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        )}

        {/* 影视名称、信息与追剧收藏 */}
        <div className="glass-card rounded-2xl p-6 border border-white/5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-white">{video.title}</h1>
              <div className="flex flex-wrap gap-2 text-[10px] text-white/50 font-semibold mt-3">
                <span className="bg-white/5 px-2 py-0.5 rounded-md">{video.year}</span>
                <span className="bg-white/5 px-2 py-0.5 rounded-md">{video.area}</span>
                <span className="bg-white/5 px-2 py-0.5 rounded-md">{video.lang}</span>
                <span className="bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-500/20">
                  {video.type === "dianying" ? "电影" : video.type === "dianshi" ? "电视剧" : video.type === "zongyi" ? "综艺" : "动漫"}
                </span>
              </div>
            </div>

            {/* 心形追剧收藏键 (带跳动弹性动效) */}
            <button
              onClick={handleToggleFavorite}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold transition-all hover:scale-105 active:scale-95 duration-200 cursor-pointer select-none ${
                isFavorited
                  ? "bg-pink-500/15 border-pink-500/30 text-pink-400 hover:bg-pink-500/25"
                  : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-indigo-500/30"
              }`}
            >
              <span className={`transition-transform duration-300 ${isFavorited ? "scale-110 animate-[bounce_1.5s_infinite] text-pink-500" : "group-hover:scale-110"}`}>
                ♥
              </span>
              <span>{isFavorited ? "已追剧" : "追剧"}</span>
            </button>
          </div>

          <div className="border-t border-white/5 mt-6 pt-5 text-xs text-white/60 leading-relaxed flex flex-col gap-2">
            <div><strong className="text-white/40">导演：</strong>{video.director || "内详"}</div>
            <div><strong className="text-white/40">主演：</strong>{video.actor || "内详"}</div>
            <div className="mt-2 text-white/45 font-medium leading-relaxed">
              <strong className="text-white/40">简介：</strong>
              {video.des ? video.des.replace(/<[^>]+>/g, "") : "暂无剧情简介。"}
            </div>
          </div>
        </div>

      </div>

      {/* 右侧：集数列表与播放源切换 */}
      <div className="flex flex-col gap-4">
        
        {/* 1. 播放源切换 TAB */}
        <div className="glass-card rounded-2xl p-4 border border-white/5">
          <div className="text-xs font-extrabold text-white/40 mb-3 tracking-widest uppercase">选择解析播放源</div>
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
            {video.sources.map((src, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setActiveSourceIdx(idx);
                  setActiveEpIdx(0); // 切换源时默认回滚到第一集
                }}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                  activeSourceIdx === idx
                    ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white border-transparent shadow-lg shadow-indigo-500/20"
                    : "bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:text-white hover:border-indigo-500/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{src.sourceName}</span>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                    activeSourceIdx === idx ? "bg-white/20 text-white" : "bg-white/5 text-white/30"
                  }`}>{src.links.length}个播放流</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 2. 集数列表 */}
        <div className="glass-card rounded-2xl p-5 border border-white/5 flex-1 flex flex-col min-h-[300px]">
          <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
            <span className="text-xs font-extrabold text-white/40 tracking-widest uppercase">集数列表</span>
            <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">共 {currentSource?.links.length || 0} 集</span>
          </div>

          {/* 动态计算平均字符长度，如果包含长字数（例如综艺“第20260515期”）则自动降级为双列宽距排版 */}
          {(() => {
            const isLongEpName = currentSource?.links.some(ep => ep.name.length > 6);
            return (
              <div className={`overflow-y-auto max-h-[450px] pr-1 ${
                isLongEpName 
                  ? "grid grid-cols-2 gap-2" 
                  : "grid grid-cols-3 md:grid-cols-4 lg:grid-cols-3 gap-2"
              }`}>
                {currentSource?.links.map((ep, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveEpIdx(idx)}
                    title={ep.name}
                    className={`py-2.5 px-2 text-center rounded-xl text-xs font-black transition-all duration-300 truncate cursor-pointer border ${
                      activeEpIdx === idx
                        ? "bg-gradient-to-tr from-indigo-500 to-pink-500 text-white border-transparent shadow-lg shadow-indigo-500/35"
                        : "bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:text-white hover:border-indigo-500/30"
                    }`}
                  >
                    {ep.name}
                  </button>
                ))}
              </div>
            );
          })()}
        </div>


      </div>

    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<PlayDetailSkeleton />}>
      <PlayContent />
    </Suspense>
  );
}
