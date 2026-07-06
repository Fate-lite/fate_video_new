#!/bin/bash
echo "========================================="
echo "   Fate Video 一键安装/初始化部署脚本"
echo "========================================="

# 1. 检查并初始化 Git 仓库
if [ ! -d ".git" ]; then
    echo "[1/4] 初始化 Git 仓库中..."
    git init
    git remote add origin https://github.com/Fate-lite/fate_video_new.git
fi

# 2. 从 GitHub 拉取最新代码
echo "[2/4] 从 GitHub 拉取最新代码中..."
git fetch origin main
git reset --hard FETCH_HEAD

# 3. 创建与设置 data 目录
echo "[3/4] 配置数据库及缓存目录..."
if [ ! -d "data" ]; then
    mkdir data
fi
chmod -R 755 .
chmod -R 777 data
chown -R www:www . 2>/dev/null || chown -R apache:apache . 2>/dev/null || true

# 4. 自动写入一键升级更新脚本 upgrade.sh
echo "[4/4] 自动配置 upgrade.sh 一键更新脚本..."
cat << 'EOF' > upgrade.sh
#!/bin/bash
# Fate 视频全站一键升级脚本
echo "=== Start Auto Upgrade ==="

# 确保目录权限可拉取
chmod -R 755 .
chown -R www:www . 2>/dev/null || chown -R apache:apache . 2>/dev/null || true

# 检查并初始化 git
if [ ! -d ".git" ]; then
    echo "Initializing Git Repository..."
    git init
fi

# 强行修正 origin URL 为 HTTPS，避开 SSH 秘钥认证失败问题
git remote set-url origin https://github.com/Fate-lite/fate_video_new.git 2>/dev/null || git remote add origin https://github.com/Fate-lite/fate_video_new.git

# 拉取远程最新的 main 分支代码
echo "Fetching latest code from Git..."
git fetch origin main

# 强制重置到刚刚 Fetch 到的 FETCH_HEAD（最新提交）
echo "Resetting code to FETCH_HEAD..."
git reset --hard FETCH_HEAD

# 安全清除临时影视数据缓存（绝对不会伤及 user.db 用户数据库）
echo "Clearing video caches..."
rm -f data/fate.db data/fate.db-wal data/fate.db-shm

# 确保 data 目录及其内部数据库文件对于 web 服务器完全可写
chmod -R 777 data
chown -R www:www data 2>/dev/null || chown -R apache:apache data 2>/dev/null || true

# 尝试平滑重启 php-fpm 刷新 OPcache 缓存
pkill -USR2 php-fpm || true

echo "=== Upgrade Completed Successfully! ==="
EOF

chmod +x upgrade.sh

echo "========================================="
echo "🎉 安装与一键更新部署配置全部成功完成！"
echo "👉 以后您只需在项目目录下执行：./upgrade.sh 即可秒级完成升级更新！"
echo "========================================="
