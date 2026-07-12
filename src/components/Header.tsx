"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";

export default function Header() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [searchWd, setSearchWd] = useState("");
  const [showSearch, setShowSearch] = useState(false); // 手机端展开状态
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);

  // 跳转处理，激活客户端 Loading
  const handleNavClick = (href: string) => {
    if (pathname === href) return;
    setIsNavigating(true);
  };

  // 监听点击外部关闭下拉框
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 播放收藏总数小气泡更新
  useEffect(() => {
    if (user) {
      fetch("/api/favorite")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.favorites) {
            setFavoritesCount(data.favorites.length);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchWd.trim()) return;
    router.push(`/search?wd=${encodeURIComponent(searchWd.trim())}`);
    setShowSearch(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full glass-card border-b border-white/5 backdrop-blur-md px-4 py-3 md:px-8">
      <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
        
        {/* 1. LOGO (升级为未来科技折线 F 图标与发光微缩 Capsule 药丸) */}
        <Link 
          href="/" 
          onClick={() => handleNavClick("/")} 
          className="flex items-center gap-3 shrink-0 group select-none"
        >
          <div className="relative flex items-center justify-center">
            {/* SVG 未来极光 F 图标 */}
            <svg 
              className="w-9 h-9 transform transition-all duration-500 group-hover:rotate-12 group-hover:scale-106 filter drop-shadow-[0_0_10px_rgba(168,85,247,0.55)]" 
              viewBox="0 0 100 100" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="logo-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="50%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              {/* 外圈未来渐变半透播放盾牌 */}
              <path d="M20 18 L80 18 L50 85 Z" fill="url(#logo-grad-1)" opacity="0.12" />
              {/* 核心科技折角 F 图形 */}
              <path d="M35 25 H72 L68 36 H47 L45 49 H63 L59 60 H42 L38 88 H28 Z" fill="url(#logo-grad-1)" />
            </svg>
            {/* 呼吸光环 */}
            <div className="absolute inset-0 rounded-full bg-indigo-500/5 blur-md -z-10 group-hover:bg-indigo-500/20 transition-all duration-500"></div>
          </div>
          
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-black tracking-wider text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:via-indigo-200 group-hover:to-pink-200 transition-all duration-300">
              FATE
            </span>
            {/* 极细致霓虹 Capsule 药丸标签 */}
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 group-hover:bg-pink-500/10 group-hover:text-pink-300 group-hover:border-pink-500/30 transition-all duration-500 uppercase tracking-widest shadow-[0_0_8px_rgba(99,102,241,0.15)]">
              TV
            </span>
          </div>
        </Link>

        {/* 2. 中间：横向滑动分类菜单 (手机端常驻，采用原生a标签跳转以完美触发 SSR 加载动效与骨架屏) */}
        <nav className="flex-1 overflow-x-auto hide-scrollbar flex items-center justify-start md:justify-center gap-6 text-sm font-semibold scroll-smooth select-none px-2">
          <a
            href="/"
            onClick={() => handleNavClick("/")}
            className={`py-1 shrink-0 transition-colors relative ${
              pathname === "/"
                ? "text-indigo-400 font-extrabold after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-4 after:h-0.5 after:bg-indigo-400 after:rounded-full"
                : "text-white/60 hover:text-white"
            }`}
          >
            精选
          </a>
          <a
            href="/list/dianying"
            onClick={() => handleNavClick("/list/dianying")}
            className={`py-1 shrink-0 transition-colors relative ${
              pathname === "/list/dianying"
                ? "text-indigo-400 font-extrabold after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-4 after:h-0.5 after:bg-indigo-400 after:rounded-full"
                : "text-white/60 hover:text-white"
            }`}
          >
            电影
          </a>
          <a
            href="/list/dianshi"
            onClick={() => handleNavClick("/list/dianshi")}
            className={`py-1 shrink-0 transition-colors relative ${
              pathname === "/list/dianshi"
                ? "text-indigo-400 font-extrabold after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-4 after:h-0.5 after:bg-indigo-400 after:rounded-full"
                : "text-white/60 hover:text-white"
            }`}
          >
            电视剧
          </a>
          <a
            href="/list/zongyi"
            onClick={() => handleNavClick("/list/zongyi")}
            className={`py-1 shrink-0 transition-colors relative ${
              pathname === "/list/zongyi"
                ? "text-indigo-400 font-extrabold after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-4 after:h-0.5 after:bg-indigo-400 after:rounded-full"
                : "text-white/60 hover:text-white"
            }`}
          >
            综艺
          </a>
          <a
            href="/list/dongman"
            onClick={() => handleNavClick("/list/dongman")}
            className={`py-1 shrink-0 transition-colors relative ${
              pathname === "/list/dongman"
                ? "text-indigo-400 font-extrabold after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-4 after:h-0.5 after:bg-indigo-400 after:rounded-full"
                : "text-white/60 hover:text-white"
            }`}
          >
            动漫
          </a>
        </nav>

        {/* 3. 右侧：搜索栏与登录区 (手机端紧凑设计，搜索紧贴登录头像) */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* PC 搜索栏 (聚焦时平滑伸缩并带霓虹投影) */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center bg-white/5 border border-white/10 rounded-full px-3.5 py-1.5 focus-within:border-indigo-500/40 focus-within:shadow-[0_0_15px_rgba(99,102,241,0.15)] focus-within:w-72 transition-all duration-500 ease-out w-56">
            <input
              type="text"
              placeholder="搜索影片、导演、主演..."
              value={searchWd}
              onChange={(e) => setSearchWd(e.target.value)}
              className="bg-transparent text-xs text-white placeholder-white/40 focus:outline-none w-full"
            />
            <button type="submit" className="text-white/40 hover:text-indigo-400 transition-colors cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </button>
          </form>

          {/* 手机端搜索按钮 (紧贴头像) */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="md:hidden p-2 text-white/70 hover:text-white hover:bg-white/5 rounded-full transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </button>

          {/* 登录/个人中心区 (紧密相连) */}
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse"></div>
          ) : user ? (
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white ring-2 ring-white/10 hover:ring-indigo-500/50 transition-all cursor-pointer"
              >
                {user.email.substring(0, 1).toUpperCase()}
              </button>

              {/* 个人中心下拉框 (毛玻璃霓虹卡片) */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-3 w-56 glass-card rounded-2xl p-2 border border-white/10 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-3 py-2 border-b border-white/5 text-xs">
                    <div className="text-white/40">已登录账号</div>
                    <div className="font-semibold text-white truncate mt-0.5">{user.email}</div>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/user/favorites"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center justify-between px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <span>我的追剧</span>
                      {favoritesCount > 0 && (
                        <span className="bg-pink-500 text-white font-bold px-1.5 py-0.5 rounded-full text-[10px]">
                          {favoritesCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      href="/user/history"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                      播放历史
                    </Link>
                  </div>
                  <div className="border-t border-white/5 pt-1">
                    <button
                      onClick={logout}
                      className="w-full text-left px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                    >
                      退出登录
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/auth"
              className="text-xs font-bold px-4 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-indigo-500/50 text-white transition-all tracking-wide shadow-sm"
            >
              登录
            </Link>
          )}

        </div>
      </div>

      {/* 手机端搜索浮出层 */}
      {showSearch && (
        <div className="md:hidden mt-2 p-2 bg-black/30 rounded-xl border border-white/5">
          <form onSubmit={handleSearchSubmit} className="flex items-center bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
            <input
              type="text"
              placeholder="输入片名、主角进行多源搜索..."
              value={searchWd}
              onChange={(e) => setSearchWd(e.target.value)}
              className="bg-transparent text-xs text-white placeholder-white/30 focus:outline-none w-full"
              autoFocus
            />
            <button type="submit" className="text-white/60 hover:text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </button>
          </form>
        </div>
      )}
    </header>
    
    {/* 客户端主动跳转 Loading 遮罩层 (毛玻璃霓虹极光流光环) */}
    {isNavigating && (
      <div className="fixed inset-0 z-[9999] bg-[#07050e]/80 backdrop-blur-md flex flex-col items-center justify-center gap-4 select-none animate-in fade-in duration-200">
        <div className="relative w-16 h-16 flex items-center justify-center">
          {/* 背景圆环 */}
          <div className="absolute inset-0 rounded-full border-4 border-white/5"></div>
          {/* 旋转流光环 */}
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-500 border-r-pink-500 animate-spin duration-700"></div>
          {/* 闪烁光点 */}
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping"></div>
        </div>
        <div className="flex flex-col items-center gap-1.5 mt-2 animate-pulse">
          <span className="text-sm font-black tracking-widest text-white/80">
            FATE<span className="text-indigo-500 font-extrabold">.</span>TV
          </span>
          <span className="text-[10px] text-white/30 tracking-widest font-semibold uppercase">
            正在为您同步加载最新资源...
          </span>
        </div>
      </div>
    )}
    </>
  );
}
