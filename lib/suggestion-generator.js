/**
 * Suggestion Generation System
 * Uses Claude API to generate specific, actionable improvement suggestions
 * Based on codebase analysis reports
 */

/**
 * Generate unique ID for suggestions
 */
function generateId() {
  return `suggestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Suggestion Generator
 * Transforms analysis reports into prioritized improvement suggestions
 */
export class SuggestionGenerator {
  /**
   * @param {string} anthropicApiKey - Anthropic API key for Claude
   */
  constructor(anthropicApiKey) {
    if (!anthropicApiKey) {
      throw new Error('Anthropic API key is required');
    }
    this.anthropicApiKey = anthropicApiKey;
  }

  /**
   * Generate improvement suggestions from analysis report
   * Uses Claude API to create specific, actionable recommendations
   * @param {Object} analysisReport - Analysis report from AnalysisEngine
   * @param {string} projectId - Project ID
   * @returns {Promise<Array<Object>>} Array of suggestions
   */
  async generateFromAnalysis(analysisReport, projectId) {
    try {
      // Build prompt for Claude
      const prompt = this.buildAnalysisPrompt(analysisReport);

      // Call Claude API
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          temperature: 0.7,
          system: `You are a Product Improvement Agent analyzing codebases to suggest specific improvements.
Generate 5-10 high-impact, actionable improvement suggestions based on the analysis.
Focus on improvements that provide real user value and are implementable.
Return ONLY a valid JSON array of suggestions, no markdown formatting.`,
          messages: [
            {
              role: 'user',
              content: prompt,
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

      // Parse Claude's response
      const suggestions = this.parseClaudeResponse(content, projectId);

      return suggestions;
    } catch (error) {
      console.error('Error generating suggestions:', error);
      throw error;
    }
  }

  /**
   * Build prompt for Claude API
   * @param {Object} analysisReport - Analysis report
   * @returns {string} Formatted prompt
   */
  buildAnalysisPrompt(analysisReport) {
    const { duplicateCode, errorHandling, uxFriction, performance, summary } = analysisReport;

    return `Analyze this codebase report and generate 5-10 specific, actionable improvement suggestions.

**Analysis Summary:**
- Total Issues: ${summary.totalIssues}
- High Severity: ${summary.highSeverity}
- Medium Severity: ${summary.mediumSeverity}
- Low Severity: ${summary.lowSeverity}

**Duplicate Code Found:**
${duplicateCode.length > 0 ? duplicateCode.slice(0, 5).map(d =>
  `- Pattern appears ${d.count} times in: ${d.locations.map(l => l.file).join(', ')}`
).join('\n') : 'None detected'}

**Missing Error Handling:**
${errorHandling.length > 0 ? errorHandling.slice(0, 5).map(e =>
  `- ${e.issue} in ${e.file}:${e.line}`
).join('\n') : 'None detected'}

**UX Friction Points:**
${uxFriction.length > 0 ? uxFriction.slice(0, 5).map(u =>
  `- ${u.issue} in ${u.location}`
).join('\n') : 'None detected'}

**Performance Issues:**
${performance.length > 0 ? performance.slice(0, 5).map(p =>
  `- ${p.issue} in ${p.location}`
).join('\n') : 'None detected'}

Generate suggestions in this exact JSON format (return ONLY the JSON array, no markdown):
[
  {
    "title": "Specific improvement title (e.g., 'Add error handling to user authentication')",
    "description": "Clear description of what to do",
    "reasoning": "Why this matters and the impact it will have",
    "impact_score": 1-5 (5 = high impact, low effort; 1 = low impact or high effort),
    "effort_estimate": "15 minutes" | "30 minutes" | "1 hour" | "2 hours" | "4 hours",
    "files_affected": ["file1.js", "file2.tsx"],
    "agent_type": "Frontend Agent" | "Backend Agent" | "Testing Agent" | "Research Agent",
    "priority": "high" | "medium" | "low",
    "category": "error-handling" | "performance" | "ux" | "code-quality" | "security"
  }
]

Focus on:
1. High-impact, low-effort improvements (impact_score 4-5)
2. User-facing benefits
3. Specific file paths and actionable steps
4. Realistic effort estimates
5. Clear reasoning for each suggestion`;
  }

  /**
   * Parse Claude's response into structured suggestions
   * @param {string} content - Claude API response content
   * @param {string} projectId - Project ID
   * @returns {Array<Object>} Parsed suggestions
   */
  parseClaudeResponse(content, projectId) {
    try {
      // Extract JSON from response (Claude might wrap it in markdown)
      let jsonContent = content;

      // Remove markdown code blocks if present
      if (content.includes('```')) {
        const match = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) {
          jsonContent = match[1];
        }
      }

      // Parse JSON
      const suggestions = JSON.parse(jsonContent);

      // Validate and enhance suggestions
      return suggestions.map(suggestion => {
        const impactScore = this.calculateImpactScore(suggestion);

        return {
          id: generateId(),
          project_id: projectId,
          title: suggestion.title || 'Untitled Suggestion',
          description: suggestion.description || '',
          reasoning: suggestion.reasoning || '',
          impact_score: impactScore,
          effort_estimate: suggestion.effort_estimate || '1 hour',
          files_affected: Array.isArray(suggestion.files_affected) ? suggestion.files_affected : [],
          agent_type: suggestion.agent_type || 'Frontend Agent',
          priority: suggestion.priority || this.scoreToPriority(impactScore),
          category: suggestion.category || 'code-quality',
          status: 'pending',
          created_at: new Date().toISOString(),
          created_by: 'Product Improvement Agent',
        };
      });
    } catch (error) {
      console.error('Error parsing Claude response:', error);
      console.error('Content:', content);
      // Return empty array if parsing fails
      return [];
    }
  }

  /**
   * Calculate impact score based on multiple factors
   * @param {Object} suggestion - Suggestion object
   * @returns {number} Impact score (1-5)
   */
  calculateImpactScore(suggestion) {
    let score = suggestion.impact_score || 3;

    // Validate score is 1-5
    score = Math.max(1, Math.min(5, score));

    // Adjust based on category
    const categoryWeights = {
      'security': 5,
      'error-handling': 4,
      'ux': 4,
      'performance': 4,
      'code-quality': 3,
    };

    const categoryBonus = categoryWeights[suggestion.category] || 3;

    // Adjust based on effort (lower effort = higher score)
    const effortPenalty = suggestion.effort_estimate?.includes('4 hour') ? -1 : 0;

    // Calculate final score
    const finalScore = Math.round((score + categoryBonus + effortPenalty) / 2);

    return Math.max(1, Math.min(5, finalScore));
  }

  /**
   * Convert impact score to priority
   * @param {number} score - Impact score (1-5)
   * @returns {string} Priority (high, medium, low)
   */
  scoreToPriority(score) {
    if (score >= 4) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  /**
   * Generate suggestions with retry logic for rate limits
   * @param {Object} analysisReport - Analysis report
   * @param {string} projectId - Project ID
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {Promise<Array<Object>>} Suggestions
   */
  async generateWithRetry(analysisReport, projectId, maxRetries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const suggestions = await this.generateFromAnalysis(analysisReport, projectId);
        return suggestions;
      } catch (error) {
        lastError = error;
        const isRateLimit = error.message.includes('429') || error.message.includes('rate');

        if (attempt < maxRetries) {
          const baseDelay = isRateLimit ? 2000 : 1000;
          const delayMs = baseDelay * Math.pow(2, attempt - 1);
          console.log(`Retry attempt ${attempt} in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    throw new Error(`Failed after ${maxRetries} attempts: ${lastError?.message}`);
  }
}
