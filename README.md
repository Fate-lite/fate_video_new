# Fate Video 2.0 (Next.js 全栈重构版)

Fate Video 2.0 是一套现代化、支持超高并发、智能多源去重融合并带有高级管理后台的影视点播系统。
本项目已彻底抛弃传统的 PHP 串行阻塞架构，采用 **Next.js 14+ / TypeScript / Prisma ORM / TailwindCSS / SQLite** 进行重构。
原 PHP 稳定版本已完整归档并在 `main` 分支中予以保留。

---

## ⚡️ 核心架构优势
* **超高并发多源抓取 (Promise.all)**：并行对 6 个健康测速源站发起第 1 页和第 2 页数据的并发请求，去重融合，饱满度翻倍！
* **自动后台定时采集**：服务器后台常驻 Singleton 定时器，**每小时自动触发一次全站多源拉取并更新 SQLite 缓存**，确保前台访问 100% 缓存命中，秒开体验！
* **双 SQLite 数据库物理隔离**：
  * `data/fate.db` (影视缓存库)：由 Prisma 缓存 API 采集的数据，支持后台一键物理清空重刷。
  * `data/user.db` (核心账户库)：存放用户、观看历史、追剧收藏，物理独立，**清理影视缓存绝对不会伤及任何用户信息**！
* **极客暗黑霓虹美学**：采用暗黑星云、高斯模糊毛玻璃卡片（Glassmorphism）、微弹心跳收藏及流光闪烁骨架屏（Shimmer Skeleton），带来 wow 级的殿堂视觉感官。
* **一站式运维管理仪表盘 (`/admin`)**：支持拖拽对采集源站进行实时优先级排序，展示 Linux Terminal 终端风格的实时采集日志控制台，并支持一键在线测速、一键清空缓存。

---

## 🚀 首次容器化部署安装 (全新服务器)

在您的 Linux 服务器（已安装 Docker & docker-compose，如 VPS 或安装了 Docker 的宝塔面板）中，进入您计划存放项目的目录，执行以下一键命令即可自动克隆分支并完成部署启动：

```bash
git clone -b feature/nextjs-rebuild https://github.com/Fate-lite/fate_video_new.git fate_video_next && cd fate_video_next && bash next_deploy.sh
```

部署完成后，即可通过以下地址访问：
* **前台影视站**：`http://您的服务器IP:3000`
* **运维管理后台**：`http://您的服务器IP:3000/admin` （默认登录密码为 `admin888`）

---

## 🔄 已部署站点的“一键更新与升级”

如果您已经部署了 Next.js 2.0 站点，未来想要升级拉取最新代码并热更新容器，只需登录服务器，**进入您的项目目录**，直接执行以下一键升级脚本即可：

```bash
bash next_deploy.sh
```

> [!NOTE]
> 该脚本会自动拉取 `feature/nextjs-rebuild` 分支的最新优化提交，自动重建 Docker 镜像并热重启容器。由于宿主机的 `./data` 目录挂载了 Volume，**升级过程中您的用户数据、观看历史和追剧收藏绝对不会丢失**！

---

## 📂 老版本 PHP 归档
原先 PHP 稳定版本的代码已完整归档于项目根目录下的 `legacy_php/` 文件夹中，以方便对比与维护。
