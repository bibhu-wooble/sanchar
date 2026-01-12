import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ success: false, error: "No token" }, { status: 401 });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const { userId } = await params;

    // Find direct message conversation - try both orders
    let directMessage = null;
    
    try {
      directMessage = await prisma.$queryRaw`
        SELECT * FROM "DirectMessage" 
        WHERE ("senderId" = ${payload.userId} AND "receiverId" = ${userId})
           OR ("senderId" = ${userId} AND "receiverId" = ${payload.userId})
        LIMIT 1
      `;
      
      if (directMessage && Array.isArray(directMessage) && directMessage.length > 0) {
        directMessage = directMessage[0];
      } else {
        directMessage = null;
      }
    } catch (error) {
      console.error("Error finding direct message:", error);
      // Fallback to empty array
      return NextResponse.json({ success: true, messages: [] });
    }

    if (!directMessage) {
      return NextResponse.json({ success: true, messages: [] });
    }

    // Get messages using raw query
    let messages = [];
    try {
      messages = await prisma.$queryRaw`
        SELECT m.*, u.id as "user_id", u.name as "user_name", u.email as "user_email"
        FROM "Message" m
        JOIN "User" u ON m."userId" = u.id
        WHERE m."directMessageId" = ${directMessage.id}
        ORDER BY m."createdAt" ASC
      `;
      
      // Transform the raw query results to match expected format
      messages = messages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        type: msg.type,
        isRead: msg.isRead,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
        userId: msg.userId,
        directMessageId: msg.directMessageId,
        user: {
          id: msg.user_id,
          name: msg.user_name,
          email: msg.user_email,
        },
      }));
    } catch (error) {
      console.error("Error fetching messages:", error);
      messages = [];
    }

    return NextResponse.json({ success: true, messages });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
