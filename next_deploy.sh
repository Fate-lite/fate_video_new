#!/bin/bash
# Fate Video 2.0 (Next.js重构版) 一键容器化部署升级脚本
echo "=== Start Next.js App Docker Deployment ==="

# 确保目录拥有正确的读写权限
chmod -R 755 .
chmod -R 777 data 2>/dev/null || true

# 检查并拉取最新重构分支代码
if [ -d ".git" ]; then
    echo "Fetching latest codes from feature/nextjs-rebuild branch..."
    git remote set-url origin https://github.com/Fate-lite/fate_video_new.git 2>/dev/null || true
    git fetch origin feature/nextjs-rebuild
    git checkout feature/nextjs-rebuild
    git reset --hard FETCH_HEAD
else
    echo "Error: .git directory not found. Please run this script in the cloned repository."
    exit 1
fi

# 关闭已运行的旧容器
echo "Stopping old container..."
docker-compose down 2>/dev/null || true

# 重新构建并后台无感启动容器
echo "Building and launching new containers..."
docker-compose up --build -d

# 确保宿主机挂载的 data 数据库文件再次对容器和 Web 服务完全可写
chmod -R 777 data 2>/dev/null || true

echo "=== Deployment Completed Successfully! ==="
echo "👉 Your Next.js 2.0 app is now running at: http://localhost:3000"
echo "========================================="
