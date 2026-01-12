import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ success: false, error: "No token" }, { status: 401 });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;

        // Use raw query to fetch invitations
        let invitations: any[] = [];
        try {
      const results = await prisma.$queryRaw`
        SELECT 
          i.*,
          r.id as "room_id", r.name as "room_name", r.type as "room_type",
          u1.id as "inviter_id", u1.name as "inviter_name", u1.email as "inviter_email"
        FROM "Invitation" i
        JOIN "Room" r ON i."roomId" = r.id
        JOIN "User" u1 ON i."inviterId" = u1.id
        WHERE i."inviteeId" = ${payload.userId} AND i.status = 'pending'
        ORDER BY i."createdAt" DESC
      `;
      
      invitations = (results as any[]).map((row: any) => ({
        id: row.id,
        roomId: row.roomId,
        inviterId: row.inviterId,
        inviteeId: row.inviteeId,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        room: {
          id: row.room_id,
          name: row.room_name,
          type: row.room_type,
          joinKey: null, // Will be loaded separately if needed
        },
        inviter: {
          id: row.inviter_id,
          name: row.inviter_name,
          email: row.inviter_email,
        },
      }));
    } catch (error) {
      console.error("Error fetching invitations:", error);
      invitations = [];
    }

    return NextResponse.json({ success: true, invitations });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
