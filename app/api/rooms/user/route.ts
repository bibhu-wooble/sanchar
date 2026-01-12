import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) return NextResponse.json({ success: false, error: "No token" }, { status: 401 });

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;

    const rooms = await (prisma as any).roomUser.findMany({
      where: { userId: payload.userId },
      include: { room: true },
    });

    return NextResponse.json({ success: true, rooms });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
