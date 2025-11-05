/**
 * Test Scenarios Library
 * Defines test scenarios for different features and agents
 */

/**
 * Test scenarios for Product Improvement Agent
 */
export const productImprovementAgentScenarios = [
  {
    name: 'Analyze empty project',
    description: 'Test behavior when analyzing a project with no code',
    input: { projectId: 'empty-project', files: [] },
    expected: {
      status: 'success',
      suggestions: [],
      message: 'No code to analyze',
    },
  },
  {
    name: 'Detect duplicate code',
    description: 'Identify duplicate code blocks across files',
    input: {
      projectId: 'project-with-duplicates',
      files: [
        { path: 'file1.js', content: 'function foo() { return 1; }' },
        { path: 'file2.js', content: 'function foo() { return 1; }' },
      ],
    },
    expected: {
      status: 'success',
      suggestions: [
        {
          type: 'refactoring',
          severity: 'medium',
          description: 'Duplicate code detected',
        },
      ],
    },
  },
  {
    name: 'Identify performance issues',
    description: 'Detect inefficient code patterns',
    input: {
      projectId: 'project-with-performance-issues',
      files: [
        {
          path: 'slow.js',
          content: 'for(let i=0; i<arr.length; i++) { /* heavy work */ }',
        },
      ],
    },
    expected: {
      status: 'success',
      suggestions: [
        {
          type: 'performance',
          severity: 'high',
          description: 'Inefficient loop detected',
        },
      ],
    },
  },
  {
    name: 'Analyze large codebase',
    description: 'Test performance with large number of files',
    input: {
      projectId: 'large-project',
      files: Array(1000).fill({ path: 'file.js', content: 'const x = 1;' }),
    },
    expected: {
      status: 'success',
      processingTime: '<5000ms',
    },
  },
];

/**
 * Test scenarios for Supervisor Agent
 */
export const supervisorAgentScenarios = [
  {
    name: 'Route task to available agent',
    description: 'Assign task to the most appropriate available agent',
    input: {
      task: {
        task_id: 'task-001',
        title: 'Build login form',
        description: 'Create a React login form',
        agent_type: 'Frontend',
      },
      agents: [
        { agent_id: 'frontend-1', status: 'idle', agent_name: 'Frontend' },
        { agent_id: 'backend-1', status: 'active', agent_name: 'Backend' },
      ],
    },
    expected: {
      assigned_to: 'frontend-1',
      reason: 'Frontend agent available and matches task type',
    },
  },
  {
    name: 'Detect bottleneck',
    description: 'Identify when agent workload is too high',
    input: {
      backlog: 15,
      agents: [{ agent_id: 'frontend-1', status: 'active', tasks: 10 }],
    },
    expected: {
      bottleneck_detected: true,
      recommendation: 'Spawn additional frontend agent',
    },
  },
  {
    name: 'Handle no available agents',
    description: 'Queue task when no agents are available',
    input: {
      task: { task_id: 'task-002', title: 'Fix bug' },
      agents: [
        { agent_id: 'agent-1', status: 'active', tasks: 5 },
        { agent_id: 'agent-2', status: 'active', tasks: 5 },
      ],
    },
    expected: {
      status: 'queued',
      message: 'All agents busy, task queued',
    },
  },
  {
    name: 'Prioritize critical tasks',
    description: 'Ensure high priority tasks are handled first',
    input: {
      tasks: [
        { task_id: 'task-1', priority: 5 },
        { task_id: 'task-2', priority: 1 },
        { task_id: 'task-3', priority: 3 },
      ],
    },
    expected: {
      order: ['task-2', 'task-3', 'task-1'],
    },
  },
];

/**
 * Test scenarios for Testing Agent
 */
export const testingAgentScenarios = [
  {
    name: 'Validate passing feature',
    description: 'Test a feature that works correctly',
    input: {
      feature: {
        name: 'User Login',
        implementation: 'working',
      },
    },
    expected: {
      passed: true,
      tests_run: 8,
      tests_passed: 8,
      tests_failed: 0,
    },
  },
  {
    name: 'Detect edge case failures',
    description: 'Identify when edge cases fail',
    input: {
      feature: {
        name: 'Form Validation',
        handles_empty_input: false,
      },
    },
    expected: {
      passed: false,
      edge_cases: [
        { name: 'Empty Input', passed: false },
      ],
    },
  },
  {
    name: 'Integration test multiple features',
    description: 'Test features working together',
    input: {
      features: ['Authentication', 'Authorization', 'User Profile'],
    },
    expected: {
      integration_test: true,
      passed: true,
      data_flow_passed: true,
    },
  },
];

/**
 * Test scenarios for Backend Agent
 */
export const backendAgentScenarios = [
  {
    name: 'Create REST API endpoint',
    description: 'Build a new API endpoint with validation',
    input: {
      endpoint: '/api/users',
      method: 'POST',
      validation: ['email', 'password'],
    },
    expected: {
      status: 'success',
      endpoint_created: true,
      validation_implemented: true,
    },
  },
  {
    name: 'Handle database errors',
    description: 'Gracefully handle database connection failures',
    input: {
      operation: 'query',
      database_status: 'disconnected',
    },
    expected: {
      error_handled: true,
      error_message: 'Database connection failed',
      retry_attempted: true,
    },
  },
];

/**
 * Test scenarios for Frontend Agent
 */
export const frontendAgentScenarios = [
  {
    name: 'Create responsive component',
    description: 'Build component that works on mobile and desktop',
    input: {
      component: 'UserCard',
      responsive: true,
    },
    expected: {
      mobile_tested: true,
      desktop_tested: true,
      passed: true,
    },
  },
  {
    name: 'Handle loading states',
    description: 'Properly display loading indicators',
    input: {
      component: 'DataTable',
      async_data: true,
    },
    expected: {
      loading_state: true,
      error_state: true,
      empty_state: true,
    },
  },
];

/**
 * All test scenarios organized by agent type
 */
export const testScenarios = {
  productImprovementAgent: productImprovementAgentScenarios,
  supervisorAgent: supervisorAgentScenarios,
  testingAgent: testingAgentScenarios,
  backendAgent: backendAgentScenarios,
  frontendAgent: frontendAgentScenarios,
};

/**
 * Run a specific test scenario
 * @param {Object} scenario - The scenario to run
 * @param {Function} implementation - The actual function to test
 * @returns {Object} Test result with pass/fail status
 */
export function runScenario(scenario, implementation) {
  const result = {
    scenario: scenario.name,
    passed: false,
    actual: null,
    expected: scenario.expected,
    errors: [],
    duration: 0,
  };

  const startTime = Date.now();

  try {
    // Run the implementation with the scenario input
    result.actual = implementation(scenario.input);

    // Compare actual vs expected
    result.passed = compareResults(result.actual, scenario.expected);

    if (!result.passed) {
      result.errors.push('Output does not match expected result');
    }
  } catch (error) {
    result.passed = false;
    result.errors.push(error.message);
  } finally {
    result.duration = Date.now() - startTime;
  }

  return result;
}

/**
 * Compare actual results with expected results
 * @param {any} actual - The actual result
 * @param {any} expected - The expected result
 * @returns {boolean} True if results match
 */
function compareResults(actual, expected) {
  // Simple comparison - could be enhanced with deep equality
  if (typeof expected === 'object' && expected !== null) {
    for (const key in expected) {
      if (actual[key] !== expected[key]) {
        return false;
      }
    }
    return true;
  }
  return actual === expected;
}

/**
 * Run all scenarios for a specific agent type
 * @param {string} agentType - The agent type to test
 * @param {Function} implementation - The implementation to test
 * @returns {Object} Summary of all test results
 */
export function runAllScenarios(agentType, implementation) {
  const scenarios = testScenarios[agentType] || [];
  const results = {
    agent_type: agentType,
    total_scenarios: scenarios.length,
    passed: 0,
    failed: 0,
    scenarios: [],
  };

  for (const scenario of scenarios) {
    const result = runScenario(scenario, implementation);
    results.scenarios.push(result);

    if (result.passed) {
      results.passed++;
    } else {
      results.failed++;
    }
  }

  return results;
}

/**
 * Get scenarios by difficulty level
 * @param {string} difficulty - 'easy', 'medium', or 'hard'
 * @returns {Array} Filtered scenarios
 */
export function getScenariosByDifficulty(difficulty) {
  const difficultyMap = {
    easy: ['Analyze empty project', 'Route task to available agent'],
    medium: ['Detect duplicate code', 'Handle no available agents'],
    hard: ['Analyze large codebase', 'Detect bottleneck'],
  };

  return difficultyMap[difficulty] || [];
}

/**
 * Generate a test report from scenario results
 * @param {Object} results - Results from runAllScenarios
 * @returns {string} Formatted test report
 */
export function generateScenarioReport(results) {
  const passRate = Math.round((results.passed / results.total_scenarios) * 100);

  let report = `# Test Scenario Report: ${results.agent_type}\n\n`;
  report += `## Summary\n`;
  report += `- Total Scenarios: ${results.total_scenarios}\n`;
  report += `- Passed: ✅ ${results.passed}\n`;
  report += `- Failed: ❌ ${results.failed}\n`;
  report += `- Pass Rate: ${passRate}%\n\n`;

  report += `## Scenario Results\n`;
  for (const scenario of results.scenarios) {
    const icon = scenario.passed ? '✅' : '❌';
    report += `${icon} **${scenario.scenario}** (${scenario.duration}ms)\n`;
    if (!scenario.passed) {
      report += `  Errors: ${scenario.errors.join(', ')}\n`;
    }
  }

  return report;
}
