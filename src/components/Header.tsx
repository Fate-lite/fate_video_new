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

  const profileRef = useRef<HTMLDivElement>(null);

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
    <header className="sticky top-0 z-50 w-full glass-card border-b border-white/5 backdrop-blur-md px-4 py-3 md:px-8">
      <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
        
        {/* 1. LOGO */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">
            F
          </div>
          <span className="text-xl font-black tracking-wider text-white">FATE<span className="text-indigo-400">.TV</span></span>
        </Link>

        {/* 2. 中间：横向滑动分类菜单 (手机端常驻，采用原生a标签跳转以完美触发 SSR 加载动效与骨架屏) */}
        <nav className="flex-1 overflow-x-auto hide-scrollbar flex items-center justify-start md:justify-center gap-6 text-sm font-semibold scroll-smooth select-none px-2">
          <a
            href="/"
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
          
          {/* PC 搜索栏 */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center bg-white/5 border border-white/10 rounded-full px-3 py-1.5 focus-within:border-indigo-500/50 transition-all w-60">
            <input
              type="text"
              placeholder="搜索影片、导演、主演..."
              value={searchWd}
              onChange={(e) => setSearchWd(e.target.value)}
              className="bg-transparent text-xs text-white placeholder-white/40 focus:outline-none w-full"
            />
            <button type="submit" className="text-white/40 hover:text-white transition-colors cursor-pointer">
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
  );
}
