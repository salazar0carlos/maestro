#!/usr/bin/env node

/**
 * Product Improvement Agent
 *
 * Analyzes system usage, patterns, and performance to suggest improvements.
 * Runs on a schedule (typically every 24 hours) or can be triggered manually.
 *
 * Capabilities:
 * - Analyzes task completion patterns
 * - Identifies bottlenecks and inefficiencies
 * - Detects recurring error patterns
 * - Suggests performance optimizations
 * - Tracks improvement impact over time
 */

const { Worker } = require('bullmq');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const AGENT_TYPE = 'ProductImprovement';
const QUEUE_NAME = 'maestro-product-improvement';
const API_KEY = process.env.ANTHROPIC_API_KEY;

if (!API_KEY) {
  console.error('[ProductImprovement Agent] ERROR: ANTHROPIC_API_KEY not set');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: API_KEY });

// Redis connection configuration
const redisConnection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
};

console.log(`[${AGENT_TYPE} Agent] Starting worker...`);
console.log(`[${AGENT_TYPE} Agent] Queue: ${QUEUE_NAME}`);
console.log(`[${AGENT_TYPE} Agent] Redis: ${redisConnection.host}:${redisConnection.port}`);

// Create worker
const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const { analysis_id, project_id } = job.data;

    console.log(`\n[${AGENT_TYPE} Agent] 🔍 Starting analysis: ${analysis_id}`);
    console.log(`[${AGENT_TYPE} Agent] Project: ${project_id}`);

    const startTime = Date.now();

    try {
      // Update analysis status to running
      await updateAnalysisStatus(analysis_id, 'running');

      // 1. Gather system data
      console.log(`[${AGENT_TYPE} Agent] 📊 Gathering system data...`);
      const systemData = await gatherSystemData(project_id);

      // 2. Analyze with Claude
      console.log(`[${AGENT_TYPE} Agent] 🤖 Analyzing with Claude API...`);
      const prompt = buildAnalysisPrompt(project_id, systemData);

      const message = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4000, // Longer for detailed analysis
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const response = message.content[0].text;
      const analysisResult = parseAnalysisResponse(response);

      console.log(`[${AGENT_TYPE} Agent] ✅ Analysis completed`);
      console.log(`[${AGENT_TYPE} Agent] Found ${analysisResult.suggestions.length} suggestions`);
      console.log(`[${AGENT_TYPE} Agent] Detected ${analysisResult.patterns.length} patterns`);

      // 3. Save suggestions to database
      await saveSuggestions(analysis_id, analysisResult.suggestions);

      // 4. Update or create patterns
      await updatePatternLibrary(analysisResult.patterns, analysis_id);

      // 5. Complete analysis
      const executionTime = Date.now() - startTime;
      await updateAnalysisStatus(analysis_id, 'completed', {
        agent_insights: analysisResult.insights,
        suggestions_count: analysisResult.suggestions.length,
        patterns_detected_count: analysisResult.patterns.length,
        execution_time_ms: executionTime
      });

      console.log(`[${AGENT_TYPE} Agent] ⏱️  Execution time: ${executionTime}ms`);

      return {
        success: true,
        analysis_id,
        suggestions_count: analysisResult.suggestions.length,
        patterns_count: analysisResult.patterns.length,
        execution_time: executionTime
      };

    } catch (error) {
      console.error(`[${AGENT_TYPE} Agent] ❌ Analysis failed:`, error.message);

      const executionTime = Date.now() - startTime;
      await updateAnalysisStatus(analysis_id, 'failed', {
        error_message: error.message,
        execution_time_ms: executionTime
      });

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 1, // One analysis at a time
  }
);

/**
 * Gather system data for analysis
 */
async function gatherSystemData(projectId) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    // Fetch tasks
    const tasksRes = await fetch(`${apiUrl}/api/projects/${projectId}/tasks`);
    const tasksData = await tasksRes.json();

    // Fetch agents
    const agentsRes = await fetch(`${apiUrl}/api/agents/health`);
    const agentsData = await agentsRes.json();

    // Fetch recent patterns
    const patternsRes = await fetch(`${apiUrl}/api/patterns`);
    const patternsData = await patternsRes.json();

    return {
      tasks: tasksData.tasks || [],
      agents: agentsData,
      patterns: patternsData.patterns || [],
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`[${AGENT_TYPE} Agent] Error gathering data:`, error.message);
    return {
      tasks: [],
      agents: { systemHealth: { status: 'unknown' } },
      patterns: [],
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Build comprehensive analysis prompt for Claude
 */
function buildAnalysisPrompt(projectId, systemData) {
  const taskStats = {
    total: systemData.tasks.length,
    todo: systemData.tasks.filter(t => t.status === 'todo').length,
    inProgress: systemData.tasks.filter(t => t.status === 'in-progress').length,
    done: systemData.tasks.filter(t => t.status === 'done').length,
    blocked: systemData.tasks.filter(t => t.status === 'blocked').length,
  };

  return `You are a ProductImprovementAgent analyzing the Maestro AI orchestration platform.

Project ID: ${projectId}
Analysis Date: ${systemData.timestamp}

## Current System State

### Task Statistics:
- Total Tasks: ${taskStats.total}
- Todo: ${taskStats.todo}
- In Progress: ${taskStats.inProgress}
- Done: ${taskStats.done}
- Blocked: ${taskStats.blocked}

### Agent Health:
${JSON.stringify(systemData.agents.systemHealth, null, 2)}

### Recent Tasks:
${systemData.tasks.slice(0, 20).map(t => `- [${t.status}] ${t.title} (Priority: ${t.priority})`).join('\n')}

### Known Patterns:
${systemData.patterns.slice(0, 10).map(p => `- ${p.pattern_name} (confidence: ${p.confidence_score}, observed: ${p.times_observed}x)`).join('\n') || 'None detected yet'}

## Your Task

Analyze this system data and provide:

1. **Key Insights** (3-5 bullet points)
   - What's working well?
   - What needs attention?
   - Any concerning trends?

2. **Improvement Suggestions** (5-10 specific suggestions)
   For each suggestion, provide:
   - title: Short, actionable title
   - description: Detailed explanation
   - category: performance | ux | security | architecture | code_quality
   - priority: 1 (critical) to 5 (nice-to-have)
   - impact_score: 0.0 to 1.0 (estimated improvement impact)
   - implementation_effort: small | medium | large
   - estimated_hours: Estimated time to implement

3. **Patterns Detected** (up to 5)
   For each pattern:
   - pattern_name: Brief descriptive name
   - pattern_type: error_pattern | usage_pattern | performance_pattern | security_pattern
   - description: What the pattern indicates
   - confidence: 0.0 to 1.0
   - actionable: true/false
   - tags: Array of relevant tags

Format your response as valid JSON:

{
  "insights": {
    "strengths": ["...", "..."],
    "concerns": ["...", "..."],
    "trends": ["...", "..."]
  },
  "suggestions": [
    {
      "title": "...",
      "description": "...",
      "category": "...",
      "priority": 1,
      "impact_score": 0.8,
      "implementation_effort": "medium",
      "estimated_hours": 4.0,
      "code_location": "optional/path/to/code"
    }
  ],
  "patterns": [
    {
      "pattern_name": "...",
      "pattern_type": "...",
      "description": "...",
      "confidence": 0.85,
      "actionable": true,
      "tags": ["tag1", "tag2"]
    }
  ]
}

IMPORTANT: Return ONLY valid JSON, no markdown formatting or additional text.`;
}

/**
 * Parse Claude's analysis response
 */
function parseAnalysisResponse(response) {
  try {
    // Remove markdown code blocks if present
    let jsonStr = response.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```\n?/g, '').replace(/```\n?$/g, '');
    }

    const parsed = JSON.parse(jsonStr);

    return {
      insights: parsed.insights || {},
      suggestions: parsed.suggestions || [],
      patterns: parsed.patterns || []
    };
  } catch (error) {
    console.error(`[${AGENT_TYPE} Agent] Failed to parse response:`, error.message);
    console.error('Response was:', response.substring(0, 500));

    return {
      insights: { error: 'Failed to parse response' },
      suggestions: [],
      patterns: []
    };
  }
}

/**
 * Save suggestions to database
 */
async function saveSuggestions(analysisId, suggestions) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  for (const suggestion of suggestions) {
    try {
      const suggestionData = {
        suggestion_id: `sug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        analysis_id: analysisId,
        ...suggestion,
        created_at: new Date().toISOString()
      };

      await fetch(`${apiUrl}/api/improvements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(suggestionData)
      });

      console.log(`[${AGENT_TYPE} Agent] ✓ Saved suggestion: ${suggestion.title}`);
    } catch (error) {
      console.error(`[${AGENT_TYPE} Agent] Failed to save suggestion:`, error.message);
    }
  }
}

/**
 * Update pattern library
 */
async function updatePatternLibrary(patterns, analysisId) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  for (const pattern of patterns) {
    try {
      const patternData = {
        pattern_id: `pat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        pattern_data: { details: pattern.description },
        related_analyses: [analysisId],
        ...pattern,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString()
      };

      await fetch(`${apiUrl}/api/patterns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patternData)
      });

      console.log(`[${AGENT_TYPE} Agent] ✓ Saved pattern: ${pattern.pattern_name}`);
    } catch (error) {
      console.error(`[${AGENT_TYPE} Agent] Failed to save pattern:`, error.message);
    }
  }
}

/**
 * Update analysis status
 */
async function updateAnalysisStatus(analysisId, status, updates = {}) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    const body = { status, ...updates };
    if (status === 'completed') {
      body.completed_at = new Date().toISOString();
    }

    const response = await fetch(`${apiUrl}/api/analyses/${analysisId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(`[${AGENT_TYPE} Agent] Failed to update analysis status:`, await response.text());
    }
  } catch (error) {
    console.error(`[${AGENT_TYPE} Agent] Error updating analysis status:`, error.message);
  }
}

worker.on('completed', (job) => {
  console.log(`[${AGENT_TYPE} Agent] ✓ Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`[${AGENT_TYPE} Agent] ✗ Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error(`[${AGENT_TYPE} Agent] Worker error:`, err);
});

process.on('SIGTERM', async () => {
  console.log(`\n[${AGENT_TYPE} Agent] Received SIGTERM, shutting down gracefully...`);
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log(`\n[${AGENT_TYPE} Agent] Received SIGINT, shutting down gracefully...`);
  await worker.close();
  process.exit(0);
});

console.log(`[${AGENT_TYPE} Agent] ✓ Worker started successfully, waiting for analysis jobs...`);
