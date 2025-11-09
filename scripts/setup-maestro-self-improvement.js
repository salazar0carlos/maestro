#!/usr/bin/env node

/**
 * Maestro Phase 5: Self-Improvement Application Setup
 *
 * This script initializes Maestro as a meta-project within itself,
 * enabling continuous self-improvement through the intelligence layer.
 *
 * Features:
 * - Creates "Maestro" as a project in Maestro
 * - Configures ProductImprovementAgent to analyze Maestro's codebase
 * - Sets up Supervisor to manage improvement workflow
 * - Enables the self-improvement loop
 */

const fs = require('fs');
const path = require('path');

// Configuration
const MAESTRO_PROJECT_CONFIG = {
  project_id: 'maestro-self-improvement',
  name: 'Maestro',
  description: 'Maestro platform self-improvement - autonomous analysis and enhancement of the Maestro system itself',
  github_repo: process.env.GITHUB_REPO || '',
  local_path: process.cwd(),
  status: 'active',
  created_date: new Date().toISOString(),
  agent_count: 3, // ProductImprovement, Supervisor, Backend
  task_count: 0
};

const MAESTRO_AGENTS = [
  {
    agent_id: 'maestro-product-improvement-agent',
    project_id: 'maestro-self-improvement',
    agent_name: 'product-improvement-agent',
    status: 'active',
    tasks_completed: 0,
    tasks_in_progress: 0,
    last_poll_date: new Date().toISOString()
  },
  {
    agent_id: 'maestro-supervisor-agent',
    project_id: 'maestro-self-improvement',
    agent_name: 'supervisor-agent',
    status: 'active',
    tasks_completed: 0,
    tasks_in_progress: 0,
    last_poll_date: new Date().toISOString()
  },
  {
    agent_id: 'maestro-backend-agent',
    project_id: 'maestro-self-improvement',
    agent_name: 'backend-agent',
    status: 'idle',
    tasks_completed: 0,
    tasks_in_progress: 0
  }
];

const INITIAL_IMPROVEMENT_TASK = {
  task_id: `task-${Date.now()}-init`,
  project_id: 'maestro-self-improvement',
  title: 'Analyze Maestro codebase for improvement opportunities',
  description: `Perform comprehensive analysis of the Maestro platform codebase to identify:
- Code quality issues (patterns, anti-patterns, technical debt)
- Performance optimization opportunities
- User experience improvements
- Architecture enhancements
- Security vulnerabilities
- Missing features that would improve the platform

Focus on actionable improvements that make Maestro better at managing AI agents and orchestrating autonomous development.`,
  ai_prompt: '', // Will be generated
  assigned_to_agent: 'product-improvement-agent',
  priority: 1,
  status: 'todo',
  created_date: new Date().toISOString()
};

/**
 * Initialize Maestro as a meta-project in localStorage
 */
function initializeMaestroProject() {
  console.log('🚀 Initializing Maestro Self-Improvement Project...\n');

  // Read current data
  const dataPath = path.join(__dirname, '../data/.maestro.json');
  let data = { projects: [], agents: [], tasks: [], improvements: [] };

  if (fs.existsSync(dataPath)) {
    try {
      data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
      console.log('✓ Loaded existing Maestro data');
    } catch (error) {
      console.error('⚠ Could not parse existing data, starting fresh');
    }
  }

  // Check if Maestro project already exists
  const existingProject = data.projects?.find(p => p.project_id === 'maestro-self-improvement');
  if (existingProject) {
    console.log('⚠ Maestro self-improvement project already exists');
    console.log('  Project ID:', existingProject.project_id);
    console.log('  Status:', existingProject.status);
    console.log('\nUse --reset flag to recreate the project\n');
    return existingProject;
  }

  // Add Maestro project
  data.projects = data.projects || [];
  data.projects.push(MAESTRO_PROJECT_CONFIG);
  console.log('✓ Created Maestro meta-project');

  // Add agents
  data.agents = data.agents || [];
  MAESTRO_AGENTS.forEach(agent => {
    data.agents.push(agent);
  });
  console.log(`✓ Created ${MAESTRO_AGENTS.length} agents for Maestro project`);

  // Add initial task
  data.tasks = data.tasks || [];
  data.tasks.push(INITIAL_IMPROVEMENT_TASK);
  console.log('✓ Created initial analysis task');

  // Ensure improvements array exists
  data.improvements = data.improvements || [];

  // Write back to file
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  console.log('✓ Saved configuration to', dataPath);

  console.log('\n📊 Maestro Self-Improvement Project Summary:');
  console.log('  Project:', MAESTRO_PROJECT_CONFIG.name);
  console.log('  Project ID:', MAESTRO_PROJECT_CONFIG.project_id);
  console.log('  Agents:', MAESTRO_AGENTS.length);
  console.log('  Initial Tasks:', 1);
  console.log('  Local Path:', MAESTRO_PROJECT_CONFIG.local_path);

  return MAESTRO_PROJECT_CONFIG;
}

/**
 * Reset Maestro self-improvement project
 */
function resetMaestroProject() {
  console.log('🔄 Resetting Maestro Self-Improvement Project...\n');

  const dataPath = path.join(__dirname, '../data/.maestro.json');
  if (!fs.existsSync(dataPath)) {
    console.log('⚠ No data file found, nothing to reset');
    return;
  }

  let data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  // Remove existing Maestro project and related data
  data.projects = (data.projects || []).filter(p => p.project_id !== 'maestro-self-improvement');
  data.agents = (data.agents || []).filter(a => a.project_id !== 'maestro-self-improvement');
  data.tasks = (data.tasks || []).filter(t => t.project_id !== 'maestro-self-improvement');
  data.improvements = (data.improvements || []).filter(i => i.project_id !== 'maestro-self-improvement');

  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  console.log('✓ Removed existing Maestro self-improvement project\n');

  // Now create fresh
  initializeMaestroProject();
}

/**
 * Display status of Maestro self-improvement project
 */
function displayStatus() {
  const dataPath = path.join(__dirname, '../data/.maestro.json');
  if (!fs.existsSync(dataPath)) {
    console.log('⚠ No Maestro data found. Run this script to initialize.\n');
    return;
  }

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const project = data.projects?.find(p => p.project_id === 'maestro-self-improvement');

  if (!project) {
    console.log('⚠ Maestro self-improvement project not found. Run this script to initialize.\n');
    return;
  }

  const agents = (data.agents || []).filter(a => a.project_id === 'maestro-self-improvement');
  const tasks = (data.tasks || []).filter(t => t.project_id === 'maestro-self-improvement');
  const improvements = (data.improvements || []).filter(i => i.project_id === 'maestro-self-improvement');

  console.log('📊 Maestro Self-Improvement Status:\n');
  console.log('Project:', project.name);
  console.log('Status:', project.status);
  console.log('Created:', project.created_date);
  console.log('\nAgents:', agents.length);
  agents.forEach(a => {
    console.log(`  - ${a.agent_name} (${a.status})`);
  });

  console.log('\nTasks:', tasks.length);
  const tasksByStatus = {
    todo: tasks.filter(t => t.status === 'todo').length,
    'in-progress': tasks.filter(t => t.status === 'in-progress').length,
    done: tasks.filter(t => t.status === 'done').length,
    blocked: tasks.filter(t => t.status === 'blocked').length
  };
  console.log(`  To Do: ${tasksByStatus.todo}`);
  console.log(`  In Progress: ${tasksByStatus['in-progress']}`);
  console.log(`  Done: ${tasksByStatus.done}`);
  console.log(`  Blocked: ${tasksByStatus.blocked}`);

  console.log('\nImprovements:', improvements.length);
  const improvementsByStatus = {
    pending: improvements.filter(i => i.status === 'pending').length,
    approved: improvements.filter(i => i.status === 'approved').length,
    rejected: improvements.filter(i => i.status === 'rejected').length,
    implemented: improvements.filter(i => i.status === 'implemented').length
  };
  console.log(`  Pending: ${improvementsByStatus.pending}`);
  console.log(`  Approved: ${improvementsByStatus.approved}`);
  console.log(`  Rejected: ${improvementsByStatus.rejected}`);
  console.log(`  Implemented: ${improvementsByStatus.implemented}`);
  console.log('');
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   Maestro Phase 5: Self-Improvement Application      ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  if (command === '--reset') {
    resetMaestroProject();
  } else if (command === '--status') {
    displayStatus();
  } else if (command === '--help') {
    console.log('Usage: node setup-maestro-self-improvement.js [command]');
    console.log('\nCommands:');
    console.log('  (none)      Initialize Maestro self-improvement project');
    console.log('  --reset     Remove and recreate the project');
    console.log('  --status    Display current status');
    console.log('  --help      Show this help message');
    console.log('');
  } else {
    initializeMaestroProject();
  }

  console.log('✨ Next Steps:');
  console.log('  1. Start the Maestro development server: npm run dev');
  console.log('  2. Run the ProductImprovementAgent: node agents/maestro-self-improvement-agent.js');
  console.log('  3. View improvements in the Maestro UI at http://localhost:3000');
  console.log('  4. Review and approve suggestions');
  console.log('  5. Watch Maestro improve itself! 🚀\n');
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  initializeMaestroProject,
  resetMaestroProject,
  displayStatus,
  MAESTRO_PROJECT_CONFIG,
  MAESTRO_AGENTS
};
