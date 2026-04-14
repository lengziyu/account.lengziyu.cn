import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const item = await prisma.vaultItem.findUnique({
      where: {
        id: params.id,
        userId: user.id as string
      }
    });

    if (!item) {
      return new NextResponse("Not Found", { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const json = await req.json();

    const item = await prisma.vaultItem.update({
      where: {
        id: params.id,
        userId: user.id as string
      },
      data: json
    });

    return NextResponse.json(item);
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    await prisma.vaultItem.delete({
      where: {
        id: params.id,
        userId: user.id as string
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}
