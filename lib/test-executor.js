/**
 * Test Executor
 * Orchestrates test execution based on triggers and context
 */

import { runQuickTests, generateQuickTestReport } from './quick-tests.js';
import { runDeepTests, generateDeepTestReport } from './deep-tests.js';
import eventBus, { Events } from './event-bus.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Test execution modes
 */
export const TestMode = {
  QUICK: 'quick', // Fast validation (builds, types, lint)
  DEEP: 'deep', // Comprehensive testing (integration, edge cases, performance)
  AUTO: 'auto', // Automatically determine based on context
};

/**
 * Test Executor class
 */
export class TestExecutor {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.reportsDir = options.reportsDir || path.join(this.projectRoot, 'data', 'test-reports');
    this.maestroUrl = options.maestroUrl || 'http://localhost:3000';
  }

  /**
   * Execute tests based on mode
   * @param {string} mode - Test mode (quick, deep, or auto)
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} Test results
   */
  async execute(mode = TestMode.AUTO, context = {}) {
    console.log(`[TestExecutor] Executing tests in ${mode} mode`);

    const executionMode = mode === TestMode.AUTO ? this.determineMode(context) : mode;

    let results;
    let report;

    try {
      if (executionMode === TestMode.QUICK) {
        results = await this.executeQuickTests(context);
        report = generateQuickTestReport(results);
      } else if (executionMode === TestMode.DEEP) {
        results = await this.executeDeepTests(context);
        report = generateDeepTestReport(results);
      } else {
        throw new Error(`Unknown test mode: ${executionMode}`);
      }

      // Save report
      await this.saveReport(report, results, executionMode);

      // Emit test completion event
      await eventBus.emit(
        results.passed ? Events.TEST_RUN_COMPLETED : Events.TEST_FAILED,
        {
          mode: executionMode,
          passed: results.passed,
          duration: results.duration,
          context,
        }
      );

      console.log(
        `[TestExecutor] Tests ${results.passed ? 'PASSED' : 'FAILED'} (${executionMode} mode)`
      );

      return {
        mode: executionMode,
        results,
        report,
      };
    } catch (error) {
      console.error('[TestExecutor] Error executing tests:', error);

      await eventBus.emit(Events.TEST_FAILED, {
        mode: executionMode,
        error: error.message,
        context,
      });

      return {
        mode: executionMode,
        results: { passed: false, error: error.message },
        report: null,
      };
    }
  }

  /**
   * Execute quick tests
   */
  async executeQuickTests(context = {}) {
    console.log('[TestExecutor] Running quick tests...');

    await eventBus.emit(Events.TEST_RUN_STARTED, {
      mode: TestMode.QUICK,
      context,
    });

    const results = await runQuickTests({
      projectRoot: this.projectRoot,
      ...context,
    });

    return results;
  }

  /**
   * Execute deep tests
   */
  async executeDeepTests(context = {}) {
    console.log('[TestExecutor] Running deep tests...');

    await eventBus.emit(Events.TEST_RUN_STARTED, {
      mode: TestMode.DEEP,
      context,
    });

    const results = await runDeepTests({
      maestroUrl: this.maestroUrl,
      projectRoot: this.projectRoot,
      ...context,
    });

    return results;
  }

  /**
   * Determine test mode based on context
   * @param {Object} context - Execution context
   * @returns {string} Test mode
   */
  determineMode(context) {
    // PR created → Deep tests
    if (context.trigger === 'pr_created') {
      return TestMode.DEEP;
    }

    // PR updated → Quick tests
    if (context.trigger === 'pr_updated') {
      return TestMode.QUICK;
    }

    // Task completed → Quick tests
    if (context.trigger === 'task_completed') {
      return TestMode.QUICK;
    }

    // Manual trigger with explicit mode
    if (context.requestedMode) {
      return context.requestedMode;
    }

    // Default to quick tests
    return TestMode.QUICK;
  }

  /**
   * Save test report
   */
  async saveReport(report, results, mode) {
    try {
      // Ensure reports directory exists
      await fs.mkdir(this.reportsDir, { recursive: true });

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `test-report-${mode}-${timestamp}.md`;
      const filepath = path.join(this.reportsDir, filename);

      // Write report
      await fs.writeFile(filepath, report, 'utf8');

      console.log(`[TestExecutor] Report saved: ${filename}`);

      return filepath;
    } catch (error) {
      console.error('[TestExecutor] Error saving report:', error);
      return null;
    }
  }

  /**
   * Execute tests on task completion
   * @param {Object} task - The completed task
   * @returns {Promise<Object>} Validation results
   */
  async validateTask(task) {
    console.log(`[TestExecutor] Validating task: ${task.task_id}`);

    return await this.execute(TestMode.QUICK, {
      trigger: 'task_completed',
      task_id: task.task_id,
      task_title: task.title,
    });
  }

  /**
   * Execute tests for PR
   * @param {Object} prData - PR information
   * @returns {Promise<Object>} Test results
   */
  async testPullRequest(prData, mode = TestMode.DEEP) {
    console.log(`[TestExecutor] Testing PR #${prData.number}`);

    return await this.execute(mode, {
      trigger: prData.action === 'opened' ? 'pr_created' : 'pr_updated',
      pr_number: prData.number,
      pr_title: prData.title,
      head_sha: prData.head_sha,
    });
  }

  /**
   * Execute tests manually (user clicks "Run Tests")
   * @param {string} mode - Test mode
   * @returns {Promise<Object>} Test results
   */
  async runManualTests(mode = TestMode.AUTO) {
    console.log('[TestExecutor] Running manual tests');

    return await this.execute(mode, {
      trigger: 'manual',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get recent test results
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Array>} Recent test results
   */
  async getRecentResults(limit = 10) {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true });

      const files = await fs.readdir(this.reportsDir);
      const reportFiles = files
        .filter((f) => f.startsWith('test-report-') && f.endsWith('.md'))
        .sort()
        .reverse()
        .slice(0, limit);

      const results = [];

      for (const file of reportFiles) {
        const filepath = path.join(this.reportsDir, file);
        const content = await fs.readFile(filepath, 'utf8');
        const stats = await fs.stat(filepath);

        results.push({
          filename: file,
          path: filepath,
          created: stats.mtime,
          content: content.substring(0, 500), // Preview
        });
      }

      return results;
    } catch (error) {
      console.error('[TestExecutor] Error getting recent results:', error);
      return [];
    }
  }

  /**
   * Get test statistics
   * @returns {Promise<Object>} Test statistics
   */
  async getStatistics() {
    try {
      const recentResults = await this.getRecentResults(50);

      const stats = {
        total_test_runs: recentResults.length,
        quick_tests: 0,
        deep_tests: 0,
        passed: 0,
        failed: 0,
        last_run: recentResults[0]?.created || null,
      };

      for (const result of recentResults) {
        if (result.filename.includes('quick')) {
          stats.quick_tests++;
        } else if (result.filename.includes('deep')) {
          stats.deep_tests++;
        }

        // Parse content for pass/fail (simple check)
        if (result.content.includes('✅ PASS')) {
          stats.passed++;
        } else if (result.content.includes('❌ FAIL')) {
          stats.failed++;
        }
      }

      return stats;
    } catch (error) {
      console.error('[TestExecutor] Error getting statistics:', error);
      return {
        total_test_runs: 0,
        quick_tests: 0,
        deep_tests: 0,
        passed: 0,
        failed: 0,
        last_run: null,
      };
    }
  }
}

/**
 * Create default test executor instance
 */
export function createTestExecutor(options = {}) {
  return new TestExecutor(options);
}

/**
 * Quick helper to run tests
 */
export async function runTests(mode = TestMode.AUTO, context = {}) {
  const executor = createTestExecutor();
  return await executor.execute(mode, context);
}
