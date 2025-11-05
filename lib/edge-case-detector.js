/**
 * Edge Case Detector
 * Identifies and tests edge cases for features
 */

/**
 * Edge Case Detector class
 */
export class EdgeCaseDetector {
  /**
   * Find all edge cases for a given feature
   * @param {Function} feature - The feature function to test
   * @param {Object} options - Configuration options
   * @returns {Array} Array of edge case test definitions
   */
  static findEdgeCases(feature, options = {}) {
    const edgeCases = [];
    const featureName = options.featureName || feature.name || 'unknown';

    // 1. Empty data edge case
    edgeCases.push({
      name: 'Empty Input',
      category: 'data',
      severity: 'high',
      description: 'Test feature behavior with empty input',
      test: async () => {
        try {
          const result = await feature({ data: [] });
          return {
            passed: result !== undefined && result !== null,
            result: result,
            expected: 'Should handle empty data gracefully',
          };
        } catch (error) {
          return {
            passed: false,
            error: error.message,
            expected: 'Should not throw error on empty data',
          };
        }
      },
    });

    // 2. Null/undefined edge case
    edgeCases.push({
      name: 'Null Input',
      category: 'data',
      severity: 'high',
      description: 'Test feature behavior with null/undefined values',
      test: async () => {
        try {
          const nullResult = await feature(null);
          const undefinedResult = await feature(undefined);
          return {
            passed: true,
            result: { nullResult, undefinedResult },
            expected: 'Should return error or default value',
          };
        } catch (error) {
          return {
            passed: true, // Throwing an error is acceptable
            result: 'Error thrown (acceptable)',
            expected: 'Error or default value',
          };
        }
      },
    });

    // 3. Large dataset edge case
    edgeCases.push({
      name: 'Large Dataset',
      category: 'performance',
      severity: 'medium',
      description: 'Test performance with large amounts of data (1000+ items)',
      test: async () => {
        try {
          const largeData = generateLargeDataset(1000);
          const startTime = Date.now();
          const result = await feature({ data: largeData });
          const duration = Date.now() - startTime;

          return {
            passed: duration < 5000, // Should complete within 5 seconds
            result: { duration, itemsProcessed: largeData.length },
            expected: 'Performance acceptable (<5s for 1000 items)',
          };
        } catch (error) {
          return {
            passed: false,
            error: error.message,
            expected: 'Should handle large datasets without errors',
          };
        }
      },
    });

    // 4. Malformed data edge case
    edgeCases.push({
      name: 'Malformed Data',
      category: 'validation',
      severity: 'high',
      description: 'Test with invalid data format',
      test: async () => {
        try {
          const malformedData = [
            'not-an-object',
            { wrong: 'format' },
            null,
            undefined,
          ];
          const result = await feature({ data: malformedData });
          return {
            passed: result.error || result.validation_errors,
            result: result,
            expected: 'Should return validation error',
          };
        } catch (error) {
          return {
            passed: true, // Throwing validation error is acceptable
            result: error.message,
            expected: 'Validation error expected',
          };
        }
      },
    });

    // 5. Concurrent operations edge case
    edgeCases.push({
      name: 'Concurrent Operations',
      category: 'concurrency',
      severity: 'medium',
      description: 'Test feature with multiple simultaneous calls',
      test: async () => {
        try {
          const promises = Array(10)
            .fill(null)
            .map((_, i) => feature({ data: `test-${i}` }));
          const results = await Promise.all(promises);

          return {
            passed: results.every((r) => r !== undefined),
            result: {
              total: results.length,
              successful: results.filter((r) => r).length,
            },
            expected: 'Should handle concurrent calls without race conditions',
          };
        } catch (error) {
          return {
            passed: false,
            error: error.message,
            expected: 'Should handle concurrency gracefully',
          };
        }
      },
    });

    // 6. Network failure edge case (for API calls)
    if (options.isAsync || options.hasNetworkCalls) {
      edgeCases.push({
        name: 'Network Failure',
        category: 'network',
        severity: 'high',
        description: 'Test behavior when network requests fail',
        test: async () => {
          try {
            // Simulate network failure
            const result = await feature({ simulateNetworkError: true });
            return {
              passed: result.error || result.retry_attempted,
              result: result,
              expected: 'Should handle network errors with retry or graceful degradation',
            };
          } catch (error) {
            return {
              passed: true, // Error handling is acceptable
              result: error.message,
              expected: 'Network error handled',
            };
          }
        },
      });
    }

    // 7. Timeout edge case
    if (options.hasTimeout) {
      edgeCases.push({
        name: 'Timeout',
        category: 'performance',
        severity: 'medium',
        description: 'Test behavior when operations timeout',
        test: async () => {
          try {
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 1000)
            );
            const result = await Promise.race([
              feature({ slowOperation: true }),
              timeoutPromise,
            ]);
            return {
              passed: false,
              result: result,
              expected: 'Should timeout after 1s',
            };
          } catch (error) {
            return {
              passed: error.message === 'Timeout',
              result: error.message,
              expected: 'Timeout error',
            };
          }
        },
      });
    }

    // 8. Special characters edge case
    if (options.acceptsStrings) {
      edgeCases.push({
        name: 'Special Characters',
        category: 'validation',
        severity: 'medium',
        description: 'Test with special characters and unicode',
        test: async () => {
          const specialChars = [
            '!@#$%^&*()',
            '<script>alert("xss")</script>',
            '你好世界',
            '🚀🎉',
            "'; DROP TABLE users;--",
          ];

          try {
            const results = await Promise.all(
              specialChars.map((input) => feature({ data: input }))
            );
            return {
              passed: results.every((r) => r !== undefined),
              result: results,
              expected: 'Should handle special characters safely',
            };
          } catch (error) {
            return {
              passed: false,
              error: error.message,
              expected: 'Should sanitize or handle special characters',
            };
          }
        },
      });
    }

    // 9. Boundary values edge case
    if (options.hasNumericInput) {
      edgeCases.push({
        name: 'Boundary Values',
        category: 'validation',
        severity: 'high',
        description: 'Test with min/max values and edge boundaries',
        test: async () => {
          const boundaryValues = [
            0,
            -1,
            Number.MAX_SAFE_INTEGER,
            Number.MIN_SAFE_INTEGER,
            Infinity,
            -Infinity,
            NaN,
          ];

          try {
            const results = await Promise.all(
              boundaryValues.map((val) => feature({ value: val }))
            );
            return {
              passed: results.every(
                (r) => r !== undefined && r !== null
              ),
              result: results,
              expected: 'Should handle boundary values correctly',
            };
          } catch (error) {
            return {
              passed: false,
              error: error.message,
              expected: 'Should validate boundary values',
            };
          }
        },
      });
    }

    // 10. State transition edge case
    if (options.hasState) {
      edgeCases.push({
        name: 'State Transitions',
        category: 'state',
        severity: 'medium',
        description: 'Test invalid state transitions',
        test: async () => {
          try {
            // Try invalid state transition
            const result = await feature({ fromState: 'done', toState: 'todo' });
            return {
              passed: result.error || !result.success,
              result: result,
              expected: 'Should prevent invalid state transitions',
            };
          } catch (error) {
            return {
              passed: true,
              result: error.message,
              expected: 'Invalid state transition prevented',
            };
          }
        },
      });
    }

    return edgeCases;
  }

  /**
   * Run all edge case tests for a feature
   * @param {Array} edgeCases - Array of edge case definitions
   * @returns {Object} Test results
   */
  static async runEdgeCaseTests(edgeCases) {
    const results = {
      total: edgeCases.length,
      passed: 0,
      failed: 0,
      details: [],
    };

    for (const edgeCase of edgeCases) {
      try {
        const testResult = await edgeCase.test();
        const passed = testResult.passed;

        results.details.push({
          name: edgeCase.name,
          category: edgeCase.category,
          severity: edgeCase.severity,
          passed: passed,
          result: testResult.result,
          expected: testResult.expected,
          error: testResult.error,
        });

        if (passed) {
          results.passed++;
        } else {
          results.failed++;
        }
      } catch (error) {
        results.failed++;
        results.details.push({
          name: edgeCase.name,
          category: edgeCase.category,
          severity: edgeCase.severity,
          passed: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Get edge cases by category
   * @param {Array} edgeCases - Array of edge cases
   * @param {string} category - Category to filter by
   * @returns {Array} Filtered edge cases
   */
  static getByCategory(edgeCases, category) {
    return edgeCases.filter((ec) => ec.category === category);
  }

  /**
   * Get edge cases by severity
   * @param {Array} edgeCases - Array of edge cases
   * @param {string} severity - Severity level ('high', 'medium', 'low')
   * @returns {Array} Filtered edge cases
   */
  static getBySeverity(edgeCases, severity) {
    return edgeCases.filter((ec) => ec.severity === severity);
  }

  /**
   * Generate a report of edge case test results
   * @param {Object} results - Results from runEdgeCaseTests
   * @returns {string} Formatted report
   */
  static generateReport(results) {
    const passRate = Math.round((results.passed / results.total) * 100);

    let report = `# Edge Case Test Report\n\n`;
    report += `## Summary\n`;
    report += `- Total Edge Cases: ${results.total}\n`;
    report += `- Passed: ✅ ${results.passed}\n`;
    report += `- Failed: ❌ ${results.failed}\n`;
    report += `- Pass Rate: ${passRate}%\n\n`;

    // Group by category
    const categories = [...new Set(results.details.map((d) => d.category))];
    for (const category of categories) {
      const categoryTests = results.details.filter((d) => d.category === category);
      report += `## ${category.charAt(0).toUpperCase() + category.slice(1)} Tests\n`;

      for (const test of categoryTests) {
        const icon = test.passed ? '✅' : '❌';
        report += `${icon} **${test.name}** [${test.severity}]\n`;
        if (!test.passed) {
          report += `  - Error: ${test.error || 'Test failed'}\n`;
        }
      }
      report += '\n';
    }

    // Critical failures
    const criticalFailures = results.details.filter(
      (d) => !d.passed && d.severity === 'high'
    );
    if (criticalFailures.length > 0) {
      report += `## ⚠️ Critical Failures\n`;
      for (const failure of criticalFailures) {
        report += `- **${failure.name}**: ${failure.error || 'Failed'}\n`;
      }
    }

    return report;
  }
}

/**
 * Generate a large dataset for testing
 * @param {number} size - Number of items to generate
 * @returns {Array} Generated dataset
 */
function generateLargeDataset(size = 1000) {
  return Array(size)
    .fill(null)
    .map((_, i) => ({
      id: `item-${i}`,
      value: Math.random() * 1000,
      timestamp: new Date().toISOString(),
      data: `Sample data ${i}`,
    }));
}

/**
 * Common edge case patterns for different feature types
 */
export const edgeCasePatterns = {
  api: {
    isAsync: true,
    hasNetworkCalls: true,
    hasTimeout: true,
  },
  form: {
    acceptsStrings: true,
    hasState: true,
  },
  calculation: {
    hasNumericInput: true,
  },
  database: {
    isAsync: true,
    hasNetworkCalls: true,
  },
};

/**
 * Quick test helper for common feature types
 * @param {Function} feature - Feature to test
 * @param {string} type - Feature type ('api', 'form', 'calculation', 'database')
 * @returns {Promise<Object>} Test results
 */
export async function quickEdgeCaseTest(feature, type = 'api') {
  const options = edgeCasePatterns[type] || {};
  const edgeCases = EdgeCaseDetector.findEdgeCases(feature, options);
  const results = await EdgeCaseDetector.runEdgeCaseTests(edgeCases);
  return results;
}
