"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface SourceStatus {
  id: number;
  name: string;
  url: string;
  status: string;
  latency: number | null;
}

interface HotSearch {
  wd: string;
  count: number;
}

interface AdminStats {
  cacheCount: number;
  dbSizeFormatted: string;
  sourceCount: number;
  sourceList: SourceStatus[];
  hotSearches: HotSearch[];
}

export default function AdminPage() {
  const router = useRouter();
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // 编辑采集源状态
  const [editingSources, setEditingSources] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // 1. 挂载时尝试获取统计数据（测试 Cookie 是否有效）
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.status === 200) {
        const data = await res.json();
        if (data.success) {
          setStats(data.stats);
          setIsAuthenticated(true);
          // 将源列表解析为每行一个的文本形式
          const urlsText = data.stats.sourceList.map((s: any) => s.url).join("\n");
          setEditingSources(urlsText);
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    }
    setLoadingStats(false);
  };

  // 2. 登录认证
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
        fetchStats();
      } else {
        setAuthError(data.msg || "认证失败，请重试");
      }
    } catch {
      setAuthError("网络错误，认证请求失败");
    }
    setAuthLoading(false);
  };

  // 3. 退出后台
  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      setIsAuthenticated(false);
      setStats(null);
      setPassword("");
    } catch {}
  };

  // 4. 清理缓存或历史
  const handleClearCache = async (type: "cache" | "search" | "all") => {
    const confirmMsg = 
      type === "cache" 
        ? "确定要清理全部已下载的影视 API 缓存数据吗？" 
        : type === "search"
        ? "确定要清空全部用户的搜索热度历史吗？"
        : "确定要一键初始化清空所有缓存与历史吗？";
    
    if (!confirm(confirmMsg)) return;

    setActionLoading("clear");
    try {
      const res = await fetch("/api/admin/clear-cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.msg || "清理成功！");
        fetchStats();
      } else {
        alert(data.msg || "清理失败");
      }
    } catch {
      alert("网络连接异常");
    }
    setActionLoading(null);
  };

  // 5. 运行一键测速诊断
  const handleRunDiagnostic = async () => {
    setActionLoading("ping");
    try {
      const res = await fetch("/api/admin/diagnostic", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert(data.msg || "测速诊断完成！");
        fetchStats();
      } else {
        alert(data.msg || "诊断失败");
      }
    } catch {
      alert("测速接口网络超时");
    }
    setActionLoading(null);
  };

  // 6. 保存采集源
  const handleSaveSources = async () => {
    const lines = editingSources
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    
    if (lines.length === 0) {
      alert("必须保留至少一个有效的采集源站！");
      return;
    }

    setActionLoading("save");
    try {
      const res = await fetch("/api/admin/save-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources: lines }),
      });
      const data = await res.json();
      if (data.success) {
        alert("配置已更新，下次采集将自动使用新源站！");
        setIsEditing(false);
        fetchStats();
      } else {
        alert(data.msg || "保存失败");
      }
    } catch {
      alert("网络错误");
    }
    setActionLoading(null);
  };

  // --- 渲染：未登录状态 ---
  if (!isAuthenticated) {
    return (
      <div className="w-full max-w-md mx-auto my-16 md:my-28">
        <div className="glass-card rounded-3xl p-6 md:p-8 border border-white/5 shadow-2xl relative overflow-hidden text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center font-black text-white text-lg mx-auto shadow-lg shadow-indigo-500/30 mb-6 select-none">
            F
          </div>
          <h2 className="text-xl font-black text-white tracking-wide">FATE.TV 运维管理中心</h2>
          <p className="text-xs text-white/35 mt-1.5 mb-8">极速高并发，免登录数据缓存状态流控制</p>

          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold animate-in fade-in duration-200">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input
              type="password"
              placeholder="请输入后台管理员安全密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              className="w-full bg-white/5 border border-white/5 focus:border-indigo-500/40 rounded-xl px-4 py-3 text-xs text-white text-center placeholder-white/30 focus:outline-none transition-all"
            />
            <button
              type="submit"
              disabled={authLoading}
              className="w-full neon-btn text-white font-bold py-3 rounded-xl text-xs tracking-wider transition-all mt-2 cursor-pointer flex items-center justify-center"
            >
              {authLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                "验 证 登 录"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- 渲染：已登录状态的主面板 ---
  return (
    <div className="w-full animate-in fade-in duration-500">
      
      {/* 头部导航区域 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-5 mb-8 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
            <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-indigo-500 to-pink-500 animate-pulse"></span>
            <span>采集运维监控中心</span>
          </h1>
          <p className="text-xs text-white/40 mt-1">动态监测 SQLite 数据库容量，一键清空高强度缓冲，配置极速采集源</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs font-bold px-4 py-2 rounded-full border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-all select-none cursor-pointer self-start md:self-auto"
        >
          退出管理中心
        </button>
      </div>

      {loadingStats || !stats ? (
        <div className="w-full py-20 flex flex-col items-center justify-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-xs text-white/40 font-semibold animate-pulse">正在获取系统监控数据流，请稍后...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 左侧主要运维控制面板 */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* 三栏状态统计网格 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* 缓存统计卡片 */}
              <div className="glass-card rounded-2xl p-5 border border-white/5 flex flex-col justify-between min-h-[140px] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 text-white/5 group-hover:text-indigo-500/10 transition-colors text-3xl font-black select-none">
                  DB
                </div>
                <div>
                  <div className="text-[10px] font-bold text-white/35 uppercase tracking-wide">缓存影片记录</div>
                  <div className="text-3xl font-black text-indigo-400 mt-2">{stats.cacheCount} <span className="text-xs text-white/40 font-normal">部</span></div>
                </div>
                <button
                  disabled={actionLoading !== null}
                  onClick={() => handleClearCache("cache")}
                  className="w-full text-center mt-4 py-1.5 rounded-lg border border-red-500/10 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-[10px] font-bold transition-all cursor-pointer"
                >
                  一键清空影视缓存
                </button>
              </div>

              {/* 物理库统计卡片 */}
              <div className="glass-card rounded-2xl p-5 border border-white/5 flex flex-col justify-between min-h-[140px] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 text-white/5 group-hover:text-pink-500/10 transition-colors text-3xl font-black select-none">
                  SZ
                </div>
                <div>
                  <div className="text-[10px] font-bold text-white/35 uppercase tracking-wide">SQLite 整体物理容量</div>
                  <div className="text-3xl font-black text-pink-400 mt-2">{stats.dbSizeFormatted}</div>
                </div>
                <button
                  disabled={actionLoading !== null}
                  onClick={() => handleClearCache("all")}
                  className="w-full text-center mt-4 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-[10px] font-bold transition-all cursor-pointer"
                >
                  一键重置全站数据
                </button>
              </div>

              {/* 采集源统计卡片 */}
              <div className="glass-card rounded-2xl p-5 border border-white/5 flex-1 flex flex-col justify-between min-h-[140px] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 text-white/5 group-hover:text-green-500/10 transition-colors text-3xl font-black select-none">
                  API
                </div>
                <div>
                  <div className="text-[10px] font-bold text-white/35 uppercase tracking-wide">已配置采集源</div>
                  <div className="text-3xl font-black text-green-400 mt-2">{stats.sourceCount} <span className="text-xs text-white/40 font-normal">个</span></div>
                </div>
                <button
                  disabled={actionLoading !== null}
                  onClick={handleRunDiagnostic}
                  className="w-full text-center mt-4 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  {actionLoading === "ping" ? (
                    <div className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : null}
                  <span>一键运行并发测速诊断</span>
                </button>
              </div>

            </div>

            {/* 采集源在线状态列表监控 */}
            <div className="glass-card rounded-2xl p-5 border border-white/5">
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                <span className="text-xs font-bold text-white/70 tracking-wider">采集源站状态监测快照</span>
                <span className="text-[10px] text-white/30 font-semibold">健康状态显示为最近一次测速延迟</span>
              </div>
              
              <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1">
                {stats.sourceList.map((src) => (
                  <div
                    key={src.id}
                    className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-xs hover:border-white/10 transition-all"
                  >
                    <div className="flex items-center gap-2.5 truncate w-2/3">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        src.status === "Online" ? "bg-green-500 shadow-lg shadow-green-500/30" : src.status === "Offline" ? "bg-red-500" : "bg-white/20 animate-pulse"
                      }`}></span>
                      <span className="font-bold text-white/80 shrink-0">{src.name}</span>
                      <span className="text-[10px] text-white/35 truncate">{src.url}</span>
                    </div>

                    <div className="text-right shrink-0">
                      {src.status === "Online" && src.latency !== null ? (
                        <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                          src.latency < 500 ? "text-green-400 bg-green-500/10" : src.latency < 1500 ? "text-warning bg-warning/10" : "text-danger bg-danger/10"
                        }`}>
                          {src.latency}ms
                        </span>
                      ) : src.status === "Offline" ? (
                        <span className="font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded text-[10px]">超时离线</span>
                      ) : (
                        <span className="font-semibold text-white/20 px-2 py-0.5 rounded text-[10px]">待诊断</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* 右侧边栏：在线编辑源站 & 热搜排行 */}
          <div className="flex flex-col gap-6">
            
            {/* 在线编辑源站面板 */}
            <div className="glass-card rounded-2xl p-5 border border-white/5 flex flex-col min-h-[300px]">
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                <span className="text-xs font-bold text-white/70 tracking-wider">在线编辑采集源 (Hot Edit)</span>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    ✏️ 编辑
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveSources}
                      disabled={actionLoading === "save"}
                      className="text-[10px] font-bold text-green-400 hover:text-green-300 transition-colors cursor-pointer"
                    >
                      💾 保存
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        const urlsText = stats.sourceList.map((s) => s.url).join("\n");
                        setEditingSources(urlsText);
                      }}
                      className="text-[10px] font-bold text-white/40 hover:text-white transition-colors cursor-pointer"
                    >
                      取消
                    </button>
                  </div>
                )}
              </div>

              {!isEditing ? (
                <div className="flex-1 overflow-y-auto max-h-[220px] bg-black/15 rounded-xl border border-white/5 p-3.5 text-[10px] text-white/50 leading-relaxed font-mono whitespace-pre-wrap select-text select-none">
                  {stats.sourceList.map((s) => s.url).join("\n")}
                </div>
              ) : (
                <textarea
                  value={editingSources}
                  onChange={(e) => setEditingSources(e.target.value)}
                  placeholder="请输入资源站 XML/JSON API 接口地址，每行填写一个以 http 或 https 开始的地址"
                  className="flex-1 w-full bg-black/35 border border-white/5 focus:border-indigo-500/30 rounded-xl p-3.5 text-[10px] text-indigo-300 font-mono focus:outline-none resize-none leading-relaxed min-h-[200px]"
                />
              )}
              <div className="text-[9px] text-white/30 mt-3.5 leading-relaxed bg-white/5 rounded-lg p-2.5">
                <strong className="text-indigo-300">温馨提示：</strong>
                在线修改并保存后将实时写入 `data/sources.json` 文件中，缓存清空或下次拉取时立即生效，无需重启或重新编译 Next.js！
              </div>
            </div>

            {/* 用户热门检索排行榜 */}
            <div className="glass-card rounded-2xl p-5 border border-white/5 flex-1">
              <div className="border-b border-white/5 pb-3 mb-4">
                <span className="text-xs font-bold text-white/70 tracking-wider">用户热搜词 Top 10</span>
              </div>
              
              {stats.hotSearches.length === 0 ? (
                <div className="text-center py-8 text-xs text-white/20">暂无热度搜索历史记录</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {stats.hotSearches.map((hot, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs py-2 px-3 bg-white/5 rounded-lg"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className={`w-4 h-4 rounded-md text-[9px] font-bold flex items-center justify-center ${
                          idx === 0 ? "bg-pink-500/20 text-pink-400" : idx === 1 ? "bg-indigo-500/20 text-indigo-400" : idx === 2 ? "bg-green-500/20 text-green-400" : "bg-white/5 text-white/40"
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-white/80 truncate">{hot.wd}</span>
                      </div>
                      <span className="text-[10px] font-bold text-white/30 shrink-0">{hot.count} 次</span>
                    </div>
                  ))}
                  
                  {stats.hotSearches.length > 0 && (
                    <button
                      disabled={actionLoading !== null}
                      onClick={() => handleClearCache("search")}
                      className="w-full text-center mt-3 py-1.5 rounded-lg border border-red-500/10 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-[10px] font-bold transition-all cursor-pointer"
                    >
                      ✕ 重置清除搜索热榜
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
