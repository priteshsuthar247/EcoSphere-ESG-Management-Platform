// src/utils/apiResponse.ts
// Standardised API response helpers to ensure consistent response shape.

import { NextResponse } from 'next/server';

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
}

export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200,
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true, data, message }, { status });
}

export function errorResponse(
  error: string,
  status: number = 400,
  code?: string,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json({ success: false, error, code }, { status });
}
