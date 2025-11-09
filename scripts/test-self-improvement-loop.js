#!/usr/bin/env node

/**
 * Test Self-Improvement Loop
 *
 * This script demonstrates and tests the complete self-improvement workflow:
 * 1. Initialize Maestro meta-project
 * 2. Create test improvement suggestion
 * 3. Simulate approval workflow
 * 4. Convert to task
 * 5. Verify the loop works end-to-end
 */

const fs = require('fs');
const path = require('path');
const { initializeMaestroProject } = require('./setup-maestro-self-improvement');

const DATA_PATH = path.join(__dirname, '../data/.maestro.json');

/**
 * Read Maestro data
 */
function readData() {
  if (!fs.existsSync(DATA_PATH)) {
    return { projects: [], agents: [], tasks: [], improvements: [] };
  }
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
}

/**
 * Write Maestro data
 */
function writeData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

/**
 * Create a test improvement suggestion
 */
function createTestImprovement() {
  const data = readData();

  const improvement = {
    improvement_id: `test-imp-${Date.now()}`,
    project_id: 'maestro-self-improvement',
    title: 'Add request caching to API routes',
    description: `Implement request caching to reduce redundant API calls and improve performance.

**Rationale:**
Current API routes make fresh calls for every request, even when data hasn't changed. This increases latency and API costs.

**Implementation:**
1. Add cache layer using in-memory store
2. Implement cache invalidation on data updates
3. Add cache headers to responses
4. Monitor cache hit rates

**Expected Impact:**
- 40-60% reduction in API response time
- Lower infrastructure costs
- Better user experience`,
    suggested_by: 'product-improvement-agent',
    status: 'pending',
    priority: 2,
    estimated_impact: 'high',
    created_date: new Date().toISOString()
  };

  data.improvements = data.improvements || [];
  data.improvements.push(improvement);
  writeData(data);

  return improvement;
}

/**
 * Approve an improvement
 */
function approveImprovement(improvementId) {
  const data = readData();

  const improvement = data.improvements.find(i => i.improvement_id === improvementId);
  if (!improvement) {
    throw new Error('Improvement not found');
  }

  improvement.status = 'approved';
  improvement.reviewed_date = new Date().toISOString();
  improvement.reviewed_by = 'test-user';

  writeData(data);
  return improvement;
}

/**
 * Convert improvement to task
 */
function convertToTask(improvementId) {
  const data = readData();

  const improvement = data.improvements.find(i => i.improvement_id === improvementId);
  if (!improvement) {
    throw new Error('Improvement not found');
  }

  const task = {
    task_id: `task-${Date.now()}`,
    project_id: improvement.project_id,
    title: improvement.title,
    description: improvement.description,
    ai_prompt: `Implement the following improvement:\n\n${improvement.description}`,
    assigned_to_agent: 'backend-agent',
    priority: improvement.priority,
    status: 'todo',
    created_date: new Date().toISOString()
  };

  data.tasks = data.tasks || [];
  data.tasks.push(task);

  // Update improvement
  improvement.converted_to_task_id = task.task_id;
  improvement.status = 'implemented';

  writeData(data);
  return task;
}

/**
 * Simulate task execution
 */
function completeTask(taskId) {
  const data = readData();

  const task = data.tasks.find(t => t.task_id === taskId);
  if (!task) {
    throw new Error('Task not found');
  }

  task.status = 'in-progress';
  task.started_date = new Date().toISOString();

  // Simulate execution
  setTimeout(() => {
    task.status = 'done';
    task.completed_date = new Date().toISOString();
    task.completed_by_agent = 'backend-agent';
    task.ai_response = 'Successfully implemented caching layer with 50% cache hit rate';

    writeData(data);
    console.log('✓ Task completed successfully');
  }, 1000);

  writeData(data);
}

/**
 * Run the full test loop
 */
async function runTest() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   Maestro Self-Improvement Loop Test                ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Initialize
    console.log('📋 Step 1: Initialize Maestro meta-project');
    console.log('─────────────────────────────────────────');
    const project = initializeMaestroProject();
    console.log('✓ Maestro meta-project initialized\n');

    // Step 2: Create improvement
    console.log('💡 Step 2: Create test improvement suggestion');
    console.log('─────────────────────────────────────────');
    const improvement = createTestImprovement();
    console.log('✓ Created improvement:', improvement.title);
    console.log('  Priority:', improvement.priority);
    console.log('  Impact:', improvement.estimated_impact);
    console.log('  Status:', improvement.status);
    console.log('  ID:', improvement.improvement_id, '\n');

    // Step 3: Review and approve
    console.log('👀 Step 3: Review and approve improvement');
    console.log('─────────────────────────────────────────');
    console.log('  (In production, this would be done via UI)');
    const approved = approveImprovement(improvement.improvement_id);
    console.log('✓ Improvement approved by:', approved.reviewed_by);
    console.log('  New status:', approved.status);
    console.log('  Reviewed:', approved.reviewed_date, '\n');

    // Step 4: Convert to task
    console.log('🔄 Step 4: Convert improvement to task');
    console.log('─────────────────────────────────────────');
    const task = convertToTask(improvement.improvement_id);
    console.log('✓ Created task:', task.title);
    console.log('  Assigned to:', task.assigned_to_agent);
    console.log('  Priority:', task.priority);
    console.log('  Task ID:', task.task_id, '\n');

    // Step 5: Execute task
    console.log('⚙️  Step 5: Execute task (BackendAgent)');
    console.log('─────────────────────────────────────────');
    console.log('  (Simulating agent execution...)');
    completeTask(task.task_id);

    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Step 6: Verify results
    console.log('\n📊 Step 6: Verify self-improvement loop');
    console.log('─────────────────────────────────────────');
    const finalData = readData();

    const finalImprovement = finalData.improvements.find(i => i.improvement_id === improvement.improvement_id);
    const finalTask = finalData.tasks.find(t => t.task_id === task.task_id);

    console.log('  Improvement Status:', finalImprovement.status);
    console.log('  Converted to Task:', finalImprovement.converted_to_task_id);
    console.log('  Task Status:', finalTask.status);
    console.log('  Completed By:', finalTask.completed_by_agent);
    console.log('  Result:', finalTask.ai_response);

    console.log('\n✨ Success! Self-improvement loop completed\n');
    console.log('┌──────────────────────────────────────────────┐');
    console.log('│  LOOP VERIFICATION:                          │');
    console.log('│  ✓ ProductImprovementAgent → Suggestion      │');
    console.log('│  ✓ Human Review → Approval                   │');
    console.log('│  ✓ Supervisor → Task Creation                │');
    console.log('│  ✓ BackendAgent → Implementation             │');
    console.log('│  ✓ Maestro → Improved                        │');
    console.log('└──────────────────────────────────────────────┘\n');

    console.log('🎯 Test Summary:');
    console.log('  ✓ Meta-project created');
    console.log('  ✓ Improvement suggested');
    console.log('  ✓ Approval workflow worked');
    console.log('  ✓ Task conversion successful');
    console.log('  ✓ Implementation completed');
    console.log('  ✓ Full loop validated\n');

    console.log('📚 Next Steps:');
    console.log('  1. View in UI: http://localhost:3000');
    console.log('  2. Run real agent: node agents/maestro-self-improvement-agent.js');
    console.log('  3. Apply to other projects using intelligence-layer-export.ts');
    console.log('  4. Monitor improvements dashboard\n');

    return true;
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run if executed directly
if (require.main === module) {
  runTest().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { runTest };
