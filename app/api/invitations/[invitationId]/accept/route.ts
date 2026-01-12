import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function POST(req: Request, { params }: { params: Promise<{ invitationId: string }> }) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ success: false, error: "No token" }, { status: 401 });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const { invitationId } = await params;

    // Find invitation
    const invitation = await (prisma as any).invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      return NextResponse.json({ success: false, error: "Invitation not found" }, { status: 404 });
    }

    if (invitation.inviteeId !== payload.userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    if (invitation.status !== "pending") {
      return NextResponse.json({ success: false, error: "Invitation already processed" }, { status: 400 });
    }

    // Update invitation status
    await (prisma as any).invitation.update({
      where: { id: invitationId },
      data: { status: "accepted" },
    });

    // Add user to room
    await (prisma as any).roomUser.create({
      data: {
        userId: payload.userId,
        roomId: invitation.roomId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
