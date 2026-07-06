import React from "react";
import Link from "next/link";
import { getCategoryVideos } from "@/lib/collector";

export const revalidate = 3600; // 缓存 1 小时自动后台重新生成

interface ListPageProps {
  params: Promise<{
    type: string;
  }>;
}

export default async function ListPage({ params }: ListPageProps) {
  const { type } = await params;
  
  // 转换分类名称为中文友好名
  const getTypeName = (t: string) => {
    switch (t) {
      case "dianying": return "电影";
      case "dianshi": return "电视剧";
      case "zongyi": return "综艺";
      case "dongman": return "动漫";
      default: return "电影";
    }
  };

  const typeName = getTypeName(type);
  
  // 列表页并发拉取更多数量的视频卡片 (例如前 36 个)
  const list = await getCategoryVideos(type, 36);

  return (
    <div className="w-full">
      {/* 栏目头部 */}
      <div className="border-b border-white/5 pb-4 mb-8">
        <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
          <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-indigo-500 to-pink-500"></span>
          <span>{typeName}大厅</span>
        </h1>
        <p className="text-xs text-white/40 mt-1">聚合多源去重，为您实时呈递最新上线的优质{typeName}资源</p>
      </div>

      {list.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center border border-white/5 text-white/30 text-xs">
          暂无该栏目视频数据，请联系管理员配置采集源
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {list.map((v) => (
            <Link
              key={v.id}
              href={`/play?title=${encodeURIComponent(v.title)}&type=${v.type}`}
              className="group block relative overflow-hidden rounded-2xl transition-all duration-300"
            >
              <div className="aspect-[3/4] relative overflow-hidden rounded-2xl bg-white/5 border border-white/5 group-hover:border-indigo-500/30 transition-all duration-300">
                <img
                  src={v.pic || "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=400&auto=format&fit=crop"}
                  alt={v.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=400&auto=format&fit=crop";
                  }}
                />

                {v.note && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[9px] font-bold glass-card text-pink-400 bg-black/60 border border-white/10 scale-90 origin-top-right">
                    {v.note}
                  </span>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                  <span className="text-[10px] font-bold text-indigo-300 tracking-wider">点击开始播放</span>
                </div>
              </div>

              <div className="mt-2.5 px-1">
                <h3 className="text-xs font-bold text-white/80 group-hover:text-indigo-400 transition-colors truncate">
                  {v.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
