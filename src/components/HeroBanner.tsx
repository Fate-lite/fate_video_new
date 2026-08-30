"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { Video } from "@/lib/collector";

interface HeroBannerProps {
  bannerList: Video[];
}

export default function HeroBanner({ bannerList }: HeroBannerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const total = bannerList.length;

  const startTimer = () => {
    stopTimer();
    timerRef.current = setInterval(() => {
      handleNext();
    }, 5000); // 调整为更自然的 5 秒自动轮播
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  useEffect(() => {
    if (total > 1) {
      startTimer();
    }
    return () => stopTimer();
  }, [activeIndex, total]);

  const handleNext = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setActiveIndex((prev) => (prev + 1) % total);
    setTimeout(() => setIsTransitioning(false), 300); // 缩短状态切换锁定时间
  };

  const handlePrev = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setActiveIndex((prev) => (prev - 1 + total) % total);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const handleDotClick = (index: number) => {
    if (index === activeIndex || isTransitioning) return;
    setIsTransitioning(true);
    setActiveIndex(index);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  if (!bannerList || total === 0) return null;

  const activeVideo = bannerList[activeIndex];

  return (
    <div
      className="w-full rounded-3xl overflow-hidden relative glass-card border border-white/5 aspect-[16/9] md:aspect-[21/9] shadow-2xl flex items-end group"
      onMouseEnter={stopTimer}
      onMouseLeave={startTimer}
    >
      {/* 幻灯片背景图集合 (敏捷的淡入淡出动画) */}
      <div className="absolute inset-0 -z-10 bg-black">
        {bannerList.map((video, idx) => (
          <div
            key={video.id}
            className={`absolute inset-0 transition-all duration-700 ease-in-out ${
              idx === activeIndex ? "opacity-65 scale-100" : "opacity-0 scale-102"
            }`}
            style={{ transitionProperty: "opacity, transform" }}
          >
            <img
              src={video.pic}
              alt={video.title}
              className="w-full h-full object-cover filter brightness-[0.8] contrast-[1.05]"
            />
          </div>
        ))}
        {/* 高端影院级渐变层叠屏蔽，与全站极光背景天然融合 */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07050f] via-[#07050f]/35 to-black/45"></div>
        <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-[#07050f]/50 to-transparent hidden md:block"></div>
      </div>

      {/* 幻灯片内容区 (极其轻柔的淡入淡出过渡) */}
      <div className="p-8 md:p-14 w-full md:max-w-2xl select-none z-10">
        <div
          className={`transform transition-all duration-500 ease-out ${
            isTransitioning ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-gradient-to-r from-indigo-500/20 to-pink-500/20 text-indigo-200 border border-indigo-500/35 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              🎬 今日精选大片
            </span>
            {activeVideo.year && (
              <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-white/10 text-white/70">
                {activeVideo.year}
              </span>
            )}
            {activeVideo.area && (
              <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-white/10 text-white/70">
                {activeVideo.area}
              </span>
            )}
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-wide leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
            {activeVideo.title}
          </h1>
          <p className="text-xs md:text-sm text-white/70 mt-4 leading-relaxed line-clamp-2 md:line-clamp-3 drop-shadow-[0_1px_5px_rgba(0,0,0,0.6)] font-medium">
            {activeVideo.des ||
              "今日热播推荐，点击下方按钮开始高清解析播放。多源并发保障，去重过滤，为您提供极速流畅的观影体验。"}
          </p>
          <div className="flex items-center gap-4 mt-7">
            <Link
              href={`/play?title=${encodeURIComponent(activeVideo.title)}&type=${activeVideo.type}`}
              className="px-7 py-2.5 md:px-9 md:py-3 rounded-full text-xs font-black text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 shadow-xl shadow-indigo-600/30 hover:shadow-indigo-500/50 tracking-widest transition-all hover:scale-104 active:scale-95 duration-300 flex items-center gap-2"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              <span>立即播放</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 左右导航按钮 (带玻璃磨砂及高光描边) */}
      {total > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/40 hover:bg-indigo-600/80 border border-white/10 hover:border-indigo-500/50 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer hidden md:flex backdrop-blur-md shadow-2xl"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={handleNext}
            className="absolute right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/40 hover:bg-indigo-600/80 border border-white/10 hover:border-indigo-500/50 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer hidden md:flex backdrop-blur-md shadow-2xl"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* 底部小圆点指示器 (流光呼吸发光) */}
      {total > 1 && (
        <div className="absolute bottom-5 right-8 flex items-center gap-2 z-20">
          {bannerList.map((_, idx) => (
            <button
              key={idx}
              onClick={() => handleDotClick(idx)}
              className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer ${
                idx === activeIndex 
                  ? "w-6 bg-gradient-to-r from-indigo-500 to-pink-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]" 
                  : "w-1.5 bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
