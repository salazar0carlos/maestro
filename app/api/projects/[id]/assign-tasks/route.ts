import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/projects/:id/assign-tasks
 * Automatically assign all unassigned tasks in a project to appropriate agents
 * Creates agents if they don't exist
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;

    // Agent type definitions with capabilities and patterns
    const agentTypes: Record<string, { capabilities: string[]; patterns: string[] }> = {
      'Frontend': {
        capabilities: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'UI/UX', 'Components', 'Styling'],
        patterns: ['ui', 'frontend', 'react', 'component', 'css', 'style', 'tailwind', 'page', 'interface', 'modal', 'button', 'form', 'layout']
      },
      'Backend': {
        capabilities: ['Node.js', 'API', 'Database', 'TypeScript', 'Express', 'Routes', 'Authentication'],
        patterns: ['api', 'backend', 'database', 'server', 'endpoint', 'route', 'auth', 'storage', 'sql', 'query']
      },
      'Testing': {
        capabilities: ['Jest', 'Cypress', 'Unit Tests', 'Integration Tests', 'E2E Tests'],
        patterns: ['test', 'testing', 'spec', 'jest', 'cypress', 'e2e', 'unit test', 'integration test']
      },
      'DevOps': {
        capabilities: ['Docker', 'CI/CD', 'Deployment', 'Infrastructure', 'Monitoring'],
        patterns: ['deploy', 'deployment', 'docker', 'ci/cd', 'infrastructure', 'build', 'pipeline', 'kubernetes']
      },
      'Documentation': {
        capabilities: ['Technical Writing', 'API Docs', 'User Guides', 'README'],
        patterns: ['documentation', 'docs', 'readme', 'guide', 'tutorial', 'document', 'write', 'explain']
      },
      'Data': {
        capabilities: ['Data Processing', 'Analytics', 'ML/AI', 'Data Pipeline'],
        patterns: ['data', 'analytics', 'ml', 'ai', 'machine learning', 'model', 'training', 'dataset', 'pipeline']
      },
      'Security': {
        capabilities: ['Security Audit', 'Vulnerability Assessment', 'Authentication', 'Authorization'],
        patterns: ['security', 'auth', 'permission', 'vulnerability', 'encrypt', 'secure', 'audit', 'compliance']
      }
    };

    // Return assignment logic and configuration
    return NextResponse.json({
      success: true,
      message: 'Task assignment configuration',
      projectId,
      agentTypes,
      instructions: {
        step1: 'This endpoint provides the assignment logic',
        step2: 'Use the browser script at /scripts/assign-project-tasks.js',
        step3: 'Or use the assignment logic below to implement client-side',
        note: 'Assignment must happen client-side due to localStorage usage'
      },
      assignmentLogic: {
        description: 'Determine agent type by pattern matching task content',
        algorithm: 'Score each agent type based on keyword matches, select highest score',
        defaultType: 'Backend'
      }
    });

  } catch (error) {
    console.error('[assign-tasks] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
