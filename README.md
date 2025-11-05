# Maestro - AI Agent Orchestration Platform

**Command center for autonomous AI agents building applications 24/7**

Maestro is a mission control system where you create projects, assign tasks to AI agents, and orchestrate autonomous development across multiple projects simultaneously.

---

## 🎯 Vision

Maestro transforms how AI agents build software. Instead of humans managing development, humans orchestrate AI agents:

- **Create Projects** (HomesteadIQ, FlwBx, Navillus)
- **Define Tasks** with simple titles
- **AI Auto-Generates** detailed, executable prompts
- **Assign** tasks to specific agents
- **Agents Poll** the API, execute tasks, report completion
- **Monitor Everything** from ONE interface

This is the **builder's operating system** - a single dashboard to manage unlimited agents across unlimited projects.

---

## 🏗 Architecture

### Tech Stack
- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS v3
- **Storage:** localStorage (future: PostgreSQL migration)
- **AI:** Anthropic Claude API for prompt generation
- **Deployment:** Ready for Vercel

### Core Data Model

```typescript
// Project - What agents are building
Project {
  project_id: string
  name: string
  description: string
  status: 'active' | 'paused' | 'complete'
  created_date: string
  agent_count: number
  task_count: number
}

// Task - Work assigned to agents
MaestroTask {
  task_id: string
  project_id: string
  title: string                    // Simple: "Add dark mode toggle"
  description: string              // User's context
  ai_prompt: string               // AUTO-GENERATED detailed prompt
  assigned_to_agent: string       // "agent-1", "agent-2", etc.
  priority: 1-5
  status: 'todo' | 'in-progress' | 'done' | 'blocked'
  created_date: string
  started_date?: string
  completed_date?: string
}

// Agent - Worker processes
Agent {
  agent_id: string
  project_id: string
  agent_name: string
  status: 'active' | 'idle' | 'offline'
  last_poll_date?: string
  tasks_completed: number
  tasks_in_progress: number
}
```

---

## 🚀 Features (Phase 1)

### Dashboard (`/`)
- View all projects as cards
- Quick stats: task count, agent count
- Create new projects
- Click to enter project

### Project Detail (`/projects/[id]`)
- **Kanban Board:** To Do | In Progress | Done
- **Task Cards:** Show title, agent, priority
- **Filter & Search:** By agent name or task text
- **Quick Actions:** Start, Mark Done buttons on cards
- **Create Task:** Modal to add new tasks

### Task Creation
1. Enter simple title ("Add dark mode toggle")
2. Add optional description for context
3. Select agent (agent-1 through agent-7)
4. Set priority (1-5)
5. **System generates detailed AI prompt automatically**
6. Review/edit prompt before saving
7. Task appears on kanban board

### Task Detail
- View complete task information
- Read AI-generated prompt
- Copy prompt to clipboard (for external agents)
- Change status (To Do → In Progress → Done → Blocked)
- Delete task
- View creation/start/completion timestamps

### Agent Monitor (`/agents`)
- Table of all agents across all projects
- Status indicators: Active (green), Idle (yellow), Offline (gray)
- Task counts: Total, In Progress, Done, Blocked
- Last poll timestamp
- Summary statistics

### Settings (`/settings`)
- **Anthropic API Key Setup:** Required for AI prompt generation
- Validate key before saving
- Stored securely in localStorage
- Get key from [console.anthropic.com](https://console.anthropic.com/account/keys)

---

## 📡 API Routes for Agent Integration

### Get Tasks for Agent
```bash
GET /api/projects/[projectId]/tasks?agent=agent-1&status=todo
```

Returns tasks sorted by priority. Used by agents to poll for work.

**Query Parameters:**
- `agent` (optional): Filter by agent_id (e.g., "agent-1")
- `status` (optional): Filter by status (e.g., "todo", "in-progress")

**Response:**
```json
{
  "project_id": "project-1",
  "agent": "agent-1",
  "status": "todo",
  "total": 5,
  "tasks": [
    {
      "task_id": "task-123",
      "project_id": "project-1",
      "title": "Add dark mode toggle",
      "description": "Users should be able to switch themes",
      "ai_prompt": "## GOAL\nAdd theme toggle...",
      "assigned_to_agent": "agent-1",
      "priority": 2,
      "status": "todo",
      "created_date": "2025-11-04T12:00:00Z"
    }
  ]
}
```

### Update Task Status
```bash
PUT /api/tasks/[taskId]/status
```

Called by agents when they update task progress.

**Request Body:**
```json
{
  "status": "in-progress",
  "blocked_reason": null
}
```

**Response:**
```json
{
  "success": true,
  "task": {
    "task_id": "task-123",
    "status": "in-progress",
    "started_date": "2025-11-04T12:05:00Z"
  }
}
```

### Get Agent Info
```bash
GET /api/agents/[agentId]
```

Returns agent statistics and assigned tasks.

**Response:**
```json
{
  "agent_id": "agent-1",
  "project_id": "project-1",
  "agent_name": "agent-1",
  "status": "active",
  "last_poll_date": "2025-11-04T12:10:00Z",
  "tasks_completed": 5,
  "tasks_in_progress": 1,
  "total_tasks": 10,
  "todo_count": 4,
  "in_progress_count": 1,
  "done_count": 5,
  "blocked_count": 0,
  "tasks": [...]
}
```

---

## 🤖 AI Prompt Generation System

When you create a task with a simple title, Maestro uses Claude to generate a detailed, executable prompt:

### Example Flow

**Input:**
```
Title: "Add dark mode toggle"
Description: "Users should be able to switch between light and dark themes"
```

**Generated Prompt (excerpt):**
```
## GOAL
Add theme toggle functionality so users can switch between dark and light modes.

## CONTEXT
- App currently uses dark theme by default
- Theme preference should persist across sessions
- All components must remain readable in both modes

## REQUIREMENTS
- Add theme field to user preferences ('dark' | 'light' | 'auto')
- Create theme toggle component (sun/moon icon)
- Implement using Tailwind dark mode class strategy
- Store preference in localStorage
- Support system preference detection for 'auto' mode

## VALIDATION
- Toggle works instantly without page refresh
- Theme persists on reload
- All text remains readable in both modes

## CONSTRAINTS
- Use existing Tailwind color system
- Follow component patterns from design guide
- Maintain accessibility standards
```

---

## 🛠 Setup & Development

### Prerequisites
- Node.js 18+
- Anthropic API key ([Get one here](https://console.anthropic.com/account/keys))

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open browser
open http://localhost:3000
```

### Configure API Key

1. Go to Settings (`/settings`)
2. Paste your Anthropic API key
3. Click "Save & Validate"
4. You're ready to create tasks with AI prompts

### Production Build

```bash
npm run build
npm start
```

---

## 📁 Project Structure

```
maestro/
├── app/
│   ├── layout.tsx              # Root layout with header/nav
│   ├── page.tsx                # Dashboard (all projects)
│   ├── globals.css             # Tailwind + custom colors
│   ├── projects/
│   │   └── [id]/
│   │       └── page.tsx        # Project detail + kanban
│   ├── agents/
│   │   └── page.tsx            # Agent monitor
│   ├── settings/
│   │   └── page.tsx            # Settings page
│   └── api/
│       ├── projects/[id]/tasks/
│       │   └── route.ts        # GET tasks for agent
│       ├── tasks/[id]/status/
│       │   └── route.ts        # PUT update status
│       └── agents/[id]/
│           └── route.ts        # GET agent info
├── components/
│   ├── Button.tsx              # Reusable button
│   ├── Card.tsx                # Reusable card
│   ├── Modal.tsx               # Reusable modal
│   ├── NewTaskModal.tsx        # Create task form + AI prompt
│   └── TaskDetailModal.tsx     # View/edit task
├── lib/
│   ├── types.ts                # Core TypeScript interfaces
│   ├── storage.ts              # localStorage wrapper + CRUD
│   └── ai-prompt-generator.ts  # Anthropic API integration
└── package.json
```

---

## 💾 Storage

**Currently:** localStorage (persistent across browser sessions)

**Future:** PostgreSQL migration (just replace `lib/storage.ts`)

All data is stored locally. To clear:
```javascript
// In browser console
localStorage.clear()
// Then refresh page
```

---

## 🔑 Environment Variables

Create a `.env.local` file:

```bash
# Anthropic API Key (can also be set in Settings UI)
ANTHROPIC_API_KEY=sk-ant-...
```

---

## 📊 Example Usage Flow

### 1. Create a Project
- Click "+ New Project"
- Name: "HomesteadIQ"
- Description: "Real estate investment platform"
- System creates project with 0 tasks

### 2. Add Agents (Auto-created)
- Agents are auto-created when you assign tasks
- Or manually create agents: `agent-1`, `agent-2`, etc.
- Up to 7 agents per project

### 3. Create a Task
- Click "+ New Task"
- Title: "Build user authentication"
- Description: "Email + password login with session management"
- Assign to: agent-1
- Priority: 2 (High)
- System generates detailed AI prompt
- Review prompt, make edits if needed
- Click "Create Task"

### 4. Agent Polls for Work
```bash
# Agent polls every 60 seconds
curl http://localhost:3000/api/projects/project-1/tasks?agent=agent-1&status=todo

# Gets back task with ai_prompt
# Agent executes the prompt with Claude
# Agent completes task
```

### 5. Agent Reports Completion
```bash
# Agent updates status when done
curl -X PUT http://localhost:3000/api/tasks/task-123/status \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}'

# Task moves to Done column
```

### 6. Monitor Progress
- Watch kanban board update in real-time
- View agent monitor for overall stats
- Check task completion rates

---

## 🚀 Phase 2 (Coming Soon)

- **Real-time Updates:** WebSocket instead of polling
- **PostgreSQL Backend:** Production-ready database
- **GitHub Integration:** Link to repos, auto-create PRs
- **Team Collaboration:** Multi-user accounts
- **Agent Automation:** Built-in agent runner
- **Detailed Logging:** See agent execution traces
- **Cost Tracking:** Monitor API usage

---

## 🤝 Contributing

This is a personal project for autonomous AI development. For bugs or ideas:

1. Create a new task in the Maestro dashboard
2. Assign to an agent
3. Let Maestro orchestrate the fix!

---

## 📝 License

MIT - Free to use and modify

---

## 🎓 Key Concepts

**Project:** A software application being built (e.g., HomesteadIQ)

**Task:** A unit of work (e.g., "Add dark mode toggle")

**Agent:** An AI worker that executes tasks (e.g., agent-1)

**AI Prompt:** Auto-generated detailed instructions for agents

**Status:** Where a task is in its lifecycle (To Do → In Progress → Done)

**Priority:** How urgent a task is (1-5)

---

## 💡 Tips

- **Start simple:** Create a small project with 2-3 tasks first
- **Be descriptive:** Good descriptions → better AI prompts
- **Monitor agents:** Check Agent Monitor page to see who's busy
- **Copy prompts:** Use the copy button to manually test prompts
- **Iterate:** Edit generated prompts to refine instructions
- **Save API key:** Set it once in Settings, it's stored locally

---

## 🐛 Troubleshooting

**Q: "API key not configured" error**
A: Go to Settings and add your Anthropic API key

**Q: Tasks not showing up**
A: Clear localStorage and refresh (Settings has info)

**Q: "Generate prompt" button loading forever**
A: Check your API key is valid and has quota remaining

**Q: localhost:3000 won't load**
A: Make sure `npm run dev` is running in the Maestro directory

---

**Made with ⚡ by the Maestro team**
