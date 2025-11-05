/**
 * Codebase Analysis Engine
 * Detects patterns, anti-patterns, and improvement opportunities
 * Provides structured analysis for Product Improvement Agent
 */

/**
 * Pattern detection utilities
 */
export class AnalysisEngine {
  /**
   * Detect duplicate code patterns
   * Identifies code blocks repeated 3+ times across files
   * @param {Array<{path: string, content: string}>} files - Array of file objects
   * @returns {Array<{pattern: string, locations: Array, severity: string}>}
   */
  static findDuplicateCode(files) {
    const duplicates = [];
    const codeBlocks = new Map(); // Track code blocks and their locations

    try {
      files.forEach(file => {
        if (!file.content) return;

        // Extract meaningful code blocks (functions, classes, etc.)
        const lines = file.content.split('\n');

        // Look for function patterns
        lines.forEach((line, index) => {
          const trimmed = line.trim();

          // Skip empty lines and comments
          if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) return;

          // Detect function declarations
          if (trimmed.match(/^(function|const|let|var)\s+\w+\s*[=\(]|^async\s+(function|const)/)) {
            // Extract next 5-10 lines as a block
            const blockLines = lines.slice(index, Math.min(index + 8, lines.length));
            const block = blockLines.join('\n').trim();

            if (block.length > 50) { // Only track substantial blocks
              const key = block.replace(/\s+/g, ' '); // Normalize whitespace

              if (!codeBlocks.has(key)) {
                codeBlocks.set(key, []);
              }

              codeBlocks.get(key).push({
                file: file.path,
                line: index + 1,
                preview: blockLines[0].trim()
              });
            }
          }
        });
      });

      // Find blocks that appear 3+ times
      codeBlocks.forEach((locations, pattern) => {
        if (locations.length >= 3) {
          duplicates.push({
            pattern: locations[0].preview,
            locations: locations,
            count: locations.length,
            severity: locations.length >= 5 ? 'high' : 'medium'
          });
        }
      });

      return duplicates;
    } catch (error) {
      console.error('Error detecting duplicate code:', error);
      return [];
    }
  }

  /**
   * Find missing error handling
   * Scans for async functions without try/catch or .catch()
   * @param {Array<{path: string, content: string}>} files - Array of file objects
   * @returns {Array<{file: string, line: number, function: string, severity: string}>}
   */
  static findMissingErrorHandling(files) {
    const issues = [];

    try {
      files.forEach(file => {
        if (!file.content) return;

        const lines = file.content.split('\n');

        lines.forEach((line, index) => {
          const trimmed = line.trim();

          // Detect async functions
          if (trimmed.match(/async\s+(function|const|\()/)) {
            const functionName = trimmed.match(/(?:function|const)\s+(\w+)/)?.[1] || 'anonymous';

            // Look ahead for try/catch in the next 15 lines
            const nextLines = lines.slice(index, Math.min(index + 15, lines.length)).join('\n');
            const hasTryCatch = nextLines.includes('try') && nextLines.includes('catch');

            if (!hasTryCatch) {
              issues.push({
                file: file.path,
                line: index + 1,
                function: functionName,
                issue: 'Async function without try/catch block',
                severity: 'medium'
              });
            }
          }

          // Detect fetch calls without .catch()
          if (trimmed.includes('fetch(') && !trimmed.includes('.catch(')) {
            // Check if there's a catch in the next few lines
            const nextLines = lines.slice(index, Math.min(index + 5, lines.length)).join('\n');
            const hasCatch = nextLines.includes('.catch(') || nextLines.includes('catch(');

            if (!hasCatch) {
              issues.push({
                file: file.path,
                line: index + 1,
                function: 'fetch call',
                issue: 'Fetch call without .catch() or try/catch',
                severity: 'high'
              });
            }
          }
        });
      });

      return issues;
    } catch (error) {
      console.error('Error detecting missing error handling:', error);
      return [];
    }
  }

  /**
   * Detect UX friction points
   * Identifies confusing flows, complex forms, excessive clicks
   * @param {Array<{path: string, content: string}>} files - Array of file objects
   * @returns {Array<{issue: string, location: string, impact: string}>}
   */
  static analyzeUXFriction(files) {
    const frictions = [];

    try {
      files.forEach(file => {
        if (!file.content) return;

        // Only analyze UI files (React, Vue, etc.)
        if (!file.path.match(/\.(tsx|jsx|vue)$/)) return;

        const content = file.content;

        // Detect complex forms (>5 input fields)
        const inputCount = (content.match(/<input/g) || []).length;
        if (inputCount > 5) {
          // Check if form has fieldsets/sections
          const hasFieldsets = content.includes('fieldset') || content.includes('FormSection');

          if (!inputCount) {
            frictions.push({
              issue: `Complex form with ${inputCount} fields without grouping`,
              location: file.path,
              impact: 'medium',
              suggestion: 'Group form fields into sections for better UX'
            });
          }
        }

        // Detect missing loading states
        const hasAsyncCalls = content.includes('fetch(') || content.includes('async ');
        const hasLoadingState = content.includes('loading') || content.includes('isLoading');

        if (hasAsyncCalls && !hasLoadingState) {
          frictions.push({
            issue: 'Async operations without loading state',
            location: file.path,
            impact: 'high',
            suggestion: 'Add loading indicators for better UX'
          });
        }

        // Detect nested navigation (excessive clicks)
        const linkCount = (content.match(/<Link|<a href/g) || []).length;
        const buttonCount = (content.match(/<button|<Button/g) || []).length;

        if (linkCount + buttonCount > 15) {
          frictions.push({
            issue: 'Page with excessive navigation elements',
            location: file.path,
            impact: 'low',
            suggestion: 'Consider simplifying navigation or using progressive disclosure'
          });
        }

        // Detect missing error states
        if (hasAsyncCalls && !content.includes('error') && !content.includes('Error')) {
          frictions.push({
            issue: 'Async operations without error state handling',
            location: file.path,
            impact: 'high',
            suggestion: 'Add error state display for failed operations'
          });
        }
      });

      return frictions;
    } catch (error) {
      console.error('Error analyzing UX friction:', error);
      return [];
    }
  }

  /**
   * Analyze performance issues
   * Detects N+1 queries, missing indexes, large bundles
   * @param {Array<{path: string, content: string}>} files - Array of file objects
   * @returns {Array<{issue: string, location: string, estimated_impact: string}>}
   */
  static analyzePerformance(files) {
    const issues = [];

    try {
      files.forEach(file => {
        if (!file.content) return;

        const content = file.content;

        // Detect potential N+1 query patterns
        if (file.path.match(/\.(ts|js|tsx|jsx)$/)) {
          // Look for loops with database queries
          const loopPatterns = [
            /for\s*\(.*\)\s*{[\s\S]*?(fetch|query|find|get)\(/,
            /\.map\([\s\S]*?(fetch|query|find|get)\(/,
            /\.forEach\([\s\S]*?(fetch|query|find|get)\(/
          ];

          loopPatterns.forEach(pattern => {
            if (pattern.test(content)) {
              issues.push({
                issue: 'Potential N+1 query pattern detected',
                location: file.path,
                estimated_impact: 'high',
                suggestion: 'Use batch queries or eager loading'
              });
            }
          });
        }

        // Detect large component files (>500 lines)
        const lineCount = content.split('\n').length;
        if (lineCount > 500 && file.path.match(/\.(tsx|jsx)$/)) {
          issues.push({
            issue: `Large component file (${lineCount} lines)`,
            location: file.path,
            estimated_impact: 'medium',
            suggestion: 'Consider splitting into smaller components'
          });
        }

        // Detect missing memoization in expensive operations
        if (file.path.match(/\.(tsx|jsx)$/)) {
          const hasExpensiveOperations = content.includes('.map(') || content.includes('.filter(') || content.includes('.reduce(');
          const hasMemo = content.includes('useMemo') || content.includes('useCallback') || content.includes('memo(');

          if (hasExpensiveOperations && !hasMemo && lineCount > 100) {
            issues.push({
              issue: 'Expensive operations without memoization',
              location: file.path,
              estimated_impact: 'medium',
              suggestion: 'Consider using useMemo/useCallback for performance'
            });
          }
        }

        // Detect console.log statements (should be removed in production)
        const consoleLogCount = (content.match(/console\.log\(/g) || []).length;
        if (consoleLogCount > 0) {
          issues.push({
            issue: `${consoleLogCount} console.log statement(s) found`,
            location: file.path,
            estimated_impact: 'low',
            suggestion: 'Remove console.log statements before production'
          });
        }
      });

      return issues;
    } catch (error) {
      console.error('Error analyzing performance:', error);
      return [];
    }
  }

  /**
   * Comprehensive codebase analysis
   * Runs all analysis methods and returns structured report
   * @param {Array<{path: string, content: string}>} files - Array of file objects
   * @returns {Object} Comprehensive analysis report
   */
  static analyzeCodebase(files) {
    if (!files || !Array.isArray(files)) {
      return {
        duplicateCode: [],
        errorHandling: [],
        uxFriction: [],
        performance: [],
        summary: {
          totalIssues: 0,
          highSeverity: 0,
          mediumSeverity: 0,
          lowSeverity: 0
        }
      };
    }

    const duplicateCode = this.findDuplicateCode(files);
    const errorHandling = this.findMissingErrorHandling(files);
    const uxFriction = this.analyzeUXFriction(files);
    const performance = this.analyzePerformance(files);

    // Calculate summary
    const allIssues = [
      ...duplicateCode.map(d => ({ severity: d.severity })),
      ...errorHandling.map(e => ({ severity: e.severity })),
      ...uxFriction.map(u => ({ severity: u.impact })),
      ...performance.map(p => ({ severity: p.estimated_impact }))
    ];

    const summary = {
      totalIssues: allIssues.length,
      highSeverity: allIssues.filter(i => i.severity === 'high').length,
      mediumSeverity: allIssues.filter(i => i.severity === 'medium').length,
      lowSeverity: allIssues.filter(i => i.severity === 'low').length
    };

    return {
      duplicateCode,
      errorHandling,
      uxFriction,
      performance,
      summary
    };
  }
}
