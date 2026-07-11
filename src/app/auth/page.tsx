"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

type AuthMode = "login" | "register" | "reset";

export default function AuthPage() {
  const { login, user } = useAuth();
  const router = useRouter();

  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [countdown, setCountdown] = useState(0);

  // 若已登录，则自动重定向至首页
  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user]);

  // 倒计时计时器
  useEffect(() => {
    if (countdown > 0) {
      const id = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(id);
    }
  }, [countdown]);

  // 重置消息横幅
  const clearMessages = () => {
    setErrorMsg("");
    setSuccessMsg("");
  };

  // 发送验证码 (支持 register 和 reset)
  const handleSendCode = async () => {
    if (!email) {
      setErrorMsg("请先输入您的邮箱地址");
      return;
    }
    clearMessages();

    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type: authMode === "reset" ? "reset" : "register" }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.msg || "验证码已成功发至您的邮箱");
        setCountdown(60);
      } else {
        setErrorMsg(data.msg || "验证码发送失败");
      }
    } catch {
      setErrorMsg("网络请求失败，请稍后重试");
    }
  };

  // 提交登录/注册/密码重置
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!email || !password) {
      setErrorMsg("请填写所有必填信息");
      return;
    }
    if (authMode !== "login" && !code) {
      setErrorMsg("必须填写邮箱验证码");
      return;
    }

    setLoading(true);

    let apiEndpoint = "/api/auth/login";
    let bodyPayload: any = { email, password };

    if (authMode === "register") {
      apiEndpoint = "/api/auth/register";
      bodyPayload = { email, password, code };
    } else if (authMode === "reset") {
      apiEndpoint = "/api/auth/reset-password";
      bodyPayload = { email, password, code };
    }

    try {
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });
      const data = await res.json();
      setLoading(false);

      if (data.success) {
        if (authMode === "login") {
          setSuccessMsg(data.msg || "登录成功！");
          login(data.user);
          router.push("/");
        } else if (authMode === "register") {
          setSuccessMsg(data.msg || "注册成功，正在跳转登录...");
          setAuthMode("login");
          setCode("");
        } else {
          setSuccessMsg(data.msg || "密码已成功重置，请登录！");
          setAuthMode("login");
          setCode("");
          setPassword("");
        }
      } else {
        setErrorMsg(data.msg || "操作失败");
      }
    } catch {
      setLoading(false);
      setErrorMsg("网络错误，操作未能完成");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto my-12 md:my-20">
      <div className="glass-card rounded-3xl p-6 md:p-8 border border-white/5 shadow-2xl relative overflow-hidden transition-all duration-300">
        
        {/* 卡片流光斑点装饰 */}
        <div className="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-indigo-500/10 blur-xl"></div>
        <div className="absolute -bottom-12 -right-12 w-24 h-24 rounded-full bg-pink-500/10 blur-xl"></div>

        {/* 顶部 TAB 切换键 */}
        {authMode !== "reset" ? (
          <div className="flex bg-white/5 rounded-2xl p-1 mb-8">
            <button
              onClick={() => {
                setAuthMode("login");
                clearMessages();
              }}
              className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                authMode === "login" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" : "text-white/40 hover:text-white"
              }`}
            >
              账号登录
            </button>
            <button
              onClick={() => {
                setAuthMode("register");
                clearMessages();
              }}
              className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                authMode === "register" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" : "text-white/40 hover:text-white"
              }`}
            >
              新用户注册
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => {
                setAuthMode("login");
                clearMessages();
              }}
              className="text-xs text-white/60 hover:text-white transition-colors flex items-center gap-1 cursor-pointer font-semibold"
            >
              <span>←</span> 返回登录
            </button>
            <span className="text-xs font-extrabold text-indigo-400">重置账号密码</span>
          </div>
        )}

        {/* 标题 */}
        <div className="text-center mb-6">
          <h2 className="text-lg font-black text-white">
            {authMode === "login" ? "欢迎回来" : authMode === "register" ? "加入 Fate Video" : "找回您的账户密码"}
          </h2>
          <p className="text-[10px] text-white/35 mt-1">
            {authMode === "reset" ? "通过发送验证码确认安全凭证" : "云端保存播放历史，手机与电脑跨端同步"}
          </p>
        </div>

        {/* 错误与成功消息横幅 */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold animate-in fade-in duration-200">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold animate-in fade-in duration-200">
            {successMsg}
          </div>
        )}

        {/* 表单域 */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wide mb-1.5">邮箱地址</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              className="w-full bg-white/5 border border-white/5 focus:border-indigo-500/40 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wide mb-1.5">
              {authMode === "reset" ? "设定的新密码" : "账户密码"}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-white/5 border border-white/5 focus:border-indigo-500/40 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none transition-all"
            />
          </div>

          {/* 注册/重置专属：验证码输入框 */}
          {authMode !== "login" && (
            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wide mb-1.5">邮箱验证码</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="6位数字"
                  maxLength={6}
                  required
                  className="w-full bg-white/5 border border-white/5 focus:border-indigo-500/40 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  disabled={countdown > 0}
                  onClick={handleSendCode}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    countdown > 0
                      ? "bg-white/5 border border-white/5 text-white/30 cursor-not-allowed"
                      : "bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20"
                  }`}
                >
                  {countdown > 0 ? `${countdown}s` : "获取验证码"}
                </button>
              </div>
            </div>
          )}

          {/* 登录专属：忘记密码快捷入口 */}
          {authMode === "login" && (
            <div className="flex justify-end -mt-2">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("reset");
                  clearMessages();
                }}
                className="text-[10px] font-semibold text-white/40 hover:text-indigo-400 transition-colors cursor-pointer"
              >
                忘记密码？
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full neon-btn text-white font-bold py-2.5 rounded-xl text-xs tracking-wider transition-all mt-4 flex items-center justify-center cursor-pointer"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : authMode === "login" ? (
              "安全登录"
            ) : authMode === "register" ? (
              "同意协议并注册"
            ) : (
              "确 认 重 置"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
