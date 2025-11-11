import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          error: 'Supabase not configured',
          message: 'Please configure Supabase environment variables. See supabase/README.md for setup instructions.',
          summary: {
            total_tasks: 0,
            completed_tasks: 0,
            in_progress_tasks: 0,
            blocked_tasks: 0,
            todo_tasks: 0,
            total_cost: 0,
            avg_cost_per_task: 0,
            tasks_per_day: 0,
            tasks_per_hour: 0,
            success_rate: 0
          },
          agent_productivity: [],
          agent_utilization: { active: 0, idle: 0, offline: 0 },
          task_trends: [],
          task_status_distribution: { todo: 0, 'in-progress': 0, done: 0, blocked: 0 },
          cost_by_model: [],
          cost_by_agent: [],
          top_failure_reasons: [],
          date_range: { start: new Date().toISOString(), end: new Date().toISOString(), range: 'all' }
        },
        { status: 200 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('range') || 'week';
    const projectId = searchParams.get('project_id');

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (dateRange) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        startDate = new Date('2000-01-01');
        break;
    }

    // Build base query filters
    const taskFilters: any = { completed_date: { gte: startDate.toISOString() } };
    const agentFilters: any = {};
    const costFilters: any = { timestamp: { gte: startDate.toISOString() } };

    if (projectId) {
      taskFilters.project_id = projectId;
      agentFilters.project_id = projectId;
      costFilters.project_id = projectId;
    }

    // Fetch tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .gte('created_date', startDate.toISOString());

    if (tasksError) throw tasksError;

    // Fetch agents
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('*');

    if (agentsError) throw agentsError;

    // Fetch cost records
    const { data: costRecords, error: costError } = await supabase
      .from('cost_records')
      .select('*')
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: false });

    if (costError) throw costError;

    // Calculate metrics
    const completedTasks = tasks?.filter(t => t.status === 'done') || [];
    const inProgressTasks = tasks?.filter(t => t.status === 'in-progress') || [];
    const blockedTasks = tasks?.filter(t => t.status === 'blocked') || [];
    const todoTasks = tasks?.filter(t => t.status === 'todo') || [];

    // Agent productivity metrics
    const agentMetrics = agents?.map(agent => {
      const agentTasks = tasks?.filter(t => t.assigned_to_agent === agent.agent_id) || [];
      const agentCompletedTasks = agentTasks.filter(t => t.status === 'done');
      const agentCosts = costRecords?.filter(c => c.agent_id === agent.agent_id) || [];

      const completionTimes = agentCompletedTasks
        .filter(t => t.started_date && t.completed_date)
        .map(t => {
          const start = new Date(t.started_date!).getTime();
          const end = new Date(t.completed_date!).getTime();
          return (end - start) / (1000 * 60 * 60); // hours
        });

      const avgCompletionTime = completionTimes.length > 0
        ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
        : 0;

      const totalCost = agentCosts.reduce((sum, c) => sum + parseFloat(c.cost_usd.toString()), 0);

      return {
        agent_id: agent.agent_id,
        agent_name: agent.agent_name,
        status: agent.status,
        tasks_completed: agentCompletedTasks.length,
        tasks_in_progress: agentTasks.filter(t => t.status === 'in-progress').length,
        avg_completion_hours: Math.round(avgCompletionTime * 100) / 100,
        total_cost: Math.round(totalCost * 1000) / 1000,
        success_rate: agentTasks.length > 0
          ? Math.round((agentCompletedTasks.length / agentTasks.length) * 100)
          : 0
      };
    }) || [];

    // Task completion trends (daily)
    const tasksByDate: Record<string, { date: string; completed: number; created: number }> = {};

    tasks?.forEach(task => {
      if (task.completed_date) {
        const date = new Date(task.completed_date).toISOString().split('T')[0];
        if (!tasksByDate[date]) {
          tasksByDate[date] = { date, completed: 0, created: 0 };
        }
        tasksByDate[date].completed++;
      }

      const createdDate = new Date(task.created_date).toISOString().split('T')[0];
      if (!tasksByDate[createdDate]) {
        tasksByDate[createdDate] = { date: createdDate, completed: 0, created: 0 };
      }
      tasksByDate[createdDate].created++;
    });

    const taskTrends = Object.values(tasksByDate).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Cost trends
    const costByModel: Record<string, number> = {};
    const costByAgent: Record<string, { agent_id: string; cost: number; calls: number }> = {};

    costRecords?.forEach(record => {
      // By model
      if (!costByModel[record.model]) {
        costByModel[record.model] = 0;
      }
      costByModel[record.model] += parseFloat(record.cost_usd.toString());

      // By agent
      if (record.agent_id) {
        if (!costByAgent[record.agent_id]) {
          costByAgent[record.agent_id] = { agent_id: record.agent_id, cost: 0, calls: 0 };
        }
        costByAgent[record.agent_id].cost += parseFloat(record.cost_usd.toString());
        costByAgent[record.agent_id].calls++;
      }
    });

    // Failure analysis
    const failureReasons: Record<string, number> = {};
    blockedTasks.forEach(task => {
      const reason = task.blocked_reason || 'Unknown';
      failureReasons[reason] = (failureReasons[reason] || 0) + 1;
    });

    const topFailureReasons = Object.entries(failureReasons)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Agent utilization
    const activeAgents = agents?.filter(a => a.status === 'active').length || 0;
    const idleAgents = agents?.filter(a => a.status === 'idle').length || 0;
    const offlineAgents = agents?.filter(a => a.status === 'offline').length || 0;

    // Summary statistics
    const totalTasks = tasks?.length || 0;
    const totalCost = costRecords?.reduce((sum, c) => sum + parseFloat(c.cost_usd.toString()), 0) || 0;
    const avgCostPerTask = completedTasks.length > 0 ? totalCost / completedTasks.length : 0;

    // Tasks per day/hour
    const daysSinceStart = Math.max(1, (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const tasksPerDay = completedTasks.length / daysSinceStart;
    const tasksPerHour = tasksPerDay / 24;

    // Response
    return NextResponse.json({
      summary: {
        total_tasks: totalTasks,
        completed_tasks: completedTasks.length,
        in_progress_tasks: inProgressTasks.length,
        blocked_tasks: blockedTasks.length,
        todo_tasks: todoTasks.length,
        total_cost: Math.round(totalCost * 1000) / 1000,
        avg_cost_per_task: Math.round(avgCostPerTask * 1000) / 1000,
        tasks_per_day: Math.round(tasksPerDay * 100) / 100,
        tasks_per_hour: Math.round(tasksPerHour * 100) / 100,
        success_rate: totalTasks > 0
          ? Math.round((completedTasks.length / totalTasks) * 100)
          : 0
      },
      agent_productivity: agentMetrics.sort((a, b) => b.tasks_completed - a.tasks_completed),
      agent_utilization: {
        active: activeAgents,
        idle: idleAgents,
        offline: offlineAgents
      },
      task_trends: taskTrends,
      task_status_distribution: {
        todo: todoTasks.length,
        'in-progress': inProgressTasks.length,
        done: completedTasks.length,
        blocked: blockedTasks.length
      },
      cost_by_model: Object.entries(costByModel).map(([model, cost]) => ({
        model,
        cost: Math.round(cost * 1000) / 1000
      })),
      cost_by_agent: Object.values(costByAgent)
        .map(a => ({ ...a, cost: Math.round(a.cost * 1000) / 1000 }))
        .sort((a, b) => b.cost - a.cost),
      top_failure_reasons: topFailureReasons,
      date_range: {
        start: startDate.toISOString(),
        end: now.toISOString(),
        range: dateRange
      }
    });

  } catch (error) {
    console.error('Analytics metrics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics metrics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
