"use client";

import React, { useState, useEffect, useRef } from "react";
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

interface LogEntry {
  id: string;
  timestamp: string;
  level: "INFO" | "SUCCESS" | "WARN" | "ERROR";
  message: string;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [sourceList, setSourceList] = useState<SourceStatus[]>([]);
  const [cacheCount, setCacheCount] = useState(0);
  const [dbSizeFormatted, setDbSizeFormatted] = useState("0 Bytes");
  const [hotSearches, setHotSearches] = useState<HotSearch[]>([]);
  
  const [loadingStats, setLoadingStats] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // 实时采集日志状态与 Terminal 滚动容器引用
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const terminalBoxRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);

  // 拖拽排序与编辑新增源状态
  const [isSortingMode, setIsSortingMode] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  // 新增采集源表单
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");

  // 1. 初始化拉取统计和日志
  useEffect(() => {
    fetchStats();
    fetchLogs();

    // 开启日志每 3 秒自动刷新定时器
    const intervalId = setInterval(() => {
      if (isAuthenticated) {
        fetchLogs();
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [isAuthenticated]);

  // 日志改变时，自动且平稳地将控制台滚动到底部 (且防范页面大视口强行位移)
  useEffect(() => {
    const box = terminalBoxRef.current;
    if (box) {
      // 仅当用户没有手动往上翻阅（距离底部 50px 内）时，才自动滚到底部，体验极其自然友好
      const isAtBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 50;
      if (isAtBottom || !isUserScrollingRef.current) {
        box.scrollTop = box.scrollHeight;
      }
    }
  }, [logs]);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.status === 200) {
        const data = await res.json();
        if (data.success) {
          setCacheCount(data.stats.cacheCount);
          setDbSizeFormatted(data.stats.dbSizeFormatted);
          setSourceList(data.stats.sourceList);
          setHotSearches(data.stats.hotSearches);
          setIsAuthenticated(true);
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    }
    setLoadingStats(false);
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/admin/logs");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // 后端返回的是 unshift 的最新在最前，我们用 reverse 转过来在最下，利于终端向下滚动
          setLogs([...data.logs].reverse());
        }
      }
    } catch {}
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
        setAuthError(data.msg || "密码错误，拒绝访问");
      }
    } catch {
      setAuthError("网络故障，请求发送失败");
    }
    setAuthLoading(false);
  };

  // 3. 登出
  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      setIsAuthenticated(false);
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
        fetchStats();
        fetchLogs();
      } else {
        alert(data.msg || "清理失败");
      }
    } catch {
      alert("网络错误");
    }
    setActionLoading(null);
  };

  // 5. 手动触发后台自动采集与预热更新缓存
  const handleTriggerCollect = async () => {
    setActionLoading("collect");
    try {
      const res = await fetch("/api/admin/collect", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert("已成功在后台触发并发更新采集！您可以在右侧终端监视实时进度。");
        // 瞬时拉取日志以防空白
        fetchLogs();
      } else {
        alert(data.msg || "触发采集失败");
      }
    } catch {
      alert("接口网络超时");
    }
    setActionLoading(null);
  };

  // 6. 运行一键测速诊断
  const handleRunDiagnostic = async () => {
    setActionLoading("ping");
    try {
      const res = await fetch("/api/admin/diagnostic", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        fetchStats();
        fetchLogs();
      } else {
        alert(data.msg || "测速失败");
      }
    } catch {
      alert("接口网络超时");
    }
    setActionLoading(null);
  };

  // 7. 添加新采集源到当前暂存列表
  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceUrl.trim()) return;

    const url = newSourceUrl.trim();
    const name = newSourceName.trim() || new URL(url).hostname.replace("www.", "");
    
    // 检查重复
    if (sourceList.some((s) => s.url === url)) {
      alert("该采集源 URL 已经在列表中，请勿重复添加");
      return;
    }

    const newSrc: SourceStatus = {
      id: Math.floor(Math.random() * 100000),
      name,
      url,
      status: "Unknown",
      latency: null,
    };

    setSourceList([...sourceList, newSrc]);
    setNewSourceName("");
    setNewSourceUrl("");
  };

  // 8. 从暂存列表移除采集源
  const handleRemoveSource = (urlToRemove: string) => {
    if (!confirm("确定要在当前列表中移除该资源站配置吗？")) return;
    setSourceList(sourceList.filter((s) => s.url !== urlToRemove));
  };

  // 9. 拖拽排序逻辑事件处理器
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    
    const updated = [...sourceList];
    const [draggedItem] = updated.splice(draggedIndex, 1);
    updated.splice(index, 0, draggedItem);
    
    setSourceList(updated);
    setDraggedIndex(null);
  };

  // 10. 保存排序及更改后的采集源配置
  const handleSaveSortedSources = async () => {
    const urls = sourceList.map((s) => s.url);
    if (urls.length === 0) {
      alert("必须保留至少一个有效的采集源站！");
      return;
    }

    setActionLoading("save-sorted");
    try {
      const res = await fetch("/api/admin/save-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources: urls }),
      });
      const data = await res.json();
      if (data.success) {
        setIsSortingMode(false);
        fetchStats();
        fetchLogs();
      } else {
        alert(data.msg || "保存配置失败");
      }
    } catch {
      alert("保存失败，接口错误");
    }
    setActionLoading(null);
  };

  // 监听终端容器内部滚动状态，防范强制刷回底部
  const handleTerminalScroll = () => {
    const box = terminalBoxRef.current;
    if (box) {
      const isAtBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 30;
      isUserScrollingRef.current = !isAtBottom;
    }
  };

  // --- 渲染：未登录管理中心 ---
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

  // --- 渲染：主管理面板 ---
  return (
    <div className="w-full animate-in fade-in duration-500">
      
      {/* 头部信息栏 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-5 mb-8 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
            <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-indigo-500 to-pink-500"></span>
            <span>采集运维监控中心</span>
          </h1>
          <p className="text-xs text-white/40 mt-1">支持拖拽对采集源站进行实时排序，监测物理数据库与日志控制台</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs font-bold px-4 py-2 rounded-full border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-all select-none cursor-pointer self-start md:self-auto"
        >
          退出管理中心
        </button>
      </div>

      {loadingStats ? (
        <div className="w-full py-20 flex flex-col items-center justify-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-xs text-white/40 font-semibold animate-pulse">正在获取系统监控数据流，请稍后...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 左侧：采集源列表与拖拽排序管理 (宽占位) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* 顶层三卡片运维仪表盘 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* 缓存容量卡片 (新增手动预热采集功能) */}
              <div className="glass-card rounded-2xl p-5 border border-white/5 flex flex-col justify-between min-h-[160px] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 text-white/5 group-hover:text-indigo-500/10 transition-colors text-3xl font-black select-none">
                  DB
                </div>
                <div>
                  <div className="text-[10px] font-bold text-white/35 uppercase tracking-wide">缓存影片记录</div>
                  <div className="text-3xl font-black text-indigo-400 mt-2">{cacheCount} <span className="text-xs text-white/40 font-normal">部</span></div>
                </div>
                
                <div className="flex flex-col gap-2 mt-4">
                  <button
                    disabled={actionLoading !== null}
                    onClick={handleTriggerCollect}
                    className="w-full text-center py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-indigo-600/10"
                  >
                    {actionLoading === "collect" ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : null}
                    <span>⚡ 一键后台手动更新采集</span>
                  </button>
                  <button
                    disabled={actionLoading !== null}
                    onClick={() => handleClearCache("cache")}
                    className="w-full text-center py-1 rounded-lg border border-red-500/15 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-[10px] font-semibold transition-all cursor-pointer"
                  >
                    清除影视本地缓存
                  </button>
                </div>
              </div>

              {/* 物理库容量 */}
              <div className="glass-card rounded-2xl p-5 border border-white/5 flex flex-col justify-between min-h-[160px] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 text-white/5 group-hover:text-pink-500/10 transition-colors text-3xl font-black select-none">
                  SZ
                </div>
                <div>
                  <div className="text-[10px] font-bold text-white/35 uppercase tracking-wide">SQLite 整体物理容量</div>
                  <div className="text-3xl font-black text-pink-400 mt-2">{dbSizeFormatted}</div>
                </div>
                <button
                  disabled={actionLoading !== null}
                  onClick={() => handleClearCache("all")}
                  className="w-full text-center mt-4 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-[10px] font-bold transition-all cursor-pointer"
                >
                  一键重置全站数据
                </button>
              </div>

              {/* 采集源站 */}
              <div className="glass-card rounded-2xl p-5 border border-white/5 flex flex-col justify-between min-h-[160px] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 text-white/5 group-hover:text-green-500/10 transition-colors text-3xl font-black select-none">
                  API
                </div>
                <div>
                  <div className="text-[10px] font-bold text-white/35 uppercase tracking-wide">已配置采集源</div>
                  <div className="text-3xl font-black text-green-400 mt-2">{sourceList.length} <span className="text-xs text-white/40 font-normal">个</span></div>
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

            {/* 采集源列表控制面板 */}
            <div className="glass-card rounded-2xl p-5 border border-white/5 flex flex-col gap-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-3 gap-2">
                <div>
                  <span className="text-xs font-bold text-white/70 tracking-wider">
                    {isSortingMode ? "🔃 采集源站拖拽排序与编辑" : "采集源站状态监测与列表"}
                  </span>
                  <p className="text-[9px] text-white/30 mt-0.5">
                    {isSortingMode ? "按住源站卡片上下拖拽来调换抓取优先顺序" : "系统去重时将按照此列表中从上到下的顺序优先解析"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {!isSortingMode ? (
                    <button
                      onClick={() => setIsSortingMode(true)}
                      className="text-xs font-bold px-3 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/30 transition-all cursor-pointer"
                    >
                      排序与增删管理
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        disabled={actionLoading === "save-sorted"}
                        onClick={handleSaveSortedSources}
                        className="text-xs font-bold px-3 py-1 rounded-lg bg-green-500/20 text-green-400 border border-green-500/20 hover:bg-green-500/30 transition-all cursor-pointer flex items-center gap-1"
                      >
                        {actionLoading === "save-sorted" ? (
                          <div className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                        ) : null}
                        <span>保存更新</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsSortingMode(false);
                          fetchStats(); // 回滚
                        }}
                        className="text-xs font-bold px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all cursor-pointer"
                      >
                        取消
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 排序编辑模式特有：新增源输入框表单 */}
              {isSortingMode && (
                <form onSubmit={handleAddSource} className="grid grid-cols-1 md:grid-cols-5 gap-2 p-3 bg-white/5 rounded-xl border border-white/5 animate-in fade-in duration-300">
                  <input
                    type="text"
                    placeholder="源站名称 (如: 360资源)"
                    value={newSourceName}
                    onChange={(e) => setNewSourceName(e.target.value)}
                    className="md:col-span-2 bg-black/30 border border-white/5 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/30"
                  />
                  <input
                    type="url"
                    placeholder="XML/JSON API 地址"
                    value={newSourceUrl}
                    onChange={(e) => setNewSourceUrl(e.target.value)}
                    required
                    className="md:col-span-2 bg-black/30 border border-white/5 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/30"
                  />
                  <button
                    type="submit"
                    className="py-2 px-3 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-colors cursor-pointer"
                  >
                    ➕ 插入到末尾
                  </button>
                </form>
              )}

              {/* 列表渲染 (带拖拽属性) */}
              <div className="flex flex-col gap-2 max-h-[460px] overflow-y-auto pr-1">
                {sourceList.map((src, index) => (
                  <div
                    key={src.id}
                    draggable={isSortingMode}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={() => handleDrop(index)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                      isSortingMode
                        ? "bg-white/5 border-dashed border-indigo-500/20 cursor-grab hover:bg-indigo-500/5 hover:border-indigo-500/40"
                        : "bg-white/5 border-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate w-2/3 select-none">
                      {isSortingMode ? (
                        <span className="text-white/20 font-bold font-mono">☰</span>
                      ) : (
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          src.status === "Online" ? "bg-green-500 shadow-lg shadow-green-500/30" : src.status === "Offline" ? "bg-red-500" : "bg-white/20 animate-pulse"
                        }`}></span>
                      )}
                      
                      <span className="text-[10px] text-white/30 font-bold font-mono w-6 shrink-0 text-center bg-white/5 rounded">
                        #{index + 1}
                      </span>
                      
                      <span className="font-bold text-white/80 shrink-0">{src.name}</span>
                      <span className="text-[10px] text-white/35 truncate">{src.url}</span>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-3">
                      {isSortingMode ? (
                        <button
                          onClick={() => handleRemoveSource(src.url)}
                          className="text-[10px] font-bold px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 transition-colors cursor-pointer select-none"
                        >
                          ✕ 删除
                        </button>
                      ) : src.status === "Online" && src.latency !== null ? (
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

          {/* 右侧：采集运维日志监控控制台 */}
          <div className="flex flex-col gap-6">
            
            {/* 实时采集日志 Shell 控制台 (优化本地滚动机制，解决大页面拉扯抖动) */}
            <div className="glass-card rounded-3xl p-5 border border-white/5 flex flex-col min-h-[480px] bg-black/45 shadow-2xl relative overflow-hidden group">
              
              {/* 终端顶部标头 */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4 select-none">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500/40"></span>
                  <span className="w-3 h-3 rounded-full bg-yellow-500/40"></span>
                  <span className="w-3 h-3 rounded-full bg-green-500/40"></span>
                  <span className="text-[11px] font-bold text-white/50 font-mono ml-2">fate-system.log</span>
                </div>
                
                <span className="text-[9px] font-bold text-indigo-400/80 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">
                  Live Streaming
                </span>
              </div>

              {/* 终端控制台核心内容区 (监听滚动条变化，防抖优化) */}
              <div
                ref={terminalBoxRef}
                onScroll={handleTerminalScroll}
                className="flex-1 overflow-y-auto max-h-[380px] pr-1 font-mono text-[10px] leading-relaxed select-text flex flex-col gap-2 p-1 hide-scrollbar"
              >
                {logs.length === 0 ? (
                  <div className="text-white/20 italic p-4 text-center">暂无采集运行日志...</div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="transition-all duration-200">
                      <span className="text-white/30 select-none mr-2">[{log.timestamp}]</span>
                      <span className={`font-bold mr-2 ${
                        log.level === "SUCCESS" ? "text-green-400" : log.level === "WARN" ? "text-yellow-400" : log.level === "ERROR" ? "text-red-400" : "text-indigo-300"
                      }`}>
                        {log.level}
                      </span>
                      <span className="text-white/70">{log.message}</span>
                    </div>
                  ))
                )}
              </div>

              {/* 终端光标底栏 */}
              <div className="border-t border-white/5 pt-3.5 mt-3 select-none flex items-center justify-between text-[9px] text-white/35 font-mono">
                <div className="flex items-center gap-1">
                  <span>root@fate-video:~#</span>
                  <span className="w-1.5 h-3 bg-green-500 animate-[blink_1s_infinite]"></span>
                </div>
                <span>Buffered: {logs.length} items</span>
              </div>
            </div>

            {/* 用户热搜 */}
            <div className="glass-card rounded-2xl p-5 border border-white/5 flex flex-col justify-between">
              <div className="border-b border-white/5 pb-3 mb-4">
                <span className="text-xs font-bold text-white/70 tracking-wider">用户热搜词 Top 10</span>
              </div>
              
              {hotSearches.length === 0 ? (
                <div className="text-center py-6 text-xs text-white/20">暂无搜索热度数据</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {hotSearches.map((hot, idx) => (
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
                  
                  <button
                    disabled={actionLoading !== null}
                    onClick={() => handleClearCache("search")}
                    className="w-full text-center mt-3 py-1.5 rounded-lg border border-red-500/10 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-[10px] font-bold transition-all cursor-pointer"
                  >
                    ✕ 重置清除搜索热词
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>
      )}
      
      {/* 终端光标闪烁 CSS 定义 */}
      <style jsx global>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
