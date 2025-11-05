/**
 * Event System Test Suite
 * Comprehensive tests for the event-driven testing infrastructure
 */

import eventBus, { Events } from './event-bus.js';
import { initializeEventListeners } from './event-listeners.js';
import { createTestExecutor, TestMode } from './test-executor.js';
import { createBug, createTaskFromBug, BugSeverity } from './bug-tracker.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Test results storage
 */
const testResults = {
  timestamp: new Date().toISOString(),
  total_tests: 0,
  passed_tests: 0,
  failed_tests: 0,
  suites: [],
};

/**
 * Test helper: Run a test and record result
 */
async function runTest(testName, testFn) {
  const result = {
    name: testName,
    passed: false,
    duration: 0,
    error: null,
    details: null,
  };

  const startTime = Date.now();

  try {
    const testResult = await testFn();
    result.passed = testResult.passed !== false;
    result.details = testResult.details || testResult;
    testResults.passed_tests++;
  } catch (error) {
    result.passed = false;
    result.error = error.message;
    result.stack = error.stack;
    testResults.failed_tests++;
  } finally {
    result.duration = Date.now() - startTime;
    testResults.total_tests++;
  }

  return result;
}

/**
 * Test Suite 1: EventBus Core Functionality
 */
async function testEventBusCore() {
  console.log('\n📦 Testing EventBus Core Functionality...');

  const suite = {
    name: 'EventBus Core',
    tests: [],
  };

  // Test 1: EventBus emit and on
  suite.tests.push(
    await runTest('EventBus emit and on', async () => {
      let eventReceived = false;
      let eventData = null;

      const unsubscribe = eventBus.on('test_event', (data) => {
        eventReceived = true;
        eventData = data;
      });

      await eventBus.emit('test_event', { message: 'Hello World' });

      unsubscribe(); // Clean up

      return {
        passed: eventReceived && eventData?.message === 'Hello World',
        details: { eventReceived, eventData },
      };
    })
  );

  // Test 2: Multiple listeners on same event
  suite.tests.push(
    await runTest('Multiple listeners on same event', async () => {
      let listener1Called = false;
      let listener2Called = false;

      const unsub1 = eventBus.on('multi_test', () => {
        listener1Called = true;
      });
      const unsub2 = eventBus.on('multi_test', () => {
        listener2Called = true;
      });

      await eventBus.emit('multi_test', {});

      unsub1();
      unsub2();

      return {
        passed: listener1Called && listener2Called,
        details: { listener1Called, listener2Called },
      };
    })
  );

  // Test 3: EventBus once (one-time listener)
  suite.tests.push(
    await runTest('EventBus once (one-time listener)', async () => {
      let callCount = 0;

      eventBus.once('once_test', () => {
        callCount++;
      });

      await eventBus.emit('once_test', {});
      await eventBus.emit('once_test', {}); // Should not trigger

      return {
        passed: callCount === 1,
        details: { callCount, expected: 1 },
      };
    })
  );

  // Test 4: EventBus off (unsubscribe)
  suite.tests.push(
    await runTest('EventBus off (unsubscribe)', async () => {
      let callCount = 0;

      const handler = () => {
        callCount++;
      };

      eventBus.on('off_test', handler);
      await eventBus.emit('off_test', {});

      eventBus.off('off_test', handler);
      await eventBus.emit('off_test', {});

      return {
        passed: callCount === 1,
        details: { callCount, expected: 1 },
      };
    })
  );

  // Test 5: Event history tracking
  suite.tests.push(
    await runTest('Event history tracking', async () => {
      eventBus.clearHistory();

      await eventBus.emit('history_test_1', { id: 1 });
      await eventBus.emit('history_test_2', { id: 2 });
      await eventBus.emit('history_test_3', { id: 3 });

      const history = eventBus.getHistory(10);

      return {
        passed: history.length >= 3,
        details: { historyLength: history.length, history },
      };
    })
  );

  // Test 6: Listener count
  suite.tests.push(
    await runTest('Listener count', async () => {
      const unsub1 = eventBus.on('count_test', () => {});
      const unsub2 = eventBus.on('count_test', () => {});
      const unsub3 = eventBus.on('count_test', () => {});

      const count = eventBus.listenerCount('count_test');

      unsub1();
      unsub2();
      unsub3();

      return {
        passed: count === 3,
        details: { count, expected: 3 },
      };
    })
  );

  // Test 7: Error handling in listeners
  suite.tests.push(
    await runTest('Error handling in listeners', async () => {
      let errorOccurred = false;
      let goodListenerCalled = false;

      eventBus.on('error_test', () => {
        throw new Error('Test error');
      });

      eventBus.on('error_test', () => {
        goodListenerCalled = true;
      });

      const results = await eventBus.emit('error_test', {});

      // Check that one listener failed and one succeeded
      const hasError = results.some((r) => r.success === false);
      const hasSuccess = results.some((r) => r.success === true);

      eventBus.removeAllListeners('error_test');

      return {
        passed: hasError && hasSuccess && goodListenerCalled,
        details: { hasError, hasSuccess, goodListenerCalled },
      };
    })
  );

  suite.passed = suite.tests.filter((t) => t.passed).length;
  suite.failed = suite.tests.filter((t) => !t.passed).length;

  return suite;
}

/**
 * Test Suite 2: Event Listeners
 */
async function testEventListeners() {
  console.log('\n🎧 Testing Event Listeners...');

  const suite = {
    name: 'Event Listeners',
    tests: [],
  };

  // Initialize event listeners
  initializeEventListeners();

  // Test 1: Task completion event triggers validation
  suite.tests.push(
    await runTest('Task completion triggers validation', async () => {
      const task = {
        task_id: 'test-task-001',
        title: 'Test Task',
        description: 'Test description',
        status: 'done',
      };

      const results = await eventBus.emit(Events.TASK_COMPLETED, task);

      return {
        passed: results.length > 0 && results.some((r) => r.success),
        details: { results, listenersTriggered: results.length },
      };
    })
  );

  // Test 2: Bug found event creates task (critical severity)
  suite.tests.push(
    await runTest('Bug found (critical) creates task', async () => {
      const bug = createBug({
        title: 'Critical bug test',
        description: 'Test critical bug',
        severity: BugSeverity.CRITICAL,
        expected: 'Should work',
        actual: 'Does not work',
        found_in: 'Test Feature',
      });

      const results = await eventBus.emit(Events.BUG_FOUND, bug);

      // Check if task was created
      const taskCreated = results.some(
        (r) => r.success && r.result && r.result.task_id
      );

      return {
        passed: taskCreated,
        details: { bug, results, taskCreated },
      };
    })
  );

  // Test 3: Bug found event (low severity) does not create task
  suite.tests.push(
    await runTest('Bug found (low) does not create task', async () => {
      const bug = createBug({
        title: 'Low severity bug test',
        description: 'Test low severity bug',
        severity: BugSeverity.LOW,
        expected: 'Should work',
        actual: 'Minor issue',
        found_in: 'Test Feature',
      });

      const results = await eventBus.emit(Events.BUG_FOUND, bug);

      // Check that no task was created
      const taskCreated = results.some(
        (r) => r.success && r.result && r.result.task_id
      );

      return {
        passed: !taskCreated, // Should NOT create task for low severity
        details: { bug, results, taskCreated },
      };
    })
  );

  // Test 4: PR created event triggers tests
  suite.tests.push(
    await runTest('PR created event triggers tests', async () => {
      const prData = {
        number: 42,
        title: 'Test PR',
        action: 'opened',
        head_sha: 'abc123',
        base_branch: 'main',
        head_branch: 'feature/test',
        maestroUrl: 'http://localhost:3000',
      };

      const results = await eventBus.emit(Events.PR_CREATED, prData);

      return {
        passed: results.length > 0,
        details: { prData, results, listenersTriggered: results.length },
      };
    })
  );

  // Test 5: Build failed event creates bug
  suite.tests.push(
    await runTest('Build failed event creates bug', async () => {
      const buildData = {
        error: 'Build failed: TypeScript errors',
        environment: 'production',
      };

      const results = await eventBus.emit(Events.BUILD_FAILED, buildData);

      // Check if bug was created
      const bugCreated = results.some(
        (r) => r.success && r.result && r.result.bug_id
      );

      return {
        passed: bugCreated,
        details: { buildData, results, bugCreated },
      };
    })
  );

  suite.passed = suite.tests.filter((t) => t.passed).length;
  suite.failed = suite.tests.filter((t) => !t.passed).length;

  return suite;
}

/**
 * Test Suite 3: Test Executor
 */
async function testTestExecutor() {
  console.log('\n⚙️ Testing Test Executor...');

  const suite = {
    name: 'Test Executor',
    tests: [],
  };

  const executor = createTestExecutor({
    projectRoot: process.cwd(),
    maestroUrl: 'http://localhost:3000',
  });

  // Test 1: Determine mode (auto)
  suite.tests.push(
    await runTest('Auto-determine test mode', async () => {
      const quickContext = { trigger: 'task_completed' };
      const deepContext = { trigger: 'pr_created' };

      const quickMode = executor.determineMode(quickContext);
      const deepMode = executor.determineMode(deepContext);

      return {
        passed: quickMode === TestMode.QUICK && deepMode === TestMode.DEEP,
        details: { quickMode, deepMode },
      };
    })
  );

  // Test 2: Execute quick tests
  suite.tests.push(
    await runTest('Execute quick tests', async () => {
      const result = await executor.execute(TestMode.QUICK, {
        trigger: 'test',
      });

      return {
        passed: result.mode === TestMode.QUICK && result.results !== null,
        details: {
          mode: result.mode,
          passed: result.results?.passed,
          duration: result.results?.duration,
        },
      };
    })
  );

  // Test 3: Validate task
  suite.tests.push(
    await runTest('Validate task completion', async () => {
      const task = {
        task_id: 'test-task-002',
        title: 'Test Task Validation',
      };

      const result = await executor.validateTask(task);

      return {
        passed: result.mode === TestMode.QUICK && result.results !== null,
        details: {
          mode: result.mode,
          passed: result.results?.passed,
        },
      };
    })
  );

  // Test 4: Get statistics
  suite.tests.push(
    await runTest('Get test statistics', async () => {
      const stats = await executor.getStatistics();

      return {
        passed:
          stats &&
          typeof stats.total_test_runs === 'number' &&
          typeof stats.passed === 'number',
        details: stats,
      };
    })
  );

  // Test 5: Get recent results
  suite.tests.push(
    await runTest('Get recent test results', async () => {
      const results = await executor.getRecentResults(5);

      return {
        passed: Array.isArray(results),
        details: {
          count: results.length,
          results: results.slice(0, 2),
        },
      };
    })
  );

  suite.passed = suite.tests.filter((t) => t.passed).length;
  suite.failed = suite.tests.filter((t) => !t.passed).length;

  return suite;
}

/**
 * Test Suite 4: Bug Tracker
 */
async function testBugTracker() {
  console.log('\n🐛 Testing Bug Tracker...');

  const suite = {
    name: 'Bug Tracker',
    tests: [],
  };

  // Test 1: Create bug
  suite.tests.push(
    await runTest('Create bug report', async () => {
      const bug = createBug({
        title: 'Test bug',
        description: 'Test description',
        severity: BugSeverity.HIGH,
        steps: ['Step 1', 'Step 2'],
        expected: 'Should work',
        actual: 'Does not work',
        found_in: 'Test Feature',
      });

      return {
        passed:
          bug.bug_id &&
          bug.title === 'Test bug' &&
          bug.severity === BugSeverity.HIGH,
        details: bug,
      };
    })
  );

  // Test 2: Create task from bug
  suite.tests.push(
    await runTest('Create task from bug', async () => {
      const bug = createBug({
        title: 'Test bug for task creation',
        description: 'Test',
        severity: BugSeverity.CRITICAL,
        expected: 'Works',
        actual: 'Broken',
        found_in: 'API Endpoint',
      });

      const task = createTaskFromBug(bug, {
        project_id: 'test-project',
      });

      return {
        passed:
          task.task_id &&
          task.title.includes('Fix:') &&
          task.source === 'bug_report' &&
          task.source_id === bug.bug_id &&
          bug.related_task_id === task.task_id,
        details: { bug, task },
      };
    })
  );

  // Test 3: Severity to priority mapping
  suite.tests.push(
    await runTest('Severity to priority mapping', async () => {
      const bug = createBug({
        title: 'Critical bug',
        severity: BugSeverity.CRITICAL,
        expected: 'Works',
        actual: 'Broken',
        found_in: 'System',
      });

      const task = createTaskFromBug(bug);

      return {
        passed: task.priority === 1, // Critical should be priority 1
        details: { severity: bug.severity, priority: task.priority },
      };
    })
  );

  suite.passed = suite.tests.filter((t) => t.passed).length;
  suite.failed = suite.tests.filter((t) => !t.passed).length;

  return suite;
}

/**
 * Test Suite 5: Integration Tests
 */
async function testIntegration() {
  console.log('\n🔄 Testing End-to-End Integration...');

  const suite = {
    name: 'Integration Tests',
    tests: [],
  };

  // Test 1: Complete task completion flow
  suite.tests.push(
    await runTest('Complete task completion flow', async () => {
      const task = {
        task_id: 'integration-test-001',
        title: 'Integration Test Task',
        status: 'done',
      };

      // Emit task completed
      const results = await eventBus.emit(Events.TASK_COMPLETED, task);

      // Should trigger validation
      const validationTriggered = results.length > 0;

      return {
        passed: validationTriggered,
        details: { task, results, validationTriggered },
      };
    })
  );

  // Test 2: Bug to task flow
  suite.tests.push(
    await runTest('Bug to task creation flow', async () => {
      const bug = createBug({
        title: 'Integration test bug',
        severity: BugSeverity.CRITICAL,
        expected: 'Works',
        actual: 'Broken',
        found_in: 'Integration Test',
      });

      // Emit bug found
      const results = await eventBus.emit(Events.BUG_FOUND, bug);

      // Should create task
      const taskCreated = results.some((r) => r.result?.task_id);

      return {
        passed: taskCreated,
        details: { bug, results, taskCreated },
      };
    })
  );

  // Test 3: Event history tracking across flow
  suite.tests.push(
    await runTest('Event history tracking', async () => {
      const historyBefore = eventBus.getHistory(100);

      await eventBus.emit('test_event_1', { data: 1 });
      await eventBus.emit('test_event_2', { data: 2 });
      await eventBus.emit('test_event_3', { data: 3 });

      const historyAfter = eventBus.getHistory(100);

      return {
        passed: historyAfter.length >= historyBefore.length + 3,
        details: {
          eventsBefore: historyBefore.length,
          eventsAfter: historyAfter.length,
        },
      };
    })
  );

  suite.passed = suite.tests.filter((t) => t.passed).length;
  suite.failed = suite.tests.filter((t) => !t.passed).length;

  return suite;
}

/**
 * Generate test report
 */
async function generateTestReport() {
  console.log('\n📊 Generating Test Report...');

  const passIcon = '✅';
  const failIcon = '❌';

  let report = `# Event System Test Report\n\n`;
  report += `**Test Run:** ${new Date(testResults.timestamp).toLocaleString()}\n\n`;

  // Summary
  const passRate = Math.round(
    (testResults.passed_tests / testResults.total_tests) * 100
  );
  report += `## Summary\n\n`;
  report += `- **Total Tests:** ${testResults.total_tests}\n`;
  report += `- **Passed:** ${passIcon} ${testResults.passed_tests}\n`;
  report += `- **Failed:** ${failIcon} ${testResults.failed_tests}\n`;
  report += `- **Pass Rate:** ${passRate}%\n`;
  report += `- **Status:** ${testResults.failed_tests === 0 ? `${passIcon} ALL TESTS PASSED` : `${failIcon} SOME TESTS FAILED`}\n\n`;

  // Test Suites
  report += `## Test Suites\n\n`;

  for (const suite of testResults.suites) {
    const suiteIcon = suite.failed === 0 ? passIcon : failIcon;
    report += `### ${suiteIcon} ${suite.name}\n\n`;
    report += `- Passed: ${suite.passed}/${suite.tests.length}\n`;
    report += `- Failed: ${suite.failed}/${suite.tests.length}\n\n`;

    report += `#### Tests\n\n`;
    for (const test of suite.tests) {
      const testIcon = test.passed ? passIcon : failIcon;
      report += `${testIcon} **${test.name}** (${test.duration}ms)\n`;

      if (!test.passed) {
        report += `\n\`\`\`\nError: ${test.error || 'Test failed'}\n\`\`\`\n`;
        if (test.stack) {
          report += `\n<details>\n<summary>Stack Trace</summary>\n\n\`\`\`\n${test.stack}\n\`\`\`\n</details>\n`;
        }
      }

      if (test.details && test.passed) {
        report += `\n<details>\n<summary>Details</summary>\n\n\`\`\`json\n${JSON.stringify(test.details, null, 2)}\n\`\`\`\n</details>\n`;
      }

      report += '\n';
    }
  }

  // Component Status
  report += `## Component Status\n\n`;
  report += `| Component | Status |\n`;
  report += `|-----------|--------|\n`;

  const componentStatus = {
    'EventBus Core': testResults.suites.find((s) => s.name === 'EventBus Core'),
    'Event Listeners': testResults.suites.find((s) => s.name === 'Event Listeners'),
    'Test Executor': testResults.suites.find((s) => s.name === 'Test Executor'),
    'Bug Tracker': testResults.suites.find((s) => s.name === 'Bug Tracker'),
    'Integration': testResults.suites.find((s) => s.name === 'Integration Tests'),
  };

  for (const [component, suite] of Object.entries(componentStatus)) {
    if (suite) {
      const status = suite.failed === 0 ? `${passIcon} Working` : `${failIcon} Issues Found`;
      report += `| ${component} | ${status} (${suite.passed}/${suite.tests.length}) |\n`;
    } else {
      report += `| ${component} | ⏭️ Not Tested |\n`;
    }
  }

  report += `\n`;

  // Known Issues
  const failedTests = testResults.suites.flatMap((s) =>
    s.tests.filter((t) => !t.passed).map((t) => ({ suite: s.name, test: t }))
  );

  if (failedTests.length > 0) {
    report += `## Known Issues\n\n`;
    for (const { suite, test } of failedTests) {
      report += `### ${suite}: ${test.name}\n\n`;
      report += `**Error:** ${test.error || 'Unknown error'}\n\n`;
      if (test.details) {
        report += `**Details:**\n\`\`\`json\n${JSON.stringify(test.details, null, 2)}\n\`\`\`\n\n`;
      }
    }
  }

  // Recommendations
  report += `## Recommendations\n\n`;
  if (testResults.failed_tests === 0) {
    report += `${passIcon} All systems operational! The event-driven testing infrastructure is working correctly.\n\n`;
    report += `**Next Steps:**\n`;
    report += `1. Configure GitHub webhook for PR testing\n`;
    report += `2. Integrate task completion events into your workflow\n`;
    report += `3. Monitor event history and test results\n`;
  } else {
    report += `${failIcon} Some tests failed. Please review the issues above.\n\n`;
    report += `**Action Items:**\n`;
    for (const { suite, test } of failedTests.slice(0, 5)) {
      report += `- Fix: ${suite} - ${test.name}\n`;
    }
  }

  return report;
}

/**
 * Run all tests
 */
export async function runAllTests() {
  console.log('='.repeat(60));
  console.log('🧪 EVENT SYSTEM TEST SUITE');
  console.log('='.repeat(60));

  try {
    // Run test suites
    testResults.suites.push(await testEventBusCore());
    testResults.suites.push(await testEventListeners());
    testResults.suites.push(await testTestExecutor());
    testResults.suites.push(await testBugTracker());
    testResults.suites.push(await testIntegration());

    // Generate report
    const report = await generateTestReport();

    // Save report
    const reportPath = path.join(process.cwd(), 'data', 'test-reports', 'event-system-test-report.md');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, report, 'utf8');

    console.log(`\n📄 Test report saved: ${reportPath}`);
    console.log('\n' + '='.repeat(60));
    console.log(
      testResults.failed_tests === 0
        ? '✅ ALL TESTS PASSED!'
        : `❌ ${testResults.failed_tests} TEST(S) FAILED`
    );
    console.log('='.repeat(60));

    // Print summary
    console.log(`\nTotal Tests: ${testResults.total_tests}`);
    console.log(`Passed: ✅ ${testResults.passed_tests}`);
    console.log(`Failed: ❌ ${testResults.failed_tests}`);
    console.log(
      `Pass Rate: ${Math.round((testResults.passed_tests / testResults.total_tests) * 100)}%`
    );

    return {
      success: testResults.failed_tests === 0,
      results: testResults,
      report,
      reportPath,
    };
  } catch (error) {
    console.error('\n❌ Test suite error:', error);
    throw error;
  }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
