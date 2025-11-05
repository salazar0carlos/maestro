# Research Agent Integration Guide

## Overview

The Research Agent serves as the **intelligence layer** for the Maestro platform, providing on-demand research capabilities to other agents. This document describes how to integrate Research Agent functionality into other agents, particularly the Product Improvement Agent.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Maestro Platform                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │ Product          │ ◄────── │ Research         │          │
│  │ Improvement      │  Query  │ Agent            │          │
│  │ Agent            │ ──────► │                  │          │
│  └──────────────────┘ Results └──────────────────┘          │
│           │                            │                     │
│           │                            ▼                     │
│           │                    ┌──────────────────┐         │
│           │                    │ Knowledge        │         │
│           │                    │ Base             │         │
│           │                    └──────────────────┘         │
│           │                                                  │
│           ▼                                                  │
│  ┌──────────────────┐                                       │
│  │ Implementation   │                                       │
│  │ Tasks            │                                       │
│  └──────────────────┘                                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Integration Pattern 1: Direct API Integration

### Product Improvement Agent Enhancement

Add Research Agent capabilities directly to the Product Improvement Agent:

```javascript
const Agent = require('./agent-base');
const ResearchAgent = require('./research-agent');

class ProductImprovementAgent extends Agent {
  constructor(maestroUrl = 'http://localhost:3000', anthropicApiKey = '') {
    super('product-improvement-agent', 'Product Improvement', maestroUrl, anthropicApiKey);

    // Initialize Research Agent instance
    this.researchAgent = new ResearchAgent(maestroUrl, anthropicApiKey);
  }

  /**
   * Analyze unknown pattern with research support
   */
  async analyzeUnknownPattern(pattern, codeExample) {
    try {
      this.log(`Analyzing unfamiliar pattern: ${pattern}`, 'info');

      // Trigger Research Agent
      const research = await this.researchAgent.conductResearch(
        `Best practices for ${pattern}`,
        {
          codeExample: codeExample,
          requirements: 'Identify industry standards and recommended approaches'
        }
      );

      // Use research findings in suggestions
      return {
        pattern,
        research_findings: research.findings,
        recommendations: research.recommendations,
        confidence: research.confidence,
        research_report: research.report_path
      };
    } catch (error) {
      this.log(`Error analyzing pattern: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Enhanced executeTask with research integration
   */
  async executeTask(task) {
    try {
      // Check if task requires research
      const needsResearch = this.detectResearchNeed(task);

      let researchContext = '';
      if (needsResearch) {
        this.log(`Task requires research: ${needsResearch.topic}`, 'info');

        const research = await this.researchAgent.findBestPractices(
          needsResearch.topic
        );

        researchContext = `\n\nResearch Context:\n${research.guidance}\n`;
      }

      const systemPrompt = `You are a Product Improvement Agent for Maestro.
Your role is to analyze tasks and provide recommendations for product enhancements,
feature improvements, and user experience optimizations.
Focus on clarity, impact, and feasibility.

${researchContext}`;

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
        research_used: needsResearch ? needsResearch.topic : null,
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

  /**
   * Detect if task requires research
   */
  detectResearchNeed(task) {
    const taskText = (task.ai_prompt || task.description || task.title).toLowerCase();

    // Patterns that indicate research need
    const researchPatterns = [
      { pattern: /what is|what are|how does|how do/i, type: 'explanation' },
      { pattern: /best practice|recommended approach|industry standard/i, type: 'best-practices' },
      { pattern: /compare|versus|vs\.|alternative/i, type: 'comparison' },
      { pattern: /implement|build|create.*using/i, type: 'implementation' },
    ];

    for (const { pattern, type } of researchPatterns) {
      if (pattern.test(taskText)) {
        // Extract topic from task
        const topic = this.extractTopic(taskText);
        return { topic, type };
      }
    }

    return null;
  }

  /**
   * Extract research topic from task text
   */
  extractTopic(taskText) {
    // Simple topic extraction - can be enhanced with NLP
    const words = taskText.split(/\s+/);
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'];
    const keywords = words.filter(w => !stopWords.includes(w.toLowerCase()) && w.length > 3);
    return keywords.slice(0, 3).join(' ');
  }
}

module.exports = ProductImprovementAgent;
```

---

## Integration Pattern 2: Task Delegation

### Creating Research Tasks

Product Improvement Agent can delegate research to Research Agent via Maestro task system:

```javascript
async delegateResearch(topic, context) {
  try {
    // Create a research task in Maestro
    const response = await fetch(`${this.maestroUrl}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `Research: ${topic}`,
        description: `Conduct research on: ${topic}`,
        assigned_to: 'research-agent',
        priority: 'high',
        ai_prompt: `Conduct comprehensive research on: ${topic}\n\nContext: ${JSON.stringify(context)}`,
        metadata: {
          requested_by: 'product-improvement-agent',
          research_type: 'best-practices',
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create research task`);
    }

    const data = await response.json();
    this.log(`Created research task: ${data.task_id}`, 'info');

    return data.task_id;
  } catch (error) {
    this.log(`Error delegating research: ${error.message}`, 'error');
    throw error;
  }
}

async waitForResearch(taskId, maxWaitMs = 120000) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const response = await fetch(`${this.maestroUrl}/api/tasks/${taskId}`);

    if (!response.ok) {
      throw new Error(`Failed to check research task status`);
    }

    const task = await response.json();

    if (task.status === 'done') {
      return task.ai_response;
    }

    if (task.status === 'blocked') {
      throw new Error(`Research task blocked: ${task.ai_response}`);
    }

    // Wait 5 seconds before checking again
    await this.delay(5000);
  }

  throw new Error(`Research timeout after ${maxWaitMs}ms`);
}
```

---

## Integration Pattern 3: Knowledge Base Access

### Direct Knowledge Base Queries

Any agent can directly query the Knowledge Base without invoking Research Agent:

```javascript
const KnowledgeBase = require('../lib/knowledge-base');

class AnyAgent extends Agent {
  constructor(maestroUrl, anthropicApiKey) {
    super('any-agent', 'Any Type', maestroUrl, anthropicApiKey);
    this.knowledgeBase = new KnowledgeBase();
  }

  async checkExistingResearch(topic) {
    // Search knowledge base
    const existing = this.knowledgeBase.search(topic);

    if (existing.length > 0) {
      this.log(`Found ${existing.length} existing research items on: ${topic}`, 'info');
      return existing[0]; // Return most recent
    }

    return null;
  }

  async executeTaskWithKnowledge(task) {
    // Check knowledge base first
    const knowledge = await this.checkExistingResearch(task.title);

    let knowledgeContext = '';
    if (knowledge) {
      knowledgeContext = `\n\nExisting Research:\n${knowledge.content}\n`;
    }

    // Use knowledge in prompt
    // ... rest of implementation
  }
}
```

---

## Usage Examples

### Example 1: Product Improvement Agent Encounters Unknown Pattern

```javascript
// In Product Improvement Agent
async analyzeFeatureRequest(featureRequest) {
  // Detect unfamiliar technology
  if (featureRequest.includes('WebAssembly')) {
    const research = await this.researchAgent.conductResearch(
      'WebAssembly best practices for web applications',
      {
        requirements: featureRequest,
        additionalInfo: 'Focus on integration with existing JavaScript apps'
      }
    );

    return {
      feature: featureRequest,
      feasibility: 'High',
      research_insights: research.recommendations,
      implementation_guidance: research.findings,
    };
  }
}
```

### Example 2: Competitive Analysis

```javascript
// Trigger competitor research
async analyzeCompetitorFeatures(competitorUrls) {
  const analysis = await this.researchAgent.analyzeCompetitors(competitorUrls);

  return {
    competitive_analysis: analysis.analysis,
    differentiation_opportunities: this.extractOpportunities(analysis.analysis),
    implementation_priority: 'high',
  };
}
```

### Example 3: Best Practices Research

```javascript
// Before implementing new feature
async planImplementation(featureSpec) {
  const bestPractices = await this.researchAgent.findBestPractices(
    featureSpec.technology
  );

  return {
    feature: featureSpec,
    recommended_approach: bestPractices.guidance,
    existing_research_count: bestPractices.existing_research,
    confidence_level: 'high',
  };
}
```

---

## Knowledge Base Statistics

Monitor knowledge base growth and usage:

```javascript
const kb = new KnowledgeBase();
const stats = kb.getStats();

console.log(`Total Research Reports: ${stats.total_reports}`);
console.log(`Research Types:`, stats.types);
console.log(`Total Tags: ${stats.total_tags}`);
```

---

## API Reference

### ResearchAgent Methods

#### `conductResearch(topic, context)`
Conducts comprehensive research and returns structured report.

**Parameters:**
- `topic` (string): Research topic
- `context` (object): Additional context
  - `codeExample` (string): Code sample to analyze
  - `requirements` (string): Specific requirements
  - `additionalInfo` (string): Extra context

**Returns:** Research report object with findings, recommendations, sources, and confidence level.

#### `analyzeCompetitors(competitorUrls)`
Analyzes competitor implementations.

**Parameters:**
- `competitorUrls` (array): URLs or descriptions of competitors

**Returns:** Comparison analysis with strengths, weaknesses, and recommendations.

#### `findBestPractices(technology)`
Finds industry best practices for a technology.

**Parameters:**
- `technology` (string): Technology or pattern name

**Returns:** Best practices guidance with actionable recommendations.

### KnowledgeBase Methods

#### `save(research)`
Saves research to knowledge base.

#### `search(query)`
Searches knowledge base by query.

#### `getByTopic(topic)`
Gets all research on specific topic.

#### `getByTag(tag)`
Gets research by tag.

#### `getByType(type)`
Gets research by type (research-report, competitor-analysis, best-practices).

#### `getStats()`
Gets knowledge base statistics.

---

## Best Practices

1. **Check Knowledge Base First**: Always search existing research before triggering new research.

2. **Use Appropriate Methods**:
   - `conductResearch()` for general research
   - `analyzeCompetitors()` for competitive analysis
   - `findBestPractices()` for implementation guidance

3. **Provide Context**: Include code examples and requirements for better research quality.

4. **Tag Research**: Use relevant tags for better organization and retrieval.

5. **Monitor Confidence**: Check confidence levels in research reports.

6. **Cache Aggressively**: Use knowledge base to avoid redundant research.

---

## Troubleshooting

### Issue: Research Agent not responding
- Check ANTHROPIC_API_KEY is set
- Verify Research Agent is running
- Check network connectivity to Anthropic API

### Issue: Knowledge base not persisting
- Verify `./research-reports` directory exists
- Check file permissions
- Verify disk space

### Issue: Duplicate research
- Use `knowledgeBase.search()` before triggering new research
- Implement deduplication logic in your agent

---

## Future Enhancements

1. **Web Search Integration**: Add real-time web search capabilities
2. **Document Parsing**: Extract information from PDFs and documentation
3. **Citation Tracking**: Maintain source attribution
4. **Version Control**: Track research updates and changes
5. **Collaborative Research**: Multiple agents contributing to same research
6. **ML-Based Topic Extraction**: Better automatic topic detection
7. **Research Quality Scoring**: Automated quality assessment

---

## Support

For issues or questions about Research Agent integration:
- File an issue in the Maestro repository
- Check the Knowledge Base for existing research on integration patterns
- Review agent logs for debugging information

---

**Last Updated:** 2025-11-05
**Version:** 1.0.0
**Maintainer:** Maestro Platform Team
