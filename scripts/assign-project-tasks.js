/**
 * Assign all tasks in "Maestro Intelligence Layer" project to appropriate agents
 * Creates agents if they don't exist
 *
 * This script needs to run in a browser context since it uses localStorage
 * To use: Open browser console on Maestro app and paste this script
 */

(function assignProjectTasks() {
  console.log('🎯 Starting Task Assignment for Maestro Intelligence Layer...\n');

  // Helper to get localStorage safely
  function getStorage(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error(`Error reading ${key}:`, e);
      return [];
    }
  }

  // Helper to set localStorage safely
  function setStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error(`Error writing ${key}:`, e);
      return false;
    }
  }

  // Load current data
  const projects = getStorage('maestro:projects');
  const tasks = getStorage('maestro:tasks');
  const agents = getStorage('maestro:agents');

  // Find Maestro Intelligence Layer project
  const project = projects.find(p =>
    p.name === 'Maestro Intelligence Layer' ||
    p.name.includes('Maestro Intelligence')
  );

  if (!project) {
    console.error('❌ Project "Maestro Intelligence Layer" not found');
    console.log('Available projects:', projects.map(p => p.name));
    return;
  }

  console.log(`✅ Found project: ${project.name} (${project.project_id})\n`);

  // Get tasks for this project
  const projectTasks = tasks.filter(t => t.project_id === project.project_id);
  console.log(`📋 Found ${projectTasks.length} tasks in project\n`);

  if (projectTasks.length === 0) {
    console.log('No tasks to assign!');
    return;
  }

  // Agent type definitions with capabilities
  const agentTypes = {
    'Frontend': {
      capabilities: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'UI/UX', 'Components', 'Styling'],
      patterns: ['ui', 'frontend', 'react', 'component', 'css', 'style', 'tailwind', 'page', 'interface', 'modal', 'button', 'form', 'layout']
    },
    'Backend': {
      capabilities: ['Node.js', 'API', 'Database', 'TypeScript', 'Express', 'Routes', 'Authentication'],
      patterns: ['api', 'backend', 'database', 'server', 'endpoint', 'route', 'auth', 'storage', 'sql', 'query']
    },
    'Testing': {
      capabilities: ['Jest', 'Cypress', 'Unit Tests', 'Integration Tests', 'E2E Tests'],
      patterns: ['test', 'testing', 'spec', 'jest', 'cypress', 'e2e', 'unit test', 'integration test']
    },
    'DevOps': {
      capabilities: ['Docker', 'CI/CD', 'Deployment', 'Infrastructure', 'Monitoring'],
      patterns: ['deploy', 'deployment', 'docker', 'ci/cd', 'infrastructure', 'build', 'pipeline', 'kubernetes']
    },
    'Documentation': {
      capabilities: ['Technical Writing', 'API Docs', 'User Guides', 'README'],
      patterns: ['documentation', 'docs', 'readme', 'guide', 'tutorial', 'document', 'write', 'explain']
    },
    'Data': {
      capabilities: ['Data Processing', 'Analytics', 'ML/AI', 'Data Pipeline'],
      patterns: ['data', 'analytics', 'ml', 'ai', 'machine learning', 'model', 'training', 'dataset', 'pipeline']
    },
    'Security': {
      capabilities: ['Security Audit', 'Vulnerability Assessment', 'Authentication', 'Authorization'],
      patterns: ['security', 'auth', 'permission', 'vulnerability', 'encrypt', 'secure', 'audit', 'compliance']
    }
  };

  // Determine best agent type for a task
  function determineAgentType(task) {
    const content = (
      (task.title || '') + ' ' +
      (task.description || '') + ' ' +
      (task.ai_prompt || '')
    ).toLowerCase();

    const scores = {};

    for (const [agentType, config] of Object.entries(agentTypes)) {
      let score = 0;
      for (const pattern of config.patterns) {
        if (content.includes(pattern)) {
          score += 1;
        }
      }
      scores[agentType] = score;
    }

    // Find agent type with highest score
    let bestType = 'Backend'; // default
    let highestScore = 0;

    for (const [type, score] of Object.entries(scores)) {
      if (score > highestScore) {
        highestScore = score;
        bestType = type;
      }
    }

    return bestType;
  }

  // Get or create agent for project
  function getOrCreateAgent(projectId, agentType) {
    // Look for existing agent
    let agent = agents.find(a =>
      a.project_id === projectId &&
      a.agent_type === agentType
    );

    if (agent) {
      console.log(`   ✓ Using existing ${agentType} Agent (${agent.agent_id})`);
      return agent;
    }

    // Create new agent
    const agentId = `${agentType.toLowerCase()}-agent-${Date.now()}`;
    const now = new Date().toISOString();

    agent = {
      agent_id: agentId,
      project_id: projectId,
      agent_name: `${agentType} Agent`,
      agent_type: agentType,
      status: 'idle',
      tasks_completed: 0,
      tasks_in_progress: 0,
      tasks_failed: 0,
      success_rate: 1.0,
      average_task_time: 0,
      created_date: now,
      capabilities: agentTypes[agentType].capabilities
    };

    agents.push(agent);
    console.log(`   ✨ Created new ${agentType} Agent (${agentId})`);

    return agent;
  }

  // Process each task
  let assignedCount = 0;
  let skippedCount = 0;
  let createdAgents = [];

  console.log('🔄 Processing tasks...\n');

  for (const task of projectTasks) {
    console.log(`📝 Task: ${task.title}`);

    // Skip if already assigned
    if (task.assigned_to_agent && task.assigned_to_agent !== 'Unassigned') {
      console.log(`   ⊙ Already assigned to: ${task.assigned_to_agent}`);
      skippedCount++;
      continue;
    }

    // Determine agent type
    const agentType = determineAgentType(task);
    console.log(`   → Determined type: ${agentType}`);

    // Get or create agent
    const agent = getOrCreateAgent(project.project_id, agentType);

    if (!createdAgents.includes(agent.agent_id)) {
      createdAgents.push(agent.agent_id);
    }

    // Assign task to agent
    const taskIndex = tasks.findIndex(t => t.task_id === task.task_id);
    if (taskIndex !== -1) {
      tasks[taskIndex].assigned_to_agent = agent.agent_id;
      tasks[taskIndex].assigned_to_agent_type = agentType;
      assignedCount++;
      console.log(`   ✅ Assigned to: ${agent.agent_name} (${agent.agent_id})\n`);
    }
  }

  // Save updated data
  console.log('💾 Saving changes...');
  setStorage('maestro:tasks', tasks);
  setStorage('maestro:agents', agents);

  // Update project agent count
  const projectIndex = projects.findIndex(p => p.project_id === project.project_id);
  if (projectIndex !== -1) {
    const projectAgents = agents.filter(a => a.project_id === project.project_id);
    projects[projectIndex].agent_count = projectAgents.length;
    setStorage('maestro:projects', projects);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 ASSIGNMENT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Project: ${project.name}`);
  console.log(`Total Tasks: ${projectTasks.length}`);
  console.log(`Assigned: ${assignedCount}`);
  console.log(`Skipped (already assigned): ${skippedCount}`);
  console.log(`Agents Created: ${createdAgents.length}`);
  console.log('\n✅ Task assignment complete!');
  console.log('Refresh the page to see changes.\n');

  // Return summary
  return {
    success: true,
    projectId: project.project_id,
    projectName: project.name,
    totalTasks: projectTasks.length,
    assigned: assignedCount,
    skipped: skippedCount,
    agentsCreated: createdAgents.length,
    createdAgentIds: createdAgents
  };
})();
