import React from "react";
import { getCategoryVideos } from "@/lib/collector";
import CategoryFilterList from "@/components/CategoryFilterList";

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
  
  // 列表页并发拉取较多数量的视频卡片 (例如前 80 个) 供前端高水准交叉过滤
  const list = await getCategoryVideos(type, 80);

  return (
    <CategoryFilterList initialList={list} typeName={typeName} />
  );
}
