import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"
import { DEFAULT_TAGS } from "@/lib/tags"

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json()

    if (!email || !password) {
      return new NextResponse("Missing params", { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return new NextResponse("Email exists", { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        tagPresets: {
          create: DEFAULT_TAGS.map((tag) => ({ name: tag })),
        },
      }
    })

    return NextResponse.json({ id: user.id, email: user.email })
  } catch (error) {
    return new NextResponse("Error", { status: 500 })
  }
}
