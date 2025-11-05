/**
 * API utilities and error handling middleware
 * Provides consistent error responses and request handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { ValidationResult } from './validation';

/**
 * Standard API response format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  error: ApiErrorResponse | null;
}

/**
 * API error response structure
 */
export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: any;
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Validation error class
 */
export class ValidationError extends ApiError {
  constructor(message: string, details?: any) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Not found error class
 */
export class NotFoundError extends ApiError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Create a success response
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    data,
    error: null,
  };
  return NextResponse.json(response, { status });
}

/**
 * Create an error response
 */
export function errorResponse(
  code: string,
  message: string,
  status: number = 500,
  details?: any
): NextResponse {
  const response: ApiResponse = {
    success: false,
    data: null,
    error: {
      code,
      message,
      details,
    },
  };
  return NextResponse.json(response, { status });
}

/**
 * Handle validation errors
 */
export function validationErrorResponse(validation: ValidationResult): NextResponse {
  return errorResponse(
    'VALIDATION_ERROR',
    'Validation failed',
    400,
    validation.errors
  );
}

/**
 * Error handling wrapper for API routes
 * Catches errors and returns consistent error responses
 */
export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error('API Error:', error);

      // Handle known error types
      if (error instanceof ApiError) {
        return errorResponse(error.code, error.message, error.status, error.details);
      }

      if (error instanceof Error) {
        // Generic error
        return errorResponse(
          'INTERNAL_ERROR',
          process.env.NODE_ENV === 'development'
            ? error.message
            : 'An unexpected error occurred',
          500
        );
      }

      // Unknown error type
      return errorResponse(
        'UNKNOWN_ERROR',
        'An unexpected error occurred',
        500
      );
    }
  };
}

/**
 * Parse and validate JSON request body
 */
export async function parseJsonBody<T = any>(request: NextRequest): Promise<T> {
  try {
    const body = await request.json();
    return body as T;
  } catch (error) {
    throw new ValidationError('Invalid JSON in request body');
  }
}

/**
 * Extract query parameters with type safety
 */
export function getQueryParam(
  request: NextRequest,
  param: string,
  defaultValue?: string
): string | null {
  const { searchParams } = new URL(request.url);
  return searchParams.get(param) || defaultValue || null;
}

/**
 * Extract multiple query parameters
 */
export function getQueryParams(
  request: NextRequest,
  params: string[]
): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  const { searchParams } = new URL(request.url);

  params.forEach(param => {
    result[param] = searchParams.get(param);
  });

  return result;
}

/**
 * Check if request has required query parameters
 */
export function requireQueryParams(
  request: NextRequest,
  params: string[]
): void {
  const { searchParams } = new URL(request.url);

  params.forEach(param => {
    if (!searchParams.has(param)) {
      throw new ValidationError(`Missing required query parameter: ${param}`);
    }
  });
}

/**
 * CORS headers for API responses
 */
export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

/**
 * Add CORS headers to response
 */
export function withCors(response: NextResponse): NextResponse {
  const headers = corsHeaders();
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

/**
 * Handle OPTIONS requests for CORS
 */
export function handleOptions(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

/**
 * Rate limiting helper (simple in-memory implementation)
 * For production, use Redis or similar
 */
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const record = requestCounts.get(identifier);

  if (!record || now > record.resetAt) {
    // Create new record
    requestCounts.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Clean up expired rate limit records (call periodically)
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, record] of requestCounts.entries()) {
    if (now > record.resetAt) {
      requestCounts.delete(key);
    }
  }
}

// Clean up rate limits every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimits, 5 * 60 * 1000);
}
