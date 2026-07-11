import crypto from "crypto";
import nodemailer from "nodemailer";
import { userDb } from "./db";

// 密码加密 (SHA256 + 动态邮箱盐)
export function hashPassword(password: string, email: string): string {
  const salt = `fate_video_salt_${email.toLowerCase()}`;
  return crypto.createHmac("sha256", salt).update(password).digest("hex");
}

// 1. 发送邮箱验证码 (支持 Nodemailer 发送)
export async function sendVerificationCode(email: string, type = "register"): Promise<{ success: boolean; msg: string }> {
  // 生成 6 位随机数字验证码
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const now = Math.floor(Date.now() / 1000);
  const expireAt = now + 10 * 60; // 10分钟过期

  // 1. 写入数据库
  await userDb.email_verifications.create({
    data: {
      email,
      code,
      type,
      created_at: now,
      expire_at: expireAt,
    },
  });

  // 2. 邮件配置发送 (若未配置环境变量，则会在开发环境控制台直接打印，保证流畅体验)
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || "465");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.log(`[Email Mock Send] To: ${email}, Code: ${code}, Type: ${type}`);
    return { success: true, msg: "验证码已发送（开发模拟打印，请检查后台日志或配置 SMTP 环境变量）" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const mailOptions = {
      from: `"Fate Video" <${smtpUser}>`,
      to: email,
      subject: `【Fate Video】您的验证码是 ${code}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #6366f1; text-align: center;">Fate Video 身份验证</h2>
          <p>您好！</p>
          <p>您正在进行网站的账号安全操作，验证码为：</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #4f46e5; letter-spacing: 5px; background: #f3f4f6; padding: 10px 20px; border-radius: 6px;">${code}</span>
          </div>
          <p style="color: #ef4444; font-size: 14px;">此验证码在 10 分钟内有效，请勿泄露给他人。</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">Fate Video 视频系统自动发送</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return { success: true, msg: "验证码已成功发至您的邮箱" };
  } catch (error: any) {
    console.error("邮件发送失败:", error);
    return { success: false, msg: `发送失败: ${error.message || "未知邮件服务错误"}` };
  }
}

// 2. 用户注册
export async function registerUser(email: string, password: string, code: string): Promise<{ success: boolean; msg: string; user?: any }> {
  const normalizedEmail = email.toLowerCase().trim();
  const now = Math.floor(Date.now() / 1000);

  // 1. 校验验证码
  const verification = await userDb.email_verifications.findFirst({
    where: {
      email: normalizedEmail,
      code,
      expire_at: { gt: now },
    },
    orderBy: { created_at: "desc" },
  });

  if (!verification) {
    return { success: false, msg: "验证码无效或已过期" };
  }

  // 2. 检查邮箱是否已被注册
  const existingUser = await userDb.users.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    return { success: false, msg: "该邮箱已被注册" };
  }

  // 3. 创建用户
  const passwordHash = hashPassword(password, normalizedEmail);
  const user = await userDb.users.create({
    data: {
      email: normalizedEmail,
      password_hash: passwordHash,
      created_at: now,
      status: 1,
    },
  });

  // 4. 清理已被使用的验证码
  await userDb.email_verifications.deleteMany({
    where: { email: normalizedEmail },
  });

  return { success: true, msg: "注册成功", user: { id: user.id, email: user.email } };
}

// 3. 用户登录
export async function loginUser(email: string, password: string): Promise<{ success: boolean; msg: string; user?: any }> {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await userDb.users.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user || user.status !== 1) {
    return { success: false, msg: "用户不存在或已被禁用" };
  }

  const passwordHash = hashPassword(password, normalizedEmail);
  if (user.password_hash !== passwordHash) {
    return { success: false, msg: "密码错误" };
  }

  return { success: true, msg: "登录成功", user: { id: user.id, email: user.email, nickname: user.nickname } };
}

// 3.5 密码重置
export async function resetPassword(email: string, newPassword: string, code: string): Promise<{ success: boolean; msg: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const now = Math.floor(Date.now() / 1000);

  // 1. 校验验证码 (type = "reset")
  const verification = await userDb.email_verifications.findFirst({
    where: {
      email: normalizedEmail,
      code,
      type: "reset",
      expire_at: { gt: now },
    },
    orderBy: { created_at: "desc" },
  });

  if (!verification) {
    return { success: false, msg: "验证码无效或已过期" };
  }

  // 2. 检查用户是否存在
  const user = await userDb.users.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    return { success: false, msg: "未找到该邮箱关联的账号" };
  }

  // 3. 更新密码
  const passwordHash = hashPassword(newPassword, normalizedEmail);
  await userDb.users.update({
    where: { email: normalizedEmail },
    data: { password_hash: passwordHash },
  });

  // 4. 清理已被使用的验证码
  await userDb.email_verifications.deleteMany({
    where: { email: normalizedEmail },
  });

  return { success: true, msg: "密码重置成功，请使用新密码登录" };
}


// 4. 播放历史增删改查
export async function addPlayHistory(
  userId: number,
  vid: string,
  title: string,
  pic: string,
  site: string,
  episode: string,
  progress: number
) {
  const now = Math.floor(Date.now() / 1000);
  return await userDb.user_history.upsert({
    where: {
      user_id_vid: { user_id: userId, vid },
    },
    update: {
      title,
      pic,
      site,
      episode,
      progress,
      updated_at: now,
    },
    create: {
      user_id: userId,
      vid,
      title,
      pic,
      site,
      episode,
      progress,
      updated_at: now,
    },
  });
}

export async function getPlayHistory(userId: number) {
  return await userDb.user_history.findMany({
    where: { user_id: userId },
    orderBy: { updated_at: "desc" },
    take: 50,
  });
}

// 5. 追剧收藏增删改查
export async function toggleFavorite(userId: number, vid: string, title: string, pic: string): Promise<{ isFavorited: boolean }> {
  const now = Math.floor(Date.now() / 1000);
  
  const existing = await userDb.user_favorites.findUnique({
    where: {
      user_id_vid: { user_id: userId, vid },
    },
  });

  if (existing) {
    await userDb.user_favorites.delete({
      where: {
        user_id_vid: { user_id: userId, vid },
      },
    });
    return { isFavorited: false };
  } else {
    await userDb.user_favorites.create({
      data: {
        user_id: userId,
        vid,
        title,
        pic,
        created_at: now,
      },
    });
    return { isFavorited: true };
  }
}

export async function checkFavorite(userId: number, vid: string): Promise<boolean> {
  const existing = await userDb.user_favorites.findUnique({
    where: {
      user_id_vid: { user_id: userId, vid },
    },
  });
  return !!existing;
}

export async function getFavorites(userId: number) {
  return await userDb.user_favorites.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
  });
}
