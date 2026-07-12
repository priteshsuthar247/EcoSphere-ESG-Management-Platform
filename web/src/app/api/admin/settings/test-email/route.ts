// src/app/api/admin/settings/test-email/route.ts
// POST /api/admin/settings/test-email - Send a test email to verify Google App Password configuration

import { NextRequest } from 'next/server';
import { sendMail } from '@/lib/email';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import { verifyToken } from '@/lib/auth';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return errorResponse('Access denied. Authorization required.', 401, 'UNAUTHORIZED');
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return errorResponse('Access denied. Admin role required.', 403, 'FORBIDDEN');
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
      return errorResponse('Valid recipient email address is required', 400, 'VALIDATION_ERROR');
    }

    const htmlContent = `
      <div style="font-family: monospace; background-color: #0d0d0d; color: #00ff41; padding: 24px; border: 1px solid #444444; border-radius: 0px;">
        <h2 style="color: #00ff41; margin-bottom: 16px;">[ECOSPHERE SYSTEM COMMUNICATION]</h2>
        <p style="color: #8b8b8b;">// Outbound email subsystem verification check</p>
        <div style="border-left: 2px solid #00ff41; padding-left: 16px; margin: 16px 0; color: #f1f5f9;">
          STATUS: SMTP CONNECTION CONFIRMED<br>
          TARGET: ${email}<br>
          TIMESTAMP: ${new Date().toISOString()}<br>
          INITIATED BY: Admin @ ${payload.email}
        </div>
        <p style="color: #8b8b8b;">Your Google App Password is properly configured and successfully transmitting email logs.</p>
        <div style="margin-top: 24px; border-top: 1px dashed #222222; padding-top: 16px; font-size: 11px; color: #555555;">
          This is an automated test message. Please do not reply directly.
        </div>
      </div>
    `;

    logger.info('Initiating admin test email send', { recipient: email });
    const result = await sendMail({
      to: email,
      subject: 'EcoSphere – Outbound Mail System Verification Test',
      html: htmlContent
    });

    if (!result.success) {
      return errorResponse(result.error || 'Failed to send test email', 400, 'SMTP_ERROR');
    }

    return successResponse(null, 'Test email dispatched successfully.');
  } catch (err) {
    logger.error('POST /api/admin/settings/test-email error', { error: (err as Error).message });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}
