import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { MAIN_IDENTITY_KIND } from "@/lib/mainIdentity"

type CreateIdentityBody = {
  name?: string
  identifier?: string
  kind?: string
  provider?: string
  notes?: string
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const identities = await prisma.identity.findMany({
      where: { userId: user.id, kind: MAIN_IDENTITY_KIND },
      include: {
        _count: {
          select: { vaultItems: true },
        },
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
      return new NextResponse("Identifier is required", { status: 400 })
    }

    const name = body.name?.trim() || identifier
    const kind = body.kind?.trim() || "email"
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
      return new NextResponse("Identity already exists", { status: 400 })
    }
    return new NextResponse("Internal Error", { status: 500 })
  }
}
