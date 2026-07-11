type LogLevel = "INFO" | "SUCCESS" | "WARN" | "ERROR";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
}

const globalForLogs = globalThis as unknown as {
  adminLogs: LogEntry[] | undefined;
};

// 内存日志缓冲区，最大保留 150 条
const MAX_LOGS = 150;

if (!globalForLogs.adminLogs) {
  globalForLogs.adminLogs = [
    {
      id: "init",
      timestamp: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
      level: "SUCCESS",
      message: "Fate Video 2.0 采集监控系统初始化完毕",
    },
  ];
}

export function addAdminLog(level: LogLevel, message: string) {
  const logs = globalForLogs.adminLogs || [];
  const timestamp = new Date().toLocaleTimeString("zh-CN", { hour12: false });
  const id = Math.random().toString(36).substring(2, 9);
  
  logs.unshift({ id, timestamp, level, message });
  
  if (logs.length > MAX_LOGS) {
    logs.pop();
  }
  
  globalForLogs.adminLogs = logs;
}

export function getAdminLogs(): LogEntry[] {
  return globalForLogs.adminLogs || [];
}

export function clearAdminLogs() {
  globalForLogs.adminLogs = [];
}
