/**
 * Research Agent - Event-Driven Intelligence Layer
 * On-demand research triggered by events from other agents or UI
 *
 * Architecture:
 * - Event-driven: Listens for 'research_needed' events
 * - Batched execution: Processes requests in batches to reduce API calls
 * - Queue system: Executes when batch reaches 5 requests OR every 6 hours
 * - Smart caching: Checks knowledge base before making new requests
 *
 * Enterprise Capabilities:
 * - Structured research with formal reports
 * - Competitive analysis
 * - Best practice identification
 * - Knowledge base integration
 */

const Agent = require('./agent-base');
const KnowledgeBase = require('../lib/knowledge-base');
const EventBus = require('../lib/event-bus');

class ResearchAgent extends Agent {
  constructor(maestroUrl = 'http://localhost:3000', anthropicApiKey = '') {
    super('research-agent', 'Research', maestroUrl, anthropicApiKey);
    this.knowledgeBase = new KnowledgeBase();

    // Research queue configuration
    this.researchQueue = [];
    this.batchSize = 5; // Execute when 5 requests accumulated
    this.batchInterval = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
    this.batchTimer = null;
    this.firstRequestTime = null;
    this.isProcessing = false;

    // Statistics
    this.stats = {
      events_received: 0,
      requests_queued: 0,
      requests_processed: 0,
      requests_cached: 0,
      batches_executed: 0,
      api_calls_saved: 0,
    };

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Setup event-driven listeners
   */
  setupEventListeners() {
    // Main research event
    EventBus.on('research_needed', async (data) => {
      this.stats.events_received++;
      await this.handleResearchRequest(data);
    });

    // Direct research trigger (bypasses queue)
    EventBus.on('research_immediate', async (data) => {
      this.log('Immediate research requested (bypassing queue)', 'info');
      await this.processResearchRequest(data);
    });

    // Queue status request
    EventBus.on('research_queue_status', () => {
      EventBus.emit('research_queue_status_response', {
        queue_size: this.researchQueue.length,
        next_execution: this.estimateNextExecution(),
        stats: this.stats,
      });
    });

    // Force batch execution
    EventBus.on('research_execute_batch', async () => {
      this.log('Forced batch execution requested', 'info');
      await this.executeBatch();
    });

    this.log('Event listeners configured', 'info');
  }

  /**
   * Handle incoming research request
   * @param {Object} data - Request data
   */
  async handleResearchRequest(data) {
    try {
      const { topic, context = {}, requestedBy, priority = 'normal', requestId } = data;

      if (!topic) {
        this.log('Research request missing topic', 'error');
        EventBus.emit('research_error', {
          requestId,
          error: 'Missing topic',
        });
        return;
      }

      // Check knowledge base first (smart caching)
      const existing = this.knowledgeBase.search(topic);
      if (existing.length > 0) {
        this.log(`Cache hit: Found existing research for "${topic}"`, 'info');
        this.stats.requests_cached++;
        this.stats.api_calls_saved++;

        EventBus.emit('research_complete', {
          requestId,
          topic,
          requestedBy,
          source: 'cache',
          research: existing[0],
          cached: true,
        });
        return;
      }

      // Add to queue
      const queueItem = {
        topic,
        context,
        requestedBy,
        priority,
        requestId: requestId || this.generateRequestId(),
        queuedAt: new Date().toISOString(),
      };

      this.researchQueue.push(queueItem);
      this.stats.requests_queued++;

      this.log(`Queued research request: "${topic}" (queue size: ${this.researchQueue.length})`, 'info');

      // Set first request time if this is the first in batch
      if (this.researchQueue.length === 1) {
        this.firstRequestTime = Date.now();
        this.startBatchTimer();
      }

      // Check if we should execute batch
      if (this.researchQueue.length >= this.batchSize) {
        this.log(`Batch size reached (${this.batchSize}), executing batch`, 'info');
        await this.executeBatch();
      }
    } catch (error) {
      this.log(`Error handling research request: ${error.message}`, 'error');
      EventBus.emit('research_error', {
        error: error.message,
      });
    }
  }

  /**
   * Start batch timer (6 hours)
   */
  startBatchTimer() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(async () => {
      this.log('Batch timer expired (6 hours), executing batch', 'info');
      await this.executeBatch();
    }, this.batchInterval);
  }

  /**
   * Execute batch of research requests
   */
  async executeBatch() {
    if (this.isProcessing) {
      this.log('Batch already processing, skipping', 'warn');
      return;
    }

    if (this.researchQueue.length === 0) {
      this.log('Queue empty, nothing to process', 'info');
      return;
    }

    this.isProcessing = true;
    this.stats.batches_executed++;

    // Clear batch timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    const batchSize = this.researchQueue.length;
    this.log(`Executing batch of ${batchSize} research requests`, 'info');

    // Emit batch start event
    EventBus.emit('research_batch_start', {
      batch_size: batchSize,
      requests: this.researchQueue.map(r => ({ topic: r.topic, requestId: r.requestId })),
    });

    // Process all requests in queue
    const batch = [...this.researchQueue];
    this.researchQueue = [];
    this.firstRequestTime = null;

    for (const request of batch) {
      try {
        await this.processResearchRequest(request);
      } catch (error) {
        this.log(`Error processing request ${request.requestId}: ${error.message}`, 'error');
        EventBus.emit('research_error', {
          requestId: request.requestId,
          error: error.message,
        });
      }
    }

    // Emit batch complete event
    EventBus.emit('research_batch_complete', {
      batch_size: batchSize,
      processed: this.stats.requests_processed,
    });

    this.isProcessing = false;
    this.log(`Batch execution complete (processed ${batchSize} requests)`, 'info');
  }

  /**
   * Process individual research request
   * @param {Object} request - Research request
   */
  async processResearchRequest(request) {
    const { topic, context, requestedBy, requestId } = request;

    try {
      this.log(`Processing research: "${topic}"`, 'info');

      // Determine research type based on context
      let research;
      if (context.type === 'competitor-analysis') {
        research = await this.analyzeCompetitors(context.competitorUrls || []);
      } else if (context.type === 'best-practices') {
        research = await this.findBestPractices(topic);
      } else {
        research = await this.conductResearch(topic, context);
      }

      this.stats.requests_processed++;

      // Emit completion event
      EventBus.emit('research_complete', {
        requestId,
        topic,
        requestedBy,
        source: 'fresh',
        research,
        cached: false,
      });

      this.log(`Research complete: "${topic}"`, 'info');
    } catch (error) {
      this.log(`Error processing research: ${error.message}`, 'error');
      throw error;
    }
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
   * Generate unique request ID
   * @returns {string} Request ID
   */
  generateRequestId() {
    return `req-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Estimate next batch execution time
   * @returns {string|null} ISO timestamp or null
   */
  estimateNextExecution() {
    if (this.researchQueue.length === 0) {
      return null;
    }

    if (this.researchQueue.length >= this.batchSize) {
      return 'immediate';
    }

    if (this.firstRequestTime) {
      const nextExecution = new Date(this.firstRequestTime + this.batchInterval);
      return nextExecution.toISOString();
    }

    return null;
  }

  /**
   * Get research agent statistics
   * @returns {Object} Statistics
   */
  getResearchStats() {
    return {
      ...this.stats,
      queue_size: this.researchQueue.length,
      next_execution: this.estimateNextExecution(),
      is_processing: this.isProcessing,
      batch_config: {
        batch_size: this.batchSize,
        batch_interval_hours: this.batchInterval / (60 * 60 * 1000),
      },
      knowledge_base: this.knowledgeBase.getStats(),
    };
  }

  /**
   * Override executeTask to maintain compatibility with task-based system
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

  /**
   * Start event-driven research agent
   */
  startEventDriven() {
    this.log('Research Agent started in event-driven mode', 'info');
    this.log(`Batch config: ${this.batchSize} requests or ${this.batchInterval / (60 * 60 * 1000)} hours`, 'info');

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.log('Shutting down...', 'warn');
      if (this.batchTimer) {
        clearTimeout(this.batchTimer);
      }
      this.log(`Final stats: ${JSON.stringify(this.getResearchStats(), null, 2)}`, 'info');
      process.exit(0);
    });

    // Keep process alive
    setInterval(() => {
      // Periodic stats logging
      if (this.researchQueue.length > 0) {
        this.log(`Queue status: ${this.researchQueue.length} requests pending`, 'info');
      }
    }, 5 * 60 * 1000); // Every 5 minutes
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

  // Check for mode flag
  const mode = process.argv[2] || 'event-driven';

  if (mode === 'event-driven') {
    agent.startEventDriven();
  } else {
    // Legacy polling mode for backward compatibility
    agent.run(60000);
  }
}

module.exports = ResearchAgent;
