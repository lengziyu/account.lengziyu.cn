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
          { title: { contains: search, mode: 'insensitive' } },
          { platform: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
          { notes: { contains: search, mode: 'insensitive' } },
        ] : undefined
      },
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
    const { title, platform, url, username, password, category, notes, favorite } = json;

    if (!title) {
      return new NextResponse("Title is required", { status: 400 });
    }

    const item = await prisma.vaultItem.create({
      data: {
        userId: user.id as string,
        title,
        platform,
        url,
        username,
        password,
        category,
        notes,
        favorite: favorite || false,
      }
    });

    return NextResponse.json(item);
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}
