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
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  
  const [activeSourceIdx, setActiveSourceIdx] = useState(0);
  const [activeEpIdx, setActiveEpIdx] = useState(0);
  
  // 影院体验状态
  const [isCinemaMode, setIsCinemaMode] = useState(false); // 关灯模式
  const [isDescOrder, setIsDescOrder] = useState(false); // 倒序排序
  const [epGroupIdx, setEpGroupIdx] = useState(0); // 剧集分组分页索引 (每组 30 集)
  const EP_GROUP_SIZE = 30;

  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [showWarning, setShowWarning] = useState(true);

  // 1. 初始化拉取详情和同类推荐
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

    // 同类推荐拉取
    fetch(`/api/video/home`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          const matched = data.data[type] || data.data.dianying || [];
          setRelatedVideos(matched.filter((v: Video) => v.title !== title).slice(0, 6));
        }
      })
      .catch(() => {});

    // 防骗警告条状态
    const hidden = sessionStorage.getItem("hide_safety_tip");
    if (hidden === "yes") {
      setShowWarning(false);
    }
  }, [title, type]);

  // 当切换集数时，自动计算当前集数所在的分组
  useEffect(() => {
    if (video && video.sources[activeSourceIdx]) {
      const links = video.sources[activeSourceIdx].links;
      if (links.length > EP_GROUP_SIZE) {
        const targetGroup = Math.floor(activeEpIdx / EP_GROUP_SIZE);
        setEpGroupIdx(targetGroup);
      }
    }
  }, [activeEpIdx, activeSourceIdx, video]);

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
  const allLinks = currentSource?.links || [];
  
  // 剧集分组计算
  const totalEps = allLinks.length;
  const groupCount = Math.ceil(totalEps / EP_GROUP_SIZE);
  
  // 当前分组所包含的集数索引范围
  const startIdx = epGroupIdx * EP_GROUP_SIZE;
  const endIdx = Math.min(startIdx + EP_GROUP_SIZE, totalEps);
  
  // 生成当前组内的集数列表项（带全局真实索引）
  let displayEpisodes = allLinks.slice(startIdx, endIdx).map((ep, offset) => ({
    ep,
    realIdx: startIdx + offset,
  }));

  // 如果启用了倒序排列
  if (isDescOrder) {
    displayEpisodes = [...displayEpisodes].reverse();
  }

  const currentEpisode = allLinks[activeEpIdx] || allLinks[0];

  return (
    <div className="w-full flex flex-col gap-8 relative animate-in fade-in duration-500">
      
      {/* 影院关灯模式背景遮罩 */}
      {isCinemaMode && (
        <div 
          onClick={() => setIsCinemaMode(false)} 
          className="fixed inset-0 bg-black/90 z-40 backdrop-blur-sm transition-opacity duration-500 cursor-pointer"
          title="点击退出关灯模式"
        />
      )}

      {/* 主体两栏布局 */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-40">
        
        {/* 左侧：播放器与影片详情介绍 */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          
          {/* HLS 播放器 (影院流光溢彩氛围灯外罩) */}
          <div className={`relative w-full aspect-video rounded-3xl overflow-hidden glass-card border border-white/10 shadow-[0_20px_50px_rgba(99,102,241,0.25)] transition-all duration-500 ${
            isCinemaMode ? "z-50 ring-4 ring-indigo-500/50 scale-[1.01] shadow-[0_0_100px_rgba(99,102,241,0.5)]" : ""
          }`}>
            {/* 后置的高斯模糊氛围发光光晕 */}
            <div className="absolute -inset-10 bg-gradient-to-tr from-indigo-500/15 via-purple-500/10 to-pink-500/15 blur-3xl opacity-75 -z-10 pointer-events-none animate-pulse duration-[8000ms]"></div>
            
            {currentEpisode ? (
              <VideoPlayer
                url={currentEpisode.url}
                onTimeUpdate={(time) => {
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

          {/* 播放器下方快捷操作工具条（关灯、集数状态、追剧等） */}
          <div className="flex items-center justify-between px-2 text-xs text-white/60">
            <div className="flex items-center gap-3">
              <span className="text-white font-bold truncate max-w-[200px] md:max-w-[350px]">
                正在播放：{currentEpisode?.name || "第 1 集"}
              </span>
              <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                {currentSource?.sourceName || "默认源"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* 关灯/开灯模式切换按钮 */}
              <button
                onClick={() => setIsCinemaMode(!isCinemaMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-bold transition-all cursor-pointer select-none ${
                  isCinemaMode
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                    : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                <span>{isCinemaMode ? "💡 开灯" : "🌙 关灯"}</span>
              </button>
            </div>
          </div>

          {/* 精致防骗安全警示条 */}
          {showWarning && !isCinemaMode && (
            <div className="w-full glass-card rounded-2xl p-4 bg-red-500/10 border border-red-500/20 backdrop-blur-md flex items-start justify-between gap-3 animate-in slide-in-from-bottom duration-300">
              <div className="flex items-start gap-3">
                <span className="text-red-400 mt-0.5 shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                </span>
                <div className="text-[11px] md:text-xs text-red-200/80 leading-relaxed">
                  <strong className="text-red-400 font-bold">防骗警示：</strong> 
                  请勿轻信视频中内嵌的水印广告、低俗跑马灯，切勿添加广告中的任何联系方式。防范网贷、杀猪盘及博彩诈骗！
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
          {!isCinemaMode && (
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
                    {video.typeName && (
                      <span className="bg-pink-500/10 text-pink-300 px-2 py-0.5 rounded-md border border-pink-500/20">
                        {video.typeName}
                      </span>
                    )}
                  </div>
                </div>

                {/* 心形追剧收藏键 */}
                <button
                  onClick={handleToggleFavorite}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold transition-all hover:scale-105 active:scale-95 duration-200 cursor-pointer select-none ${
                    isFavorited
                      ? "bg-pink-500/15 border-pink-500/30 text-pink-400 hover:bg-pink-500/25"
                      : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-indigo-500/30"
                  }`}
                >
                  <span className={`transition-transform duration-300 ${isFavorited ? "scale-110 text-pink-500" : "group-hover:scale-110"}`}>
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
          )}

        </div>

        {/* 右侧：集数列表与播放源切换 */}
        <div className={`flex flex-col gap-4 ${isCinemaMode ? "opacity-30 hover:opacity-100 transition-opacity" : ""}`}>
          
          {/* 1. 播放源切换 TAB */}
          <div className="glass-card rounded-2xl p-4 border border-white/5">
            <div className="text-xs font-extrabold text-white/40 mb-3 tracking-widest uppercase">选择解析播放源</div>
            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
              {video.sources.map((src, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveSourceIdx(idx);
                    setActiveEpIdx(0);
                    setEpGroupIdx(0);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                    activeSourceIdx === idx
                      ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white border-transparent shadow-lg shadow-indigo-500/20"
                      : "bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:text-white hover:border-indigo-500/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{src.sourceName}</span>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                      activeSourceIdx === idx ? "bg-white/20 text-white" : "bg-white/5 text-white/30"
                    }`}>{src.links.length} 集</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. 集数列表 (支持分段折叠分页与正倒序切换) */}
          <div className="glass-card rounded-2xl p-5 border border-white/5 flex-1 flex flex-col min-h-[350px]">
            
            {/* 顶栏控制：标题、排序与集数统计 */}
            <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-white/40 tracking-widest uppercase">选集列表</span>
                <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                  共 {totalEps} 集
                </span>
              </div>

              {/* 正序/倒序切换键 */}
              {totalEps > 1 && (
                <button
                  onClick={() => setIsDescOrder(!isDescOrder)}
                  className="flex items-center gap-1 text-[11px] font-bold text-white/50 hover:text-indigo-400 transition-colors px-2 py-1 rounded-lg hover:bg-white/5 cursor-pointer"
                  title="切换排序"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                  <span>{isDescOrder ? "倒序" : "正序"}</span>
                </button>
              )}
            </div>

            {/* 剧集分页分组选择器 (当总集数大于 30 集时触发) */}
            {groupCount > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-3 mb-2 border-b border-white/5">
                {Array.from({ length: groupCount }).map((_, gIdx) => {
                  const gStart = gIdx * EP_GROUP_SIZE + 1;
                  const gEnd = Math.min((gIdx + 1) * EP_GROUP_SIZE, totalEps);
                  const isCurrentGroup = epGroupIdx === gIdx;
                  return (
                    <button
                      key={gIdx}
                      onClick={() => setEpGroupIdx(gIdx)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black shrink-0 transition-all cursor-pointer border ${
                        isCurrentGroup
                          ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300 shadow-sm shadow-indigo-500/20"
                          : "bg-white/5 border-white/5 text-white/50 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {gStart}-{gEnd}
                    </button>
                  );
                })}
              </div>
            )}

            {/* 动态网格排版 */}
            {(() => {
              const isLongEpName = allLinks.some((ep) => ep.name.length > 6);
              return (
                <div className={`overflow-y-auto max-h-[420px] pr-1 ${
                  isLongEpName 
                    ? "grid grid-cols-2 gap-2" 
                    : "grid grid-cols-3 md:grid-cols-4 lg:grid-cols-3 gap-2"
                }`}>
                  {displayEpisodes.map(({ ep, realIdx }) => (
                    <button
                      key={realIdx}
                      onClick={() => setActiveEpIdx(realIdx)}
                      title={ep.name}
                      className={`py-2.5 px-2 text-center rounded-xl text-xs font-black transition-all duration-300 truncate cursor-pointer border ${
                        activeEpIdx === realIdx
                          ? "bg-gradient-to-tr from-indigo-500 to-pink-500 text-white border-transparent shadow-lg shadow-indigo-500/35 scale-[1.02]"
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

      {/* 底部：猜你喜欢 / 同类影片精选推荐 */}
      {!isCinemaMode && relatedVideos.length > 0 && (
        <div className="w-full glass-card rounded-3xl p-6 md:p-8 border border-white/5 flex flex-col gap-5 mt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-5 rounded-full bg-gradient-to-b from-indigo-500 to-pink-500"></span>
              <h2 className="text-base md:text-lg font-black text-white">猜你喜欢 · 同类精选</h2>
            </div>
            <span className="text-xs text-white/40 font-semibold">精彩连连 看不够</span>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-4">
            {relatedVideos.map((item) => (
              <a
                key={item.id}
                href={`/play?title=${encodeURIComponent(item.title)}&type=${item.type}`}
                className="group block relative overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="aspect-[2/3] relative overflow-hidden rounded-2xl bg-white/5 border border-white/5 shadow-md group-hover:border-indigo-500/40 group-hover:shadow-[0_10px_30px_rgba(99,102,241,0.3)] transition-all">
                  {item.pic ? (
                    <img
                      src={item.pic}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-106 group-hover:brightness-90"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-white/30">无图</div>
                  )}
                  {item.note && (
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-black/60 backdrop-blur-md text-pink-400 border border-pink-500/20 scale-90 origin-top-right">
                      {item.note}
                    </span>
                  )}
                </div>
                <h3 className="text-xs font-bold text-white/80 mt-2 truncate group-hover:text-indigo-400 transition-colors">
                  {item.title}
                </h3>
              </a>
            ))}
          </div>
        </div>
      )}

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
