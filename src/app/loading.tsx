"use client";

import React from "react";

export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 z-50 bg-[#07050e] flex flex-col items-center justify-center gap-4 select-none">
      
      {/* 彩虹流光旋转 Loading 环 */}
      <div className="relative w-16 h-16 flex items-center justify-center">
        {/* 背景光晕环 */}
        <div className="absolute inset-0 rounded-full border-4 border-white/5"></div>
        {/* 彩虹渐变动态流转环 */}
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-500 border-r-pink-500 animate-spin duration-700"></div>
        
        {/* 中心微缩呼吸光点 */}
        <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping"></div>
      </div>

      {/* 极简精致的 FATE.TV 霓虹闪烁字样占位 */}
      <div className="flex flex-col items-center gap-1.5 mt-2 animate-pulse">
        <span className="text-sm font-black tracking-widest text-white/80">
          FATE<span className="text-indigo-500 font-extrabold">.</span>TV
        </span>
        <span className="text-[10px] text-white/30 tracking-widest font-semibold uppercase">
          正在为您同步加载多源资源...
        </span>
      </div>

    </div>
  );
}
