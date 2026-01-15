import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// Add or remove a reaction
export async function POST(req: Request, { params }: { params: Promise<{ messageId: string }> }) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ success: false, error: "No token" }, { status: 401, headers: corsHeaders });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const { messageId } = await params;
    const body = await req.json();
    const { emoji } = body;

    if (!emoji) {
      return NextResponse.json({ success: false, error: "Emoji is required" }, { status: 400, headers: corsHeaders });
    }

    // Check if message exists
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return NextResponse.json({ success: false, error: "Message not found" }, { status: 404, headers: corsHeaders });
    }

    // Check if reaction already exists
    const existingReaction = await prisma.reaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId: payload.userId,
          emoji,
        },
      },
    });

    if (existingReaction) {
      // Remove reaction
      await prisma.reaction.delete({
        where: { id: existingReaction.id },
      });
    } else {
      // Add reaction
      await prisma.reaction.create({
        data: {
          messageId,
          userId: payload.userId,
          emoji,
        },
      });
    }

    // Get updated message with reactions and user
    const updatedMessage = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, message: updatedMessage }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Reaction error:', error);
    const errorMessage = error.message || 'Failed to add reaction';
    return NextResponse.json({ 
      success: false, 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500, headers: corsHeaders });
  }
}
