/**
 * Event Listeners
 * Set up event-triggered testing and automation
 */

import eventBus, { Events } from './event-bus.js';
import { runQuickTests, quickTestSummary } from './quick-tests.js';
import { runDeepTests } from './deep-tests.js';
import { createBug, createTaskFromBug, BugSeverity } from './bug-tracker.js';

/**
 * Initialize all event listeners
 */
export function initializeEventListeners() {
  console.log('[EventListeners] Initializing event listeners...');

  // Task Completion → Trigger Validation
  eventBus.on(Events.TASK_COMPLETED, handleTaskCompletion);

  // PR Created → Run Integration Tests
  eventBus.on(Events.PR_CREATED, handlePRCreated);

  // PR Updated → Run Quick Tests
  eventBus.on(Events.PR_UPDATED, handlePRUpdated);

  // Build Failed → Create Bug Report
  eventBus.on(Events.BUILD_FAILED, handleBuildFailed);

  // Test Failed → Log and Notify
  eventBus.on(Events.TEST_FAILED, handleTestFailed);

  // Bug Found → Create Task
  eventBus.on(Events.BUG_FOUND, handleBugFound);

  console.log('[EventListeners] All event listeners registered');
}

/**
 * Handle task completion event
 * Runs quick validation tests when a task is marked complete
 */
async function handleTaskCompletion(task) {
  console.log(`[EventListeners] Task completed: ${task.task_id}`);

  try {
    // Run quick tests to validate the task
    const results = await runQuickTests({
      projectRoot: process.cwd(),
      taskId: task.task_id,
    });

    console.log(`[EventListeners] Quick tests ${results.passed ? 'PASSED' : 'FAILED'}`);

    if (!results.passed) {
      // Validation failed - create bug tasks
      const failedTests = results.tests.filter((t) => !t.passed);

      for (const test of failedTests) {
        // Skip tests that were skipped
        if (test.output && test.output.includes('skipping')) {
          continue;
        }

        // Create bug report
        const bug = createBug({
          title: `${test.name} failed for task ${task.task_id}`,
          description: test.output || 'Test failed',
          severity: determineSeverity(test),
          steps: [
            `Complete task ${task.task_id}`,
            `Run ${test.name}`,
            'Observe failure',
          ],
          expected: 'Test should pass',
          actual: test.error || test.output,
          found_in: task.title || 'Unknown feature',
          environment: 'production',
        });

        // Emit bug found event
        await eventBus.emit(Events.BUG_FOUND, bug);

        console.log(`[EventListeners] Bug created: ${bug.bug_id}`);
      }

      // Mark task as having issues
      console.log(
        `[EventListeners] Task ${task.task_id} completed but failed validation`
      );
    } else {
      console.log(`[EventListeners] Task ${task.task_id} validated successfully`);
    }

    return results;
  } catch (error) {
    console.error('[EventListeners] Error validating task:', error);
    return { passed: false, error: error.message };
  }
}

/**
 * Handle PR created event
 * Runs full integration tests when a PR is created
 */
async function handlePRCreated(prData) {
  console.log(`[EventListeners] PR created: #${prData.number || 'unknown'}`);

  try {
    // Run deep integration tests
    const results = await runDeepTests({
      maestroUrl: prData.maestroUrl || 'http://localhost:3000',
      prNumber: prData.number,
    });

    console.log(`[EventListeners] Deep tests ${results.passed ? 'PASSED' : 'FAILED'}`);

    // Store results for webhook to post as PR comment
    prData.testResults = results;

    return results;
  } catch (error) {
    console.error('[EventListeners] Error running PR tests:', error);
    return { passed: false, error: error.message };
  }
}

/**
 * Handle PR updated event
 * Runs quick tests when a PR is updated
 */
async function handlePRUpdated(prData) {
  console.log(`[EventListeners] PR updated: #${prData.number || 'unknown'}`);

  try {
    // Run quick tests only
    const summary = await quickTestSummary({
      projectRoot: process.cwd(),
    });

    console.log(
      `[EventListeners] Quick tests: ${summary.passed_count}/${summary.total} passed`
    );

    prData.testSummary = summary;

    return summary;
  } catch (error) {
    console.error('[EventListeners] Error running PR quick tests:', error);
    return { passed: false, error: error.message };
  }
}

/**
 * Handle build failed event
 * Creates a bug report when build fails
 */
async function handleBuildFailed(buildData) {
  console.log('[EventListeners] Build failed');

  try {
    const bug = createBug({
      title: 'Build failed',
      description: buildData.error || 'Build process failed',
      severity: BugSeverity.HIGH,
      steps: ['Run build command', 'Observe failure'],
      expected: 'Build completes successfully',
      actual: buildData.error || 'Build failed',
      found_in: 'Build System',
      environment: buildData.environment || 'production',
    });

    await eventBus.emit(Events.BUG_FOUND, bug);

    console.log(`[EventListeners] Build failure bug created: ${bug.bug_id}`);

    return bug;
  } catch (error) {
    console.error('[EventListeners] Error handling build failure:', error);
    return null;
  }
}

/**
 * Handle test failed event
 * Logs test failure and notifies relevant parties
 */
async function handleTestFailed(testData) {
  console.log(`[EventListeners] Test failed: ${testData.test_name || 'unknown'}`);

  try {
    // Log the failure
    console.error('[TestFailure]', {
      test: testData.test_name,
      error: testData.error,
      timestamp: new Date().toISOString(),
    });

    // Could send notification here (email, Slack, etc.)

    return { logged: true };
  } catch (error) {
    console.error('[EventListeners] Error handling test failure:', error);
    return { logged: false };
  }
}

/**
 * Handle bug found event
 * Creates a task from the bug report
 */
async function handleBugFound(bug) {
  console.log(`[EventListeners] Bug found: ${bug.bug_id} - ${bug.title}`);

  try {
    // Determine if bug is severe enough to auto-create task
    const autoCreateSeverities = [BugSeverity.CRITICAL, BugSeverity.HIGH];

    if (autoCreateSeverities.includes(bug.severity)) {
      // Create task from bug
      const task = createTaskFromBug(bug, {
        project_id: bug.project_id || 'default-project',
      });

      console.log(`[EventListeners] Task created from bug: ${task.task_id}`);

      // Emit task created event
      await eventBus.emit(Events.TASK_CREATED, task);

      // Store the bug and task (would save to database)
      console.log(
        `[EventListeners] Bug ${bug.bug_id} converted to task ${task.task_id}`
      );

      return task;
    } else {
      console.log(
        `[EventListeners] Bug ${bug.bug_id} severity ${bug.severity} - not auto-creating task`
      );
      return null;
    }
  } catch (error) {
    console.error('[EventListeners] Error creating task from bug:', error);
    return null;
  }
}

/**
 * Determine bug severity from test result
 */
function determineSeverity(test) {
  const testName = test.name.toLowerCase();

  // Critical: Build or TypeScript errors
  if (testName.includes('build') || testName.includes('typescript')) {
    return BugSeverity.CRITICAL;
  }

  // High: Functionality tests
  if (testName.includes('functionality') || testName.includes('test')) {
    return BugSeverity.HIGH;
  }

  // Medium: Linting
  if (testName.includes('lint')) {
    return BugSeverity.MEDIUM;
  }

  // Default to medium
  return BugSeverity.MEDIUM;
}

/**
 * Manually trigger task validation
 * Useful for testing the event system
 */
export async function triggerTaskValidation(task) {
  return await eventBus.emit(Events.TASK_COMPLETED, task);
}

/**
 * Manually trigger PR tests
 * Useful for testing the event system
 */
export async function triggerPRTests(prData) {
  return await eventBus.emit(Events.PR_CREATED, prData);
}

/**
 * Get event listener statistics
 */
export function getEventListenerStats() {
  return {
    registered_events: eventBus.getEvents(),
    listener_counts: eventBus.getEvents().map((event) => ({
      event,
      count: eventBus.listenerCount(event),
    })),
    recent_events: eventBus.getHistory(10),
  };
}
