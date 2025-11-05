/**
 * Product Improvement Agent
 * Specializes in identifying and implementing product enhancements
 * Focuses on: codebase analysis, pattern detection, improvement suggestions
 *
 * Core Capabilities:
 * - Analyze codebases for patterns and anti-patterns
 * - Detect duplicate code, missing error handling, UX friction
 * - Generate actionable improvement suggestions using AI
 * - Convert approved suggestions into tasks
 */

const Agent = require('./agent-base');
const { AnalysisEngine } = require('../lib/analysis-engine.js');
const { SuggestionGenerator } = require('../lib/suggestion-generator.js');

class ProductImprovementAgent extends Agent {
  constructor(maestroUrl = 'http://localhost:3000', anthropicApiKey = '') {
    super('product-improvement-agent', 'Product Improvement', maestroUrl, anthropicApiKey);
    this.suggestionGenerator = new SuggestionGenerator(anthropicApiKey);
  }

  /**
   * Analyze project codebase for improvement opportunities
   * Reads all files from project and identifies patterns
   * @param {string} projectId - Project ID to analyze
   * @param {Array<{path: string, content: string}>} files - Project files to analyze
   * @returns {Object} Analysis report with patterns, issues, and opportunities
   */
  async analyzeCodebase(projectId, files) {
    try {
      this.log(`Starting codebase analysis for project ${projectId}`, 'info');
      this.log(`Analyzing ${files.length} files`, 'info');

      // Run comprehensive analysis
      const analysisReport = AnalysisEngine.analyzeCodebase(files);

      this.log(`Analysis complete: ${analysisReport.summary.totalIssues} issues found`, 'info');
      this.log(`High severity: ${analysisReport.summary.highSeverity}, Medium: ${analysisReport.summary.mediumSeverity}, Low: ${analysisReport.summary.lowSeverity}`, 'info');

      return {
        status: 'success',
        projectId,
        analysisReport,
        filesAnalyzed: files.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.log(`Error analyzing codebase: ${error.message}`, 'error');
      return {
        status: 'error',
        error: error.message,
        projectId
      };
    }
  }

  /**
   * Generate improvement suggestions from analysis report
   * Uses Claude API to create specific, actionable recommendations
   * @param {Object} analysisReport - Analysis report from analyzeCodebase
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} Array of improvement suggestions
   */
  async generateSuggestions(analysisReport, projectId) {
    try {
      this.log('Generating improvement suggestions using Claude API', 'info');

      // Use suggestion generator with retry logic
      const suggestions = await this.suggestionGenerator.generateWithRetry(
        analysisReport,
        projectId,
        3 // max retries
      );

      this.log(`Generated ${suggestions.length} improvement suggestions`, 'info');

      // Log impact distribution
      const highImpact = suggestions.filter(s => s.impact_score >= 4).length;
      const mediumImpact = suggestions.filter(s => s.impact_score === 3).length;
      const lowImpact = suggestions.filter(s => s.impact_score <= 2).length;

      this.log(`Impact distribution - High: ${highImpact}, Medium: ${mediumImpact}, Low: ${lowImpact}`, 'info');

      return suggestions;
    } catch (error) {
      this.log(`Error generating suggestions: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Create tasks in Maestro from approved suggestions
   * Each suggestion becomes a task assigned to the appropriate agent
   * @param {Array} approvedSuggestions - Array of approved suggestions
   * @returns {Promise<Array>} Array of created tasks
   */
  async createTasks(approvedSuggestions) {
    try {
      this.log(`Creating ${approvedSuggestions.length} tasks from approved suggestions`, 'info');

      const createdTasks = [];

      for (const suggestion of approvedSuggestions) {
        try {
          // Generate detailed AI prompt
          const aiPrompt = await this.generateTaskPromptFromSuggestion(suggestion);

          // Map suggestion priority to task priority (1-5)
          const taskPriority = suggestion.priority === 'high' ? 1
            : suggestion.priority === 'medium' ? 3
            : 5;

          // Create task via Maestro API
          const response = await fetch(`${this.maestroUrl}/api/tasks`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              project_id: suggestion.project_id,
              title: suggestion.title,
              description: suggestion.description,
              ai_prompt: aiPrompt,
              assigned_to_agent: suggestion.agent_type,
              priority: taskPriority,
              status: 'todo',
              source: 'improvement_suggestion',
              source_id: suggestion.id
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to create task: HTTP ${response.status}`);
          }

          const task = await response.json();
          createdTasks.push(task);

          this.log(`Created task: ${task.title}`, 'info');
        } catch (error) {
          this.log(`Error creating task for suggestion ${suggestion.id}: ${error.message}`, 'error');
        }
      }

      this.log(`Successfully created ${createdTasks.length} tasks`, 'info');
      return createdTasks;
    } catch (error) {
      this.log(`Error creating tasks: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Generate detailed task prompt from a suggestion
   * @param {Object} suggestion - Improvement suggestion
   * @returns {Promise<string>} Detailed task prompt
   */
  async generateTaskPromptFromSuggestion(suggestion) {
    // Generate comprehensive prompt
    return `# ${suggestion.title}

## Objective
${suggestion.description}

## Why This Matters
${suggestion.reasoning}

## Files to Modify
${suggestion.files_affected.map(file => `- ${file}`).join('\n')}

## Implementation Requirements
- Category: ${suggestion.category}
- Estimated Effort: ${suggestion.effort_estimate}
- Priority: ${suggestion.priority}
- Impact Score: ${suggestion.impact_score}/5

## Code Quality Standards
- Use TypeScript strict mode
- Add JSDoc comments to all functions
- Implement proper error handling with try/catch
- Add loading states for async operations
- No 'any' types
- Follow existing code patterns

## Success Criteria
- Code builds without errors (\`npm run build\` succeeds)
- No TypeScript errors
- Implementation matches description
- Error handling in place
- Code is tested and working

## Testing
- Verify the changes work as expected
- Test error cases
- Ensure no regressions

Please implement this improvement following all quality standards.`;
  }

  /**
   * Override executeTask to add product-specific context
   */
  async executeTask(task) {
    try {
      const systemPrompt = `You are a Product Improvement Agent for Maestro.
Your role is to analyze tasks and provide recommendations for product enhancements,
feature improvements, and user experience optimizations.
Focus on clarity, impact, and feasibility.`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8000,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: task.ai_prompt || task.description || task.title,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const content = data.content?.[0]?.text || '';

      return {
        status: 'success',
        content: content,
        taskId: task.task_id,
      };
    } catch (error) {
      this.log(`Error executing task ${task.task_id}: ${error.message}`, 'error');
      return {
        status: 'error',
        error: error.message,
        taskId: task.task_id,
      };
    }
  }
}

// Run agent if executed directly
if (require.main === module) {
  const apiKey = process.env.ANTHROPIC_API_KEY || '';
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable not set');
    process.exit(1);
  }

  const agent = new ProductImprovementAgent('http://localhost:3000', apiKey);
  agent.run(60000); // Poll every 60 seconds
}

module.exports = ProductImprovementAgent;
