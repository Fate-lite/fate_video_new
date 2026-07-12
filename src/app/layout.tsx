import type { Metadata } from "next";
import { AuthProvider } from "@/components/AuthProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fate Video 2.0 - 跨多源高并发聚合去重视频系统",
  description: "采用 Next.js 14+ / Prisma SQLite / Node.js 异步非阻塞高并发采集与去重的全新聚合影视点播系统。",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/pwa-icon-192.png" />
      </head>
      <body className="min-h-full flex flex-col">
        {/* 全局极光背景晕染 */}
        <div className="aurora-backdrop"></div>
        <AuthProvider>
          <Header />
          <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-6">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
