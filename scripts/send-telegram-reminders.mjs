#!/usr/bin/env node

import prismaPkg from "@prisma/client";

const { PrismaClient } = prismaPkg;
const prisma = new PrismaClient();

const DEFAULT_REMINDER_DAYS = [7, 3, 1, 0];
const TELEGRAM_CHANNEL_TYPE = "telegram";

function startOfDay(value) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function diffInDays(target, base) {
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.floor((startOfDay(target).getTime() - startOfDay(base).getTime()) / dayMs);
}

function formatDateKey(value) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeReminderDays(values) {
  return Array.from(
    new Set(
      values
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value >= 0 && value <= 365)
    )
  ).sort((a, b) => b - a);
}

function deriveSubscriptionStatus(expiresAt, now = new Date()) {
  const diff = diffInDays(expiresAt, now);
  if (diff < 0) return "expired";
  if (diff <= 7) return "expiring";
  return "active";
}

function resolveReminderDays(subscriptionRules, defaultRules) {
  const source = subscriptionRules.length > 0 ? subscriptionRules : defaultRules;
  const enabledDays = source.filter((rule) => rule.enabled).map((rule) => rule.daysBefore);
  return normalizeReminderDays(enabledDays.length > 0 ? enabledDays : DEFAULT_REMINDER_DAYS);
}

function buildSubscriptionMessage(subscription, daysBefore, baseUrl) {
  const expires = new Date(subscription.expiresAt);
  const amount =
    subscription.price != null
      ? `${subscription.currency} ${Number(subscription.price).toFixed(2)}`
      : "未记录";
  const link = baseUrl ? `${baseUrl.replace(/\/$/, "")}/subscriptions/${subscription.id}` : "";
  const lines = [
    "会员到期提醒",
    subscription.planName
      ? `${subscription.platformName} / ${subscription.planName}`
      : subscription.platformName,
    `到期时间：${expires.getFullYear()}-${`${expires.getMonth() + 1}`.padStart(2, "0")}-${`${expires.getDate()}`.padStart(2, "0")}`,
    `提醒节点：${daysBefore === 0 ? "当天" : `提前 ${daysBefore} 天`}`,
    `自动续费：${subscription.autoRenew ? "已开启" : "未开启"}`,
    `金额：${amount}`,
    `当前决策：${subscription.decision}`,
  ];

  if (subscription.vaultItem) {
    lines.push(
      `关联账号：${subscription.vaultItem.displayTitle || subscription.vaultItem.title}`
    );
  }

  if (link) {
    lines.push(`处理链接：${link}`);
  }

  return lines.join("\n");
}

async function sendTelegramMessage(botToken, chatId, text) {
  const endpoint = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const body = new URLSearchParams({ chat_id: chatId, text });

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch (error) {
    throw new Error(
      `GitHub Actions 无法连接 Telegram API（api.telegram.org）：${error?.message || "网络请求失败"}`
    );
  }

  const rawText = await response.text();
  let data = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = null;
  }

  if (!response.ok || (data && data.ok === false)) {
    throw new Error(data?.description || rawText || "Telegram 推送失败");
  }
}

async function loadDueCandidates(userId, now) {
  const [subscriptions, defaultRules] = await Promise.all([
    prisma.subscription.findMany({
      where: {
        userId,
        decision: { notIn: ["renew", "skip"] },
      },
      include: {
        vaultItem: {
          select: {
            id: true,
            title: true,
            displayTitle: true,
          },
        },
        reminderRules: {
          where: { enabled: true },
          orderBy: { daysBefore: "desc" },
          select: {
            id: true,
            daysBefore: true,
            enabled: true,
          },
        },
      },
      orderBy: [{ expiresAt: "asc" }, { createdAt: "desc" }],
    }),
    prisma.reminderRule.findMany({
      where: { userId, subscriptionId: null, enabled: true },
      orderBy: { daysBefore: "desc" },
      select: {
        daysBefore: true,
        enabled: true,
      },
    }),
  ]);

  return subscriptions.flatMap((subscription) => {
    const daysUntilExpiry = diffInDays(subscription.expiresAt, now);
    const status = deriveSubscriptionStatus(subscription.expiresAt, now);
    if (status === "expired" && daysUntilExpiry < -3) {
      return [];
    }

    const reminderDays = resolveReminderDays(subscription.reminderRules, defaultRules);
    if (!reminderDays.includes(daysUntilExpiry)) {
      return [];
    }

    return [
      {
        subscription,
        daysBefore: daysUntilExpiry,
      },
    ];
  });
}

async function upsertDispatchLog({
  existingLogId,
  userId,
  subscriptionId,
  daysBefore,
  triggerDateKey,
  status,
  payloadSnapshot,
  errorMessage,
}) {
  const baseData = {
    userId,
    subscriptionId,
    channelId: null,
    channelType: TELEGRAM_CHANNEL_TYPE,
    daysBefore,
    triggerDateKey,
    status,
    payloadSnapshot,
    errorMessage: errorMessage || null,
    sentAt: status === "sent" ? new Date() : null,
  };

  if (existingLogId) {
    await prisma.notificationDispatchLog.update({
      where: { id: existingLogId },
      data: baseData,
    });
    return;
  }

  await prisma.notificationDispatchLog.create({
    data: baseData,
  });
}

async function main() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  const baseUrl = (process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || "").trim();
  const targetUserEmail = process.env.TARGET_USER_EMAIL?.trim();
  const dryRun = process.env.DRY_RUN === "1";
  const mode = (process.env.RUN_MODE || "normal").trim().toLowerCase();
  const manualTestMessage = process.env.TEST_MESSAGE?.trim();

  if (!process.env.DATABASE_URL) {
    throw new Error("缺少 DATABASE_URL");
  }
  if (!botToken || !chatId) {
    throw new Error("缺少 TELEGRAM_BOT_TOKEN 或 TELEGRAM_CHAT_ID");
  }

  if (mode === "test") {
    const testText =
      manualTestMessage ||
      [
        "GitHub Actions Telegram 测试消息",
        `时间：${new Date().toLocaleString("zh-CN", { hour12: false })}`,
        "如果你收到这条消息，说明 Actions -> Telegram 链路可用。",
      ].join("\n");

    if (dryRun) {
      console.log(`[dry-run][test] ${testText}`);
      return;
    }

    await sendTelegramMessage(botToken, chatId, testText);
    console.log("GitHub Actions Telegram 测试消息发送成功");
    return;
  }

  const users = await prisma.user.findMany({
    where: targetUserEmail ? { email: targetUserEmail } : undefined,
    select: { id: true, email: true },
    orderBy: { createdAt: "asc" },
  });

  if (users.length === 0) {
    console.log("没有找到可处理的用户");
    return;
  }

  const now = new Date();
  const triggerDateKey = formatDateKey(now);
  let sentCount = 0;
  let failedCount = 0;

  for (const user of users) {
    const dueCandidates = await loadDueCandidates(user.id, now);
    if (dueCandidates.length === 0) {
      console.log(`[${user.email}] 当前没有命中提醒规则的订阅`);
      continue;
    }

    for (const candidate of dueCandidates) {
      const { subscription, daysBefore } = candidate;
      const existingLog = await prisma.notificationDispatchLog.findFirst({
        where: {
          subscriptionId: subscription.id,
          channelType: TELEGRAM_CHANNEL_TYPE,
          daysBefore,
          triggerDateKey,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (existingLog?.status === "sent") {
        console.log(
          `[${user.email}] 已跳过重复提醒：${subscription.platformName} (${daysBefore})`
        );
        continue;
      }

      const message = buildSubscriptionMessage(subscription, daysBefore, baseUrl);

      if (dryRun) {
        console.log(`[dry-run][${user.email}] ${message}`);
        continue;
      }

      try {
        await sendTelegramMessage(botToken, chatId, message);
        await upsertDispatchLog({
          existingLogId: existingLog?.id,
          userId: user.id,
          subscriptionId: subscription.id,
          daysBefore,
          triggerDateKey,
          status: "sent",
          payloadSnapshot: message,
        });
        sentCount += 1;
        console.log(`[${user.email}] 已发送：${subscription.platformName} (${daysBefore})`);
      } catch (error) {
        failedCount += 1;
        const errorMessage = error instanceof Error ? error.message : String(error);
        await upsertDispatchLog({
          existingLogId: existingLog?.id,
          userId: user.id,
          subscriptionId: subscription.id,
          daysBefore,
          triggerDateKey,
          status: "failed",
          payloadSnapshot: message,
          errorMessage,
        });
        console.error(
          `[${user.email}] 发送失败：${subscription.platformName} (${daysBefore}) -> ${errorMessage}`
        );
      }
    }
  }

  console.log(`Telegram 提醒执行完成：成功 ${sentCount} 条，失败 ${failedCount} 条`);

  if (failedCount > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
