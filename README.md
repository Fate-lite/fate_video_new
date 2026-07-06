# Fate Video

Fate Video — 跨多源解析融合视频播放系统。

## 🛠 一键安装与一键升级 (推荐)

无论是第一次在干净目录（如宝塔面板的新建目录）部署，还是在已运行的目录中，均推荐使用一键脚本来安装及后续更新。

### 1. 一键安装 / 初始化部署
直接在服务器对应的网站根目录下执行以下命令：
```bash
curl -sSO https://raw.githubusercontent.com/Fate-lite/fate_video_new/main/install.sh && bash install.sh
```
该命令会自动为您下载安装脚本，并全自动拉取最新代码、配置数据库读写权限，并在根目录下自动生成一键升级脚本 `upgrade.sh`。

### 2. 后续一键更新升级
当 GitHub 上的代码有优化更新后，您只需在项目目录下执行：
```bash
./upgrade.sh
```
或者也可以每次直接拉取 GitHub 上的最新升级逻辑来强制升级：
```bash
curl -sSO https://raw.githubusercontent.com/Fate-lite/fate_video_new/main/upgrade.sh && bash upgrade.sh
```
这会自动抓取最新的 Git 提交并强制重置到 FETCH_HEAD（解决任何本地文件冲突）、清空影视脏缓存，并自动平滑重载 `php-fpm` 以冲刷 OPcache 字节码缓存！

---

## 🚀 手动部署指南

### 1. 权限配置 (关键)
本项目使用 **SQLite** 承载智能缓存和多源测速。部署拉取代码后，**必须确保网页服务进程对 `data/` 目录拥有写权限**。

在 Linux / macOS 环境下，请在项目根目录下执行以下命令：
```bash
# 给予 data 目录写入权限，以便 SQLite 自动建库和读写缓存
chmod 777 data
```

### 2. 初始化与测速
* 首次部署后访问前台，数据库文件 `data/fate.db` 会被**自动创建并完成建表**，无需手动导入 SQL。
* 登录后台（默认 `/admin/status.php`，密码：`admin888`），点击 **一键测速** 以初始化各源站的健康状态。测速完成后，前台的“多源去重、按配置排序置顶”功能即可完美运行。
