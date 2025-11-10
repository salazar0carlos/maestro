import { NextRequest, NextResponse } from 'next/server';
import {
  getProjects,
  getTasks,
  getAgents,
  getImprovements,
} from '@/lib/storage-adapter';
import { Project, MaestroTask, Agent } from '@/lib/types';
import { requireAuth } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

interface ProjectHealth {
  project_id: string;
  name: string;
  status: string;
  health_score: number;
  health_status: 'healthy' | 'warning' | 'critical';
  tasks_total: number;
  tasks_completed: number;
  tasks_in_progress: number;
  tasks_blocked: number;
  active_agents: number;
  completion_rate: number;
}

interface RecentActivity {
  id: string;
  type: 'task' | 'agent' | 'project' | 'improvement';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
}

interface DashboardData {
  summary: {
    active_projects: number;
    total_projects: number;
    tasks_in_progress: number;
    total_tasks: number;
    active_agents: number;
    total_agents: number;
    overall_health_score: number;
    completion_rate: number;
  };
  project_health: ProjectHealth[];
  recent_activity: RecentActivity[];
  weekly_tasks: Array<{
    date: string;
    completed: number;
    created: number;
  }>;
  agent_productivity: Array<{
    agent_name: string;
    tasks_completed: number;
    success_rate: number;
  }>;
  top_improvements: Array<{
    title: string;
    estimated_impact: string;
    priority: number;
    status: string;
  }>;
  system_health: {
    status: 'healthy' | 'warning' | 'critical';
    message: string;
    critical_issues: number;
  };
}

function calculateProjectHealth(
  project: Project,
  tasks: MaestroTask[],
  agents: Agent[]
): ProjectHealth {
  const projectTasks = tasks.filter(t => t.project_id === project.project_id);
  const projectAgents = agents.filter(a => a.project_id === project.project_id);

  const tasksCompleted = projectTasks.filter(t => t.status === 'done').length;
  const tasksInProgress = projectTasks.filter(t => t.status === 'in-progress').length;
  const tasksBlocked = projectTasks.filter(t => t.status === 'blocked').length;
  const activeAgents = projectAgents.filter(a => a.status === 'active').length;
  const tasksTotal = projectTasks.length;

  const completionRate = tasksTotal > 0 ? (tasksCompleted / tasksTotal) * 100 : 0;

  // Calculate health score based on multiple factors
  let healthScore = 0;

  // Factor 1: Completion rate (40%)
  healthScore += completionRate * 0.4;

  // Factor 2: Blocked tasks penalty (30%)
  const blockedPenalty = tasksTotal > 0 ? (tasksBlocked / tasksTotal) * 30 : 0;
  healthScore += Math.max(0, 30 - blockedPenalty);

  // Factor 3: Agent activity (30%)
  const agentScore = projectAgents.length > 0
    ? (activeAgents / projectAgents.length) * 30
    : 0;
  healthScore += agentScore;

  // Determine health status
  let healthStatus: 'healthy' | 'warning' | 'critical';
  if (healthScore >= 70) {
    healthStatus = 'healthy';
  } else if (healthScore >= 40) {
    healthStatus = 'warning';
  } else {
    healthStatus = 'critical';
  }

  return {
    project_id: project.project_id,
    name: project.name,
    status: project.status,
    health_score: Math.round(healthScore),
    health_status: healthStatus,
    tasks_total: tasksTotal,
    tasks_completed: tasksCompleted,
    tasks_in_progress: tasksInProgress,
    tasks_blocked: tasksBlocked,
    active_agents: activeAgents,
    completion_rate: Math.round(completionRate),
  };
}

function getRecentActivity(
  projects: Project[],
  tasks: MaestroTask[],
  _agents: Agent[], // Reserved for future use
  improvements: any[]
): RecentActivity[] {
  const activities: RecentActivity[] = [];

  // Recent tasks
  const recentTasks = tasks
    .sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime())
    .slice(0, 5);

  recentTasks.forEach(task => {
    const project = projects.find(p => p.project_id === task.project_id);
    activities.push({
      id: task.task_id,
      type: 'task',
      title: task.title,
      description: `${project?.name || 'Unknown project'} • ${task.status}`,
      timestamp: task.completed_date || task.started_date || task.created_date,
      status: task.status,
    });
  });

  // Recent projects
  const recentProjects = projects
    .sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime())
    .slice(0, 3);

  recentProjects.forEach(project => {
    activities.push({
      id: project.project_id,
      type: 'project',
      title: project.name,
      description: `Project created • ${project.status}`,
      timestamp: project.created_date,
      status: project.status,
    });
  });

  // Recent improvements
  const recentImprovements = improvements
    .sort((a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime())
    .slice(0, 3);

  recentImprovements.forEach(imp => {
    activities.push({
      id: imp.suggestion_id,
      type: 'improvement',
      title: imp.title,
      description: `${imp.category} • ${imp.status}`,
      timestamp: imp.created_date || new Date().toISOString(),
      status: imp.status,
    });
  });

  // Sort all activities by timestamp and take top 10
  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);
}

function getWeeklyTaskStats(tasks: MaestroTask[]) {
  const now = new Date();
  const weeklyStats: Array<{ date: string; completed: number; created: number }> = [];

  // Get last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const completed = tasks.filter(t => {
      if (!t.completed_date) return false;
      return t.completed_date.startsWith(dateStr);
    }).length;

    const created = tasks.filter(t => {
      return t.created_date.startsWith(dateStr);
    }).length;

    weeklyStats.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      completed,
      created,
    });
  }

  return weeklyStats;
}

export async function GET(_request: NextRequest) {
  try {
    await requireAuth();

    // Fetch all data
    const [projects, tasks, agents, improvements] = await Promise.all([
      getProjects(),
      getTasks(),
      getAgents(),
      getImprovements(),
    ]);

    // Calculate summary metrics
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const tasksInProgress = tasks.filter(t => t.status === 'in-progress').length;
    const activeAgents = agents.filter(a => a.status === 'active').length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const overallCompletionRate = tasks.length > 0
      ? (completedTasks / tasks.length) * 100
      : 0;

    // Calculate project health
    const projectHealth = projects
      .map(project => calculateProjectHealth(project, tasks, agents))
      .sort((a, b) => b.health_score - a.health_score);

    // Calculate overall health score (average of all projects)
    const overallHealthScore = projectHealth.length > 0
      ? Math.round(projectHealth.reduce((sum, p) => sum + p.health_score, 0) / projectHealth.length)
      : 0;

    // Get recent activity
    const recentActivity = getRecentActivity(projects, tasks, agents, improvements);

    // Get weekly task statistics
    const weeklyTasks = getWeeklyTaskStats(tasks);

    // Get agent productivity (top 5 agents)
    const agentProductivity = agents
      .map(agent => ({
        agent_name: agent.agent_name,
        tasks_completed: agent.tasks_completed || 0,
        success_rate: agent.success_rate || 0,
      }))
      .sort((a, b) => b.tasks_completed - a.tasks_completed)
      .slice(0, 5);

    // Get top improvements
    const impactScoreMap = { high: 3, medium: 2, low: 1 };
    const topImprovements = improvements
      .filter(imp => imp.status === 'implemented' || imp.status === 'approved')
      .sort((a, b) => {
        const scoreA = impactScoreMap[a.estimated_impact] || 0;
        const scoreB = impactScoreMap[b.estimated_impact] || 0;
        if (scoreB === scoreA) {
          return b.priority - a.priority;
        }
        return scoreB - scoreA;
      })
      .slice(0, 5)
      .map(imp => ({
        title: imp.title,
        estimated_impact: imp.estimated_impact,
        priority: imp.priority,
        status: imp.status,
      }));

    // Calculate system health
    const criticalProjects = projectHealth.filter(p => p.health_status === 'critical').length;
    const blockedTasks = tasks.filter(t => t.status === 'blocked').length;
    const criticalIssues = criticalProjects + (blockedTasks > 5 ? 1 : 0);

    let systemHealth: DashboardData['system_health'];
    if (criticalIssues === 0 && overallHealthScore >= 70) {
      systemHealth = {
        status: 'healthy',
        message: 'All systems operating normally',
        critical_issues: 0,
      };
    } else if (criticalIssues <= 2 && overallHealthScore >= 40) {
      systemHealth = {
        status: 'warning',
        message: 'Some systems need attention',
        critical_issues: criticalIssues,
      };
    } else {
      systemHealth = {
        status: 'critical',
        message: 'Critical issues detected',
        critical_issues: criticalIssues,
      };
    }

    const dashboardData: DashboardData = {
      summary: {
        active_projects: activeProjects,
        total_projects: projects.length,
        tasks_in_progress: tasksInProgress,
        total_tasks: tasks.length,
        active_agents: activeAgents,
        total_agents: agents.length,
        overall_health_score: overallHealthScore,
        completion_rate: Math.round(overallCompletionRate),
      },
      project_health: projectHealth,
      recent_activity: recentActivity,
      weekly_tasks: weeklyTasks,
      agent_productivity: agentProductivity,
      top_improvements: topImprovements,
      system_health: systemHealth,
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
