import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { corsHeaders } from "@/lib/cors";

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function PATCH(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ success: false, error: "No token" }, { status: 401, headers: corsHeaders });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const body = await req.json();
    const { name } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ success: false, error: "Name is required" }, { status: 400, headers: corsHeaders });
    }

    const updatedUser = await prisma.user.update({
      where: { id: payload.userId },
      data: { name: name.trim() },
      select: {
        id: true,
        name: true,
        email: true,
        isOnline: true,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser }, { headers: corsHeaders });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
  }
}
