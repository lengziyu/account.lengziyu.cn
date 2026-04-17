import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

type UpdateIdentityBody = {
  name?: string
  identifier?: string
  kind?: string
  provider?: string | null
  notes?: string | null
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

    const existing = await prisma.identity.findFirst({
      where: { id: params.id, userId: user.id },
      select: { id: true },
    })

    if (!existing) {
      return new NextResponse("Identity not found", { status: 404 })
    }

    const body = (await req.json()) as UpdateIdentityBody
    const identifier = body.identifier?.trim()
    if (!identifier) {
      return new NextResponse("Identifier is required", { status: 400 })
    }

    const name = body.name?.trim() || identifier
    const kind = body.kind?.trim() || (identifier.includes("@") ? "email" : "username")
    const provider = typeof body.provider === "string" ? body.provider.trim() || null : null
    const notes = typeof body.notes === "string" ? body.notes.trim() || null : null

    const identity = await prisma.identity.update({
      where: { id: params.id },
      data: {
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
