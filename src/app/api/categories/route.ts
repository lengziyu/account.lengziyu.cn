import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const categories = await prisma.category.findMany({
      where: { userId: user.id as string },
      orderBy: { createdAt: "asc" }
    });

    return NextResponse.json(categories);
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

    const { name } = await req.json();
    if (!name?.trim()) {
      return new NextResponse("Category name is required", { status: 400 });
    }

    const category = await prisma.category.create({
      data: {
        userId: user.id as string,
        name: name.trim()
      }
    });

    return NextResponse.json(category);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return new NextResponse("Category already exists", { status: 400 });
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}
