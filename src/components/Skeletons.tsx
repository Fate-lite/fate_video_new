import React from "react";

// 单个视频卡片骨架
export function VideoCardSkeleton() {
  return (
    <div className="w-full flex flex-col gap-2.5 animate-pulse">
      {/* 比例与海报图一致 */}
      <div className="aspect-[3/4] rounded-2xl bg-white/5 border border-white/5 relative overflow-hidden">
        {/* 流光渐变扫描效果 */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
      </div>
      {/* 标题占位 */}
      <div className="h-3 bg-white/10 rounded-md w-3/4 mx-0.5"></div>
    </div>
  );
}

// 视频网格排版骨架 (支持定义展示数量)
export function VideoGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-5">
      {Array.from({ length: count }).map((_, idx) => (
        <VideoCardSkeleton key={idx} />
      ))}
    </div>
  );
}

// 整个板块骨架 (含标题栏与卡片网格)
export function SectionSkeleton() {
  return (
    <div className="mt-12 flex flex-col gap-6 animate-pulse">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-5 rounded-full bg-white/15"></div>
          <div className="h-4 bg-white/10 rounded-md w-24"></div>
        </div>
        <div className="h-3 bg-white/5 rounded-md w-12"></div>
      </div>
      <VideoGridSkeleton />
    </div>
  );
}

// 顶部幻灯片巨幕骨架
export function HeroBannerSkeleton() {
  return (
    <div className="w-full rounded-3xl overflow-hidden glass-card border border-white/5 aspect-[16/9] md:aspect-[21/9] flex items-end p-6 md:p-12 animate-pulse relative">
      <div className="absolute inset-0 -z-10 bg-white/5"></div>
      <div className="flex flex-col gap-3 w-full md:max-w-2xl">
        <div className="h-4 bg-white/10 rounded-md w-16"></div>
        <div className="h-8 bg-white/15 rounded-md w-1/2 mt-1"></div>
        <div className="h-3 bg-white/10 rounded-md w-3/4 mt-2"></div>
        <div className="h-3 bg-white/10 rounded-md w-2/3"></div>
        <div className="h-9 bg-white/15 rounded-full w-28 mt-4"></div>
      </div>
    </div>
  );
}

// 播放详情页骨架
export function PlayDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-pulse">
      {/* 左侧：播放器与影片信息 */}
      <div className="lg:col-span-3 flex flex-col gap-4">
        {/* 播放器比例 16:9 */}
        <div className="aspect-video w-full bg-white/5 rounded-2xl border border-white/5"></div>
        
        {/* 标题 */}
        <div className="h-6 bg-white/15 rounded-md w-1/3 mt-2"></div>
        <div className="h-4 bg-white/10 rounded-md w-1/2"></div>
        
        {/* 操作栏 */}
        <div className="flex gap-3 mt-1">
          <div className="h-8 bg-white/10 rounded-full w-20"></div>
          <div className="h-8 bg-white/10 rounded-full w-24"></div>
        </div>
      </div>

      {/* 右侧：播放列表与侧边栏 */}
      <div className="flex flex-col gap-4">
        <div className="h-5 bg-white/15 rounded-md w-24 mb-1"></div>
        <div className="glass-card rounded-2xl p-4 border border-white/5 flex flex-col gap-3">
          <div className="h-4 bg-white/10 rounded-md w-1/2"></div>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="h-8 bg-white/5 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
