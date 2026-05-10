import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const startedAt = performance.now();
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = user.id as string;

    const [totalItems, totalFavorites, totalSubscriptions, dueSubscriptions, distinctTags, distinctCategories] =
      await Promise.all([
        prisma.vaultItem.count({ where: { userId } }),
        prisma.vaultItem.count({ where: { userId, favorite: true } }),
        prisma.subscription.count({ where: { userId } }),
        prisma.subscription.count({
          where: {
            userId,
            expiresAt: {
              lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
            status: {
              not: "cancelled",
            },
          },
        }),
        prisma.tag.findMany({
          where: {
            type: "custom",
            item: { userId },
          },
          distinct: ["tag"],
          select: { tag: true },
        }),
        prisma.vaultItem.findMany({
          where: {
            userId,
            category: {
              not: null,
            },
          },
          distinct: ["category"],
          select: { category: true },
        }),
      ]);

    const response = NextResponse.json({
      totalItems,
      totalFavorites,
      totalTags: distinctTags.length,
      totalCategories: distinctCategories.length,
      totalSubscriptions,
      dueSubscriptions,
    });
    response.headers.set(
      "Server-Timing",
      `stats;dur=${(performance.now() - startedAt).toFixed(1)}`
    );

    return response;
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}
