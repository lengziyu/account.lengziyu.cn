import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { DEFAULT_TAGS, dedupeTags, normalizeTag } from "@/lib/tags"

type UpsertTagBody = {
  id?: string
  name?: string
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const existingPresets = await prisma.tagPreset.findMany({
      where: { userId: user.id },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: { id: true, name: true },
    })

    const usedTags = await prisma.tag.findMany({
      where: {
        type: "custom",
        item: { userId: user.id },
      },
      distinct: ["tag"],
      select: { tag: true },
    })

    const presetNameSet = new Set(existingPresets.map((item) => item.name.toLowerCase()))
    const defaultSet = new Set(DEFAULT_TAGS.map((item) => item.toLowerCase()))
    const missingTags = usedTags
      .map((item) => normalizeTag(item.tag))
      .filter((item) => item && !presetNameSet.has(item.toLowerCase()) && !defaultSet.has(item.toLowerCase()))

    if (missingTags.length > 0) {
      for (const name of dedupeTags(missingTags)) {
        try {
          await prisma.tagPreset.create({
            data: { userId: user.id, name },
          })
        } catch {
          // Ignore duplicates caused by concurrent requests.
        }
      }
    }

    const customPresets = await prisma.tagPreset.findMany({
      where: { userId: user.id },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: { id: true, name: true },
    })

    const allTags = dedupeTags([
      ...DEFAULT_TAGS,
      ...customPresets.map((item) => item.name),
    ])

    return NextResponse.json({
      custom: customPresets.map((item) => item.name),
      sections: [{ label: "常用平台", tags: allTags }],
      suggested: allTags,
      presets: [
        ...DEFAULT_TAGS.map((name) => ({ id: `builtin:${name}`, name, builtin: true })),
        ...customPresets.map((item) => ({ id: item.id, name: item.name, builtin: false })),
      ],
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

    const body = (await req.json()) as UpsertTagBody
    const name = normalizeTag(body.name || "")
    if (!name) {
      return new NextResponse("Tag name is required", { status: 400 })
    }

    if (DEFAULT_TAGS.some((item) => item.toLowerCase() === name.toLowerCase())) {
      return new NextResponse("Tag already exists", { status: 400 })
    }

    const allCustom = await prisma.tagPreset.findMany({
      where: { userId: user.id },
      select: { id: true, name: true },
    })

    const exists = allCustom.some((item) => item.name.toLowerCase() === name.toLowerCase())

    if (exists) {
      return new NextResponse("Tag already exists", { status: 400 })
    }

    const created = await prisma.tagPreset.create({
      data: {
        userId: user.id,
        name,
      },
      select: { id: true, name: true },
    })

    return NextResponse.json(created)
  } catch {
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = (await req.json()) as UpsertTagBody
    const id = body.id?.trim()
    const name = normalizeTag(body.name || "")

    if (!id || !name) {
      return new NextResponse("id and name are required", { status: 400 })
    }

    const preset = await prisma.tagPreset.findFirst({
      where: { id, userId: user.id },
      select: { id: true, name: true },
    })

    if (!preset) {
      return new NextResponse("Tag preset not found", { status: 404 })
    }

    if (DEFAULT_TAGS.some((item) => item.toLowerCase() === name.toLowerCase())) {
      return new NextResponse("Tag already exists", { status: 400 })
    }

    const allCustom = await prisma.tagPreset.findMany({
      where: { userId: user.id },
      select: { id: true, name: true },
    })

    const duplicate = allCustom.some(
      (item) => item.id !== id && item.name.toLowerCase() === name.toLowerCase()
    )

    if (duplicate) {
      return new NextResponse("Tag already exists", { status: 400 })
    }

    await prisma.$transaction([
      prisma.tagPreset.update({
        where: { id },
        data: { name },
      }),
      prisma.tag.updateMany({
        where: {
          tag: preset.name,
          type: "custom",
          item: { userId: user.id },
        },
        data: { tag: name },
      }),
    ])

    return NextResponse.json({ id, name })
  } catch {
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

    const preset = await prisma.tagPreset.findFirst({
      where: { id, userId: user.id },
      select: { id: true, name: true },
    })

    if (!preset) {
      return new NextResponse("Tag preset not found", { status: 404 })
    }

    await prisma.$transaction([
      prisma.tagPreset.delete({ where: { id } }),
      prisma.tag.deleteMany({
        where: {
          tag: preset.name,
          type: "custom",
          item: { userId: user.id },
        },
      }),
    ])

    return NextResponse.json({ id })
  } catch {
    return new NextResponse("Internal Error", { status: 500 })
  }
}
