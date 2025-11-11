/**
 * API route: /api/health
 *
 * Comprehensive health check and testing system for Maestro
 * Tests all critical API endpoints, database connectivity, environment variables,
 * agent files, and file system permissions
 *
 * GET - Run health checks and return detailed status
 */

import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message?: string;
  error?: string;
  duration_ms?: number;
}

interface HealthResponse {
  healthy: boolean;
  timestamp: string;
  checks: HealthCheck[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

/**
 * Helper function to make internal API calls
 */
async function testEndpoint(
  method: 'GET' | 'POST',
  path: string,
  body?: any
): Promise<{ ok: boolean; status: number; data?: any; error?: string }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) {
      throw new Error('NEXT_PUBLIC_APP_URL environment variable is required');
    }
    const url = `${baseUrl}${path}`;

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body && method === 'POST') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    return {
      ok: response.ok,
      status: response.status,
      data,
      error: !response.ok ? data.error || data.message : undefined,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test API endpoint availability
 * Note: Some endpoints require authentication, so 401 responses are acceptable
 */
async function testApiEndpoint(
  name: string,
  method: 'GET' | 'POST',
  path: string,
  body?: any,
  authRequired: boolean = false
): Promise<HealthCheck> {
  const startTime = Date.now();

  try {
    const result = await testEndpoint(method, path, body);
    const duration_ms = Date.now() - startTime;

    // If endpoint requires auth and returns 401, that's actually a pass
    // It means the endpoint is working correctly
    if (authRequired && result.status === 401) {
      return {
        name,
        status: 'pass',
        message: 'Endpoint protected (requires authentication)',
        duration_ms,
      };
    }

    if (result.ok) {
      return {
        name,
        status: 'pass',
        message: `Responded with ${result.status}`,
        duration_ms,
      };
    } else {
      return {
        name,
        status: 'fail',
        error: result.error || `HTTP ${result.status}`,
        duration_ms,
      };
    }
  } catch (error) {
    const duration_ms = Date.now() - startTime;
    return {
      name,
      status: 'fail',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms,
    };
  }
}

/**
 * Test database connectivity
 */
async function testDatabaseConnectivity(): Promise<HealthCheck> {
  const startTime = Date.now();

  try {
    if (!isSupabaseConfigured()) {
      return {
        name: 'Database: Supabase Configuration',
        status: 'warn',
        message: 'Supabase not configured (using localStorage fallback)',
        duration_ms: Date.now() - startTime,
      };
    }

    // Test connection by querying a table
    const { error } = await supabase
      .from('projects')
      .select('project_id')
      .limit(1);

    const duration_ms = Date.now() - startTime;

    if (error) {
      return {
        name: 'Database: Supabase Connection',
        status: 'fail',
        error: error.message,
        duration_ms,
      };
    }

    return {
      name: 'Database: Supabase Connection',
      status: 'pass',
      message: 'Successfully connected to Supabase',
      duration_ms,
    };
  } catch (error) {
    const duration_ms = Date.now() - startTime;
    return {
      name: 'Database: Supabase Connection',
      status: 'fail',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms,
    };
  }
}

/**
 * Test environment variables
 */
async function testEnvironmentVariables(): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];

  // Critical environment variables
  const requiredVars = [
    { name: 'ANTHROPIC_API_KEY', required: true },
    { name: 'NEXT_PUBLIC_SUPABASE_URL', required: false },
    { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', required: false },
  ];

  for (const { name, required } of requiredVars) {
    const value = process.env[name];
    const exists = Boolean(value && value.trim() !== '');

    if (!exists && required) {
      checks.push({
        name: `Environment: ${name}`,
        status: 'fail',
        error: 'Not set or empty',
      });
    } else if (!exists && !required) {
      checks.push({
        name: `Environment: ${name}`,
        status: 'warn',
        message: 'Not set (optional for some features)',
      });
    } else {
      checks.push({
        name: `Environment: ${name}`,
        status: 'pass',
        message: 'Set correctly',
      });
    }
  }

  return checks;
}

/**
 * Test agent files exist and are readable
 */
async function testAgentFiles(): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];

  const agentFiles = [
    'agent-base.js',
    'frontend-agent.js',
    'backend-agent.js',
    'testing-agent.js',
    'research-agent.js',
    'product-improvement-agent.js',
    'supervisor-agent.js',
  ];

  const agentsDir = path.join(process.cwd(), 'agents');

  for (const file of agentFiles) {
    const startTime = Date.now();
    const filePath = path.join(agentsDir, file);

    try {
      await fs.access(filePath, fs.constants.R_OK);
      const stats = await fs.stat(filePath);

      checks.push({
        name: `Agent File: ${file}`,
        status: 'pass',
        message: `Readable, ${Math.round(stats.size / 1024)}KB`,
        duration_ms: Date.now() - startTime,
      });
    } catch (error) {
      checks.push({
        name: `Agent File: ${file}`,
        status: 'fail',
        error: error instanceof Error ? error.message : 'File not accessible',
        duration_ms: Date.now() - startTime,
      });
    }
  }

  return checks;
}

/**
 * Test file system permissions
 */
async function testFileSystemPermissions(): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = [];

  // Test critical directories
  const directories = [
    { path: '.', name: 'Project Root' },
    { path: 'agents', name: 'Agents Directory' },
    { path: 'lib', name: 'Lib Directory' },
    { path: 'app', name: 'App Directory' },
  ];

  for (const { path: dir, name } of directories) {
    const startTime = Date.now();
    const dirPath = path.join(process.cwd(), dir);

    try {
      await fs.access(dirPath, fs.constants.R_OK);
      checks.push({
        name: `Permissions: ${name}`,
        status: 'pass',
        message: 'Readable',
        duration_ms: Date.now() - startTime,
      });
    } catch (error) {
      checks.push({
        name: `Permissions: ${name}`,
        status: 'fail',
        error: 'Not readable',
        duration_ms: Date.now() - startTime,
      });
    }
  }

  return checks;
}

/**
 * GET /api/health
 * Run comprehensive health checks
 */
export async function GET() {
  const startTime = Date.now();
  const checks: HealthCheck[] = [];

  try {
    // 1. Test API Endpoints
    console.log('[Health Check] Testing API endpoints...');

    // Test protected endpoints (auth required)
    // A 401 response means the endpoint is working correctly
    checks.push(await testApiEndpoint('API: GET /api/projects', 'GET', '/api/projects', undefined, true));
    checks.push(await testApiEndpoint('API: GET /api/agents', 'GET', '/api/agents', undefined, true));
    checks.push(await testApiEndpoint('API: GET /api/improvements', 'GET', '/api/improvements?project_id=test', undefined, true));

    // Note: For /api/projects/[id]/tasks, we need a real project ID
    // We'll test the endpoint structure but expect it might 404 if no projects exist
    const tasksCheck = await testApiEndpoint('API: GET /api/tasks', 'GET', '/api/projects/test-project/tasks', undefined, true);
    // A 404 for tasks is acceptable if no project exists - we're testing endpoint availability
    if (tasksCheck.status === 'fail' && (tasksCheck.error?.includes('404') || tasksCheck.error?.includes('401'))) {
      tasksCheck.status = 'pass';
      tasksCheck.message = 'Endpoint available (authentication required)';
      delete tasksCheck.error;
    }
    checks.push(tasksCheck);

    // Test POST /api/analysis/run
    const analysisCheck = await testApiEndpoint(
      'API: POST /api/analysis/run',
      'POST',
      '/api/analysis/run',
      {
        project_id: 'health-check-test',
        project_name: 'Health Check Test',
        code_files: [],
      },
      true // This endpoint should also require auth
    );
    checks.push(analysisCheck);

    // 2. Test Database Connectivity
    console.log('[Health Check] Testing database connectivity...');
    checks.push(await testDatabaseConnectivity());

    // 3. Test Environment Variables
    console.log('[Health Check] Testing environment variables...');
    const envChecks = await testEnvironmentVariables();
    checks.push(...envChecks);

    // 4. Test Agent Files
    console.log('[Health Check] Testing agent files...');
    const agentChecks = await testAgentFiles();
    checks.push(...agentChecks);

    // 5. Test File System Permissions
    console.log('[Health Check] Testing file system permissions...');
    const permissionChecks = await testFileSystemPermissions();
    checks.push(...permissionChecks);

    // Calculate summary
    const summary = {
      total: checks.length,
      passed: checks.filter(c => c.status === 'pass').length,
      failed: checks.filter(c => c.status === 'fail').length,
      warnings: checks.filter(c => c.status === 'warn').length,
    };

    // Overall health status
    const healthy = summary.failed === 0;

    const response: HealthResponse = {
      healthy,
      timestamp: new Date().toISOString(),
      checks,
      summary,
    };

    console.log(`[Health Check] Completed in ${Date.now() - startTime}ms`);
    console.log(`[Health Check] Results: ${summary.passed} passed, ${summary.failed} failed, ${summary.warnings} warnings`);

    return NextResponse.json(response, {
      status: healthy ? 200 : 503,
    });
  } catch (error) {
    console.error('[Health Check] Error:', error);

    return NextResponse.json(
      {
        healthy: false,
        timestamp: new Date().toISOString(),
        checks: [
          {
            name: 'Health Check System',
            status: 'fail',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
        summary: {
          total: 1,
          passed: 0,
          failed: 1,
          warnings: 0,
        },
      } as HealthResponse,
      { status: 500 }
    );
  }
}
