import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import {
  ensureVaultItemOwner,
  parseNullableDate,
  replaceReminderRules,
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

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        id: params.id,
        userId: user.id,
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
        dispatchLogs: {
          orderBy: { createdAt: "desc" },
          take: 30,
          select: {
            id: true,
            channelType: true,
            status: true,
            daysBefore: true,
            triggerDateKey: true,
            payloadSnapshot: true,
            errorMessage: true,
            sentAt: true,
            createdAt: true,
          },
        },
      },
    })

    if (!subscription) {
      return new NextResponse("Not Found", { status: 404 })
    }

    const defaultRules = await prisma.reminderRule.findMany({
      where: { userId: user.id, subscriptionId: null, enabled: true },
      orderBy: { daysBefore: "desc" },
      select: { daysBefore: true, enabled: true },
    })

    return NextResponse.json({
      ...subscription,
      defaultReminderDays: defaultRules.map((rule) => rule.daysBefore),
    })
  } catch {
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const existing = await prisma.subscription.findFirst({
      where: { id: params.id, userId: user.id },
      select: { id: true },
    })

    if (!existing) {
      return new NextResponse("Not Found", { status: 404 })
    }

    const payload = (await req.json()) as SubscriptionPayload
    const platformName = payload.platformName?.trim()
    const planName = payload.planName?.trim()
    const expiresAt = parseNullableDate(payload.expiresAt)

    if (!platformName || !planName || !expiresAt) {
      return new NextResponse("platformName、planName、expiresAt 为必填项", { status: 400 })
    }

    const vaultItemId = await ensureVaultItemOwner(user.id, payload.vaultItemId)
    const price = normalizePrice(payload.price)

    await prisma.subscription.update({
      where: { id: params.id },
      data: {
        vaultItemId,
        platformName,
        planName,
        status: payload.status?.trim() || "active",
        decision: payload.decision?.trim() || "pending",
        startedAt: parseNullableDate(payload.startedAt),
        expiresAt,
        renewalCycle: payload.renewalCycle?.trim() || null,
        price,
        currency: payload.currency?.trim() || "CNY",
        autoRenew: !!payload.autoRenew,
        notes: payload.notes?.trim() || null,
        lastRenewedAt: parseNullableDate(payload.lastRenewedAt),
        snoozeUntil: parseNullableDate(payload.snoozeUntil),
      },
    })

    if (Array.isArray(payload.reminderDays)) {
      if (payload.reminderDays.length > 0) {
        await replaceReminderRules(user.id, payload.reminderDays, params.id)
      } else {
        await prisma.reminderRule.deleteMany({
          where: { userId: user.id, subscriptionId: params.id },
        })
      }
    }

    const updated = await prisma.subscription.findUnique({
      where: { id: params.id },
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
          take: 30,
          select: {
            id: true,
            channelType: true,
            status: true,
            daysBefore: true,
            triggerDateKey: true,
            payloadSnapshot: true,
            errorMessage: true,
            sentAt: true,
            createdAt: true,
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

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    await prisma.subscription.deleteMany({
      where: { id: params.id, userId: user.id },
    })

    return new NextResponse(null, { status: 204 })
  } catch {
    return new NextResponse("Internal Error", { status: 500 })
  }
}
