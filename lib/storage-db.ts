/**
 * Database Storage Layer (Supabase)
 *
 * Drop-in replacement for localStorage-based storage
 * Uses PostgreSQL for shared state across Vercel and agents
 */

import { supabase } from './supabase';
import type { Project, MaestroTask, Agent, ImprovementSuggestion } from './types';

// ============ PROJECT STORAGE ============

export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_date', { ascending: false });

  if (error) {
    console.error('[storage-db] Error fetching projects:', error);
    return [];
  }

  return data || [];
}

export async function getProject(projectId: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('project_id', projectId)
    .single();

  if (error) {
    console.error('[storage-db] Error fetching project:', error);
    return null;
  }

  return data;
}

export async function createProject(project: Project): Promise<Project> {
  const { data, error} = await supabase
    .from('projects')
    .insert([project])
    .select()
    .single();

  if (error) {
    console.error('[storage-db] Error creating project:', error);
    throw error;
  }

  return data;
}

export async function updateProject(projectId: string, updates: Partial<Project>): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('project_id', projectId)
    .select()
    .single();

  if (error) {
    console.error('[storage-db] Error updating project:', error);
    return null;
  }

  return data;
}

export async function deleteProject(projectId: string): Promise<boolean> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('project_id', projectId);

  if (error) {
    console.error('[storage-db] Error deleting project:', error);
    return false;
  }

  return true;
}

// ============ TASK STORAGE ============

export async function getTasks(): Promise<MaestroTask[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_date', { ascending: false });

  if (error) {
    console.error('[storage-db] Error fetching tasks:', error);
    return [];
  }

  return data || [];
}

export async function getProjectTasks(projectId: string): Promise<MaestroTask[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('priority', { ascending: true });

  if (error) {
    console.error('[storage-db] Error fetching project tasks:', error);
    return [];
  }

  return data || [];
}

export async function getTask(taskId: string): Promise<MaestroTask | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('task_id', taskId)
    .single();

  if (error) {
    console.error('[storage-db] Error fetching task:', error);
    return null;
  }

  return data;
}

export async function getAgentTasks(projectId: string, agentId: string): Promise<MaestroTask[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .eq('assigned_to_agent', agentId);

  if (error) {
    console.error('[storage-db] Error fetching agent tasks:', error);
    return [];
  }

  return data || [];
}

export async function getTasksByStatus(projectId: string, status: string): Promise<MaestroTask[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', status);

  if (error) {
    console.error('[storage-db] Error fetching tasks by status:', error);
    return [];
  }

  return data || [];
}

export async function createTask(task: MaestroTask): Promise<MaestroTask> {
  const { data, error } = await supabase
    .from('tasks')
    .insert([task])
    .select()
    .single();

  if (error) {
    console.error('[storage-db] Error creating task:', error);
    throw error;
  }

  // Update project task count
  const project = await getProject(task.project_id);
  if (project) {
    await updateProject(task.project_id, {
      task_count: (project.task_count || 0) + 1,
    });
  }

  // Enqueue task for agent execution (server-side only)
  if (typeof window === 'undefined' && task.assigned_to_agent && task.status === 'todo') {
    // Import dynamically to avoid circular dependency and client-side bundling
    import('./queue').then(({ enqueueTask }) => {
      enqueueTask(data).catch(error => {
        console.error('[storage-db] Failed to enqueue task:', error);
      });
    }).catch(error => {
      console.error('[storage-db] Failed to load queue module:', error);
    });
  }

  return data;
}

export async function updateTask(taskId: string, updates: Partial<MaestroTask>): Promise<MaestroTask | null> {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('task_id', taskId)
    .select()
    .single();

  if (error) {
    console.error('[storage-db] Error updating task:', error);
    return null;
  }

  return data;
}

export async function deleteTask(taskId: string): Promise<boolean> {
  const task = await getTask(taskId);
  if (!task) return false;

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('task_id', taskId);

  if (error) {
    console.error('[storage-db] Error deleting task:', error);
    return false;
  }

  // Update project task count
  const project = await getProject(task.project_id);
  if (project && project.task_count) {
    await updateProject(task.project_id, {
      task_count: Math.max(0, project.task_count - 1),
    });
  }

  return true;
}

// ============ AGENT STORAGE ============

export async function getAgents(): Promise<Agent[]> {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .order('created_date', { ascending: false });

  if (error) {
    console.error('[storage-db] Error fetching agents:', error);
    return [];
  }

  return data || [];
}

export async function getAgent(agentId: string): Promise<Agent | null> {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('agent_id', agentId)
    .single();

  if (error) {
    console.error('[storage-db] Error fetching agent:', error);
    return null;
  }

  return data;
}

export async function getProjectAgents(projectId: string): Promise<Agent[]> {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('project_id', projectId);

  if (error) {
    console.error('[storage-db] Error fetching project agents:', error);
    return [];
  }

  return data || [];
}

export async function createAgent(agent: Agent): Promise<Agent> {
  const { data, error } = await supabase
    .from('agents')
    .insert([agent])
    .select()
    .single();

  if (error) {
    console.error('[storage-db] Error creating agent:', error);
    throw error;
  }

  return data;
}

export async function updateAgent(agentId: string, updates: Partial<Agent>): Promise<Agent | null> {
  const { data, error } = await supabase
    .from('agents')
    .update(updates)
    .eq('agent_id', agentId)
    .select()
    .single();

  if (error) {
    console.error('[storage-db] Error updating agent:', error);
    return null;
  }

  return data;
}

export async function deleteAgent(agentId: string): Promise<boolean> {
  const { error } = await supabase
    .from('agents')
    .delete()
    .eq('agent_id', agentId);

  if (error) {
    console.error('[storage-db] Error deleting agent:', error);
    return false;
  }

  return true;
}

export async function getAgentStats(agentId: string) {
  const agent = await getAgent(agentId);
  if (!agent) return null;

  const tasks = await getTasks();
  const agentTasks = tasks.filter(t => t.assigned_to_agent === agentId);

  const completed = agentTasks.filter(t => t.status === 'done').length;
  const inProgress = agentTasks.filter(t => t.status === 'in-progress').length;
  const todo = agentTasks.filter(t => t.status === 'todo').length;
  const blocked = agentTasks.filter(t => t.status === 'blocked').length;

  return {
    ...agent,
    total_tasks: agentTasks.length,
    completed,
    in_progress: inProgress,
    todo,
    blocked,
  };
}

// ============ IMPROVEMENT STORAGE ============

export async function getImprovements(): Promise<ImprovementSuggestion[]> {
  const { data, error } = await supabase
    .from('improvements')
    .select('*')
    .order('created_date', { ascending: false });

  if (error) {
    console.error('[storage-db] Error fetching improvements:', error);
    return [];
  }

  return data || [];
}

export async function getImprovement(improvementId: string): Promise<ImprovementSuggestion | null> {
  const { data, error } = await supabase
    .from('improvements')
    .select('*')
    .eq('improvement_id', improvementId)
    .single();

  if (error) {
    console.error('[storage-db] Error fetching improvement:', error);
    return null;
  }

  return data;
}

export async function getProjectImprovements(projectId: string): Promise<ImprovementSuggestion[]> {
  const { data, error } = await supabase
    .from('improvements')
    .select('*')
    .eq('project_id', projectId)
    .order('created_date', { ascending: false });

  if (error) {
    console.error('[storage-db] Error fetching project improvements:', error);
    return [];
  }

  return data || [];
}

export async function getImprovementsByStatus(projectId: string, status: string): Promise<ImprovementSuggestion[]> {
  const { data, error } = await supabase
    .from('improvements')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', status);

  if (error) {
    console.error('[storage-db] Error fetching improvements by status:', error);
    return [];
  }

  return data || [];
}

export async function createImprovement(improvement: ImprovementSuggestion): Promise<ImprovementSuggestion> {
  const { data, error } = await supabase
    .from('improvements')
    .insert([improvement])
    .select()
    .single();

  if (error) {
    console.error('[storage-db] Error creating improvement:', error);
    throw error;
  }

  return data;
}

export async function updateImprovement(improvementId: string, updates: Partial<ImprovementSuggestion>): Promise<ImprovementSuggestion | null> {
  const { data, error } = await supabase
    .from('improvements')
    .update(updates)
    .eq('improvement_id', improvementId)
    .select()
    .single();

  if (error) {
    console.error('[storage-db] Error updating improvement:', error);
    return null;
  }

  return data;
}

export async function deleteImprovement(improvementId: string): Promise<boolean> {
  const { error } = await supabase
    .from('improvements')
    .delete()
    .eq('improvement_id', improvementId);

  if (error) {
    console.error('[storage-db] Error deleting improvement:', error);
    return false;
  }

  return true;
}
