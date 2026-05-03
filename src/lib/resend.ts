import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're-your-api-key');

export interface EmailData {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({ to, subject, html, from }: EmailData) {
  try {
    const { data, error } = await resend.emails.send({
      from: from || 'onboarding@resend.dev',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    if (error) {
      console.error('Email sending error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Email service error:', error);
    return { success: false, error };
  }
}

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify?token=${token}`;
  
  return sendEmail({
    to: email,
    subject: 'Verify your email address',
    html: `
      <h2>Email Verification</h2>
      <p>Click the link below to verify your email address:</p>
      <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
        Verify Email
      </a>
      <p>Or copy and paste this link: ${verificationUrl}</p>
      <p>This link expires in 24 hours.</p>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
  
  return sendEmail({
    to: email,
    subject: 'Reset your password',
    html: `
      <h2>Password Reset</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
        Reset Password
      </a>
      <p>Or copy and paste this link: ${resetUrl}</p>
      <p>This link expires in 1 hour.</p>
    `,
  });
}
