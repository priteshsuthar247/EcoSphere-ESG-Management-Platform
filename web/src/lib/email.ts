// src/lib/email.ts
// Reusable mail sender service using nodemailer and Google App Passwords

import nodemailer from 'nodemailer';
import logger from '@/lib/logger';

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || 'EcoSphere ESG Platform';

// Check if email config is properly set up
const isConfigured = 
  SMTP_USER && 
  SMTP_USER !== 'your_gmail_address@gmail.com' && 
  SMTP_PASS && 
  SMTP_PASS !== 'your_16_character_google_app_password';

// Transporter using Gmail service (SMTP under the hood)
const transporter = isConfigured
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  : null;

if (!isConfigured) {
  logger.warn('⚠️ Google Mail configuration is not set up in .env.local. Outbound email alerts will be disabled.');
} else {
  logger.info('✅ Google Mail service configured and ready.');
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email notification using the configured Gmail transporter.
 */
export async function sendMail(options: SendMailOptions): Promise<{ success: boolean; error?: string }> {
  const { to, subject, html, text } = options;

  if (!isConfigured || !transporter) {
    logger.warn('Attempted to send mail, but Gmail service is not configured.', { to, subject });
    return { success: false, error: 'Gmail service is not configured. Add credentials in .env.local.' };
  }

  try {
    const info = await transporter.sendMail({
      from: `"${SMTP_FROM_NAME}" <${SMTP_USER}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML tags for plaintext fallback
    });

    logger.info('Email sent successfully', { messageId: info.messageId, to, subject });
    return { success: true };
  } catch (err) {
    const message = (err as Error).message;
    logger.error('Failed to send email', { error: message, to, subject });
    return { success: false, error: message };
  }
}
