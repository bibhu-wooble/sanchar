import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    const { name, userIds, token, type = "public", isPrivate = false } = await req.json();

    if (!name || !userIds || !token) return NextResponse.json({ success: false, error: "Missing data" }, { status: 400 });

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Generate join key only for public rooms or private rooms that need it
    const joinKey = isPrivate ? null : Math.random().toString(36).substring(2, 10).toUpperCase();

    const room = await (prisma as any).room.create({
      data: {
        name,
        type: isPrivate ? "private" : type,
        joinKey,
        participants: {
          create: userIds.map((id: string) => ({ userId: id })),
        },
      },
      include: { participants: { include: { user: true } } },
    });

    return NextResponse.json({ success: true, room });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
