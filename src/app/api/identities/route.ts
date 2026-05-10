import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { MAIN_IDENTITY_KIND } from "@/lib/mainIdentity"

type CreateIdentityBody = {
  id?: string
  name?: string
  identifier?: string
  kind?: string
  provider?: string
  notes?: string
}

const PHONE_IDENTITY_KIND = "phone"

function resolveIdentityKind(rawKind?: string | null) {
  const kind = rawKind?.trim()
  if (!kind || kind === "main") return MAIN_IDENTITY_KIND
  if (kind === PHONE_IDENTITY_KIND) return PHONE_IDENTITY_KIND
  if (kind === "all") return "all"
  return null
}

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const kind = resolveIdentityKind(new URL(req.url).searchParams.get("kind"))
    if (!kind) {
      return new NextResponse("不支持的 identity kind", { status: 400 })
    }

    const identities = await prisma.identity.findMany({
      where: {
        userId: user.id,
        ...(kind === "all" ? {} : { kind }),
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    })

    return NextResponse.json(identities)
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

    const body = (await req.json()) as CreateIdentityBody
    const identifier = body.identifier?.trim()

    if (!identifier) {
      return new NextResponse("标识不能为空", { status: 400 })
    }

    const name = body.name?.trim() || identifier
    const requestedKind = resolveIdentityKind(body.kind)
    const kind = requestedKind === "all" ? null : requestedKind
    if (!kind) {
      return new NextResponse("不支持的 identity kind", { status: 400 })
    }
    const provider = body.provider?.trim() || null
    const notes = body.notes?.trim() || null

    const existing = await prisma.identity.findUnique({
      where: {
        userId_identifier: {
          userId: user.id,
          identifier,
        },
      },
    })

    if (existing) {
      return NextResponse.json(existing)
    }

    const identity = await prisma.identity.create({
      data: {
        userId: user.id,
        name,
        identifier,
        kind,
        provider,
        notes,
      },
    })

    return NextResponse.json(identity)
  } catch (error: any) {
    if (error?.code === "P2002") {
      return new NextResponse("该条目已存在", { status: 400 })
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

    const body = (await req.json()) as CreateIdentityBody
    const id = body.id?.trim()
    const identifier = body.identifier?.trim()
    const name = body.name?.trim()

    if (!id || !identifier || !name) {
      return new NextResponse("id、名称、手机号为必填项", { status: 400 })
    }

    const existing = await prisma.identity.findFirst({
      where: { id, userId: user.id, kind: PHONE_IDENTITY_KIND },
      select: { id: true },
    })
    if (!existing) {
      return new NextResponse("手机号不存在", { status: 404 })
    }

    const updated = await prisma.identity.update({
      where: { id },
      data: {
        name,
        identifier,
        notes: body.notes?.trim() || null,
      },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    if (error?.code === "P2002") {
      return new NextResponse("该手机号已存在", { status: 400 })
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

    const id = new URL(req.url).searchParams.get("id")?.trim()
    if (!id) {
      return new NextResponse("id is required", { status: 400 })
    }

    await prisma.identity.deleteMany({
      where: { id, userId: user.id, kind: PHONE_IDENTITY_KIND },
    })

    return NextResponse.json({ id })
  } catch {
    return new NextResponse("Internal Error", { status: 500 })
  }
}
