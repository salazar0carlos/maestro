# Auto Task Assignment System

This system automatically assigns tasks to the most appropriate agents based on task content analysis.

## Features

- 🎯 **Intelligent Agent Matching**: Analyzes task title, description, and AI prompt to determine best agent type
- 🤖 **Auto Agent Creation**: Creates agents on-demand if they don't exist
- 📊 **7 Agent Types**: Frontend, Backend, Testing, DevOps, Documentation, Data, Security
- ⚡ **Batch Processing**: Assigns all unassigned tasks in a project at once

## Agent Types & Capabilities

### Frontend Agent
- **Capabilities**: React, Next.js, TypeScript, Tailwind CSS, UI/UX, Components, Styling
- **Patterns**: UI, frontend, React, component, CSS, style, Tailwind, page, interface, modal, button, form, layout

### Backend Agent
- **Capabilities**: Node.js, API, Database, TypeScript, Express, Routes, Authentication
- **Patterns**: API, backend, database, server, endpoint, route, auth, storage, SQL, query

### Testing Agent
- **Capabilities**: Jest, Cypress, Unit Tests, Integration Tests, E2E Tests
- **Patterns**: Test, testing, spec, Jest, Cypress, E2E, unit test, integration test

### DevOps Agent
- **Capabilities**: Docker, CI/CD, Deployment, Infrastructure, Monitoring
- **Patterns**: Deploy, deployment, Docker, CI/CD, infrastructure, build, pipeline, Kubernetes

### Documentation Agent
- **Capabilities**: Technical Writing, API Docs, User Guides, README
- **Patterns**: Documentation, docs, README, guide, tutorial, document, write, explain

### Data Agent
- **Capabilities**: Data Processing, Analytics, ML/AI, Data Pipeline
- **Patterns**: Data, analytics, ML, AI, machine learning, model, training, dataset, pipeline

### Security Agent
- **Capabilities**: Security Audit, Vulnerability Assessment, Authentication, Authorization
- **Patterns**: Security, auth, permission, vulnerability, encrypt, secure, audit, compliance

## How It Works

### 1. Pattern Matching Algorithm

```typescript
function determineAgentType(task):
  content = task.title + task.description + task.ai_prompt

  for each agentType:
    score = 0
    for each pattern in agentType.patterns:
      if pattern found in content:
        score += 1

    scores[agentType] = score

  return agentType with highest score (default: Backend)
```

### 2. Agent Creation

If no agent of the required type exists for the project:
- Creates new agent with unique ID
- Sets initial metrics (success_rate: 1.0, tasks: 0)
- Assigns appropriate capabilities
- Registers in agent registry

### 3. Task Assignment

For each unassigned task:
- Analyze content to determine agent type
- Get or create agent of that type
- Update task.assigned_to_agent field
- Update task.assigned_to_agent_type field

## Usage

### Method 1: UI Component (Recommended)

Add the `AssignTasksButton` component to your project page:

```tsx
import AssignTasksButton from '@/components/AssignTasksButton';

<AssignTasksButton projectId={project.project_id} />
```

Click the "🎯 Auto-Assign Tasks" button and tasks will be automatically assigned.

### Method 2: Browser Console Script

1. Open your Maestro app in browser
2. Open Developer Console (F12)
3. Paste the contents of `/scripts/assign-project-tasks.js`
4. Press Enter
5. Refresh page to see changes

### Method 3: API Endpoint

```bash
POST /api/projects/:projectId/assign-tasks
```

Returns configuration and instructions (actual assignment happens client-side due to localStorage).

## Examples

### Example 1: Frontend Task

**Task Title:** "Build user profile modal component"
**Analysis:** Contains "modal", "component" → Frontend Agent
**Result:** ✅ Assigned to Frontend Agent

### Example 2: Backend Task

**Task Title:** "Create REST API endpoint for user authentication"
**Analysis:** Contains "API", "endpoint", "authentication" → Backend Agent
**Result:** ✅ Assigned to Backend Agent

### Example 3: Testing Task

**Task Title:** "Write Cypress E2E tests for checkout flow"
**Analysis:** Contains "Cypress", "E2E", "tests" → Testing Agent
**Result:** ✅ Assigned to Testing Agent

### Example 4: Multi-Pattern Task

**Task Title:** "Deploy React app with Docker to production"
**Analysis:**
- "Deploy", "Docker", "production" → DevOps (score: 3)
- "React", "app" → Frontend (score: 2)
**Result:** ✅ Assigned to DevOps Agent (higher score)

## Assignment Output

```
🎯 Starting Task Assignment for Maestro Intelligence Layer...

✅ Found project: Maestro Intelligence Layer (proj-12345)

📋 Found 15 tasks in project

🔄 Processing tasks...

📝 Task: Build dashboard UI
   → Determined type: Frontend
   ✨ Created new Frontend Agent (frontend-agent-1699...)
   ✅ Assigned to: Frontend Agent

📝 Task: Create user authentication API
   → Determined type: Backend
   ✨ Created new Backend Agent (backend-agent-1699...)
   ✅ Assigned to: Backend Agent

... (continued for all tasks)

================================================================================
📊 ASSIGNMENT SUMMARY
================================================================================
Project: Maestro Intelligence Layer
Total Tasks: 15
Assigned: 15
Skipped (already assigned): 0
Agents Created: 5

✅ Task assignment complete!
```

## Integration with Supervisor Agent

The Auto Task Assignment system works seamlessly with the Supervisor Agent:

1. **Task Creation** → Auto-assignment determines agent type
2. **Agent Selection** → Supervisor validates assignment and monitors
3. **Task Execution** → Agent executes, Supervisor tracks progress
4. **Reassignment** → If agent fails, Supervisor can reassign to different agent

## Best Practices

1. **Clear Task Descriptions**: Use specific keywords for accurate agent matching
2. **Review Assignments**: Check assignments after bulk operation
3. **Manual Override**: Update `assigned_to_agent` field manually if needed
4. **Agent Specialization**: Agents work best with focused, clear task descriptions

## Troubleshooting

**Q: Task assigned to wrong agent?**
A: Manually update task.assigned_to_agent or add more specific keywords to task description

**Q: No agents created?**
A: Check browser console for errors, ensure localStorage is accessible

**Q: Tasks already assigned not updating?**
A: Expected behavior - script skips already-assigned tasks to prevent overriding manual assignments

## Technical Details

- **Storage**: localStorage (browser-based)
- **Execution**: Client-side JavaScript
- **State Management**: React hooks for UI component
- **API**: Next.js API routes for configuration
- **Type Safety**: Full TypeScript support

## Future Enhancements

- [ ] Machine learning-based agent selection
- [ ] Historical performance consideration in assignment
- [ ] Task complexity analysis
- [ ] Workload balancing across multiple agents of same type
- [ ] Assignment confidence scores
- [ ] Undo/redo assignment operations
