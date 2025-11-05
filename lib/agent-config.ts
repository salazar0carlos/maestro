/**
 * Agent Configuration System
 * Manages webhook URLs and configuration for event-driven agents
 * Each agent type has a webhook endpoint where it receives task triggers
 */

export interface AgentWebhookConfig {
  webhook: string;
  enabled: boolean;
  capabilities?: string[];
}

export type AgentConfigMap = Record<string, AgentWebhookConfig>;

/**
 * Get agent webhook configuration
 * Uses environment variables with fallback to localhost defaults
 */
export function getAgentConfig(): AgentConfigMap {
  return {
    'Frontend': {
      webhook: process.env.FRONTEND_AGENT_WEBHOOK || 'http://localhost:3001/execute',
      enabled: true,
      capabilities: ['React', 'Next.js', 'Tailwind', 'TypeScript', 'UI', 'Components'],
    },
    'Backend': {
      webhook: process.env.BACKEND_AGENT_WEBHOOK || 'http://localhost:3002/execute',
      enabled: true,
      capabilities: ['Node.js', 'API', 'Database', 'TypeScript', 'Server', 'Endpoints'],
    },
    'Testing': {
      webhook: process.env.TESTING_AGENT_WEBHOOK || 'http://localhost:3003/execute',
      enabled: true,
      capabilities: ['Jest', 'Cypress', 'Testing', 'QA', 'E2E'],
    },
    'Integration': {
      webhook: process.env.INTEGRATION_AGENT_WEBHOOK || 'http://localhost:3004/execute',
      enabled: true,
      capabilities: ['Docker', 'CI/CD', 'Deployment', 'DevOps'],
    },
    'Supervisor': {
      webhook: process.env.SUPERVISOR_AGENT_WEBHOOK || 'http://localhost:3005/execute',
      enabled: true,
      capabilities: ['Orchestration', 'Monitoring', 'Coordination'],
    },
  };
}

/**
 * Get webhook URL for specific agent type
 */
export function getAgentWebhook(agentType: string): string | null {
  const config = getAgentConfig();
  return config[agentType]?.webhook || null;
}

/**
 * Check if agent type is enabled
 */
export function isAgentEnabled(agentType: string): boolean {
  const config = getAgentConfig();
  return config[agentType]?.enabled ?? false;
}

/**
 * Get all enabled agent types
 */
export function getEnabledAgentTypes(): string[] {
  const config = getAgentConfig();
  return Object.keys(config).filter(type => config[type].enabled);
}

/**
 * Validate agent configuration
 */
export function validateAgentConfig(): {
  valid: boolean;
  errors: string[];
} {
  const config = getAgentConfig();
  const errors: string[] = [];

  for (const [agentType, agentConfig] of Object.entries(config)) {
    if (!agentConfig.webhook) {
      errors.push(`Agent ${agentType} is missing webhook URL`);
    }

    // Validate webhook URL format
    try {
      new URL(agentConfig.webhook);
    } catch {
      errors.push(`Agent ${agentType} has invalid webhook URL: ${agentConfig.webhook}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
