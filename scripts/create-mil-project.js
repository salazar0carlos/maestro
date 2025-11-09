/**
 * Create Maestro Intelligence Layer project with tasks on localhost
 * Run this in the browser console at http://localhost:3000
 */

// Create the project
const project = {
  project_id: 'maestro-intelligence-layer',
  name: 'Maestro Intelligence Layer',
  description: 'Supervisor Agent Orchestration System',
  status: 'active',
  created_date: new Date().toISOString(),
  agent_count: 0,
  task_count: 0
};

// Get existing projects
const projects = JSON.parse(localStorage.getItem('maestro:projects') || '[]');
projects.push(project);
localStorage.setItem('maestro:projects', JSON.stringify(projects));

console.log('✅ Created project:', project.name);

// Create sample tasks
const tasks = [
  {
    task_id: 'mil-task-001',
    project_id: 'maestro-intelligence-layer',
    title: 'Implement SupervisorAgent health monitoring',
    description: 'Add real-time health monitoring for all agents in the system',
    ai_prompt: 'Create a comprehensive health monitoring system for agents that tracks: active status, task completion rate, error rate, and response time. Use TypeScript and include proper error handling.',
    assigned_to_agent: 'Unassigned',
    priority: 1,
    status: 'todo',
    created_date: new Date().toISOString()
  },
  {
    task_id: 'mil-task-002',
    project_id: 'maestro-intelligence-layer',
    title: 'Build agent performance dashboard',
    description: 'Create React dashboard showing agent metrics and performance',
    ai_prompt: 'Build a React dashboard component with Tailwind CSS that displays: agent status cards, performance graphs, task queue visualization, and real-time updates. Make it modern and responsive.',
    assigned_to_agent: 'Unassigned',
    priority: 2,
    status: 'todo',
    created_date: new Date().toISOString()
  },
  {
    task_id: 'mil-task-003',
    project_id: 'maestro-intelligence-layer',
    title: 'Create task routing algorithm',
    description: 'Implement intelligent task routing based on agent capabilities',
    ai_prompt: 'Design and implement a task routing algorithm that assigns tasks to the most suitable agent based on: agent type, current workload, success rate, and task requirements. Include TypeScript types and tests.',
    assigned_to_agent: 'Unassigned',
    priority: 3,
    status: 'todo',
    created_date: new Date().toISOString()
  }
];

// Get existing tasks and add new ones
const existingTasks = JSON.parse(localStorage.getItem('maestro:tasks') || '[]');
const allTasks = [...existingTasks, ...tasks];
localStorage.setItem('maestro:tasks', JSON.stringify(allTasks));

console.log('✅ Created', tasks.length, 'tasks');
console.log('📋 Refresh the page to see your project!');
