import crypto from "crypto";

const SESSION_SECRET = process.env.SESSION_SECRET || "fate_video_default_session_secret_key_110";

// 生成加密的 Session Token (7天有效)
export function createSessionToken(userId: number): string {
  const expire = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
  const payload = `${userId}|${expire}`;
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
  return `${payload}|${signature}`;
}

// 校验 Token 并提取 userId
export function verifySessionToken(token: string | undefined): number | null {
  if (!token) return null;
  const parts = token.split("|");
  if (parts.length !== 3) return null;

  const [userIdStr, expireStr, signature] = parts;
  const payload = `${userIdStr}|${expireStr}`;

  // 验证防伪 Hmac 签名
  const expectedSig = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
  if (signature !== expectedSig) return null;

  // 验证是否已过期
  const expire = parseInt(expireStr);
  if (expire < Math.floor(Date.now() / 1000)) return null;

  return parseInt(userIdStr);
}
