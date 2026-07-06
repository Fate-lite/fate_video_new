import React from "react";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="w-full border-t border-white/5 py-8 mt-20 bg-slate-950/20 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
        <div>
          <div className="text-sm font-bold text-white/90">Fate Video 2.0</div>
          <div className="text-xs text-white/40 mt-1">跨多源高并发解析与去重聚合影视点播系统</div>
        </div>
        <div className="text-xs text-white/30">
          <p>© {year} Fate Video. All rights reserved.</p>
          <p className="mt-0.5">本站视频数据均来自各大公开网络资源站，仅供技术研究与学习交流。</p>
        </div>
      </div>
    </footer>
  );
}
