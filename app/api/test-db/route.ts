import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Validate DATABASE_URL format
    const dbUrl = process.env.DATABASE_URL || "";
    const urlParts = dbUrl.split("@");
    const maskedUrl = urlParts.length > 1 
      ? `${urlParts[0]}@${urlParts[1].split("/")[0].split("?")[0]}***` 
      : "Not set";
    
    // Test the connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Also try to get a count from the User table to verify schema is synced
    const userCount = await prisma.user.count();
    
    return NextResponse.json({
      success: true,
      message: "Neon DB connected successfully",
      userCount,
      databaseUrl: maskedUrl,
    });
  } catch (error: any) {
    console.error("Database connection error:", error);
    
    // Provide more helpful error information
    const dbUrl = process.env.DATABASE_URL || "";
    const errorDetails: any = {
      success: false,
      error: error.message,
      code: error.code,
    };
    
    if (!dbUrl) {
      errorDetails.hint = "DATABASE_URL is not set in .env file";
    } else if (!dbUrl.startsWith("postgresql://") && !dbUrl.startsWith("postgres://")) {
      errorDetails.hint = `Invalid connection string format. Should start with postgresql:// or postgres://, but got: ${dbUrl.substring(0, 30)}...`;
      errorDetails.urlFormat = "Expected: postgresql://user:password@host:port/database?sslmode=require";
    } else {
      errorDetails.hint = "Check your DATABASE_URL connection string. Make sure it includes: username, password, host, database name";
      errorDetails.urlPreview = dbUrl.split("@")[0] + "@***";
    }
    
    return NextResponse.json(errorDetails, { status: 500 });
  }
}
