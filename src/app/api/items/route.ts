import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { sanitizeItemTags } from "@/lib/tags"
import {
  MAIN_IDENTITY_KIND,
  buildMainIdentityProvider,
  getItemIdFromMainIdentityProvider,
} from "@/lib/mainIdentity"

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

function mapKnownItemError(error: any) {
  if (error?.message === "Identity not found") {
    return new NextResponse("主账号或手机号不存在", { status: 400 })
  }

  if (error?.code === "P2002") {
    return new NextResponse("记录已存在或发生唯一约束冲突", { status: 400 })
  }

  if (error?.code === "P2003") {
    return new NextResponse("关联主账号或手机号不存在（外键校验失败）", { status: 400 })
  }

  if (error?.code === "P2022" || error?.code === "P2021") {
    return new NextResponse("数据库结构未同步，请执行 Prisma db push 后重试", { status: 500 })
  }

  return null
}

function buildBaseItemSelect() {
  return {
    id: true,
    userId: true,
    identityId: true,
    phoneIdentityId: true,
    title: true,
    displayTitle: true,
    platform: true,
    url: true,
    username: true,
    password: true,
    category: true,
    notes: true,
    favorite: true,
    createdAt: true,
    updatedAt: true,
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
      where: { type: "custom" as const },
      orderBy: [{ type: "asc" as const }, { tag: "asc" as const }],
    },
  }
}

async function syncMainIdentity(
  userId: string,
  itemId: string,
  displayName: string,
  account: string,
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
        name: displayName,
        notes: account,
      },
    })
    return
  }

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

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search")?.trim() || ""
    const identityId = searchParams.get("identityId")?.trim() || undefined
    const favorite = searchParams.get("favorite") === "true"

    const where = {
      userId: user.id,
      ...(identityId ? { identityId } : {}),
      ...(favorite ? { favorite: true } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search } },
              { displayTitle: { contains: search } },
              { notes: { contains: search } },
              { tags: { some: { tag: { contains: search } } } },
              { identity: { is: { name: { contains: search } } } },
              { identity: { is: { identifier: { contains: search } } } },
              { phoneIdentity: { is: { name: { contains: search } } } },
              { phoneIdentity: { is: { identifier: { contains: search } } } },
            ],
          }
        : {}),
    }

    const fetchItems = async (includePhoneIdentity: boolean) =>
      prisma.vaultItem.findMany({
        where: includePhoneIdentity
          ? where
          : {
              userId: user.id,
              ...(identityId ? { identityId } : {}),
              ...(favorite ? { favorite: true } : {}),
              ...(search
                ? {
                    OR: [
                      { title: { contains: search } },
                      { displayTitle: { contains: search } },
                      { notes: { contains: search } },
                      { tags: { some: { tag: { contains: search } } } },
                      { identity: { is: { name: { contains: search } } } },
                      { identity: { is: { identifier: { contains: search } } } },
                    ],
                  }
                : {}),
          },
        select: {
          ...buildBaseItemSelect(),
          ...(includePhoneIdentity
            ? {
                phoneIdentity: {
                  select: {
                    id: true,
                    name: true,
                    identifier: true,
                    kind: true,
                  },
                },
              }
            : {}),
        },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      })

    let items: any[] = []
    try {
      items = await fetchItems(true)
    } catch (error) {
      if (!isPhoneIdentitySchemaMismatch(error)) {
        throw error
      }
      console.error("[api/items] phone identity fallback triggered", error)
      items = await fetchItems(false)
    }

    const mainIdentities = await prisma.identity.findMany({
      where: { userId: user.id, kind: MAIN_IDENTITY_KIND },
      select: { provider: true },
    })

    const mainItemIds = new Set(
      mainIdentities
        .map((identity) => getItemIdFromMainIdentityProvider(identity.provider))
        .filter((itemId): itemId is string => !!itemId)
    )

    return NextResponse.json(
      items.map((item) => ({
        ...item,
        setAsMain: mainItemIds.has(item.id),
        mainItemId: getItemIdFromMainIdentityProvider(item.identity?.provider),
        mainIdentityName: item.identity?.name || null,
      }))
    )
  } catch (error) {
    console.error("[api/items] GET failed", error)
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

    const createData = {
      userId: user.id,
      identityId,
      title,
      displayTitle,
      password: payload.password?.trim() || null,
      category: payload.category?.trim() || null,
      notes: payload.notes?.trim() || null,
      favorite: !!payload.favorite,
      tags: {
        create: buildTagRecords({ ...payload, title, identityId }),
      },
    }

    let item
    try {
      item = await prisma.vaultItem.create({
        data: {
          ...createData,
          phoneIdentityId,
        },
        include: {
          identity: true,
          phoneIdentity: true,
          tags: true,
        },
      })
    } catch (error) {
      if (!isPhoneIdentitySchemaMismatch(error)) {
        throw error
      }
      if (phoneIdentityId) {
        throw error
      }
      console.error("[api/items] POST phone identity fallback triggered", error)
      item = await prisma.vaultItem.create({
        data: createData,
        include: {
          identity: true,
          phoneIdentity: true,
          tags: true,
        },
      })
    }

    try {
      await syncMainIdentity(user.id, item.id, displayTitle || title, title, setAsMain)
    } catch (error) {
      console.error("[api/items] syncMainIdentity failed", error)
      if (setAsMain) {
        throw error
      }
    }

    return NextResponse.json({ ...item, setAsMain })
  } catch (error: any) {
    const knownErrorResponse = mapKnownItemError(error)
    if (knownErrorResponse) return knownErrorResponse
    console.error("[api/items] POST failed", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
