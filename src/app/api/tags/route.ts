import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const tags = await prisma.tag.findMany({
      where: {
        item: {
          userId: user.id as string
        }
      },
      select: { tag: true }
    });

    const uniqueTags = Array.from(new Set(tags.map(t => t.tag))).sort();

    return NextResponse.json(uniqueTags);
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}
