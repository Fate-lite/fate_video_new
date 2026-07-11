import path from "path";
import { PrismaClient as UserClient } from "@prisma/client-user";
import { PrismaClient as CacheClient } from "@prisma/client-cache";

const globalForPrisma = globalThis as unknown as {
  userPrisma: UserClient | undefined;
  cachePrisma: CacheClient | undefined;
};

// 优先使用环境变量中的绝对路径，否则回退到 process.cwd() 动态转换
const userDbUrl =
  process.env.USER_DB_URL || `file:${path.resolve(process.cwd(), "data/user.db")}`;
const cacheDbUrl =
  process.env.CACHE_DB_URL || `file:${path.resolve(process.cwd(), "data/fate.db")}`;

export const userDb =
  globalForPrisma.userPrisma ??
  new UserClient({
    datasources: {
      db: { url: userDbUrl },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

export const cacheDb =
  globalForPrisma.cachePrisma ??
  new CacheClient({
    datasources: {
      db: { url: cacheDbUrl },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.userPrisma = userDb;
  globalForPrisma.cachePrisma = cacheDb;
}

// 自动后台每小时采集预热常驻定时器逻辑
const globalForCron = globalThis as unknown as {
  cronStarted: boolean | undefined;
};

if (!globalForCron.cronStarted) {
  globalForCron.cronStarted = true;

  // 1. 系统刚启动 10 秒后触发首次主动采集预热
  setTimeout(async () => {
    try {
      const { warmupAllCategories } = await import("./collector");
      await warmupAllCategories();
    } catch (err) {
      console.error("启动预热自动采集失败:", err);
    }
  }, 10000);

  // 2. 每隔 1 小时 (3600000 ms) 自动发起后台并发采集并刷新缓存
  setInterval(async () => {
    try {
      const { warmupAllCategories } = await import("./collector");
      await warmupAllCategories();
    } catch (err) {
      console.error("每小时定时自动采集失败:", err);
    }
  }, 3600000);
}

