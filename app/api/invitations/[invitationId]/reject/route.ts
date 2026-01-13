import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request, { params }: { params: Promise<{ invitationId: string }> }) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ success: false, error: "No token" }, { status: 401, headers: corsHeaders });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const { invitationId } = await params;

    // Find invitation
    const invitation = await (prisma as any).invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      return NextResponse.json({ success: false, error: "Invitation not found" }, { status: 404, headers: corsHeaders });
    }

    if (invitation.inviteeId !== payload.userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403, headers: corsHeaders });
    }

    // Update invitation status
    await (prisma as any).invitation.update({
      where: { id: invitationId },
      data: { status: "rejected" },
    });

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
  }
}
