#!/usr/bin/env node

/**
 * Maestro Self-Improvement Agent
 *
 * Specialized ProductImprovementAgent that analyzes Maestro's own codebase
 * to identify improvements, then creates suggestions that can be reviewed
 * and implemented to make Maestro better.
 *
 * This agent demonstrates Phase 5: Self-Improvement Application
 */

const fs = require('fs');
const path = require('path');
const Agent = require('./agent-base');

class MaestroSelfImprovementAgent extends Agent {
  constructor(maestroUrl = 'http://localhost:3000', anthropicApiKey = '') {
    super('product-improvement-agent', 'Maestro Self-Improvement', maestroUrl, anthropicApiKey);
    this.codebasePath = path.join(__dirname, '..');
    this.analysisCache = new Map();
  }

  /**
   * Analyze Maestro codebase and generate improvement suggestions
   */
  async analyzeCodebase() {
    this.log('Starting Maestro codebase analysis...', 'info');

    try {
      // Get list of files to analyze
      const files = this.getCodebaseFiles();
      this.log(`Found ${files.length} files to analyze`, 'info');

      // Read and prepare file contents
      const codebaseContext = this.prepareCodebaseContext(files.slice(0, 20)); // Limit for token efficiency

      return codebaseContext;
    } catch (error) {
      this.log(`Error analyzing codebase: ${error.message}`, 'error');
      return null;
    }
  }

  /**
   * Get list of relevant files in codebase
   */
  getCodebaseFiles() {
    const files = [];
    const ignoreDirs = ['node_modules', '.next', '.git', 'dist', 'build'];
    const includeExtensions = ['.js', '.ts', '.tsx', '.jsx', '.json'];

    const scanDirectory = (dir) => {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const relativePath = path.relative(this.codebasePath, fullPath);

        // Skip ignored directories
        if (ignoreDirs.some(ignored => relativePath.startsWith(ignored))) {
          continue;
        }

        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (includeExtensions.some(ext => item.endsWith(ext))) {
          files.push(relativePath);
        }
      }
    };

    scanDirectory(this.codebasePath);
    return files;
  }

  /**
   * Prepare codebase context for AI analysis
   */
  prepareCodebaseContext(files) {
    const context = {
      project: 'Maestro',
      description: 'AI Agent Orchestration Platform',
      totalFiles: files.length,
      files: []
    };

    for (const file of files) {
      const fullPath = path.join(this.codebasePath, file);
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n').length;

        context.files.push({
          path: file,
          lines: lines,
          size: content.length,
          preview: content.slice(0, 500) // First 500 chars
        });
      } catch (error) {
        this.log(`Could not read ${file}: ${error.message}`, 'warn');
      }
    }

    return context;
  }

  /**
   * Execute task with Maestro-specific analysis capabilities
   */
  async executeTask(task) {
    try {
      this.log(`Executing self-improvement task: ${task.title}`, 'info');

      // Analyze codebase
      const codebaseContext = await this.analyzeCodebase();

      if (!codebaseContext) {
        throw new Error('Failed to analyze codebase');
      }

      // Prepare detailed prompt for Claude
      const analysisPrompt = this.buildAnalysisPrompt(task, codebaseContext);

      // Call Claude API for analysis
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
          system: this.getSystemPrompt(),
          messages: [
            {
              role: 'user',
              content: analysisPrompt,
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

      // Parse improvements from analysis
      const improvements = this.parseImprovements(analysis, task);

      // Create improvement suggestions
      await this.createImprovementSuggestions(improvements);

      return {
        status: 'success',
        content: analysis,
        improvementsCreated: improvements.length,
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
   * Build analysis prompt for Claude
   */
  buildAnalysisPrompt(task, codebaseContext) {
    const filesList = codebaseContext.files
      .map(f => `- ${f.path} (${f.lines} lines)`)
      .join('\n');

    const filesPreview = codebaseContext.files
      .slice(0, 5)
      .map(f => `\n### ${f.path}\n\`\`\`\n${f.preview}\n\`\`\``)
      .join('\n');

    return `${task.ai_prompt || task.description}

## Maestro Codebase Overview

Total files analyzed: ${codebaseContext.totalFiles}

### File Structure:
${filesList}

### Sample File Contents:
${filesPreview}

## Analysis Request

Please analyze the Maestro codebase and provide specific, actionable improvement suggestions in the following format:

### Improvement 1: [Title]
**Priority:** [1-5]
**Impact:** [low/medium/high]
**Description:** [Detailed description]
**Rationale:** [Why this improvement matters]
**Implementation:** [How to implement]

### Improvement 2: [Title]
...

Focus on:
1. Code quality and maintainability
2. Performance optimizations
3. User experience enhancements
4. Architecture improvements
5. Security best practices
6. Missing features that would add value

Provide at least 3-5 concrete improvements that would make Maestro better at managing AI agents and orchestrating autonomous development.`;
  }

  /**
   * Get system prompt for Maestro self-improvement
   */
  getSystemPrompt() {
    return `You are a specialized Product Improvement Agent analyzing the Maestro platform - an AI agent orchestration system.

Your mission is to identify improvements that will make Maestro better at:
- Managing multiple AI agents across projects
- Orchestrating autonomous development
- Coordinating complex multi-agent workflows
- Providing visibility and control to developers
- Scaling to handle many projects simultaneously

Focus on ACTIONABLE improvements with clear business value. Think like a senior software architect who deeply understands AI agent systems, distributed systems, and developer experience.

Prioritize improvements that:
1. Reduce friction for developers using Maestro
2. Make agents more effective and autonomous
3. Improve reliability and observability
4. Enable new capabilities for agent coordination
5. Optimize performance and cost

Be specific, technical, and provide clear implementation guidance.`;
  }

  /**
   * Parse improvement suggestions from Claude's response
   */
  parseImprovements(analysis, task) {
    const improvements = [];
    const improvementRegex = /### Improvement \d+: (.+?)\n\*\*Priority:\*\* (\d+)\n\*\*Impact:\*\* (low|medium|high)\n\*\*Description:\*\* (.+?)\n\*\*Rationale:\*\* (.+?)\n\*\*Implementation:\*\* (.+?)(?=\n### |$)/gs;

    let match;
    while ((match = improvementRegex.exec(analysis)) !== null) {
      improvements.push({
        title: match[1].trim(),
        priority: parseInt(match[2]),
        impact: match[3].trim(),
        description: match[4].trim(),
        rationale: match[5].trim(),
        implementation: match[6].trim()
      });
    }

    // If regex parsing fails, create a single improvement from the full analysis
    if (improvements.length === 0) {
      improvements.push({
        title: 'Maestro Platform Improvements',
        priority: 2,
        impact: 'high',
        description: 'Comprehensive analysis of Maestro platform',
        rationale: analysis,
        implementation: 'See full analysis for details'
      });
    }

    return improvements;
  }

  /**
   * Create improvement suggestions in Maestro
   */
  async createImprovementSuggestions(improvements) {
    for (const improvement of improvements) {
      try {
        const suggestion = {
          improvement_id: `imp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          project_id: 'maestro-self-improvement',
          title: improvement.title,
          description: `${improvement.description}\n\n**Rationale:**\n${improvement.rationale}\n\n**Implementation:**\n${improvement.implementation}`,
          suggested_by: this.agentName,
          status: 'pending',
          priority: improvement.priority,
          estimated_impact: improvement.impact,
          created_date: new Date().toISOString()
        };

        const response = await fetch(`${this.maestroUrl}/api/improvements`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(suggestion),
        });

        if (response.ok) {
          this.log(`Created improvement suggestion: ${improvement.title}`, 'info');
        } else {
          this.log(`Failed to create suggestion: ${improvement.title}`, 'warn');
        }
      } catch (error) {
        this.log(`Error creating suggestion: ${error.message}`, 'error');
      }
    }
  }

  /**
   * Enhanced run method with self-improvement capabilities
   */
  async run(pollIntervalMs = 60000) {
    this.log('🚀 Maestro Self-Improvement Agent starting...', 'info');
    this.log(`Analyzing codebase at: ${this.codebasePath}`, 'info');

    // Run initial analysis
    this.log('Running initial codebase analysis...', 'info');
    const codebaseContext = await this.analyzeCodebase();

    if (codebaseContext) {
      this.log(`✓ Analyzed ${codebaseContext.totalFiles} files`, 'info');
    }

    // Start regular polling loop
    await super.run(pollIntervalMs);
  }
}

// Run agent if executed directly
if (require.main === module) {
  const apiKey = process.env.ANTHROPIC_API_KEY || '';
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable not set');
    console.error('Set it with: export ANTHROPIC_API_KEY=your-key-here');
    process.exit(1);
  }

  const maestroUrl = process.env.MAESTRO_URL || 'http://localhost:3000';
  const agent = new MaestroSelfImprovementAgent(maestroUrl, apiKey);

  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   Maestro Self-Improvement Agent                     ║');
  console.log('║   Phase 5: Autonomous Platform Enhancement           ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  agent.run(120000); // Poll every 2 minutes
}

module.exports = MaestroSelfImprovementAgent;
