/**
 * Supervisor Agent - Maestro Intelligence Layer
 * Meta-agent for orchestration, task routing, and system health monitoring
 * Ensures optimal work distribution and detects bottlenecks
 */

const Agent = require('./agent-base');

class SupervisorAgent extends Agent {
  constructor(maestroUrl = 'http://localhost:3000', anthropicApiKey = '') {
    super('supervisor-agent', 'Supervisor', maestroUrl, anthropicApiKey);
    this.orchestrationInterval = null;
  }

  /**
   * Monitor all agents across all projects
   * Identifies: stuck (no progress >30 min), idle (no task), offline (no poll >5 min)
   */
  async monitorAgents() {
    try {
      const response = await fetch(`${this.maestroUrl}/api/agents/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch agent health`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      this.log(`Error monitoring agents: ${error.message}`, 'error');
      return { healthy: [], stuck: [], idle: [], offline: [] };
    }
  }

  /**
   * Assign task to best available agent
   * Selects agent with: matching capabilities, lowest workload, best success rate
   */
  async assignTask(task) {
    try {
      const response = await fetch(`${this.maestroUrl}/api/tasks/${task.task_id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to assign task`);
      }

      const result = await response.json();
      this.log(
        `Task ${task.task_id} assigned to ${result.agent?.agent_name || 'unknown'} (score: ${result.score})`,
        'info'
      );
      return result;
    } catch (error) {
      this.log(`Error assigning task ${task.task_id}: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  /**
   * Detect when new agents needed
   * If >10 tasks waiting for one agent type for >2 hours
   */
  async detectBottlenecks() {
    try {
      const response = await fetch(`${this.maestroUrl}/api/supervisor/bottlenecks`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to detect bottlenecks`);
      }

      const bottlenecks = await response.json();

      if (bottlenecks.length > 0) {
        this.log(`Detected ${bottlenecks.length} bottleneck(s)`, 'warn');
        bottlenecks.forEach(b => {
          this.log(
            `  - ${b.agent_type}: ${b.backlog} tasks, ${b.utilization}% capacity, ~${b.estimated_delay}h delay`,
            'warn'
          );
        });
      }

      return bottlenecks;
    } catch (error) {
      this.log(`Error detecting bottlenecks: ${error.message}`, 'error');
      return [];
    }
  }

  /**
   * Create new agent configuration
   */
  async spawnAgent(agentType, capabilities = []) {
    try {
      const agentConfig = {
        agent_id: `${agentType.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        agent_name: `${agentType} Agent`,
        agent_type: agentType,
        status: 'idle',
        capabilities: capabilities,
        project_id: 'maestro-system',
        tasks_completed: 0,
        tasks_in_progress: 0,
        created_at: new Date().toISOString(),
      };

      const response = await fetch(`${this.maestroUrl}/api/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentConfig),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to spawn agent`);
      }

      const result = await response.json();
      this.log(`Spawned new ${agentType} agent: ${result.agent_id}`, 'info');
      return result;
    } catch (error) {
      this.log(`Error spawning agent: ${error.message}`, 'error');
      return null;
    }
  }

  /**
   * Generate alerts for human intervention
   * Checks for: critical tasks blocked, all agents offline, errors >50%
   */
  async generateAlerts() {
    try {
      const response = await fetch(`${this.maestroUrl}/api/supervisor/alerts`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to generate alerts`);
      }

      const alerts = await response.json();

      // Log critical alerts
      const criticalAlerts = alerts.filter(a => a.severity === 'critical');
      if (criticalAlerts.length > 0) {
        this.log(`CRITICAL: ${criticalAlerts.length} critical alert(s)`, 'error');
        criticalAlerts.forEach(alert => {
          this.log(`  - ${alert.message}`, 'error');
          this.log(`    Action: ${alert.action}`, 'error');
        });
      }

      return alerts;
    } catch (error) {
      this.log(`Error generating alerts: ${error.message}`, 'error');
      return [];
    }
  }

  /**
   * Run orchestration cycle
   * Monitors health, assigns tasks, detects bottlenecks, generates alerts
   */
  async runOrchestrationCycle() {
    this.log('Running orchestration cycle...', 'info');

    try {
      // 1. Monitor agent health
      const health = await this.monitorAgents();
      this.log(
        `Agent health: ${health.healthy?.length || 0} healthy, ${health.stuck?.length || 0} stuck, ${health.offline?.length || 0} offline`,
        'info'
      );

      // 2. Detect bottlenecks
      const bottlenecks = await this.detectBottlenecks();

      // 3. Generate alerts
      const alerts = await this.generateAlerts();

      // 4. Auto-assign unassigned tasks (if enabled)
      // Note: This is optional and could be enabled via config
      // await this.autoAssignTasks();

      // 5. Reassign stuck tasks
      if (health.stuck?.length > 0) {
        this.log('Reassigning stuck tasks...', 'warn');
        await this.reassignStuckTasks();
      }

      this.log('Orchestration cycle complete', 'info');

      return {
        health,
        bottlenecks,
        alerts,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.log(`Error in orchestration cycle: ${error.message}`, 'error');
      return null;
    }
  }

  /**
   * Auto-assign unassigned tasks
   */
  async autoAssignTasks() {
    try {
      const response = await fetch(`${this.maestroUrl}/api/tasks?status=todo&unassigned=true`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch unassigned tasks`);
      }

      const data = await response.json();
      const tasks = data.tasks || [];

      for (const task of tasks) {
        await this.assignTask(task);
        await this.delay(100); // Small delay to avoid rate limits
      }
    } catch (error) {
      this.log(`Error auto-assigning tasks: ${error.message}`, 'error');
    }
  }

  /**
   * Reassign stuck tasks
   */
  async reassignStuckTasks() {
    try {
      const response = await fetch(`${this.maestroUrl}/api/supervisor/reassign-stuck`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to reassign stuck tasks`);
      }

      const results = await response.json();
      this.log(`Reassigned ${results.length} stuck task(s)`, 'info');
      return results;
    } catch (error) {
      this.log(`Error reassigning stuck tasks: ${error.message}`, 'error');
      return [];
    }
  }

  /**
   * Override run method to include orchestration
   */
  async run(pollIntervalMs = 60000) {
    this.isRunning = true;
    this.log(`Supervisor Agent started. Orchestration every ${pollIntervalMs}ms`, 'info');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      this.log('Received SIGINT, shutting down gracefully...', 'warn');
      this.isRunning = false;
      if (this.orchestrationInterval) {
        clearInterval(this.orchestrationInterval);
      }
      this.logStats();
      process.exit(0);
    });

    // Run orchestration cycles
    while (this.isRunning) {
      try {
        await this.runOrchestrationCycle();
        await this.delay(pollIntervalMs);
      } catch (error) {
        this.log(`Unexpected error in supervisor loop: ${error.message}`, 'error');
        await this.delay(5000);
      }
    }
  }

  /**
   * Override executeTask to add supervisor-specific context
   */
  async executeTask(task) {
    try {
      const systemPrompt = `You are a Supervisor Agent for Maestro.
Your role is to oversee workflow coordination, ensure quality standards, identify bottlenecks,
and provide strategic guidance. Think critically about dependencies, resource allocation,
and overall project health. Provide actionable recommendations and clear status updates.`;

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

  const agent = new SupervisorAgent('http://localhost:3000', apiKey);
  agent.run(60000); // Poll every 60 seconds
}

module.exports = SupervisorAgent;
