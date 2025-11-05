/**
 * API Route: GitHub Webhook Handler
 * POST /api/webhooks/github
 *
 * Receives GitHub webhook events (push, PR merged, etc.)
 * Triggers analysis if code changed significantly
 */

import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';

/**
 * Verify GitHub webhook signature
 * Ensures the webhook is actually from GitHub
 */
function verifyGitHubSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) {
    return false;
  }

  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

/**
 * Calculate significance of code changes
 */
function calculateChangeSignificance(commits: any[]): number {
  let score = 0;

  commits.forEach(commit => {
    const added = commit.added?.length || 0;
    const modified = commit.modified?.length || 0;
    const removed = commit.removed?.length || 0;

    const filesChanged = added + modified + removed;

    // Score based on files changed
    if (filesChanged > 10) score += 30;
    else if (filesChanged > 5) score += 20;
    else if (filesChanged > 2) score += 10;

    // Score based on commit message patterns
    const message = commit.message.toLowerCase();
    if (message.includes('refactor')) score += 15;
    if (message.includes('feature') || message.includes('add')) score += 20;
    if (message.includes('fix')) score += 10;
    if (message.includes('breaking')) score += 30;
  });

  // Score based on commit count
  const commitCount = commits.length;
  if (commitCount > 5) score += 15;
  else if (commitCount > 2) score += 10;

  return Math.min(100, score); // Cap at 100
}

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const body = await request.text();
    const payload = JSON.parse(body);

    // Verify webhook signature (if secret is configured)
    const signature = request.headers.get('x-hub-signature-256');
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

    if (webhookSecret && !verifyGitHubSignature(body, signature, webhookSecret)) {
      console.error('[GitHubWebhook] Invalid signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Get event type
    const event = request.headers.get('x-github-event');

    console.log(`[GitHubWebhook] Received ${event} event from ${payload.repository?.full_name}`);

    // Only handle push and pull_request events
    if (event !== 'push' && event !== 'pull_request') {
      console.log(`[GitHubWebhook] Ignoring ${event} event`);
      return NextResponse.json({
        success: true,
        message: `Event type '${event}' not handled`,
      });
    }

    // For pull_request events, only handle merged PRs
    if (event === 'pull_request' && payload.action !== 'closed') {
      console.log('[GitHubWebhook] Ignoring non-merged PR');
      return NextResponse.json({
        success: true,
        message: 'Only merged PRs trigger analysis',
      });
    }

    if (event === 'pull_request' && !payload.pull_request?.merged) {
      console.log('[GitHubWebhook] Ignoring closed but not merged PR');
      return NextResponse.json({
        success: true,
        message: 'Only merged PRs trigger analysis',
      });
    }

    // Get commits
    const commits = payload.commits || [];

    if (commits.length === 0) {
      console.log('[GitHubWebhook] No commits in push event');
      return NextResponse.json({
        success: true,
        message: 'No commits to analyze',
      });
    }

    // Calculate significance
    const significance = calculateChangeSignificance(commits);

    console.log(`[GitHubWebhook] Change significance: ${significance}/100`);

    // Only trigger analysis if significant (threshold: 30)
    if (significance < 30) {
      console.log('[GitHubWebhook] Changes not significant enough, skipping analysis');
      return NextResponse.json({
        success: true,
        message: 'Changes not significant enough to trigger analysis',
        significance,
        threshold: 30,
      });
    }

    // Find or create project
    const { getProjects, createProject } = await import('@/lib/storage');
    const projects = getProjects();
    let project = projects.find(p => p.github_repo === payload.repository.full_name);

    if (!project) {
      console.log(`[GitHubWebhook] Creating project for ${payload.repository.name}`);
      project = createProject({
        project_id: `gh-${payload.repository.id}`,
        name: payload.repository.name,
        description: payload.repository.description || `GitHub: ${payload.repository.full_name}`,
        github_repo: payload.repository.full_name,
        status: 'active',
        created_date: new Date().toISOString(),
        agent_count: 0,
        task_count: 0,
      });
    }

    // Extract changed files
    const changedFiles = new Set<string>();
    commits.forEach((commit: any) => {
      (commit.added || []).forEach((file: string) => changedFiles.add(file));
      (commit.modified || []).forEach((file: string) => changedFiles.add(file));
    });

    const files = Array.from(changedFiles).map(path => ({
      path,
      content: `// File: ${path}\n// Content would be fetched from GitHub API in production`,
    }));

    console.log(`[GitHubWebhook] ${files.length} files changed`);

    // Get API key from environment
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

    if (!anthropicApiKey) {
      console.error('[GitHubWebhook] ANTHROPIC_API_KEY not configured');
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Trigger analysis event
    const { EventSystem, EventTypes } = await import('@/lib/event-system.js');

    EventSystem.emit(EventTypes.GITHUB_PUSH, {
      repository: payload.repository,
      commits: payload.commits,
      ref: payload.ref,
      anthropicApiKey,
      metadata: {
        event,
        sender: payload.sender?.login,
        timestamp: new Date().toISOString(),
      },
    });

    console.log(`[GitHubWebhook] Analysis event triggered for project ${project.project_id}`);

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      projectId: project.project_id,
      filesChanged: files.length,
      commitCount: commits.length,
      significance,
    });
  } catch (error) {
    console.error('[GitHubWebhook] Error processing webhook:', error);
    return NextResponse.json(
      {
        error: 'Failed to process webhook',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for webhook status/config
 */
export async function GET() {
  const isConfigured = !!process.env.GITHUB_WEBHOOK_SECRET;

  return NextResponse.json({
    success: true,
    configured: isConfigured,
    endpoint: '/api/webhooks/github',
    supportedEvents: ['push', 'pull_request'],
    minimumSignificanceScore: 30,
  });
}
