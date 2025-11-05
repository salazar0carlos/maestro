/**
 * Research Agent - Enterprise Intelligence Layer
 * Specializes in research, analysis, and documentation
 * Focuses on: requirement analysis, research tasks, documentation, insights
 *
 * Enterprise Capabilities:
 * - Structured research with formal reports
 * - Competitive analysis
 * - Best practice identification
 * - Knowledge base integration
 */

const Agent = require('./agent-base');
const KnowledgeBase = require('../lib/knowledge-base');

class ResearchAgent extends Agent {
  constructor(maestroUrl = 'http://localhost:3000', anthropicApiKey = '') {
    super('research-agent', 'Research', maestroUrl, anthropicApiKey);
    this.knowledgeBase = new KnowledgeBase();
  }

  /**
   * Conduct comprehensive research on a topic
   * @param {string} topic - Research topic
   * @param {Object} context - Additional context (code examples, requirements, etc.)
   * @returns {Promise<Object>} Structured research report
   */
  async conductResearch(topic, context = {}) {
    try {
      this.log(`Conducting research on: ${topic}`, 'info');

      const systemPrompt = `You are a Research Agent specializing in technical research and analysis.

Your task is to conduct comprehensive research and provide a structured report in the following format:

# Research Report: [Topic]

## Summary
[2-3 sentence overview of findings]

## Key Findings
1. Finding 1 with evidence
2. Finding 2 with evidence
3. Finding 3 with evidence

## Recommendations
- Actionable recommendation 1
- Actionable recommendation 2

## Sources
- [Source 1 with URL or reference]
- [Source 2 with URL or reference]

## Confidence Level
High/Medium/Low based on source quality and consensus

## Next Steps
What should be done with this information

Provide accurate, well-sourced information with actionable insights.`;

      const userPrompt = `Topic: ${topic}

${context.codeExample ? `Code Example:\n${context.codeExample}\n\n` : ''}
${context.requirements ? `Requirements:\n${context.requirements}\n\n` : ''}
${context.additionalInfo ? `Additional Context:\n${context.additionalInfo}\n\n` : ''}

Please conduct thorough research and provide a structured report.`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 8000,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: userPrompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const reportContent = data.content?.[0]?.text || '';

      // Parse the report to extract structured data
      const report = this.parseResearchReport(reportContent, topic);

      // Save to knowledge base
      const savedReport = this.knowledgeBase.save(report);

      this.log(`Research completed: ${topic} (saved: ${savedReport.id})`, 'info');

      return {
        topic,
        findings: report.findings,
        recommendations: report.recommendations,
        sources: report.sources,
        confidence: report.confidence,
        report_path: `/research-reports/${savedReport.id}`,
        full_report: reportContent,
      };
    } catch (error) {
      this.log(`Error conducting research: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Analyze competitor implementations
   * @param {Array<string>} competitorUrls - URLs or descriptions of competitor implementations
   * @returns {Promise<Object>} Comparison analysis
   */
  async analyzeCompetitors(competitorUrls) {
    try {
      this.log(`Analyzing ${competitorUrls.length} competitors`, 'info');

      const systemPrompt = `You are a Research Agent specializing in competitive analysis.

Analyze the provided competitor implementations and provide:
1. Key features and capabilities comparison
2. Strengths and weaknesses of each approach
3. Unique differentiators
4. Best practices identified
5. Recommendations for our implementation

Format the response as a structured comparison analysis.`;

      const userPrompt = `Analyze these competitor implementations:

${competitorUrls.map((url, idx) => `${idx + 1}. ${url}`).join('\n')}

Provide a comprehensive comparison analysis with actionable insights.`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 8000,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: userPrompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const analysis = data.content?.[0]?.text || '';

      // Save to knowledge base
      const report = {
        type: 'competitor-analysis',
        topic: 'Competitor Analysis',
        content: analysis,
        competitors: competitorUrls,
        timestamp: new Date().toISOString(),
        tags: ['competitor-analysis', 'market-research'],
      };

      this.knowledgeBase.save(report);

      return {
        analysis,
        competitors: competitorUrls,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.log(`Error analyzing competitors: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Find best practices for a technology or pattern
   * @param {string} technology - Technology or pattern to research
   * @returns {Promise<Object>} Best practices guidance
   */
  async findBestPractices(technology) {
    try {
      this.log(`Finding best practices for: ${technology}`, 'info');

      // Check knowledge base first
      const existingResearch = this.knowledgeBase.search(technology);
      if (existingResearch.length > 0) {
        this.log(`Found ${existingResearch.length} existing research items`, 'info');
      }

      const systemPrompt = `You are a Research Agent specializing in software engineering best practices.

Provide comprehensive best practices for the given technology or pattern, including:
1. Industry standards and conventions
2. Common pitfalls to avoid
3. Performance considerations
4. Security best practices
5. Maintainability guidelines
6. Testing strategies
7. Real-world examples
8. Recommended tools and libraries

Format the response as actionable guidance with clear explanations.`;

      const userPrompt = `Technology/Pattern: ${technology}

${existingResearch.length > 0 ? `Previous research available (${existingResearch.length} items). Build upon existing knowledge.\n\n` : ''}

Provide comprehensive best practices guidance.`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 8000,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: userPrompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const guidance = data.content?.[0]?.text || '';

      // Save to knowledge base
      const report = {
        type: 'best-practices',
        topic: `Best Practices: ${technology}`,
        content: guidance,
        technology,
        timestamp: new Date().toISOString(),
        tags: ['best-practices', technology.toLowerCase()],
      };

      this.knowledgeBase.save(report);

      return {
        technology,
        guidance,
        existing_research: existingResearch.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.log(`Error finding best practices: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Parse research report content into structured data
   * @param {string} content - Report content
   * @param {string} topic - Research topic
   * @returns {Object} Structured report data
   */
  parseResearchReport(content, topic) {
    const report = {
      type: 'research-report',
      topic,
      content,
      findings: [],
      recommendations: [],
      sources: [],
      confidence: 'medium',
      timestamp: new Date().toISOString(),
      tags: [topic.toLowerCase().replace(/\s+/g, '-')],
    };

    // Extract key findings
    const findingsMatch = content.match(/## Key Findings\s*([\s\S]*?)(?=##|$)/);
    if (findingsMatch) {
      const findingsText = findingsMatch[1];
      report.findings = findingsText
        .split('\n')
        .filter(line => line.trim().match(/^\d+\./))
        .map(line => line.trim());
    }

    // Extract recommendations
    const recommendationsMatch = content.match(/## Recommendations\s*([\s\S]*?)(?=##|$)/);
    if (recommendationsMatch) {
      const recommendationsText = recommendationsMatch[1];
      report.recommendations = recommendationsText
        .split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.trim().substring(1).trim());
    }

    // Extract sources
    const sourcesMatch = content.match(/## Sources\s*([\s\S]*?)(?=##|$)/);
    if (sourcesMatch) {
      const sourcesText = sourcesMatch[1];
      report.sources = sourcesText
        .split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.trim().substring(1).trim());
    }

    // Extract confidence level
    const confidenceMatch = content.match(/## Confidence Level\s*(\w+)/i);
    if (confidenceMatch) {
      report.confidence = confidenceMatch[1].toLowerCase();
    }

    return report;
  }

  /**
   * Override executeTask to add research-specific context
   */
  async executeTask(task) {
    try {
      const systemPrompt = `You are a Research Agent for Maestro.
Your expertise is in deep analysis, requirement gathering, documentation, and providing
comprehensive insights. You excel at breaking down complex problems, researching solutions,
and providing well-structured findings with clear recommendations and supporting evidence.`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
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

  const agent = new ResearchAgent('http://localhost:3000', apiKey);
  agent.run(60000); // Poll every 60 seconds
}

module.exports = ResearchAgent;
