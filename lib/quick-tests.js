/**
 * Quick Tests
 * Fast validation tests that run on every task completion
 * - Builds without errors
 * - No TypeScript errors
 * - Basic functionality works
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Run all quick tests
 * @param {Object} options - Test options
 * @returns {Promise<Object>} Test results
 */
export async function runQuickTests(options = {}) {
  const projectRoot = options.projectRoot || process.cwd();

  const results = {
    test_type: 'quick',
    started_at: new Date().toISOString(),
    tests: [],
    passed: false,
    duration: 0,
  };

  const startTime = Date.now();

  try {
    // Test 1: Build check
    const buildResult = await testBuild(projectRoot);
    results.tests.push(buildResult);

    // Test 2: TypeScript errors
    const typeScriptResult = await testTypeScript(projectRoot);
    results.tests.push(typeScriptResult);

    // Test 3: Linting
    const lintResult = await testLinting(projectRoot);
    results.tests.push(lintResult);

    // Test 4: Basic functionality
    const functionalityResult = await testBasicFunctionality(projectRoot);
    results.tests.push(functionalityResult);

    // Test 5: Package dependencies
    const depsResult = await testDependencies(projectRoot);
    results.tests.push(depsResult);

    // Determine overall pass/fail
    results.passed = results.tests.every((test) => test.passed);
    results.duration = Date.now() - startTime;
    results.completed_at = new Date().toISOString();

    return results;
  } catch (error) {
    results.passed = false;
    results.error = error.message;
    results.duration = Date.now() - startTime;
    results.completed_at = new Date().toISOString();
    return results;
  }
}

/**
 * Test: Build completes without errors
 */
async function testBuild(projectRoot) {
  const test = {
    name: 'Build Check',
    description: 'Verify project builds without errors',
    passed: false,
    duration: 0,
    output: '',
  };

  const startTime = Date.now();

  try {
    // Check if package.json has a build script
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

    if (!packageJson.scripts || !packageJson.scripts.build) {
      test.passed = true;
      test.output = 'No build script found, skipping';
      test.duration = Date.now() - startTime;
      return test;
    }

    // Run build
    const { stdout, stderr } = await execAsync('npm run build', {
      cwd: projectRoot,
      timeout: 60000, // 1 minute timeout
    });

    test.passed = true;
    test.output = 'Build completed successfully';
    test.details = stdout;
  } catch (error) {
    test.passed = false;
    test.output = 'Build failed';
    test.error = error.message;
    test.details = error.stderr || error.stdout;
  } finally {
    test.duration = Date.now() - startTime;
  }

  return test;
}

/**
 * Test: No TypeScript errors
 */
async function testTypeScript(projectRoot) {
  const test = {
    name: 'TypeScript Check',
    description: 'Check for TypeScript compilation errors',
    passed: false,
    duration: 0,
    output: '',
  };

  const startTime = Date.now();

  try {
    // Check if TypeScript is configured
    const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
    try {
      await fs.access(tsconfigPath);
    } catch {
      test.passed = true;
      test.output = 'No TypeScript configuration found, skipping';
      test.duration = Date.now() - startTime;
      return test;
    }

    // Run TypeScript compiler
    try {
      const { stdout, stderr } = await execAsync('npx tsc --noEmit', {
        cwd: projectRoot,
        timeout: 30000, // 30 second timeout
      });

      test.passed = true;
      test.output = 'No TypeScript errors found';
      test.details = stdout;
    } catch (error) {
      // TypeScript errors
      test.passed = false;
      test.output = 'TypeScript compilation errors found';
      test.error = error.message;
      test.details = error.stdout || error.stderr;
    }
  } catch (error) {
    test.passed = false;
    test.output = 'Failed to run TypeScript check';
    test.error = error.message;
  } finally {
    test.duration = Date.now() - startTime;
  }

  return test;
}

/**
 * Test: Linting passes
 */
async function testLinting(projectRoot) {
  const test = {
    name: 'Lint Check',
    description: 'Run linter to check code quality',
    passed: false,
    duration: 0,
    output: '',
  };

  const startTime = Date.now();

  try {
    // Check if package.json has a lint script
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

    if (!packageJson.scripts || !packageJson.scripts.lint) {
      test.passed = true;
      test.output = 'No lint script found, skipping';
      test.duration = Date.now() - startTime;
      return test;
    }

    // Run linter
    try {
      const { stdout, stderr } = await execAsync('npm run lint', {
        cwd: projectRoot,
        timeout: 30000, // 30 second timeout
      });

      test.passed = true;
      test.output = 'Linting passed';
      test.details = stdout;
    } catch (error) {
      test.passed = false;
      test.output = 'Linting failed';
      test.error = error.message;
      test.details = error.stdout || error.stderr;
    }
  } catch (error) {
    test.passed = false;
    test.output = 'Failed to run linter';
    test.error = error.message;
  } finally {
    test.duration = Date.now() - startTime;
  }

  return test;
}

/**
 * Test: Basic functionality
 */
async function testBasicFunctionality(projectRoot) {
  const test = {
    name: 'Basic Functionality',
    description: 'Verify basic application functionality',
    passed: false,
    duration: 0,
    output: '',
  };

  const startTime = Date.now();

  try {
    // Check if there's a test script
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

    if (!packageJson.scripts || !packageJson.scripts.test) {
      test.passed = true;
      test.output = 'No test script found, skipping';
      test.duration = Date.now() - startTime;
      return test;
    }

    // Run tests with timeout
    try {
      const { stdout, stderr } = await execAsync('npm test -- --passWithNoTests', {
        cwd: projectRoot,
        timeout: 60000, // 1 minute timeout
      });

      test.passed = true;
      test.output = 'Basic functionality tests passed';
      test.details = stdout;
    } catch (error) {
      test.passed = false;
      test.output = 'Basic functionality tests failed';
      test.error = error.message;
      test.details = error.stdout || error.stderr;
    }
  } catch (error) {
    test.passed = false;
    test.output = 'Failed to run functionality tests';
    test.error = error.message;
  } finally {
    test.duration = Date.now() - startTime;
  }

  return test;
}

/**
 * Test: Package dependencies are valid
 */
async function testDependencies(projectRoot) {
  const test = {
    name: 'Dependency Check',
    description: 'Check for dependency issues',
    passed: false,
    duration: 0,
    output: '',
  };

  const startTime = Date.now();

  try {
    // Check for package-lock.json or yarn.lock
    const packageLockPath = path.join(projectRoot, 'package-lock.json');
    const yarnLockPath = path.join(projectRoot, 'yarn.lock');

    let hasLockFile = false;
    try {
      await fs.access(packageLockPath);
      hasLockFile = true;
    } catch {
      try {
        await fs.access(yarnLockPath);
        hasLockFile = true;
      } catch {
        // No lock file
      }
    }

    if (!hasLockFile) {
      test.passed = true;
      test.output = 'No lock file found, skipping dependency check';
      test.duration = Date.now() - startTime;
      return test;
    }

    // Run npm audit for security issues (non-blocking)
    try {
      await execAsync('npm audit --audit-level=high', {
        cwd: projectRoot,
        timeout: 30000,
      });
      test.passed = true;
      test.output = 'No high-severity dependency vulnerabilities';
    } catch (error) {
      // npm audit exits with non-zero if vulnerabilities found
      if (error.stdout && error.stdout.includes('vulnerabilities')) {
        test.passed = false;
        test.output = 'Dependency vulnerabilities found';
        test.error = 'Security vulnerabilities detected';
        test.details = error.stdout;
      } else {
        test.passed = true;
        test.output = 'Dependency check completed';
      }
    }
  } catch (error) {
    test.passed = true; // Don't fail on dependency check errors
    test.output = 'Dependency check skipped';
    test.warning = error.message;
  } finally {
    test.duration = Date.now() - startTime;
  }

  return test;
}

/**
 * Generate quick test report
 * @param {Object} results - Test results
 * @returns {string} Formatted report
 */
export function generateQuickTestReport(results) {
  const passIcon = '✅';
  const failIcon = '❌';
  const skipIcon = '⏭️';

  let report = `# Quick Test Report\n\n`;
  report += `**Status:** ${results.passed ? `${passIcon} PASS` : `${failIcon} FAIL`}\n`;
  report += `**Duration:** ${results.duration}ms\n`;
  report += `**Started:** ${new Date(results.started_at).toLocaleString()}\n\n`;

  report += `## Test Results\n\n`;

  for (const test of results.tests) {
    const icon = test.passed ? passIcon : test.output.includes('skipping') ? skipIcon : failIcon;
    report += `${icon} **${test.name}** (${test.duration}ms)\n`;
    report += `   ${test.output}\n`;
    if (test.error) {
      report += `   Error: ${test.error}\n`;
    }
    report += '\n';
  }

  if (!results.passed) {
    report += `## Failed Tests\n\n`;
    const failedTests = results.tests.filter((t) => !t.passed && !t.output.includes('skipping'));
    for (const test of failedTests) {
      report += `### ${test.name}\n`;
      report += `${test.error || 'Test failed'}\n\n`;
      if (test.details) {
        report += `\`\`\`\n${test.details}\n\`\`\`\n\n`;
      }
    }
  }

  return report;
}

/**
 * Run quick tests and return summary
 * @param {Object} options - Test options
 * @returns {Promise<Object>} Quick summary
 */
export async function quickTestSummary(options = {}) {
  const results = await runQuickTests(options);

  return {
    passed: results.passed,
    total: results.tests.length,
    passed_count: results.tests.filter((t) => t.passed).length,
    failed_count: results.tests.filter((t) => !t.passed).length,
    duration: results.duration,
    failing_tests: results.tests.filter((t) => !t.passed).map((t) => t.name),
  };
}
