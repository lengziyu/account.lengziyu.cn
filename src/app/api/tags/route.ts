import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getTagSections } from "@/lib/tags"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const sections = getTagSections()
    const suggested = sections.flatMap((group) => group.tags)

    return NextResponse.json({
      custom: [],
      sections,
      suggested,
    })
  } catch {
    return new NextResponse("Internal Error", { status: 500 })
  }
}
