/**
 * Start all assigned 'todo' tasks in a project
 * Triggers webhooks for each task to start agent execution
 *
 * This script needs to run in a browser context
 * To use: Open browser console on Maestro app and paste this script
 */

(async function startAllTasks() {
  console.log('⚡ Starting All Tasks...\n');

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

  // Infer agent type from task content
  function inferAgentType(task) {
    const content = (
      (task.title || '') + ' ' +
      (task.description || '') + ' ' +
      (task.ai_prompt || '')
    ).toLowerCase();

    if (content.includes('ui') || content.includes('frontend') || content.includes('react') || content.includes('component')) {
      return 'Frontend';
    }
    if (content.includes('api') || content.includes('backend') || content.includes('database') || content.includes('server')) {
      return 'Backend';
    }
    if (content.includes('test') || content.includes('testing') || content.includes('spec')) {
      return 'Testing';
    }
    if (content.includes('deploy') || content.includes('docker') || content.includes('ci/cd')) {
      return 'DevOps';
    }
    if (content.includes('doc') || content.includes('readme') || content.includes('guide')) {
      return 'Documentation';
    }
    if (content.includes('data') || content.includes('analytics') || content.includes('ml')) {
      return 'Data';
    }
    if (content.includes('security') || content.includes('auth') || content.includes('secure')) {
      return 'Security';
    }

    return 'Backend'; // default
  }

  // Load current data
  const projects = getStorage('maestro:projects');
  const tasks = getStorage('maestro:tasks');

  // Find Maestro Intelligence Layer project
  const project = projects.find(p =>
    p.name === 'Maestro Intelligence Layer' ||
    p.name.includes('Maestro Intelligence')
  );

  if (!project) {
    console.error('❌ Project "Maestro Intelligence Layer" not found');
    console.log('Available projects:', projects.map(p => p.name));

    // Allow user to specify project ID
    console.log('\n💡 Tip: If you want to start tasks for a different project, modify the script and specify projectId directly');
    return;
  }

  console.log(`✅ Found project: ${project.name} (${project.project_id})\n`);

  // Get tasks for this project that are assigned and in 'todo' status
  const projectTasks = tasks.filter(t =>
    t.project_id === project.project_id &&
    t.status === 'todo' &&
    t.assigned_to_agent &&
    t.assigned_to_agent !== 'Unassigned'
  );

  console.log(`📋 Found ${projectTasks.length} tasks ready to start\n`);

  if (projectTasks.length === 0) {
    console.log('No tasks to start! All tasks are either unassigned or already in progress/completed.');
    return;
  }

  // Trigger each task
  let triggeredCount = 0;
  let failedCount = 0;

  console.log('⚡ Triggering tasks...\n');

  for (const task of projectTasks) {
    console.log(`📝 Task: ${task.title}`);

    try {
      // Get agent type from task or infer it
      const agentType = task.assigned_to_agent_type || inferAgentType(task);
      console.log(`   → Agent Type: ${agentType}`);

      // Trigger webhook
      const response = await fetch(`/api/agents/trigger/${agentType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId: task.task_id })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.log(`   ❌ Failed: ${errorData.error}`);
        failedCount++;
      } else {
        console.log(`   ✅ Triggered successfully\n`);
        triggeredCount++;
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
      failedCount++;
    }
  }

  // Summary
  console.log('='.repeat(60));
  console.log('⚡ START TASKS SUMMARY');
  console.log('='.repeat(60));
  console.log(`Project: ${project.name}`);
  console.log(`Total Tasks Ready: ${projectTasks.length}`);
  console.log(`Successfully Triggered: ${triggeredCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log('\n✅ Task triggering complete!');
  console.log('Agents should now start working on tasks via webhooks.\n');

  if (failedCount > 0) {
    console.log('⚠️  Some tasks failed to trigger. Check if agent webhook servers are running:');
    console.log('   - Frontend Agent: http://localhost:3001');
    console.log('   - Backend Agent: http://localhost:3002');
    console.log('   - Testing Agent: http://localhost:3003');
  }

  // Return summary
  return {
    success: true,
    projectId: project.project_id,
    projectName: project.name,
    totalTasks: projectTasks.length,
    triggered: triggeredCount,
    failed: failedCount
  };
})();
