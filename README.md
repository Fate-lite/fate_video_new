# Fate Video 2.0 (Next.js 全栈重构版)

Fate Video 2.0 是一套现代化、支持超高并发、智能多源去重融合的影视点播系统。
本项目已彻底抛弃传统的 PHP 串行阻塞架构，采用 **Next.js 14+ / TypeScript / Prisma ORM / TailwindCSS / SQLite** 进行重构。
原 PHP 稳定版本已完整归档并在 `main` 分支中予以保留。

---

## ⚡️ 核心架构优势
* **超高并发多源抓取 (Promise.all)**：彻底告别 PHP 版的串行阻塞，异步并行采集、测速并融合同步，首屏秒开！
* **双 SQLite 数据库物理隔离**：
  * `data/fate.db` (影视缓存库)：由 Prisma 智能缓存 API 大量数据，可随时清空。
  * `data/user.db` (核心账户库)：存放用户、观看历史、追剧收藏，物理完全独立，**清理影视缓存绝对不会伤及任何用户信息**！
* **API 与 UI 彻底解耦**：在 `src/app/api/` 下暴露规范的 JSON 接口，为未来平滑对接 iOS/Android App 和小程序提供完美土壤。
* **极客暗黑毛玻璃美学 (Sleek Dark Mode)**：采用暗黑星云、高斯模糊毛玻璃卡片（Glassmorphism）和精致过渡动效，带来 wow 级的殿堂视觉感官。

---

## 🚀 一键容器化部署 (推荐)

Next.js 2.0 推荐使用 Docker 容器化一键秒级拉取部署。直接在您的 Linux 服务器（如已安装 Docker & docker-compose 的 VPS 或宝塔面板）的目标目录下执行：

```bash
curl -sSO https://raw.githubusercontent.com/Fate-lite/fate_video_new/feature/nextjs-rebuild/next_deploy.sh && bash next_deploy.sh
```

### 1. 宿主机数据目录挂载
在 `docker-compose.yml` 中，容器内的数据库目录已通过 Volume 挂载至宿主机的 `./data` 下，确保即使容器被删除或升级重建镜像，您的用户数据也永远绝对不会丢失！

### 2. 传统本地运行 (开发调试)
如果您想在本地运行开发服务，请执行：
```bash
# 安装依赖
npm install

# 根据 schema 生成 Prisma 数据库客户端驱动
DATABASE_URL="file:../data/user.db" npx prisma generate --schema=prisma/user.prisma
DATABASE_URL="file:../data/fate.db" npx prisma generate --schema=prisma/cache.prisma

# 运行本地开发调试服务
npm run dev
```

---

## 📂 老版本 PHP 归档
原先 PHP 稳定版本的代码已完整归档于项目根目录下的 `legacy_php/` 文件夹中，以方便对比与维护。
