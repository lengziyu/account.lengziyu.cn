import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getUserDefaultReminderDays, replaceReminderRules } from "@/lib/subscriptions"

type ReminderRulesPayload = {
  days?: number[]
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const days = await getUserDefaultReminderDays(user.id)
    return NextResponse.json({ days })
  } catch {
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = (await req.json()) as ReminderRulesPayload
    await replaceReminderRules(user.id, Array.isArray(body.days) ? body.days : [])

    return NextResponse.json({
      days: await getUserDefaultReminderDays(user.id),
    })
  } catch {
    return new NextResponse("Internal Error", { status: 500 })
  }
}
