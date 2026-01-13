// Create SMTP transporter
const createTransporter = () => {
  let nodemailer: any;
  try {
    // Use require for server-side Next.js API routes (more compatible)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    nodemailer = require('nodemailer');
  } catch (error: any) {
    if (error.code === 'MODULE_NOT_FOUND') {
      throw new Error(
        'nodemailer is not installed. Please run: npm install nodemailer @types/nodemailer'
      );
    }
    throw error;
  }
  
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const smtpUser = process.env.SMTP_USER || 'bibhu@wooble.org';
  const smtpPassword = process.env.SMTP_PASSWORD || 'vbyg qfwb qvmx bvqw';
  const smtpSecure = process.env.SMTP_SECURE === 'true';

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });
};

export async function sendVerificationEmail(email: string, name: string, token: string) {
  try {
    const transporter = createTransporter();

    // Verify transporter configuration
    await transporter.verify();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    
    const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;

    const mailOptions = {
      from: `"Sanchar" <${process.env.SMTP_USER || 'bibhu@wooble.org'}>`,
      to: email,
      subject: 'Verify your Sanchar account',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Email</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Sanchar!</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <p style="font-size: 16px; margin-bottom: 20px; color: #333;">Hi ${name},</p>
              <p style="font-size: 16px; margin-bottom: 20px; color: #666;">
                Thank you for signing up! Please verify your email address to complete your registration and start chatting.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" 
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; 
                          font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  Verify Email Address
                </a>
              </div>
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                Or copy and paste this link into your browser:
              </p>
              <p style="font-size: 12px; color: #999; word-break: break-all; background: #f9f9f9; padding: 10px; border-radius: 5px; border: 1px solid #e0e0e0;">
                ${verificationUrl}
              </p>
              <p style="font-size: 14px; color: #666; margin-top: 20px;">
                This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
              </p>
            </div>
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
              <p>© ${new Date().getFullYear()} Sanchar. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw error;
  }
}
