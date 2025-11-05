/**
 * Agent Manager
 * Orchestrates and manages all 7 autonomous agents working in parallel
 * Handles startup, health monitoring, logging, and graceful shutdown
 */

const ProductImprovementAgent = require('./product-improvement-agent');
const FrontendAgent = require('./frontend-agent');
const BackendAgent = require('./backend-agent');
const SupervisorAgent = require('./supervisor-agent');
const ResearchAgent = require('./research-agent');
const TestingAgent = require('./testing-agent');

class AgentManager {
  constructor(maestroUrl = 'http://localhost:3000', anthropicApiKey = '') {
    this.maestroUrl = maestroUrl;
    this.anthropicApiKey = anthropicApiKey;
    this.agents = [];
    this.agentProcesses = [];
    this.isRunning = false;
    this.startTime = new Date();
  }

  /**
   * Initialize all 7 agents
   */
  initializeAgents() {
    this.agents = [
      new ProductImprovementAgent(this.maestroUrl, this.anthropicApiKey),
      new FrontendAgent(this.maestroUrl, this.anthropicApiKey),
      new BackendAgent(this.maestroUrl, this.anthropicApiKey),
      new SupervisorAgent(this.maestroUrl, this.anthropicApiKey),
      new ResearchAgent(this.maestroUrl, this.anthropicApiKey),
      new TestingAgent(this.maestroUrl, this.anthropicApiKey),
    ];

    this.log(`Initialized ${this.agents.length} agents`, 'info');
  }

  /**
   * Start all agents in parallel
   */
  async startAllAgents() {
    this.log('Starting all agents...', 'info');

    const agentPromises = this.agents.map(agent => {
      return agent.run(60000).catch(error => {
        this.log(`Agent ${agent.agentName} crashed: ${error.message}`, 'error');
      });
    });

    this.agentProcesses = agentPromises;
    return Promise.all(agentPromises);
  }

  /**
   * Start the agent manager
   */
  async start() {
    this.isRunning = true;
    this.log('='.repeat(60), 'info');
    this.log('MAESTRO AGENT SYSTEM STARTING', 'info');
    this.log('='.repeat(60), 'info');

    // Initialize agents
    this.initializeAgents();

    // Log agent details
    this.log(`Agents ready for deployment:`, 'info');
    this.agents.forEach((agent, index) => {
      this.log(`  ${index + 1}. ${agent.agentName} (${agent.agentType})`, 'info');
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.log('Received SIGINT, initiating graceful shutdown...', 'warn');
      this.shutdown();
    });

    process.on('SIGTERM', () => {
      this.log('Received SIGTERM, initiating graceful shutdown...', 'warn');
      this.shutdown();
    });

    // Start all agents in parallel
    await this.startAllAgents();
  }

  /**
   * Monitor agent health and log statistics periodically
   */
  async monitorAgents() {
    while (this.isRunning) {
      await this.delay(60000); // Log stats every 60 seconds

      this.log('-'.repeat(60), 'info');
      this.log('AGENT SYSTEM STATUS', 'info');
      this.log('-'.repeat(60), 'info');

      let totalProcessed = 0;
      let totalFailed = 0;

      for (const agent of this.agents) {
        const stats = agent.getStats();
        this.log(
          `${agent.agentName}: Processed ${stats.tasksProcessed}, Failed ${stats.tasksFailed}, Status: ${stats.isRunning ? 'running' : 'stopped'}`,
          'info'
        );
        totalProcessed += stats.tasksProcessed;
        totalFailed += stats.tasksFailed;
      }

      this.log('-'.repeat(60), 'info');
      this.log(
        `SYSTEM TOTAL: Processed ${totalProcessed} tasks, Failed ${totalFailed} tasks`,
        'info'
      );
      this.log('-'.repeat(60), 'info');
    }
  }

  /**
   * Gracefully shutdown all agents
   */
  async shutdown() {
    this.isRunning = false;
    this.log('Shutting down all agents...', 'warn');

    for (const agent of this.agents) {
      agent.isRunning = false;
      agent.logStats();
    }

    this.log('All agents stopped', 'info');
    this.logFinalStats();

    process.exit(0);
  }

  /**
   * Log final statistics
   */
  logFinalStats() {
    const uptime = new Date() - this.startTime;
    const uptimeSeconds = Math.floor(uptime / 1000);
    const uptimeMinutes = Math.floor(uptimeSeconds / 60);
    const uptimeHours = Math.floor(uptimeMinutes / 60);

    this.log('='.repeat(60), 'info');
    this.log('AGENT SYSTEM SHUTDOWN', 'info');
    this.log(`Uptime: ${uptimeHours}h ${uptimeMinutes % 60}m ${uptimeSeconds % 60}s`, 'info');

    let totalProcessed = 0;
    let totalFailed = 0;

    this.log('-'.repeat(60), 'info');
    for (const agent of this.agents) {
      const stats = agent.getStats();
      totalProcessed += stats.tasksProcessed;
      totalFailed += stats.tasksFailed;
      this.log(
        `${agent.agentName}: ${stats.tasksProcessed} processed, ${stats.tasksFailed} failed`,
        'info'
      );
    }

    this.log('-'.repeat(60), 'info');
    this.log(`Total tasks processed: ${totalProcessed}`, 'info');
    this.log(`Total tasks failed: ${totalFailed}`, 'info');
    this.log('='.repeat(60), 'info');
  }

  /**
   * Utility function to add delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log a message with timestamp and level
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [MANAGER] [${level.toUpperCase()}]`;
    console.log(`${prefix} ${message}`);
  }
}

// Run agent manager if executed directly
if (require.main === module) {
  const apiKey = process.env.ANTHROPIC_API_KEY || '';
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable not set');
    console.error('Please set: export ANTHROPIC_API_KEY=your-key');
    process.exit(1);
  }

  const manager = new AgentManager('http://localhost:3000', apiKey);
  manager.start().then(() => {
    manager.monitorAgents();
  });
}

module.exports = AgentManager;
