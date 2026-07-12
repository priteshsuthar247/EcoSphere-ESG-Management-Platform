// src/app/api/auth/forgot-password/route.ts
// POST /api/auth/forgot-password - Generate password reset token and send email link

import { NextRequest } from 'next/server';
import crypto from 'crypto';
import pool from '@/config/db';
import { findUserByEmail } from '@/services/userService';
import { sendMail } from '@/lib/email';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import logger from '@/lib/logger';
import type { ResultSetHeader } from 'mysql2';
import { escapeHtml } from '@/lib/htmlEscape';
import { rateLimit, clientIp } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const rl = rateLimit(`forgot:${ip}`, 8, 60 * 60 * 1000); // 8 / hour
    if (!rl.allowed) {
      return errorResponse('Too many reset requests. Try again later.', 429, 'RATE_LIMITED');
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }

    if (!body || typeof body !== 'object') {
      return errorResponse('Invalid payload', 400);
    }

    const { email } = body as Record<string, unknown>;

    if (typeof email !== 'string' || !email.includes('@')) {
      return errorResponse('Valid email address is required', 400, 'VALIDATION_ERROR');
    }

    const user = await findUserByEmail(email);

    // Timing attack prevention: if user doesn't exist, simulate sending email but don't error
    if (!user) {
      logger.info('Forgot password requested for non-existing email', { email });
      // Simulate small delay
      await new Promise((resolve) => setTimeout(resolve, 600));
      return successResponse(null, 'If the email matches an active account, a reset link has been dispatched.');
    }

    // Generate secure reset token
    const token = crypto.randomBytes(32).toString('hex');
    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Save token in password_resets table
    await pool.execute<ResultSetHeader>(
      `INSERT INTO password_resets (user_id, token, expires_at)
       VALUES (?, ?, ?)`,
      [user.id, token, expiresAt]
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    const htmlContent = `
      <div style="font-family: monospace; background-color: #0d0d0d; color: #00ff41; padding: 24px; border: 1px solid #444444;">
        <h2 style="color: #00ff41; margin-bottom: 16px;">[ECOSPHERE PASSWORD RESET RELAY]</h2>
        <p style="color: #8b8b8b;">// Security trigger initiated for user: ${escapeHtml(user.name)}</p>
        <p style="color: #f1f5f9; margin: 16px 0;">
          A request to reset your system password has been received.<br>
          Click the command link below to configure a new credential set:
        </p>
        <div style="margin: 24px 0;">
          <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; border: 1px solid #00ff41; background: transparent; color: #00ff41; text-decoration: none; font-weight: bold;">
            $ reset --password --token=${token.substring(0, 8)}...
          </a>
        </div>
        <p style="color: #ff6600; font-size: 12px;">
          * WARNING: This verification link expires in 60 minutes and is only valid for one submission.
        </p>
        <p style="color: #8b8b8b; font-size: 13px;">
          If you did not initiate this request, you may safely ignore this email log.
        </p>
        <div style="margin-top: 24px; border-top: 1px dashed #222222; padding-top: 16px; font-size: 11px; color: #555555;">
          EcoSphere Automated Identity Subsystem
        </div>
      </div>
    `;

    logger.info('Sending forgot password email', { userId: user.id, email });
    const emailResult = await sendMail({
      to: user.email,
      subject: 'EcoSphere – Password Reset Link Verification',
      html: htmlContent
    });

    if (!emailResult.success) {
      // Log the error but don't fail completely so development/test runs still return the token in logs
      logger.error('Outbound mail relay failed during password reset trigger', { error: emailResult.error });
      return errorResponse('Failed to dispatch verification email. Contact administrator.', 500, 'SMTP_ERROR');
    }

    return successResponse(null, 'If the email matches an active account, a reset link has been dispatched.');
  } catch (err) {
    logger.error('POST /api/auth/forgot-password error', { error: (err as Error).message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}
