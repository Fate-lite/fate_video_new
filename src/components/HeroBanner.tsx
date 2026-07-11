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
    }, 6000); // 6秒自动轮播
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
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const handlePrev = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setActiveIndex((prev) => (prev - 1 + total) % total);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const handleDotClick = (index: number) => {
    if (index === activeIndex || isTransitioning) return;
    setIsTransitioning(true);
    setActiveIndex(index);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  if (!bannerList || total === 0) return null;

  const activeVideo = bannerList[activeIndex];

  return (
    <div
      className="w-full rounded-3xl overflow-hidden relative glass-card border border-white/5 aspect-[16/9] md:aspect-[21/9] shadow-2xl flex items-end group"
      onMouseEnter={stopTimer}
      onMouseLeave={startTimer}
    >
      {/* 幻灯片背景图集合 (带柔和淡入淡出动画) */}
      <div className="absolute inset-0 -z-10 bg-black">
        {bannerList.map((video, idx) => (
          <div
            key={video.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              idx === activeIndex ? "opacity-40 scale-100" : "opacity-0 scale-105"
            }`}
            style={{ transitionProperty: "opacity, transform" }}
          >
            <img
              src={video.pic}
              alt={video.title}
              className="w-full h-full object-cover filter blur-[2px] brightness-75 scale-102"
            />
          </div>
        ))}
        {/* 精致暗黑渐变层叠 */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#060713] via-[#060713]/30 to-black/40"></div>
      </div>

      {/* 幻灯片内容区 (带平移动画) */}
      <div className="p-6 md:p-12 w-full md:max-w-2xl select-none">
        <div
          className={`transform transition-all duration-500 ease-out ${
            isTransitioning ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100"
          }`}
        >
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-widest">
            今日精选
          </span>
          <h1 className="text-2xl md:text-4xl font-extrabold text-white mt-3 tracking-wide truncate">
            {activeVideo.title}
          </h1>
          <p className="text-xs md:text-sm text-white/60 mt-3 leading-relaxed line-clamp-2 md:line-clamp-3">
            {activeVideo.des ||
              "今日热播推荐，点击下方按钮开始高清解析播放。多源并发保障，去重过滤，为您提供极速流畅的观影体验。"}
          </p>
          <div className="flex items-center gap-4 mt-6">
            <Link
              href={`/play?title=${encodeURIComponent(activeVideo.title)}&type=${activeVideo.type}`}
              className="px-6 py-2 md:px-8 md:py-2.5 rounded-full text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 tracking-wider transition-all hover:scale-105 active:scale-95 duration-200"
            >
              立即播放
            </Link>
          </div>
        </div>
      </div>

      {/* 左右导航按钮 (PC端悬停显现) */}
      {total > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/35 hover:bg-black/60 border border-white/10 text-white/60 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer hidden md:flex"
          >
            <span className="text-sm font-black">←</span>
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/35 hover:bg-black/60 border border-white/10 text-white/60 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer hidden md:flex"
          >
            <span className="text-sm font-black">→</span>
          </button>
        </>
      )}

      {/* 底部小圆点指示器 */}
      {total > 1 && (
        <div className="absolute bottom-4 right-6 flex items-center gap-2 z-20">
          {bannerList.map((_, idx) => (
            <button
              key={idx}
              onClick={() => handleDotClick(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                idx === activeIndex ? "w-5 bg-indigo-500" : "w-1.5 bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
