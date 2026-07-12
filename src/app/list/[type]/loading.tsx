"use client";

import React from "react";

export default function CategoryLoading() {
  // 模拟大厅 24 个海报卡片的骨架占位
  const skeletonCards = Array.from({ length: 24 });

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8 py-6 flex flex-col gap-6 animate-pulse">
      
      {/* 栏目头部骨架 */}
      <div className="border-b border-white/5 pb-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          {/* 左侧彩色指示条骨架 */}
          <div className="w-1.5 h-6 rounded-full bg-indigo-500/30"></div>
          {/* 大标题骨架 */}
          <div className="h-7 w-32 rounded-lg bg-white/5"></div>
        </div>
        {/* 副标题骨架 */}
        <div className="h-4 w-64 rounded-md bg-white/5"></div>
      </div>

      {/* 精致的毛玻璃分类筛选面板骨架 */}
      <div className="glass-card rounded-2xl p-4 md:p-5 border border-white/5 flex flex-col gap-5">
        
        {/* 年份行骨架 */}
        <div className="flex items-center gap-4">
          <div className="h-4 w-12 rounded bg-white/5 shrink-0"></div>
          <div className="flex flex-wrap gap-2 overflow-hidden">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-6 w-14 rounded-full bg-white/5"></div>
            ))}
          </div>
        </div>

        {/* 类型行骨架 */}
        <div className="flex items-start gap-4 border-t border-white/5 pt-4">
          <span className="h-4 w-12 rounded bg-white/5 shrink-0 py-1"></span>
          <div className="flex flex-wrap gap-2 overflow-hidden">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-6 w-14 rounded-full bg-white/5"></div>
            ))}
          </div>
        </div>

        {/* 地区行骨架 */}
        <div className="flex items-start gap-4 border-t border-white/5 pt-4">
          <span className="h-4 w-12 rounded bg-white/5 shrink-0 py-1"></span>
          <div className="flex flex-wrap gap-2 overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-6 w-14 rounded-full bg-white/5"></div>
            ))}
          </div>
        </div>

        {/* 版本行骨架 */}
        <div className="flex items-start gap-4 border-t border-white/5 pt-4">
          <span className="h-4 w-12 rounded bg-white/5 shrink-0 py-1"></span>
          <div className="flex flex-wrap gap-2 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-6 w-14 rounded-full bg-white/5"></div>
            ))}
          </div>
        </div>

      </div>

      {/* 排序条与筛选结果状态提示骨架 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1 mt-2">
        {/* 结果数量骨架 */}
        <div className="h-4 w-40 rounded bg-white/5"></div>
        {/* 排序按钮组骨架 */}
        <div className="h-7 w-48 rounded-lg bg-white/5"></div>
      </div>

      {/* 影视卡片网格骨架 */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-5">
        {skeletonCards.map((_, index) => (
          <div 
            key={index} 
            className="flex flex-col gap-2 rounded-2xl overflow-hidden glass-card p-1.5 border border-white/5"
          >
            {/* 电影海报比例骨架 (2:3) */}
            <div className="relative aspect-[2/3] w-full rounded-xl bg-white/5 overflow-hidden flex items-center justify-center">
              {/* 光影流动渐变条 */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer"></div>
            </div>
            {/* 影片标题占位骨架 */}
            <div className="h-4 w-3/4 rounded bg-white/5 mt-1"></div>
            {/* 影片更新状态占位骨架 */}
            <div className="h-3.5 w-1/2 rounded bg-white/5"></div>
          </div>
        ))}
      </div>

    </div>
  );
}
