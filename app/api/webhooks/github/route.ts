/**
 * GitHub Webhook Handler
 * Receives events from GitHub and routes them to appropriate agents
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { GitHubWebhookPayload, WebhookPayload } from '@/lib/webhook-types';
import { WebhookDeliveryService } from '@/lib/webhook-delivery';
import { createTask } from '@/lib/storage';
import { MaestroTask } from '@/lib/types';

/**
 * Verify GitHub webhook signature
 */
function verifyGitHubSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!signature) return false;

  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

/**
 * POST /api/webhooks/github
 * Receive GitHub webhook events
 */
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-hub-signature-256');
    const event = request.headers.get('x-github-event');
    const deliveryId = request.headers.get('x-github-delivery');

    // Get raw body for signature verification
    const body = await request.text();

    // Verify signature if secret is configured
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (secret && signature) {
      const isValid = verifyGitHubSignature(body, signature, secret);
      if (!isValid) {
        console.error('[GitHub Webhook] Invalid signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    // Parse payload
    const payload: GitHubWebhookPayload = JSON.parse(body);

    console.log(`[GitHub Webhook] Received ${event} event (${deliveryId})`);

    // Route based on event type
    switch (event) {
      case 'push':
        await handlePushEvent(payload);
        break;

      case 'pull_request':
        await handlePullRequestEvent(payload);
        break;

      case 'issues':
        await handleIssueEvent(payload);
        break;

      case 'ping':
        console.log('[GitHub Webhook] Ping received');
        break;

      default:
        console.log(`[GitHub Webhook] Unhandled event type: ${event}`);
    }

    return NextResponse.json({
      success: true,
      event,
      delivery_id: deliveryId,
    });
  } catch (error) {
    console.error('[GitHub Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle push events
 */
async function handlePushEvent(payload: GitHubWebhookPayload) {
  if (!payload.commits || payload.commits.length === 0) {
    return;
  }

  const branch = payload.ref?.replace('refs/heads/', '');
  const commits = payload.commits || [];

  console.log(
    `[GitHub Webhook] Push to ${branch}: ${commits.length} commit(s)`
  );

  // Analyze commits to determine which agents need to be triggered
  const fileChanges = {
    frontend: false,
    backend: false,
    database: false,
    testing: false,
  };

  commits.forEach(commit => {
    const allFiles = [
      ...(commit.modified || []),
      ...(commit.added || []),
      ...(commit.removed || []),
    ];

    allFiles.forEach(file => {
      if (file.match(/\.(tsx?|jsx?|css|html)$/i)) {
        fileChanges.frontend = true;
      }
      if (file.match(/api\/|server\/|backend\//i)) {
        fileChanges.backend = true;
      }
      if (file.match(/migrations?\/|schema|sql/i)) {
        fileChanges.database = true;
      }
      if (file.match(/test|spec|\.test\.|\.spec\./i)) {
        fileChanges.testing = true;
      }
    });
  });

  // Broadcast to relevant agents
  const webhookPayload: WebhookPayload = {
    event: 'github.push',
    timestamp: new Date().toISOString(),
    data: {
      branch,
      commits: commits.map(c => ({
        id: c.id,
        message: c.message,
        author: c.author,
      })),
      file_changes: fileChanges,
      repository: payload.repository?.full_name,
    },
    metadata: {
      source: 'github',
      priority: 'medium',
    },
  };

  await WebhookDeliveryService.broadcast(webhookPayload);
}

/**
 * Handle pull request events
 */
async function handlePullRequestEvent(payload: GitHubWebhookPayload) {
  const action = payload.action;
  const pr = payload.pull_request;

  if (!pr) return;

  console.log(`[GitHub Webhook] Pull Request #${pr.number}: ${action}`);

  // Trigger code review agent on PR opened/updated
  if (action === 'opened' || action === 'synchronize') {
    const webhookPayload: WebhookPayload = {
      event: 'github.pull_request',
      timestamp: new Date().toISOString(),
      data: {
        action,
        number: pr.number,
        title: pr.title,
        state: pr.state,
        head_branch: pr.head.ref,
        base_branch: pr.base.ref,
        repository: payload.repository?.full_name,
      },
      metadata: {
        source: 'github',
        priority: 'high',
      },
    };

    await WebhookDeliveryService.broadcast(webhookPayload);
  }

  // Trigger deployment on PR merged
  if (action === 'closed' && pr.merged) {
    const webhookPayload: WebhookPayload = {
      event: 'github.pull_request',
      timestamp: new Date().toISOString(),
      data: {
        action: 'merged',
        number: pr.number,
        title: pr.title,
        base_branch: pr.base.ref,
        repository: payload.repository?.full_name,
      },
      metadata: {
        source: 'github',
        priority: 'high',
        triggeredBy: 'pr_merge',
      },
    };

    await WebhookDeliveryService.broadcast(webhookPayload);
  }
}

/**
 * Handle issue events
 */
async function handleIssueEvent(payload: GitHubWebhookPayload) {
  const action = payload.action;
  const issue = payload.issue;

  if (!issue) return;

  console.log(`[GitHub Webhook] Issue #${issue.number}: ${action}`);

  // Create task for new issues with specific labels
  if (action === 'opened') {
    const labels = issue.labels.map(l => l.name);
    const isBug = labels.some(l => l.toLowerCase().includes('bug'));
    const isFeature = labels.some(l => l.toLowerCase().includes('feature'));

    if (isBug || isFeature) {
      // Auto-create task from GitHub issue
      const task: MaestroTask = {
        task_id: `gh-issue-${issue.number}`,
        project_id: 'github-sync',
        title: `GitHub Issue #${issue.number}: ${issue.title}`,
        description: `From GitHub: ${payload.repository?.full_name}\nState: ${issue.state}`,
        ai_prompt: `Analyze and address GitHub issue #${issue.number}: ${issue.title}`,
        assigned_to_agent: isBug ? 'bug-fix-agent' : 'feature-agent',
        priority: isBug ? 5 : 3,
        status: 'todo',
        created_date: new Date().toISOString(),
      };

      createTask(task);

      console.log(
        `[GitHub Webhook] Created task for issue #${issue.number}`
      );
    }
  }

  // Broadcast issue event
  const webhookPayload: WebhookPayload = {
    event: 'github.issue',
    timestamp: new Date().toISOString(),
    data: {
      action,
      number: issue.number,
      title: issue.title,
      state: issue.state,
      labels: issue.labels.map(l => l.name),
      repository: payload.repository?.full_name,
    },
    metadata: {
      source: 'github',
      priority: 'medium',
    },
  };

  await WebhookDeliveryService.broadcast(webhookPayload);
}

/**
 * GET /api/webhooks/github
 * Verify webhook endpoint (for GitHub setup)
 */
export async function GET() {
  return NextResponse.json({
    service: 'Maestro GitHub Webhook Handler',
    status: 'active',
    supported_events: ['push', 'pull_request', 'issues'],
  });
}
