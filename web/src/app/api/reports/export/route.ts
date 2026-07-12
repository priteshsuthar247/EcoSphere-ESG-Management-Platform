// src/app/api/reports/export/route.ts
// POST /api/reports/export - Export custom report to CSV or Excel file (Admin/CEO only)

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import logger from '@/lib/logger';

interface ExportRow {
  date: string;
  module: string;
  department_name: string | null;
  employee_name: string | null;
  metric_name: string;
  metric_value: string;
}

interface ExportPayload {
  rows: ExportRow[];
  format: 'csv' | 'excel';
}

function isPrivilegedUser(request: NextRequest): boolean {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return false;
  const payload = verifyToken(token);
  return payload?.role === 'admin' || payload?.role === 'ceo';
}

function escapeCSV(val: string | null): string {
  if (val === null || val === undefined) return '';
  const text = String(val).replace(/"/g, '""'); // Escape double quotes
  if (text.includes(',') || text.includes('\n') || text.includes('"')) {
    return `"${text}"`;
  }
  return text;
}

function escapeTSV(val: string | null): string {
  if (val === null || val === undefined) return '';
  // Tab-separated requires tabs to be replaced or escaped, and strip newlines
  return String(val).replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
}

export async function POST(request: NextRequest) {
  try {
    if (!isPrivilegedUser(request)) {
      return new NextResponse('Access denied. Privileged authorization required.', { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new NextResponse('Invalid JSON payload', { status: 400 });
    }

    if (!body || typeof body !== 'object') {
      return new NextResponse('Invalid payload layout', { status: 400 });
    }

    const { rows, format = 'csv' } = body as ExportPayload;

    if (!rows || !Array.isArray(rows)) {
      return new NextResponse('Invalid payload layout, expected array of rows', { status: 400 });
    }

    const headers = ['DATE', 'MODULE', 'DEPARTMENT', 'EMPLOYEE / OWNER', 'METRIC / ACTIVITY', 'RESULT VALUE'];

    if (format === 'excel') {
      // Build Excel TSV
      const tsvLines = [headers.join('\t')];
      rows.forEach((r) => {
        const line = [
          escapeTSV(r.date),
          escapeTSV(r.module),
          escapeTSV(r.department_name),
          escapeTSV(r.employee_name),
          escapeTSV(r.metric_name),
          escapeTSV(r.metric_value)
        ];
        tsvLines.push(line.join('\t'));
      });
      const tsvContent = tsvLines.join('\r\n');

      return new NextResponse(tsvContent, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
          'Content-Disposition': 'attachment; filename="EcoSphere_ESG_Report.xls"',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    // Default CSV output
    const csvLines = [headers.join(',')];
    rows.forEach((r) => {
      const line = [
        escapeCSV(r.date),
        escapeCSV(r.module),
        escapeCSV(r.department_name),
        escapeCSV(r.employee_name),
        escapeCSV(r.metric_name),
        escapeCSV(r.metric_value)
      ];
      csvLines.push(line.join(','));
    });
    const csvContent = csvLines.join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="EcoSphere_ESG_Report.csv"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (err) {
    logger.error('POST /api/reports/export error', { error: (err as Error).message });
    return new NextResponse('Internal server error', { status: 500 });
  }
}
