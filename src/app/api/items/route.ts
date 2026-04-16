import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    const items = await prisma.vaultItem.findMany({
      where: {
        userId: user.id as string,
        OR: search ? [
          { title: { contains: search } },
          { notes: { contains: search } },
          { tags: { some: { tag: { contains: search } } } }
        ] : undefined
      },
      include: { tags: true },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json(items);
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const json = await req.json();
    const { title, password, category, notes, favorite, tags } = json;

    if (!title) {
      return new NextResponse("Account/Title is required", { status: 400 });
    }

    const item = await prisma.vaultItem.create({
      data: {
        userId: user.id as string,
        title,
        password,
        category,
        notes,
        favorite: favorite || false,
        tags: {
          create: Array.isArray(tags) ? tags.map((t: string) => ({ tag: t })) : []
        }
      },
      include: { tags: true }
    });

    return NextResponse.json(item);
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}
