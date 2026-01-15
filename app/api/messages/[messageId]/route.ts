import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// Edit a message
export async function PATCH(req: Request, { params }: { params: Promise<{ messageId: string }> }) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ success: false, error: "No token" }, { status: 401, headers: corsHeaders });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const { messageId } = await params;
    const body = await req.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ success: false, error: "Content is required" }, { status: 400, headers: corsHeaders });
    }

    // Find the message
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return NextResponse.json({ success: false, error: "Message not found" }, { status: 404, headers: corsHeaders });
    }

    // Check if user owns the message
    if (message.userId !== payload.userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403, headers: corsHeaders });
    }

    // Update the message
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: { content: content.trim() },
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
    console.error('Edit message error:', error);
    const errorMessage = error.message || 'Failed to edit message';
    return NextResponse.json({ 
      success: false, 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500, headers: corsHeaders });
  }
}
