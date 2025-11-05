/**
 * Smart Storage Adapter
 *
 * Automatically uses database storage (Supabase) when configured,
 * falls back to localStorage for development/offline use.
 *
 * This provides a unified interface regardless of backend.
 */

import type { Project, MaestroTask, Agent } from './types';

// Check if database is configured
const isDatabaseConfigured = (): boolean => {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

// Lazy load storage backends
let dbStorage: typeof import('./storage-db') | null = null;
let localStorageModule: typeof import('./storage') | null = null;

async function getStorage() {
  if (isDatabaseConfigured()) {
    if (!dbStorage) {
      dbStorage = await import('./storage-db');
    }
    return { type: 'database' as const, storage: dbStorage };
  } else {
    if (!localStorageModule) {
      localStorageModule = await import('./storage');
    }
    return { type: 'localStorage' as const, storage: localStorageModule };
  }
}

// ============ PROJECT STORAGE ============

export async function getProjects(): Promise<Project[]> {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.getProjects();
  } else {
    // Wrap sync call in Promise for consistent interface
    return Promise.resolve(storage.getProjects());
  }
}

export async function getProject(projectId: string): Promise<Project | null> {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.getProject(projectId);
  } else {
    return Promise.resolve(storage.getProject(projectId));
  }
}

export async function createProject(project: Project): Promise<Project> {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.createProject(project);
  } else {
    return Promise.resolve(storage.createProject(project));
  }
}

export async function updateProject(projectId: string, updates: Partial<Project>): Promise<Project | null> {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.updateProject(projectId, updates);
  } else {
    return Promise.resolve(storage.updateProject(projectId, updates));
  }
}

export async function deleteProject(projectId: string): Promise<boolean> {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.deleteProject(projectId);
  } else {
    return Promise.resolve(storage.deleteProject(projectId));
  }
}

// ============ TASK STORAGE ============

export async function getTasks(): Promise<MaestroTask[]> {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.getTasks();
  } else {
    return Promise.resolve(storage.getTasks());
  }
}

export async function getProjectTasks(projectId: string): Promise<MaestroTask[]> {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.getProjectTasks(projectId);
  } else {
    return Promise.resolve(storage.getProjectTasks(projectId));
  }
}

export async function getTask(taskId: string): Promise<MaestroTask | null> {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.getTask(taskId);
  } else {
    return Promise.resolve(storage.getTask(taskId));
  }
}

export async function getTasksByStatus(projectId: string, status: string): Promise<MaestroTask[]> {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.getTasksByStatus(projectId, status);
  } else {
    return Promise.resolve(storage.getTasksByStatus(projectId, status));
  }
}

export async function createTask(task: MaestroTask): Promise<MaestroTask> {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.createTask(task);
  } else {
    return Promise.resolve(storage.createTask(task));
  }
}

export async function updateTask(taskId: string, updates: Partial<MaestroTask>): Promise<MaestroTask | null> {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.updateTask(taskId, updates);
  } else {
    return Promise.resolve(storage.updateTask(taskId, updates));
  }
}

export async function deleteTask(taskId: string): Promise<boolean> {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.deleteTask(taskId);
  } else {
    return Promise.resolve(storage.deleteTask(taskId));
  }
}

// ============ AGENT STORAGE ============

export async function getAgents(): Promise<Agent[]> {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.getAgents();
  } else {
    return Promise.resolve(storage.getAgents());
  }
}

export async function getAgent(agentId: string): Promise<Agent | null> {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.getAgent(agentId);
  } else {
    return Promise.resolve(storage.getAgent(agentId));
  }
}

export async function getProjectAgents(projectId: string): Promise<Agent[]> {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.getProjectAgents(projectId);
  } else {
    return Promise.resolve(storage.getProjectAgents(projectId));
  }
}

export async function createAgent(agent: Agent): Promise<Agent> {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.createAgent(agent);
  } else {
    return Promise.resolve(storage.createAgent(agent));
  }
}

export async function updateAgent(agentId: string, updates: Partial<Agent>): Promise<Agent | null> {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.updateAgent(agentId, updates);
  } else {
    return Promise.resolve(storage.updateAgent(agentId, updates));
  }
}

export async function deleteAgent(agentId: string): Promise<boolean> {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.deleteAgent(agentId);
  } else {
    return Promise.resolve(storage.deleteAgent(agentId));
  }
}

export async function getAgentStats(agentId: string) {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.getAgentStats(agentId);
  } else {
    return Promise.resolve(storage.getAgentStats(agentId));
  }
}

// ============ UTILITY FUNCTIONS ============

export async function seedData(): Promise<void> {
  const { storage, type } = await getStorage();
  if (type === 'localStorage') {
    return Promise.resolve(storage.seedData());
  } else {
    // Database seeding not implemented
    console.warn('[storage-adapter] Database seeding not supported');
    return Promise.resolve();
  }
}

export async function clearAllData(): Promise<void> {
  const { storage, type } = await getStorage();
  if (type === 'localStorage') {
    return Promise.resolve(storage.clearAllData());
  } else {
    console.warn('[storage-adapter] Database clearing not supported via adapter');
    return Promise.resolve();
  }
}

// Export storage type for debugging
export function getStorageType(): 'database' | 'localStorage' {
  return isDatabaseConfigured() ? 'database' : 'localStorage';
}
