import React from "react";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="w-full border-t border-white/5 py-8 mt-20 bg-slate-950/20 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 flex items-center justify-center text-center">
        <div className="text-xs text-white/30 leading-relaxed">
          <p>© {year} Fate Video. All rights reserved.</p>
          <p className="mt-1">本站视频数据均来自各大公开网络资源站，仅供技术研究与学习交流。</p>
        </div>
      </div>
    </footer>
  );
}
