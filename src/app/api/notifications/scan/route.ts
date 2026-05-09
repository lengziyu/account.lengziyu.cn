import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import {
  buildSubscriptionMessage,
  getDueSubscriptionCandidates,
  sendChannelMessage,
} from "@/lib/subscriptions"

async function resolveUserIds(req: Request) {
  const user = await getCurrentUser()
  if (user) {
    return [user.id]
  }

  const cronSecret = process.env.CRON_SECRET?.trim()
  const requestSecret = req.headers.get("x-cron-secret")?.trim()
  const authHeader = req.headers.get("authorization")?.trim()
  const bearerSecret = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : ""

  if (cronSecret && (requestSecret === cronSecret || bearerSecret === cronSecret)) {
    const users = await prisma.user.findMany({ select: { id: true } })
    return users.map((item) => item.id)
  }

  return []
}

export async function GET(req: Request) {
  try {
    const userIds = await resolveUserIds(req)
    if (userIds.length === 0) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const results = await Promise.all(
      userIds.map(async (userId) => {
        const candidates = await getDueSubscriptionCandidates(userId)
        return {
          userId,
          count: candidates.length,
          items: candidates.map((candidate) => ({
            id: candidate.subscription.id,
            platformName: candidate.subscription.platformName,
            planName: candidate.subscription.planName,
            expiresAt: candidate.subscription.expiresAt,
            daysUntilExpiry: candidate.daysUntilExpiry,
            channels: candidate.channels.map((channel) => ({
              id: channel.id,
              type: channel.type,
              name: channel.name,
              source: channel.source,
            })),
          })),
        }
      })
    )

    return NextResponse.json({
      totalUsers: results.length,
      totalCandidates: results.reduce((sum, item) => sum + item.count, 0),
      results,
    })
  } catch {
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const userIds = await resolveUserIds(req)
    if (userIds.length === 0) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const baseUrl =
      process.env.NEXTAUTH_URL?.trim() || new URL(req.url).origin

    const allResults = []

    for (const userId of userIds) {
      const candidates = await getDueSubscriptionCandidates(userId)
      const userResult = {
        userId,
        attempted: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
      }

      for (const candidate of candidates) {
        for (const channel of candidate.channels) {
          const message = buildSubscriptionMessage(
            candidate.subscription,
            candidate.daysUntilExpiry,
            baseUrl
          )

          let logId = ""
          try {
            const log = await prisma.notificationDispatchLog.create({
              data: {
                userId,
                subscriptionId: candidate.subscription.id,
                channelId: channel.id,
                channelType: channel.type,
                daysBefore: candidate.daysUntilExpiry,
                triggerDateKey: candidate.triggerDateKey,
                status: "pending",
                payloadSnapshot: message,
              },
            })
            logId = log.id
          } catch (error: any) {
            if (error?.code === "P2002") {
              userResult.skipped += 1
              continue
            }
            throw error
          }

          userResult.attempted += 1

          try {
            await sendChannelMessage(channel.type, channel.configJson, message)
            userResult.sent += 1

            await prisma.notificationDispatchLog.update({
              where: { id: logId },
              data: {
                status: "sent",
                sentAt: new Date(),
              },
            })
          } catch (error: any) {
            userResult.failed += 1
            await prisma.notificationDispatchLog.update({
              where: { id: logId },
              data: {
                status: "failed",
                errorMessage: error?.message || "发送失败",
              },
            })
          }
        }
      }

      allResults.push(userResult)
    }

    return NextResponse.json({
      ok: true,
      results: allResults,
    })
  } catch {
    return new NextResponse("Internal Error", { status: 500 })
  }
}
