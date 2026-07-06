#!/bin/sh
set -e

# 初始化 SQLite 数据库文件（如果不存在则自动创建空库并推送 Schema）
if [ ! -f /app/data/user.db ]; then
  echo "Initializing user database..."
  DATABASE_URL="file:/app/data/user.db" npx prisma db push --schema=prisma/user.prisma --skip-generate --accept-data-loss
fi

if [ ! -f /app/data/fate.db ]; then
  echo "Initializing cache database..."
  DATABASE_URL="file:/app/data/fate.db" npx prisma db push --schema=prisma/cache.prisma --skip-generate --accept-data-loss
fi

echo "Databases ready. Starting Next.js..."
exec npm run start
