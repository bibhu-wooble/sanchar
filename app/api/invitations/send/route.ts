import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    const { roomId, email } = await req.json();
    const token = req.headers.get("authorization")?.split(" ")[1];

    if (!roomId || !email || !token) {
      return NextResponse.json({ success: false, error: "Missing data" }, { status: 400 });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Find invitee by email
    const invitee = await (prisma as any).user.findUnique({ where: { email } });
    if (!invitee) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Check if room exists
    const room = await (prisma as any).room.findUnique({ where: { id: roomId } });
    if (!room) {
      return NextResponse.json({ success: false, error: "Room not found" }, { status: 404 });
    }

    // Check if already a participant
    const existingParticipant = await (prisma as any).roomUser.findUnique({
      where: { userId_roomId: { userId: invitee.id, roomId } },
    });
    if (existingParticipant) {
      return NextResponse.json({ success: false, error: "User is already in the room" }, { status: 400 });
    }

    // Check if invitation already exists
    const existingInvitation = await (prisma as any).invitation.findUnique({
      where: { roomId_inviteeId: { roomId, inviteeId: invitee.id } },
    });
    if (existingInvitation) {
      return NextResponse.json({ success: false, error: "Invitation already sent" }, { status: 400 });
    }

    // Create invitation
    const invitation = await (prisma as any).invitation.create({
      data: {
        roomId,
        inviterId: payload.userId,
        inviteeId: invitee.id,
      },
      include: {
        room: true,
        inviter: true,
        invitee: true,
      },
    });

    return NextResponse.json({ success: true, invitation });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
