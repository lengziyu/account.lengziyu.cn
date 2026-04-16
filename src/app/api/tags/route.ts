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

    const defaultTags = ["QQ", "微信", "Google", "Github", "X", "AI Key", "ChatGPT"];
    const userTags = tags.map(t => t.tag).filter(t => !defaultTags.includes(t)).sort();
    const uniqueTags = [...defaultTags, ...Array.from(new Set(userTags))];

    return NextResponse.json(uniqueTags);
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}
