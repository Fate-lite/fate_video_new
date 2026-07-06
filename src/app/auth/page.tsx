"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function AuthPage() {
  const { login, user } = useAuth();
  const router = useRouter();

  const [isLoginTab, setIsLoginTab] = useState(true);
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

  // 发送验证码
  const handleSendCode = async () => {
    if (!email) {
      setErrorMsg("请先输入您的邮箱地址");
      return;
    }
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type: "register" }),
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

  // 提交登录/注册
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!email || !password) {
      setErrorMsg("请填写所有必填信息");
      return;
    }
    if (!isLoginTab && !code) {
      setErrorMsg("注册账号必须填写邮箱验证码");
      return;
    }

    setLoading(true);
    const apiEndpoint = isLoginTab ? "/api/auth/login" : "/api/auth/register";
    const bodyPayload = isLoginTab ? { email, password } : { email, password, code };

    try {
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });
      const data = await res.json();
      setLoading(false);

      if (data.success) {
        setSuccessMsg(data.msg || (isLoginTab ? "登录成功！" : "注册成功，正在跳转登录..."));
        
        if (isLoginTab) {
          login(data.user);
          router.push("/");
        } else {
          // 注册成功自动切换到登录 TAB，并清空验证码
          setIsLoginTab(true);
          setCode("");
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
      <div className="glass-card rounded-3xl p-6 md:p-8 border border-white/5 shadow-2xl relative overflow-hidden">
        
        {/* 卡片流光斑点装饰 */}
        <div className="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-indigo-500/10 blur-xl"></div>
        <div className="absolute -bottom-12 -right-12 w-24 h-24 rounded-full bg-pink-500/10 blur-xl"></div>

        {/* 顶部 TAB 切换键 */}
        <div className="flex bg-white/5 rounded-2xl p-1 mb-8">
          <button
            onClick={() => {
              setIsLoginTab(true);
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isLoginTab ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" : "text-white/40 hover:text-white"
            }`}
          >
            账号登录
          </button>
          <button
            onClick={() => {
              setIsLoginTab(false);
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              !isLoginTab ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" : "text-white/40 hover:text-white"
            }`}
          >
            新用户注册
          </button>
        </div>

        {/* 标题 */}
        <div className="text-center mb-6">
          <h2 className="text-lg font-black text-white">{isLoginTab ? "欢迎回来" : "加入 Fate Video"}</h2>
          <p className="text-[10px] text-white/35 mt-1">云端保存播放历史，手机与电脑跨端同步</p>
        </div>

        {/* 错误与成功消息横幅 */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold">
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
            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wide mb-1.5">账户密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-white/5 border border-white/5 focus:border-indigo-500/40 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none transition-all"
            />
          </div>

          {/* 注册专属：验证码输入框 */}
          {!isLoginTab && (
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

          <button
            type="submit"
            disabled={loading}
            className="w-full neon-btn text-white font-bold py-2.5 rounded-xl text-xs tracking-wider transition-all mt-4 flex items-center justify-center cursor-pointer"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : isLoginTab ? (
              "安全登录"
            ) : (
              "同意协议并注册"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
