import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const { joinKey } = await req.json();
    const token = req.headers.get("authorization")?.split(" ")[1];

    if (!joinKey || !token) {
      return NextResponse.json({ success: false, error: "Missing data" }, { status: 400, headers: corsHeaders });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Find room by join key
    const room = await (prisma as any).room.findUnique({
      where: { joinKey },
    });

    if (!room) {
      return NextResponse.json({ success: false, error: "Invalid join key" }, { status: 404, headers: corsHeaders });
    }

    // Check if already a participant
    const existingParticipant = await (prisma as any).roomUser.findUnique({
      where: { userId_roomId: { userId: payload.userId, roomId: room.id } },
    });

    if (existingParticipant) {
      return NextResponse.json({ success: false, error: "Already in room" }, { status: 400, headers: corsHeaders });
    }

    // Add user to room
    await (prisma as any).roomUser.create({
      data: {
        userId: payload.userId,
        roomId: room.id,
      },
    });

    return NextResponse.json({ success: true, room }, { headers: corsHeaders });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
  }
}
