# Maestro Quick Start (5 minutes)

## 1. Start the Dev Server

```bash
cd maestro
npm run dev
```

Open browser to **http://localhost:3000**

---

## 2. Get an API Key

1. Go to https://console.anthropic.com/account/keys
2. Create a new API key
3. Copy the key (starts with `sk-ant-`)

---

## 3. Configure API Key in Maestro

1. Click **Settings** (top right)
2. Paste API key into "API Key" field
3. Click **Save & Validate**
4. ✓ Should show "API key validated successfully"

---

## 4. Create Your First Project

1. Go back to **Projects** (top left)
2. Click **+ New Project**
3. Name: `TestApp`
4. Description: `My first Maestro project`
5. Click **Create Project**

You should now see a card for "TestApp"

---

## 5. Create Your First Task

1. Click on the **TestApp** card
2. Click **+ New Task**
3. Title: `Build login page`
4. Description: `Email and password authentication`
5. Agent: `agent-1`
6. Priority: `2 - High`
7. Click **Next: Generate Prompt**

Wait a few seconds... ✨ **AI generates a detailed prompt**

8. Review the prompt (it should look awesome)
9. Click **Create Task**

---

## 6. See Your Task on the Kanban Board

Your task now appears in the **To Do** column

- Click the task to view full details + AI prompt
- Click **✓ Done** to mark complete
- Watch it move to the **Done** column

---

## 7. Test the Agent API

```bash
# Get tasks for agent-1 in todo status
curl "http://localhost:3000/api/projects/testapp-[random-id]/tasks?agent=agent-1&status=todo"
```

You should get back JSON with your task and the AI-generated prompt!

---

## 8. Update Task Status via API

```bash
# Mark task as in-progress
curl -X PUT "http://localhost:3000/api/tasks/[task-id]/status" \
  -H "Content-Type: application/json" \
  -d '{"status": "in-progress"}'
```

Watch the kanban board update in real-time!

---

## That's It! 🎉

You've now:
✓ Set up Maestro
✓ Created a project
✓ Created a task with AI prompt generation
✓ Used the kanban board
✓ Tested the agent API

---

## Next Steps

### Try These Features:

1. **Search & Filter**
   - Type in the search box on the project page
   - Filter by agent from dropdown

2. **Agent Monitor**
   - Click **Agents** to see all agents across projects
   - See task counts and status

3. **Modify Task Details**
   - Click a task card to open details
   - Edit the AI prompt
   - Delete tasks

4. **Create Multiple Projects**
   - Dashboard supports unlimited projects
   - Agents can work across projects

---

## Example: Real-world Flow

Let's build a multi-feature project:

### Project: "E-Commerce Platform"

#### Task 1: User Authentication
- AI generates 500-line prompt about auth flows
- Assign to agent-1
- Agent gets prompt via API
- Agent executes with Claude
- Agent marks done

#### Task 2: Product Catalog
- Create task
- AI generates prompt about database schema, UI, pagination
- Assign to agent-2
- Agent executes in parallel
- Both agents working simultaneously

#### Task 3: Shopping Cart
- Create task
- AI generates prompt about state management, persistence
- Assign to agent-3
- 3 agents building 3 features in parallel

#### Task 4: Payment Integration
- Create task
- Assign to agent-1 (now available)
- High priority = agent picks it up first

Watch the **Agent Monitor** - see all 3 agents working!

---

## API Endpoints Cheat Sheet

```bash
# Get tasks for agent (most important endpoint)
GET /api/projects/[projectId]/tasks?agent=[agentId]&status=[status]

# Update task status
PUT /api/tasks/[taskId]/status
{
  "status": "in-progress" | "done" | "blocked",
  "blocked_reason": "optional reason if blocked"
}

# Get agent info and stats
GET /api/agents/[agentId]
```

---

## Troubleshooting

**Error: "Failed to generate prompt"**
- Check API key in Settings
- Make sure it starts with `sk-ant-`
- Verify key is valid on console.anthropic.com

**Tasks not showing in Kanban**
- Hard refresh browser (Cmd+Shift+R)
- Check browser console for errors

**API returns 404**
- Use the full project_id (includes timestamp)
- Check task_id and agent_id are correct

---

## Your First Agent Integration

Create a simple Python script to use Maestro:

```python
import requests
import json
from anthropic import Anthropic

BASE_URL = "http://localhost:3000/api"
PROJECT_ID = "your-project-id"
AGENT_ID = "agent-1"

# Poll for tasks
response = requests.get(
    f"{BASE_URL}/projects/{PROJECT_ID}/tasks",
    params={"agent": AGENT_ID, "status": "todo"}
)
tasks = response.json()["tasks"]

for task in tasks:
    print(f"Executing: {task['title']}")
    print(f"Prompt:\n{task['ai_prompt']}\n")

    # Update to in-progress
    requests.put(
        f"{BASE_URL}/tasks/{task['task_id']}/status",
        json={"status": "in-progress"}
    )

    # Use the ai_prompt with Claude to generate solution
    # ... your agent logic here ...

    # Mark done
    requests.put(
        f"{BASE_URL}/tasks/{task['task_id']}/status",
        json={"status": "done"}
    )
```

---

## Questions?

- Read [README.md](README.md) for full documentation
- Check [lib/types.ts](lib/types.ts) for data structures
- Review API routes in [app/api/](app/api/)

---

**Happy orchestrating! 🎵**
