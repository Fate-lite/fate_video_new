import React from "react";
import { getCategoryVideos } from "@/lib/collector";
import CategorySection from "@/components/CategorySection";
import HeroBanner from "@/components/HeroBanner";

// 强制开启动态服务端渲染 (保证缓存有穿透时实时拉取更新)
export const revalidate = 3600; // 每隔 1 小时自动后台重新生成

export default async function Home() {
  // 1. 服务端并发抓取四大板块数据
  const [dianying, dianshi, zongyi, dongman] = await Promise.all([
    getCategoryVideos("dianying", 12),
    getCategoryVideos("dianshi", 12),
    getCategoryVideos("zongyi", 12),
    getCategoryVideos("dongman", 12),
  ]);

  // 2. 挑选出电影列表中前 6 个作为顶部的精选幻灯片 (Banner)
  const bannerList = dianying.slice(0, 6);

  return (
    <div className="w-full flex flex-col gap-8 md:gap-12">
      {/* 1. 精致自动轮播巨幕组件 (Hero Banner) */}
      <HeroBanner bannerList={bannerList} />

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
