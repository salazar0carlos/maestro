/**
 * Intelligence Layer Export
 *
 * Exports the Maestro intelligence layer patterns and configurations
 * to be applied to other projects. This enables any project in Maestro
 * to benefit from the self-improvement capabilities.
 */

import {
  Project,
  ImprovementSuggestion,
  MaestroTask,
  Agent
} from './types';

/**
 * Intelligence Layer Configuration
 * Defines how the intelligence layer should be applied to a project
 */
export interface IntelligenceLayerConfig {
  project_id: string;
  project_name: string;
  enabled: boolean;
  agents: {
    productImprovement: boolean;
    supervisor: boolean;
    research: boolean;
  };
  analysis: {
    frequency: 'continuous' | 'daily' | 'weekly' | 'on-demand';
    scope: 'full' | 'incremental';
    codebasePaths: string[];
  };
  approval: {
    autoApprove: boolean;
    requiredReviewers: number;
    minimumImpact: 'low' | 'medium' | 'high';
  };
}

/**
 * Intelligence Layer Template
 * Reusable template for applying intelligence layer to any project
 */
export interface IntelligenceLayerTemplate {
  name: string;
  description: string;
  version: string;
  config: Omit<IntelligenceLayerConfig, 'project_id' | 'project_name'>;
  agents: Array<{
    agent_type: string;
    agent_name: string;
    system_prompt: string;
    capabilities: string[];
  }>;
  initialTasks: Array<{
    title: string;
    description: string;
    assigned_to: string;
    priority: number;
  }>;
}

/**
 * Default Maestro Intelligence Layer Template
 * Based on Phase 5 implementation
 */
export const MAESTRO_INTELLIGENCE_TEMPLATE: IntelligenceLayerTemplate = {
  name: 'Maestro Intelligence Layer v1',
  description: 'Self-improvement intelligence layer for autonomous project enhancement',
  version: '1.0.0',
  config: {
    enabled: true,
    agents: {
      productImprovement: true,
      supervisor: true,
      research: true
    },
    analysis: {
      frequency: 'daily',
      scope: 'full',
      codebasePaths: ['app', 'components', 'lib', 'agents']
    },
    approval: {
      autoApprove: false,
      requiredReviewers: 1,
      minimumImpact: 'medium'
    }
  },
  agents: [
    {
      agent_type: 'product-improvement-agent',
      agent_name: 'Product Improvement Agent',
      system_prompt: `You are a Product Improvement Agent specializing in analyzing codebases to identify enhancements.
Your role is to:
- Analyze code quality and architecture
- Identify performance optimizations
- Suggest UX improvements
- Recommend security enhancements
- Propose new features that add value

Focus on actionable, high-impact improvements.`,
      capabilities: [
        'codebase_analysis',
        'improvement_suggestions',
        'impact_assessment',
        'implementation_planning'
      ]
    },
    {
      agent_type: 'supervisor-agent',
      agent_name: 'Supervisor Agent',
      system_prompt: `You are a Supervisor Agent responsible for coordinating improvement workflows.
Your role is to:
- Review improvement suggestions
- Prioritize based on impact and effort
- Coordinate between agents
- Ensure quality standards
- Track implementation progress

Think strategically about project evolution.`,
      capabilities: [
        'workflow_coordination',
        'quality_assurance',
        'prioritization',
        'progress_tracking'
      ]
    },
    {
      agent_type: 'research-agent',
      agent_name: 'Research Agent',
      system_prompt: `You are a Research Agent focused on gathering best practices and technical insights.
Your role is to:
- Research industry best practices
- Analyze similar solutions
- Provide technical recommendations
- Stay current with emerging patterns

Provide well-researched, actionable insights.`,
      capabilities: [
        'research',
        'best_practices',
        'technical_analysis',
        'knowledge_synthesis'
      ]
    }
  ],
  initialTasks: [
    {
      title: 'Analyze codebase for improvement opportunities',
      description: `Perform comprehensive analysis of the project codebase to identify:
- Code quality issues
- Performance optimizations
- User experience improvements
- Architecture enhancements
- Security vulnerabilities
- Missing features

Generate specific, actionable improvement suggestions.`,
      assigned_to: 'product-improvement-agent',
      priority: 1
    }
  ]
};

/**
 * Apply intelligence layer to a project
 */
export function applyIntelligenceLayer(
  project: Project,
  template: IntelligenceLayerTemplate = MAESTRO_INTELLIGENCE_TEMPLATE
): {
  config: IntelligenceLayerConfig;
  agents: Agent[];
  tasks: Omit<MaestroTask, 'task_id' | 'created_date'>[];
} {
  // Build configuration
  const config: IntelligenceLayerConfig = {
    project_id: project.project_id,
    project_name: project.name,
    ...template.config
  };

  // Build agents
  const agents: Agent[] = template.agents.map((agentTemplate, index) => ({
    agent_id: `${project.project_id}-${agentTemplate.agent_type}-${index}`,
    project_id: project.project_id,
    agent_name: agentTemplate.agent_type,
    status: 'idle',
    tasks_completed: 0,
    tasks_in_progress: 0
  }));

  // Build initial tasks
  const tasks: Omit<MaestroTask, 'task_id' | 'created_date'>[] = template.initialTasks.map(taskTemplate => ({
    project_id: project.project_id,
    title: taskTemplate.title,
    description: taskTemplate.description,
    ai_prompt: taskTemplate.description, // Will be enhanced by AI
    assigned_to_agent: taskTemplate.assigned_to,
    priority: taskTemplate.priority as any,
    status: 'todo'
  }));

  return { config, agents, tasks };
}

/**
 * Export intelligence layer from a project
 * Creates a template based on the project's current intelligence setup
 */
export function exportIntelligenceLayer(
  project: Project,
  config: IntelligenceLayerConfig,
  agents: Agent[],
  improvements: ImprovementSuggestion[]
): IntelligenceLayerTemplate {
  // Extract agent templates
  const agentTemplates = agents.map(agent => ({
    agent_type: agent.agent_name,
    agent_name: agent.agent_name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    system_prompt: `Specialized agent for ${agent.agent_name}`,
    capabilities: [] as string[]
  }));

  // Extract successful improvement patterns
  const successfulImprovements = improvements
    .filter(i => i.status === 'implemented')
    .slice(0, 5); // Top 5

  const initialTasks = successfulImprovements.map(improvement => ({
    title: improvement.title,
    description: improvement.description,
    assigned_to: improvement.suggested_by,
    priority: improvement.priority
  }));

  return {
    name: `${project.name} Intelligence Layer`,
    description: `Intelligence layer exported from ${project.name}`,
    version: '1.0.0',
    config: {
      enabled: config.enabled,
      agents: config.agents,
      analysis: config.analysis,
      approval: config.approval
    },
    agents: agentTemplates,
    initialTasks: initialTasks.length > 0 ? initialTasks : MAESTRO_INTELLIGENCE_TEMPLATE.initialTasks
  };
}

/**
 * Generate intelligence layer report
 */
export function generateIntelligenceReport(
  _project: Project,
  improvements: ImprovementSuggestion[],
  _tasks: MaestroTask[]
): {
  summary: {
    totalImprovements: number;
    pending: number;
    approved: number;
    implemented: number;
    rejected: number;
  };
  impact: {
    high: number;
    medium: number;
    low: number;
  };
  performance: {
    improvementRate: number;
    avgTimeToImplement: number;
    successRate: number;
  };
  topImprovements: ImprovementSuggestion[];
} {
  const summary = {
    totalImprovements: improvements.length,
    pending: improvements.filter(i => i.status === 'pending').length,
    approved: improvements.filter(i => i.status === 'approved').length,
    implemented: improvements.filter(i => i.status === 'implemented').length,
    rejected: improvements.filter(i => i.status === 'rejected').length
  };

  const impact = {
    high: improvements.filter(i => i.estimated_impact === 'high').length,
    medium: improvements.filter(i => i.estimated_impact === 'medium').length,
    low: improvements.filter(i => i.estimated_impact === 'low').length
  };

  // Calculate performance metrics
  const implementedImprovements = improvements.filter(i => i.status === 'implemented');
  const avgTimeToImplement = implementedImprovements.length > 0
    ? implementedImprovements.reduce((acc, imp) => {
        if (imp.reviewed_date && imp.created_date) {
          const created = new Date(imp.created_date).getTime();
          const reviewed = new Date(imp.reviewed_date).getTime();
          return acc + (reviewed - created);
        }
        return acc;
      }, 0) / implementedImprovements.length
    : 0;

  const performance = {
    improvementRate: improvements.length > 0 ? (implementedImprovements.length / improvements.length) : 0,
    avgTimeToImplement: avgTimeToImplement / (1000 * 60 * 60 * 24), // Convert to days
    successRate: improvements.length > 0
      ? ((summary.approved + summary.implemented) / improvements.length)
      : 0
  };

  // Get top improvements by impact
  const topImprovements = improvements
    .filter(i => i.status === 'implemented')
    .sort((a, b) => {
      const impactScore = { high: 3, medium: 2, low: 1 };
      return impactScore[b.estimated_impact] - impactScore[a.estimated_impact];
    })
    .slice(0, 10);

  return {
    summary,
    impact,
    performance,
    topImprovements
  };
}
