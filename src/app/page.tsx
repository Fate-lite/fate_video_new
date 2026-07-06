import React from "react";
import Link from "next/link";
import { getCategoryVideos, Video } from "@/lib/collector";

// 强制开启动态服务端渲染 (保证缓存有穿透时实时拉取更新)
export const revalidate = 3600; // 每隔 1 小时自动后台重新生成

interface CategorySectionProps {
  title: string;
  keyName: string;
  videos: Video[];
}

function CategorySection({ title, keyName, videos }: CategorySectionProps) {
  return (
    <section className="mt-12">
      <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-6">
        <h2 className="text-lg font-extrabold tracking-wide text-white/90 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-gradient-to-b from-indigo-500 to-pink-500"></span>
          {title}
        </h2>
        <Link
          href={`/list/${keyName}`}
          className="text-xs font-semibold text-white/40 hover:text-indigo-400 transition-colors flex items-center gap-0.5"
        >
          查看更多 <span className="text-[10px]">→</span>
        </Link>
      </div>

      {videos.length === 0 ? (
        <div className="glass-card rounded-2xl py-12 text-center text-xs text-white/30 border border-white/5">
          暂无影视数据，请检查资源站在线状态
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-5">
          {videos.map((v) => (
            <Link
              key={v.id}
              href={`/play?title=${encodeURIComponent(v.title)}&type=${v.type}`}
              className="group block relative overflow-hidden rounded-xl transition-all duration-300"
            >
              {/* 海报图层 */}
              <div className="aspect-[3/4] relative overflow-hidden rounded-xl bg-white/5 shadow-md group-hover:shadow-indigo-500/20 transition-all duration-300">
                <img
                  src={v.pic || "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=400&auto=format&fit=crop"}
                  alt={v.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    // 降级占位图
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=400&auto=format&fit=crop";
                  }}
                />
                
                {/* 备注小角标 (如：高清/更新至xx集) */}
                {v.note && (
                  <span className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wide glass-card text-pink-400 bg-black/60 border border-white/10 scale-90 origin-top-right">
                    {v.note}
                  </span>
                )}

                {/* 悬停光晕蒙版 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2.5">
                  <span className="text-[10px] font-bold text-indigo-300 tracking-wider">点击立刻播放</span>
                </div>
              </div>

              {/* 信息图层 */}
              <div className="mt-2.5 px-0.5">
                <h3 className="text-xs font-bold text-white/80 group-hover:text-indigo-400 transition-colors truncate">
                  {v.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export default async function Home() {
  // 1. 服务端并发抓取四大板块数据
  const [dianying, dianshi, zongyi, dongman] = await Promise.all([
    getCategoryVideos("dianying", 12),
    getCategoryVideos("dianshi", 12),
    getCategoryVideos("zongyi", 12),
    getCategoryVideos("dongman", 12),
  ]);

  // 2. 挑选出电影列表中前4个作为顶部的精选幻灯片 (Banner)
  const bannerList = dianying.slice(0, 4);

  return (
    <div className="w-full">
      {/* 1. 精致毛玻璃巨幕幻灯片 (Hero Banner) */}
      {bannerList.length > 0 && (
        <div className="w-full rounded-3xl overflow-hidden relative glass-card border border-white/5 aspect-[16/9] md:aspect-[21/9] shadow-2xl flex items-end">
          {/* 幻灯片背景图 */}
          <div className="absolute inset-0 -z-10">
            <img
              src={bannerList[0].pic}
              alt="Hero Banner"
              className="w-full h-full object-cover filter blur-sm scale-105 opacity-40 brightness-75"
            />
            {/* 暗黑渐变叠加 */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#060713] via-transparent to-black/30"></div>
          </div>

          {/* 幻灯片文字详情区 */}
          <div className="p-6 md:p-12 w-full md:max-w-2xl animate-in fade-in duration-700">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-widest">
              今日精选
            </span>
            <h1 className="text-2xl md:text-4xl font-extrabold text-white mt-3 tracking-wide">
              {bannerList[0].title}
            </h1>
            <p className="text-xs md:text-sm text-white/60 mt-3 leading-relaxed line-clamp-2 md:line-clamp-3">
              {bannerList[0].des || "今日热播推荐，点击下方按钮开始高清解析播放。多源并发保障，去重过滤，为您提供极速流畅的观影体验。"}
            </p>
            <div className="flex items-center gap-4 mt-6">
              <Link
                href={`/play?title=${encodeURIComponent(bannerList[0].title)}&type=${bannerList[0].type}`}
                className="px-6 py-2 md:px-8 md:py-2.5 rounded-full text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 tracking-wider transition-all"
              >
                立即播放
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 2. 电影板块 */}
      <CategorySection title="热播电影" keyName="dianying" videos={dianying} />

      {/* 3. 电视剧板块 */}
      <CategorySection title="热播电视剧" keyName="dianshi" videos={dianshi} />

      {/* 4. 综艺板块 */}
      <CategorySection title="热播综艺" keyName="zongyi" videos={zongyi} />

      {/* 5. 动漫板块 */}
      <CategorySection title="热播动漫" keyName="dongman" videos={dongman} />
    </div>
  );
}
