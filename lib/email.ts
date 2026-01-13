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

  const transportConfig: any = {
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  };

  // For Gmail and most SMTP servers, we need TLS
  if (!smtpSecure && smtpPort === 587) {
    transportConfig.requireTLS = true;
    transportConfig.tls = {
      rejectUnauthorized: false, // Allow self-signed certificates if needed
    };
  }

  console.log('SMTP Configuration:', {
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    user: smtpUser,
    // Don't log password
  });

  return nodemailer.createTransport(transportConfig);
};

export async function sendVerificationEmail(email: string, name: string, token: string) {
  try {
    console.log('Attempting to send verification email to:', email);
    const transporter = createTransporter();

    // Verify transporter configuration
    console.log('Verifying SMTP connection...');
    await transporter.verify();
    console.log('SMTP connection verified successfully');

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    
    const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;
    console.log('Verification URL:', verificationUrl);

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

    console.log('Sending email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    return info;
  } catch (error: any) {
    console.error('❌ Failed to send verification email');
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
      stack: error.stack,
    });
    throw error;
  }
}
