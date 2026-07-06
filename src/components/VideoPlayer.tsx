"use client";

import React, { useEffect, useRef, useState } from "react";

interface VideoPlayerProps {
  url: string;
  onTimeUpdate?: (currentTime: number) => void;
  initialTime?: number;
}

export default function VideoPlayer({ url, onTimeUpdate, initialTime = 0 }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setLoading(true);
    setError(false);

    // 动态加载 hls.js
    const scriptId = "hls-js-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const initHls = () => {
      // @ts-ignore
      if (window.Hls) {
        // @ts-ignore
        if (window.Hls.isSupported()) {
          // @ts-ignore
          const hls = new window.Hls({
            maxMaxBufferLength: 30,
            enableWorker: true,
          });
          hls.loadSource(url);
          hls.attachMedia(video);
          
          hls.on(
            // @ts-ignore
            window.Hls.Events.MANIFEST_PARSED,
            () => {
              setLoading(false);
              if (initialTime > 0) {
                video.currentTime = initialTime;
              }
              video.play().catch(() => {});
            }
          );

          hls.on(
            // @ts-ignore
            window.Hls.Events.ERROR,
            (event: any, data: any) => {
              if (data.fatal) {
                setError(true);
                setLoading(false);
              }
            }
          );

          return () => {
            hls.destroy();
          };
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          // 原生 Safari 支持
          video.src = url;
          video.addEventListener("loadedmetadata", () => {
            setLoading(false);
            if (initialTime > 0) {
              video.currentTime = initialTime;
            }
            video.play().catch(() => {});
          });
        } else {
          setError(true);
          setLoading(false);
        }
      }
    };

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://cdn.jsdelivr.net/npm/hls.js@latest";
      script.onload = initHls;
      document.head.appendChild(script);
    } else {
      initHls();
    }

    return () => {
      video.pause();
      video.src = "";
    };
  }, [url]);

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/5 group">
      <video
        ref={videoRef}
        controls
        playsInline
        className="w-full h-full object-contain"
        onTimeUpdate={() => {
          if (videoRef.current && onTimeUpdate) {
            onTimeUpdate(videoRef.current.currentTime);
          }
        }}
      />

      {/* 加载中骨架屏蒙版 */}
      {loading && (
        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-white/50 tracking-wider">正在并发解析多源播放流...</span>
        </div>
      )}

      {/* 错误降级蒙版 */}
      {error && (
        <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center gap-4 text-center px-4">
          <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          <div>
            <div className="text-sm font-bold text-white/90">该播放源暂时失效或响应超时</div>
            <div className="text-xs text-white/40 mt-1">请尝试切换右侧的其他播放源（如量子源、飞飞源等）</div>
          </div>
        </div>
      )}
    </div>
  );
}
