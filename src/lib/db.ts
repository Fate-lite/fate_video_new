import path from "path";
import { PrismaClient as UserClient } from "@prisma/client-user";
import { PrismaClient as CacheClient } from "@prisma/client-cache";

const globalForPrisma = globalThis as unknown as {
  userPrisma: UserClient | undefined;
  cachePrisma: CacheClient | undefined;
};

// 使用 path.resolve 和 process.cwd() 将相对路径强制转换为绝对路径，规避 Next.js 预渲染时工作目录变化导致的“无法打开数据库”错误。
const userDbPath = path.resolve(process.cwd(), "data/user.db");
const cacheDbPath = path.resolve(process.cwd(), "data/fate.db");

export const userDb =
  globalForPrisma.userPrisma ??
  new UserClient({
    datasources: {
      db: {
        url: `file:${userDbPath}`,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

export const cacheDb =
  globalForPrisma.cachePrisma ??
  new CacheClient({
    datasources: {
      db: {
        url: `file:${cacheDbPath}`,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.userPrisma = userDb;
  globalForPrisma.cachePrisma = cacheDb;
}
