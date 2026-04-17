import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { SITE_TAGS, sanitizeSiteTags } from "@/lib/tags"
import { MAIN_IDENTITY_KIND, buildMainIdentityProvider } from "@/lib/mainIdentity"

type ItemPayload = {
  title?: string
  password?: string
  category?: string
  notes?: string
  favorite?: boolean
  tags?: string[]
  identityId?: string | null
  setAsMain?: boolean
}

async function ensureIdentityOwner(userId: string, identityId?: string | null) {
  if (!identityId) return null

  const identity = await prisma.identity.findFirst({
    where: { id: identityId, userId },
    select: { id: true },
  })

  if (!identity) {
    throw new Error("Identity not found")
  }

  return identity.id
}

function buildTagRecords(payload: ItemPayload) {
  const tags = sanitizeSiteTags(Array.isArray(payload.tags) ? payload.tags : [])
  return tags.map((tag) => ({ tag, type: "custom" as const }))
}

async function syncMainIdentity(
  userId: string,
  itemId: string,
  title: string,
  setAsMain: boolean
) {
  const provider = buildMainIdentityProvider(itemId)
  const existing = await prisma.identity.findFirst({
    where: { userId, kind: MAIN_IDENTITY_KIND, provider },
    select: { id: true },
  })

  if (!setAsMain) {
    if (existing) {
      await prisma.identity.delete({ where: { id: existing.id } })
    }
    return
  }

  if (existing) {
    await prisma.identity.update({
      where: { id: existing.id },
      data: {
        name: title,
      },
    })
    return
  }

  await prisma.identity.create({
    data: {
      userId,
      name: title,
      identifier: provider,
      kind: MAIN_IDENTITY_KIND,
      provider,
    },
  })
}

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search")?.trim() || ""
    const identityId = searchParams.get("identityId")?.trim() || undefined

    const where = {
      userId: user.id,
      ...(identityId ? { identityId } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search } },
              { notes: { contains: search } },
              { tags: { some: { tag: { contains: search } } } },
              { identity: { is: { name: { contains: search } } } },
              { identity: { is: { identifier: { contains: search } } } },
            ],
          }
        : {}),
    }

    const items = await prisma.vaultItem.findMany({
      where,
      include: {
        identity: {
          select: {
            id: true,
            name: true,
            identifier: true,
            kind: true,
            provider: true,
          },
        },
        tags: {
          where: {
            type: "custom",
            tag: { in: [...SITE_TAGS] },
          },
          orderBy: [{ type: "asc" }, { tag: "asc" }],
        },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    })

    return NextResponse.json(items)
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

    const payload = (await req.json()) as ItemPayload
    const title = payload.title?.trim()
    if (!title) {
      return new NextResponse("Account/Title is required", { status: 400 })
    }

    const setAsMain = !!payload.setAsMain
    const identityId = await ensureIdentityOwner(
      user.id,
      setAsMain ? null : payload.identityId
    )

    const item = await prisma.vaultItem.create({
      data: {
        userId: user.id,
        identityId,
        title,
        password: payload.password?.trim() || null,
        category: payload.category?.trim() || null,
        notes: payload.notes?.trim() || null,
        favorite: !!payload.favorite,
        tags: {
          create: buildTagRecords({ ...payload, title, identityId }),
        },
      },
      include: {
        identity: true,
        tags: true,
      },
    })

    await syncMainIdentity(user.id, item.id, title, setAsMain)

    return NextResponse.json({ ...item, setAsMain })
  } catch (error: any) {
    if (error?.message === "Identity not found") {
      return new NextResponse("Identity not found", { status: 400 })
    }
    return new NextResponse("Internal Error", { status: 500 })
  }
}
