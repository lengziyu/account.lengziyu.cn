import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import {
  normalizeChannelPayload,
  resolveChannelById,
  sendChannelMessage,
  validateChannelPayload,
} from "@/lib/subscriptions"

type TestPayload = {
  id?: string
  type?: string
  config?: {
    botToken?: string
    chatId?: string
    webhookUrl?: string
    secret?: string
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = (await req.json()) as TestPayload

    let type = body.type?.trim()
    let configJson = ""
    let resolvedSource: "database" | null = null

    if (body.id) {
      const channel = await resolveChannelById(user.id, body.id)

      if (!channel) {
        return new NextResponse("通知渠道不存在", { status: 404 })
      }

      type = channel.type
      configJson = channel.configJson
      resolvedSource = channel.source
    } else if (type) {
      const config = normalizeChannelPayload(type, body.config || {})
      validateChannelPayload(type, config)
      configJson = JSON.stringify(config)
    }

    if (!type || !configJson) {
      return new NextResponse("缺少测试渠道配置", { status: 400 })
    }

    await sendChannelMessage(
      type,
      configJson,
      `测试消息\n当前时间：${new Date().toLocaleString("zh-CN", { hour12: false })}\n如果你看到这条消息，说明推送通道可用。`
    )

    if (body.id && resolvedSource === "database") {
      await prisma.notificationChannel.update({
        where: { id: body.id },
        data: { lastVerifiedAt: new Date() },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("[api/notifications/channels/test] failed", error)
    return new NextResponse(error?.message || "测试发送失败", { status: 400 })
  }
}
