import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    const { receiverId, content } = await req.json();
    const token = req.headers.get("authorization")?.split(" ")[1];

    if (!receiverId || !content || !token) {
      return NextResponse.json({ success: false, error: "Missing data" }, { status: 400 });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Find or create direct message conversation using raw queries
    let directMessage = null;
    
    try {
      const existing = await prisma.$queryRaw`
        SELECT * FROM "DirectMessage" 
        WHERE ("senderId" = ${payload.userId} AND "receiverId" = ${receiverId})
           OR ("senderId" = ${receiverId} AND "receiverId" = ${payload.userId})
        LIMIT 1
      `;
      
      if (existing && Array.isArray(existing) && existing.length > 0) {
        directMessage = existing[0];
      }
    } catch (error) {
      console.error("Error finding direct message:", error);
    }

    if (!directMessage) {
      // Create new conversation
      try {
        // Generate a simple ID
        const id = `dm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const newDM = await prisma.$queryRaw`
          INSERT INTO "DirectMessage" ("id", "senderId", "receiverId", "createdAt", "updatedAt")
          VALUES (${id}, ${payload.userId}, ${receiverId}, NOW(), NOW())
          RETURNING *
        `;
        directMessage = Array.isArray(newDM) && newDM.length > 0 ? newDM[0] : null;
      } catch (error) {
        console.error("Error creating direct message:", error);
        return NextResponse.json({ success: false, error: "Failed to create conversation" }, { status: 500 });
      }
    }

    // Get user info
    const userInfo = await prisma.$queryRaw`
      SELECT id, name, email FROM "User" WHERE id = ${payload.userId} LIMIT 1
    `;
    const user = Array.isArray(userInfo) && userInfo.length > 0 ? userInfo[0] : null;

    // Create message using raw query
    let message = null;
    try {
      const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const newMessage = await prisma.$queryRaw`
        INSERT INTO "Message" ("id", "content", "type", "isRead", "userId", "directMessageId", "createdAt", "updatedAt")
        VALUES (${msgId}, ${content}, 'text', false, ${payload.userId}, ${directMessage.id}, NOW(), NOW())
        RETURNING *
      `;
      message = Array.isArray(newMessage) && newMessage.length > 0 ? newMessage[0] : null;
      
      if (!message) {
        console.error("Message creation returned null");
        return NextResponse.json({ success: false, error: "Failed to create message" }, { status: 500 });
      }
      
      if (user) {
        message.user = user;
      } else {
        console.error("User info not found");
        return NextResponse.json({ success: false, error: "User not found" }, { status: 500 });
      }
    } catch (error: any) {
      console.error("Error creating message:", error);
      return NextResponse.json({ 
        success: false, 
        error: error.message || "Failed to send message",
        details: error.toString()
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
