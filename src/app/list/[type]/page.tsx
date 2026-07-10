import React from "react";
import { getCategoryVideos } from "@/lib/collector";
import { VideoCard } from "@/components/CategorySection";

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
            <VideoCard key={v.id} v={v} />
          ))}
        </div>
      )}
    </div>
  );
}
