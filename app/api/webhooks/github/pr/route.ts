/**
 * GitHub PR Webhook Handler
 * Receives GitHub webhook events and triggers tests
 */

import { NextRequest, NextResponse } from 'next/server';
import eventBus, { Events } from '@/lib/event-bus';
import { generateDeepTestReport } from '@/lib/deep-tests';

// Store for test results (in production, use database)
const testResultsCache = new Map();

/**
 * POST /api/webhooks/github/pr
 * Handle GitHub PR webhook events
 */
export async function POST(request: NextRequest) {
  try {
    // Get the GitHub event type
    const githubEvent = request.headers.get('x-github-event');

    if (!githubEvent) {
      return NextResponse.json(
        { error: 'Missing x-github-event header' },
        { status: 400 }
      );
    }

    // Parse webhook payload
    const payload = await request.json();

    console.log(`[Webhook] Received GitHub event: ${githubEvent}`);

    // Handle different event types
    switch (githubEvent) {
      case 'pull_request':
        return await handlePullRequestEvent(payload);

      case 'push':
        return await handlePushEvent(payload);

      default:
        console.log(`[Webhook] Ignoring event type: ${githubEvent}`);
        return NextResponse.json({ message: 'Event type not handled' });
    }
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Handle pull request events
 */
async function handlePullRequestEvent(payload: any) {
  const action = payload.action;
  const pr = payload.pull_request;

  console.log(`[Webhook] PR ${action}: #${pr.number} - ${pr.title}`);

  // Only trigger tests on specific actions
  const testActions = ['opened', 'synchronize', 'reopened'];

  if (!testActions.includes(action)) {
    return NextResponse.json({
      message: `PR action '${action}' does not trigger tests`,
    });
  }

  try {
    // Prepare PR data
    const prData = {
      number: pr.number,
      title: pr.title,
      action: action,
      head_sha: pr.head.sha,
      base_branch: pr.base.ref,
      head_branch: pr.head.ref,
      repo: payload.repository.full_name,
      author: pr.user.login,
      url: pr.html_url,
      maestroUrl: process.env.MAESTRO_URL || 'http://localhost:3000',
    };

    // Emit PR created/updated event based on action
    if (action === 'opened') {
      await eventBus.emit(Events.PR_CREATED, prData);
    } else {
      await eventBus.emit(Events.PR_UPDATED, prData);
    }

    // Get test results (set by event listener)
    const testResults = prData.testResults || prData.testSummary;

    if (testResults) {
      // Store results for retrieval
      testResultsCache.set(pr.number, {
        results: testResults,
        timestamp: new Date().toISOString(),
      });

      // Post results as PR comment
      await postTestResultsComment(prData, testResults);
    }

    return NextResponse.json({
      message: 'Tests triggered successfully',
      pr_number: pr.number,
      tests_passed: testResults?.passed,
    });
  } catch (error) {
    console.error('[Webhook] Error handling PR event:', error);
    return NextResponse.json(
      { error: 'Failed to process PR event', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Handle push events
 */
async function handlePushEvent(payload: any) {
  const ref = payload.ref;
  const commits = payload.commits || [];

  console.log(`[Webhook] Push to ${ref}: ${commits.length} commits`);

  try {
    // Emit commit pushed event
    await eventBus.emit(Events.COMMIT_PUSHED, {
      ref: ref,
      commits: commits.length,
      head_commit: payload.head_commit,
      repo: payload.repository.full_name,
      pusher: payload.pusher.name,
    });

    return NextResponse.json({
      message: 'Push event processed',
      commits: commits.length,
    });
  } catch (error) {
    console.error('[Webhook] Error handling push event:', error);
    return NextResponse.json(
      { error: 'Failed to process push event', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Post test results as PR comment
 */
async function postTestResultsComment(prData: any, testResults: any) {
  try {
    // Generate comment text based on test type
    let commentBody = '';

    if (testResults.test_type === 'deep') {
      // Deep test results
      commentBody = generateDeepTestReport(testResults);
    } else if (testResults.test_type === 'quick') {
      // Quick test summary
      commentBody = generateQuickTestComment(testResults);
    } else if (testResults.passed !== undefined) {
      // Generic test summary
      commentBody = generateGenericTestComment(testResults);
    }

    // In production, post to GitHub API
    // const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    // await octokit.rest.issues.createComment({
    //   owner: prData.repo.split('/')[0],
    //   repo: prData.repo.split('/')[1],
    //   issue_number: prData.number,
    //   body: commentBody,
    // });

    console.log('[Webhook] Test results comment generated (would post to GitHub)');
    console.log(commentBody);

    return true;
  } catch (error) {
    console.error('[Webhook] Error posting PR comment:', error);
    return false;
  }
}

/**
 * Generate quick test comment
 */
function generateQuickTestComment(testResults: any) {
  const passIcon = '✅';
  const failIcon = '❌';

  let comment = `## ${testResults.passed ? passIcon : failIcon} Quick Test Results\n\n`;
  comment += `**Status:** ${testResults.passed ? 'PASS' : 'FAIL'}\n`;
  comment += `**Duration:** ${testResults.duration}ms\n\n`;

  if (testResults.tests && testResults.tests.length > 0) {
    comment += `### Tests\n`;
    for (const test of testResults.tests) {
      const icon = test.passed ? passIcon : failIcon;
      comment += `${icon} ${test.name} (${test.duration}ms)\n`;
    }
  }

  if (!testResults.passed && testResults.tests) {
    const failedTests = testResults.tests.filter((t: any) => !t.passed);
    if (failedTests.length > 0) {
      comment += `\n### Failed Tests\n`;
      for (const test of failedTests) {
        comment += `- **${test.name}**: ${test.error || test.output}\n`;
      }
    }
  }

  return comment;
}

/**
 * Generate generic test comment
 */
function generateGenericTestComment(testResults: any) {
  const passIcon = testResults.passed ? '✅' : '❌';

  let comment = `## ${passIcon} Test Results\n\n`;
  comment += `**Status:** ${testResults.passed ? 'PASS' : 'FAIL'}\n`;

  if (testResults.total) {
    comment += `**Total Tests:** ${testResults.total}\n`;
    comment += `**Passed:** ${testResults.passed_count || 0}\n`;
    comment += `**Failed:** ${testResults.failed_count || 0}\n`;
  }

  if (testResults.failing_tests && testResults.failing_tests.length > 0) {
    comment += `\n### Failing Tests\n`;
    for (const test of testResults.failing_tests) {
      comment += `- ${test}\n`;
    }
  }

  return comment;
}

/**
 * GET /api/webhooks/github/pr?pr=123
 * Retrieve test results for a PR
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const prNumber = searchParams.get('pr');

    if (!prNumber) {
      return NextResponse.json(
        { error: 'Missing pr parameter' },
        { status: 400 }
      );
    }

    const cached = testResultsCache.get(parseInt(prNumber));

    if (!cached) {
      return NextResponse.json(
        { error: 'No test results found for this PR' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      pr_number: prNumber,
      timestamp: cached.timestamp,
      results: cached.results,
    });
  } catch (error) {
    console.error('[Webhook] Error retrieving test results:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
