import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = user.id as string;

    const totalItems = await prisma.vaultItem.count({ where: { userId } });
    const totalFavorites = await prisma.vaultItem.count({ where: { userId, favorite: true } });
    
    const tags = await prisma.tag.findMany({
      where: { item: { userId } },
      select: { tag: true },
    });
    const uniqueTags = new Set(tags.map(t => t.tag)).size;
    
    const categoryGroups = await prisma.vaultItem.groupBy({
      by: ['category'],
      where: { userId }
    });

    return NextResponse.json({
      totalItems,
      totalFavorites,
      totalTags: uniqueTags,
      totalCategories: categoryGroups.length
    });
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}
