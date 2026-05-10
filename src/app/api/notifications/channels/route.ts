import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import {
  getResolvedNotificationChannels,
  normalizeChannelPayload,
  parseChannelConfig,
  validateChannelPayload,
} from "@/lib/subscriptions"

type ChannelPayload = {
  id?: string
  type?: string
  name?: string
  enabled?: boolean
  config?: {
    botToken?: string
    chatId?: string
    webhookUrl?: string
    secret?: string
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const channelState = await getResolvedNotificationChannels(user.id)

    return NextResponse.json({
      channels: channelState.dbChannels.map((channel) => ({
        ...channel,
        config: parseChannelConfig(channel.configJson),
      })),
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

    const body = (await req.json()) as ChannelPayload
    const type = body.type?.trim()
    const name = body.name?.trim()
    if (!type || !name) {
      return new NextResponse("type 和 name 为必填项", { status: 400 })
    }

    const config = normalizeChannelPayload(type, body.config || {})
    validateChannelPayload(type, config)

    const created = await prisma.notificationChannel.create({
      data: {
        userId: user.id,
        type,
        name,
        enabled: body.enabled ?? true,
        configJson: JSON.stringify(config),
      },
    })

    return NextResponse.json({
      ...created,
      config,
    })
  } catch (error: any) {
    if (error?.message) {
      return new NextResponse(error.message, { status: 400 })
    }
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = (await req.json()) as ChannelPayload
    const id = body.id?.trim()
    const type = body.type?.trim()
    const name = body.name?.trim()
    if (!id || !type || !name) {
      return new NextResponse("id、type、name 为必填项", { status: 400 })
    }

    const existing = await prisma.notificationChannel.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    })
    if (!existing) {
      return new NextResponse("通知渠道不存在", { status: 404 })
    }

    const config = normalizeChannelPayload(type, body.config || {})
    validateChannelPayload(type, config)

    const updated = await prisma.notificationChannel.update({
      where: { id },
      data: {
        type,
        name,
        enabled: body.enabled ?? true,
        configJson: JSON.stringify(config),
      },
    })

    return NextResponse.json({
      ...updated,
      config,
    })
  } catch (error: any) {
    if (error?.message) {
      return new NextResponse(error.message, { status: 400 })
    }
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")?.trim()
    if (!id) {
      return new NextResponse("id is required", { status: 400 })
    }

    await prisma.notificationChannel.deleteMany({
      where: { id, userId: user.id },
    })

    return NextResponse.json({ id })
  } catch {
    return new NextResponse("Internal Error", { status: 500 })
  }
}
