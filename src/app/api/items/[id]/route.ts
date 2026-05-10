import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { sanitizeItemTags } from "@/lib/tags"
import { MAIN_IDENTITY_KIND, buildMainIdentityProvider } from "@/lib/mainIdentity"

type ItemPayload = {
  title?: string
  displayTitle?: string
  password?: string
  category?: string
  notes?: string
  favorite?: boolean
  tags?: string[]
  identityId?: string | null
  phoneIdentityId?: string | null
  setAsMain?: boolean
}

async function ensureIdentityOwner(
  userId: string,
  identityId?: string | null,
  allowedKinds?: string[]
) {
  if (!identityId) return null

  const identity = await prisma.identity.findFirst({
    where: {
      id: identityId,
      userId,
      ...(allowedKinds?.length ? { kind: { in: allowedKinds } } : {}),
    },
    select: { id: true },
  })

  if (!identity) {
    throw new Error("Identity not found")
  }

  return identity.id
}

function buildTagRecords(payload: ItemPayload) {
  const tags = sanitizeItemTags(Array.isArray(payload.tags) ? payload.tags : [])
  return tags.map((tag) => ({ tag, type: "custom" as const }))
}

function isPhoneIdentitySchemaMismatch(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return (
    message.includes("phoneIdentity") ||
    message.includes("phoneIdentityId") ||
    message.includes("The column") ||
    message.includes("P2022") ||
    message.includes("P2021")
  )
}

async function getMainIdentity(userId: string, itemId: string) {
  return prisma.identity.findFirst({
    where: {
      userId,
      kind: MAIN_IDENTITY_KIND,
      provider: buildMainIdentityProvider(itemId),
    },
    select: { id: true },
  })
}

async function syncMainIdentity(
  userId: string,
  itemId: string,
  displayName: string,
  account: string,
  setAsMain: boolean
) {
  const existing = await getMainIdentity(userId, itemId)

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
        name: displayName,
        notes: account,
      },
    })
    return
  }

  const provider = buildMainIdentityProvider(itemId)
  await prisma.identity.create({
    data: {
      userId,
      name: displayName,
      identifier: provider,
      kind: MAIN_IDENTITY_KIND,
      provider,
      notes: account,
    },
  })
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

    const fetchItem = async (includePhoneIdentity: boolean) =>
      prisma.vaultItem.findFirst({
        where: {
          id: params.id,
          userId: user.id,
        },
        include: {
          identity: true,
          ...(includePhoneIdentity ? { phoneIdentity: true } : {}),
          tags: {
            where: { type: "custom" },
            orderBy: [{ type: "asc" }, { tag: "asc" }],
          },
        },
      })

    let item = null
    try {
      item = await fetchItem(true)
    } catch (error) {
      if (!isPhoneIdentitySchemaMismatch(error)) {
        throw error
      }
      console.error("[api/items/:id] phone identity fallback triggered", error)
      item = await fetchItem(false)
    }

    if (!item) {
      return new NextResponse("Not Found", { status: 404 })
    }

    const mainIdentity = await getMainIdentity(user.id, params.id)

    return NextResponse.json({
      ...item,
      setAsMain: !!mainIdentity,
    })
  } catch (error) {
    console.error("[api/items/:id] GET failed", error)
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

    const existing = await prisma.vaultItem.findFirst({
      where: { id: params.id, userId: user.id },
      select: { id: true },
    })

    if (!existing) {
      return new NextResponse("Not Found", { status: 404 })
    }

    const payload = (await req.json()) as ItemPayload
    const title = payload.title?.trim()
    if (!title) {
      return new NextResponse("Account/Title is required", { status: 400 })
    }
    const displayTitle = payload.displayTitle?.trim() || null

    const setAsMain = !!payload.setAsMain
    const identityId = await ensureIdentityOwner(
      user.id,
      setAsMain ? null : payload.identityId,
      [MAIN_IDENTITY_KIND]
    )
    const phoneIdentityId = await ensureIdentityOwner(
      user.id,
      payload.phoneIdentityId,
      ["phone"]
    )

    await prisma.tag.deleteMany({ where: { itemId: params.id } })

    const item = await prisma.vaultItem.update({
      where: { id: params.id },
      data: {
        title,
        displayTitle,
        password: payload.password?.trim() || null,
        category: payload.category?.trim() || null,
        notes: payload.notes?.trim() || null,
        favorite: !!payload.favorite,
        identityId,
        phoneIdentityId,
        tags: {
          create: buildTagRecords({ ...payload, title, identityId }),
        },
      },
      include: {
        identity: true,
        phoneIdentity: true,
        tags: true,
      },
    })

    await syncMainIdentity(
      user.id,
      params.id,
      displayTitle || title,
      title,
      setAsMain
    )

    return NextResponse.json({ ...item, setAsMain })
  } catch (error: any) {
    if (error?.message === "Identity not found") {
      return new NextResponse("主账号或手机号不存在", { status: 400 })
    }
    console.error("[api/items/:id] PATCH failed", error)
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

    const mainIdentity = await getMainIdentity(user.id, params.id)
    if (mainIdentity) {
      await prisma.identity.delete({ where: { id: mainIdentity.id } })
    }

    await prisma.vaultItem.deleteMany({
      where: {
        id: params.id,
        userId: user.id,
      },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[api/items/:id] DELETE failed", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
