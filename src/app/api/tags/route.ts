import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { dedupeTags, getDefaultCustomTagSections } from "@/lib/tags"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const customTags = await prisma.tag.findMany({
      where: {
        type: "custom",
        item: {
          userId: user.id,
        },
      },
      select: { tag: true },
      orderBy: { tag: "asc" },
    })

    const custom = dedupeTags(customTags.map((item) => item.tag))
    const defaultSections = getDefaultCustomTagSections()
    const defaults = dedupeTags(defaultSections.flatMap((group) => group.tags))
    const suggested = dedupeTags([...defaults, ...custom])

    return NextResponse.json({
      custom,
      sections: defaultSections,
      suggested,
    })
  } catch {
    return new NextResponse("Internal Error", { status: 500 })
  }
}
