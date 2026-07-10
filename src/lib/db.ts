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
