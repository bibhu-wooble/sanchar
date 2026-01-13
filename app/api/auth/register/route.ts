import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { corsHeaders } from "@/lib/cors";
import { sendVerificationEmail } from "@/lib/email";
import crypto from "crypto";

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return NextResponse.json(
        { success: false, error: "Invalid request body. Expected JSON." },
        { 
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          }
        }
      );
    }

    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: "All fields are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "User already exists" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date();
    verificationTokenExpiry.setHours(verificationTokenExpiry.getHours() + 24); // 24 hours expiry

    // Create user with verification token
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        emailVerified: false,
        verificationToken,
        verificationTokenExpiry,
      } as {
        name: string;
        email: string;
        password: string;
        emailVerified: boolean;
        verificationToken: string;
        verificationTokenExpiry: Date;
      },
    });

    // Send verification email
    try {
      console.log('Sending verification email to:', email);
      await sendVerificationEmail(email, name, verificationToken);
      console.log('✅ Verification email sent successfully');
    } catch (emailError: any) {
      console.error('❌ Failed to send verification email');
      console.error('Error type:', emailError?.constructor?.name);
      console.error('Error message:', emailError?.message);
      console.error('Error code:', emailError?.code);
      console.error('Full error:', emailError);
      
      // Don't fail registration if email fails, but log it
      // User can still register and verify later
      // In production, you might want to queue this for retry
    }

    return NextResponse.json(
      { 
        success: true, 
        message: "Registration successful! Please check your email to verify your account.",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
        }
      }, 
      { 
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      }
    );
  } catch (error: any) {
    console.error('Registration error:', error);
    
    // Ensure we always return valid JSON
    const errorMessage = error?.message || 'An unexpected error occurred during registration';
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage 
      }, 
      { 
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      }
    );
  }
}
