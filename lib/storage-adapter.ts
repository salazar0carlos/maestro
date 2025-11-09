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

export async function getAgentTasks(projectId: string, agentId: string): Promise<MaestroTask[]> {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.getAgentTasks(projectId, agentId);
  } else {
    return Promise.resolve(storage.getAgentTasks(projectId, agentId));
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

// ============ IMPROVEMENT SUGGESTIONS STORAGE ============

export async function getImprovements(): Promise<any[]> {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.getImprovements();
  } else {
    return Promise.resolve(storage.getImprovements());
  }
}

export async function getImprovement(improvementId: string): Promise<any | null> {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.getImprovement(improvementId);
  } else {
    return Promise.resolve(storage.getImprovement(improvementId));
  }
}

export async function getProjectImprovements(projectId: string): Promise<any[]> {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.getProjectImprovements(projectId);
  } else {
    return Promise.resolve(storage.getProjectImprovements(projectId));
  }
}

export async function getImprovementsByStatus(projectId: string, status: string): Promise<any[]> {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.getImprovementsByStatus(projectId, status);
  } else {
    return Promise.resolve(storage.getImprovementsByStatus(projectId, status));
  }
}

export async function createImprovement(improvement: any): Promise<any> {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.createImprovement(improvement);
  } else {
    return Promise.resolve(storage.createImprovement(improvement));
  }
}

export async function updateImprovement(improvementId: string, updates: any): Promise<any | null> {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.updateImprovement(improvementId, updates);
  } else {
    return Promise.resolve(storage.updateImprovement(improvementId, updates));
  }
}

export async function deleteImprovement(improvementId: string): Promise<boolean> {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.deleteImprovement(improvementId);
  } else {
    return Promise.resolve(storage.deleteImprovement(improvementId));
  }
}

// ============ ALERTS STORAGE ============

export async function getAlerts(): Promise<any[]> {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.getAlerts();
  } else {
    // For localStorage, need to implement a simple getter
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem('maestro:alerts');
      return Promise.resolve(data ? JSON.parse(data) : []);
    }
    return Promise.resolve([]);
  }
}

export async function saveAlert(alert: any): Promise<any> {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.saveAlert(alert);
  } else {
    // For localStorage, implement simple save
    if (typeof window !== 'undefined') {
      const alerts = await getAlerts();
      alerts.unshift(alert);
      // Keep only last 100 alerts
      const limited = alerts.slice(0, 100);
      localStorage.setItem('maestro:alerts', JSON.stringify(limited));
      return Promise.resolve(alert);
    }
    return Promise.resolve(alert);
  }
}

export async function clearAlerts(): Promise<boolean> {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.clearAlerts();
  } else {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('maestro:alerts');
    }
    return Promise.resolve(true);
  }
}

// ============ SETTINGS STORAGE ============

export async function getSettings(userId: string = 'default'): Promise<any | null> {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.getSettings(userId);
  } else {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem('maestro:settings');
      return Promise.resolve(data ? JSON.parse(data) : null);
    }
    return Promise.resolve(null);
  }
}

export async function saveSettings(settings: any, userId: string = 'default'): Promise<boolean> {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.saveSettings(settings, userId);
  } else {
    if (typeof window !== 'undefined') {
      localStorage.setItem('maestro:settings', JSON.stringify(settings));
    }
    return Promise.resolve(true);
  }
}

export async function getProjectSettings(projectId: string): Promise<any | null> {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.getProjectSettings(projectId);
  } else {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem(`project_settings_${projectId}`);
      return Promise.resolve(data ? JSON.parse(data) : null);
    }
    return Promise.resolve(null);
  }
}

export async function saveProjectSettings(projectId: string, settings: any): Promise<boolean> {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.saveProjectSettings(projectId, settings);
  } else {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`project_settings_${projectId}`, JSON.stringify(settings));
    }
    return Promise.resolve(true);
  }
}

// ============ AGENT REGISTRY STORAGE ============

export async function getAgentRegistry(): Promise<any> {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.getAgentRegistry();
  } else {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem('maestro:agent_registry');
      return Promise.resolve(data ? JSON.parse(data) : {});
    }
    return Promise.resolve({});
  }
}

export async function saveAgentRegistry(registry: any): Promise<boolean> {
  const { storage, type } = await getStorage();
  if (type === 'database') {
    return storage.saveAgentRegistry(registry);
  } else {
    if (typeof window !== 'undefined') {
      localStorage.setItem('maestro:agent_registry', JSON.stringify(registry));
    }
    return Promise.resolve(true);
  }
}
