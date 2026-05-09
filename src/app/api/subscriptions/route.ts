import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import {
  diffInDays,
  ensureVaultItemOwner,
  parseNullableDate,
  replaceReminderRules,
  resolveReminderDays,
} from "@/lib/subscriptions"

type SubscriptionPayload = {
  vaultItemId?: string | null
  platformName?: string
  planName?: string
  status?: string
  decision?: string
  startedAt?: string | null
  expiresAt?: string | null
  renewalCycle?: string | null
  price?: number | string | null
  currency?: string | null
  autoRenew?: boolean
  notes?: string | null
  lastRenewedAt?: string | null
  snoozeUntil?: string | null
  reminderDays?: number[]
}

function normalizePrice(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    throw new Error("金额格式不正确")
  }
  return parsed
}

function buildWhere(userId: string, search: string, status: string, decision: string) {
  return {
    userId,
    ...(status ? { status } : {}),
    ...(decision ? { decision } : {}),
    ...(search
      ? {
          OR: [
            { platformName: { contains: search } },
            { planName: { contains: search } },
            { notes: { contains: search } },
            { vaultItem: { is: { title: { contains: search } } } },
            { vaultItem: { is: { displayTitle: { contains: search } } } },
          ],
        }
      : {}),
  }
}

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search")?.trim() || ""
    const status = searchParams.get("status")?.trim() || ""
    const decision = searchParams.get("decision")?.trim() || ""
    const dueWithin = Number(searchParams.get("dueWithin") || "")
    const limit = Number(searchParams.get("limit") || "")

    const [defaultRules, subscriptions] = await Promise.all([
      prisma.reminderRule.findMany({
        where: { userId: user.id, subscriptionId: null, enabled: true },
        orderBy: { daysBefore: "desc" },
        select: { daysBefore: true, enabled: true },
      }),
      prisma.subscription.findMany({
        where: buildWhere(user.id, search, status, decision),
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
          dispatchLogs: {
            orderBy: { createdAt: "desc" },
            take: 3,
            select: {
              id: true,
              channelType: true,
              status: true,
              daysBefore: true,
              triggerDateKey: true,
              sentAt: true,
            },
          },
        },
        orderBy: [{ expiresAt: "asc" }, { createdAt: "desc" }],
      }),
    ])

    const today = new Date()
    const mapped = subscriptions.map((subscription) => {
      const daysUntilExpiry = diffInDays(subscription.expiresAt, today)
      const reminderDays = resolveReminderDays(subscription.reminderRules, defaultRules)

      return {
        ...subscription,
        daysUntilExpiry,
        effectiveReminderDays: reminderDays,
        isDueSoon: daysUntilExpiry <= 7,
      }
    })

    const filtered = mapped.filter((subscription) => {
      if (!Number.isFinite(dueWithin)) return true
      return subscription.daysUntilExpiry <= dueWithin
    })

    const finalItems = Number.isFinite(limit) && limit > 0 ? filtered.slice(0, limit) : filtered

    return NextResponse.json({
      items: finalItems,
      summary: {
        total: mapped.length,
        dueSoon: mapped.filter((item) => item.daysUntilExpiry <= 7).length,
        expired: mapped.filter((item) => item.daysUntilExpiry < 0).length,
        autoRenew: mapped.filter((item) => item.autoRenew).length,
      },
      defaults: defaultRules.map((rule) => rule.daysBefore),
    })
  } catch {
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const payload = (await req.json()) as SubscriptionPayload
    const platformName = payload.platformName?.trim()
    const planName = payload.planName?.trim()
    const expiresAt = parseNullableDate(payload.expiresAt)

    if (!platformName || !planName || !expiresAt) {
      return new NextResponse("platformName、planName、expiresAt 为必填项", { status: 400 })
    }

    const vaultItemId = await ensureVaultItemOwner(user.id, payload.vaultItemId)
    const startedAt = parseNullableDate(payload.startedAt)
    const lastRenewedAt = parseNullableDate(payload.lastRenewedAt)
    const snoozeUntil = parseNullableDate(payload.snoozeUntil)
    const price = normalizePrice(payload.price)

    const subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        vaultItemId,
        platformName,
        planName,
        status: payload.status?.trim() || "active",
        decision: payload.decision?.trim() || "pending",
        startedAt,
        expiresAt,
        renewalCycle: payload.renewalCycle?.trim() || null,
        price,
        currency: payload.currency?.trim() || "CNY",
        autoRenew: !!payload.autoRenew,
        notes: payload.notes?.trim() || null,
        lastRenewedAt,
        snoozeUntil,
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
    })

    if (Array.isArray(payload.reminderDays) && payload.reminderDays.length > 0) {
      await replaceReminderRules(user.id, payload.reminderDays, subscription.id)
    }

    const updated = await prisma.subscription.findUnique({
      where: { id: subscription.id },
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
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    if (error?.message === "Vault item not found") {
      return new NextResponse("关联账号不存在", { status: 400 })
    }
    if (error?.message === "金额格式不正确") {
      return new NextResponse(error.message, { status: 400 })
    }
    return new NextResponse("Internal Error", { status: 500 })
  }
}
