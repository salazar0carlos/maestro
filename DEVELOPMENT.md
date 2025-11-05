# Maestro Development Guide

## Local Development Setup

### 1. Prerequisites
- Node.js 18+
- npm or yarn
- Code editor (VSCode recommended)
- Anthropic API key

### 2. Install & Run

```bash
# Install dependencies (already done)
npm install

# Start dev server
npm run dev

# Open browser
open http://localhost:3000
```

Dev server runs with hot reload - changes appear instantly.

---

## Project Structure

### `/lib` - Core Business Logic

**`types.ts`** - TypeScript interfaces
- `Project` - App being built
- `MaestroTask` - Unit of work
- `Agent` - AI worker
- Type definitions for API responses

**`storage.ts`** - Data persistence
- localStorage wrapper with type safety
- CRUD operations for all entities
- Seed data for development
- Easy migration point to PostgreSQL

**`ai-prompt-generator.ts`** - AI integration
- Anthropic Claude API client
- System prompt for task expansion
- API key management
- Validation helpers

### `/app` - Next.js Pages & Routes

**Page Files (`.tsx`):**
- `page.tsx` - Dashboard (all projects)
- `projects/[id]/page.tsx` - Project detail + kanban
- `agents/page.tsx` - Agent monitor
- `settings/page.tsx` - Configuration
- `layout.tsx` - Root layout with header

**API Routes (`.ts`):**
- `api/projects/[id]/tasks/route.ts` - GET tasks for agent
- `api/tasks/[id]/status/route.ts` - PUT update status
- `api/agents/[id]/route.ts` - GET agent info

### `/components` - Reusable React Components

**`Button.tsx`** - Button component
- Variants: primary, secondary, danger, ghost
- Sizes: sm, md, lg
- Loading state support

**`Card.tsx`** - Card container
- Flexible styling
- Optional hover effect
- Accepts HTML attributes

**`Modal.tsx`** - Dialog component
- Escape key support
- Click-outside dismiss
- Accessible focus management

**`NewTaskModal.tsx`** - Task creation flow
- 3-step process (form → generating → review)
- AI prompt generation
- Editable prompts

**`TaskDetailModal.tsx`** - Task view & edit
- Full task information
- Status transitions
- Delete functionality

---

## Making Changes

### Adding a New Page

1. Create file: `app/new-feature/page.tsx`
2. Export default React component
3. Use layout automatically from parent
4. Link from navigation in `app/layout.tsx`

```typescript
// app/new-feature/page.tsx
export default function NewFeature() {
  return (
    <div className="max-w-6xl mx-auto">
      <h1>New Feature</h1>
    </div>
  );
}
```

### Adding an API Route

1. Create file: `app/api/resource/route.ts`
2. Export `GET`, `POST`, `PUT`, `DELETE` functions
3. Use `NextRequest` and `NextResponse`

```typescript
// app/api/resource/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const data = { /* ... */ };
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed' },
      { status: 500 }
    );
  }
}
```

### Adding a Component

1. Create file: `components/NewComponent.tsx`
2. Export component function
3. Add proper TypeScript types
4. Import in pages as needed

```typescript
// components/NewComponent.tsx
interface Props {
  title: string;
  onAction: () => void;
}

export function NewComponent({ title, onAction }: Props) {
  return (
    <div>
      <h2>{title}</h2>
      <button onClick={onAction}>Action</button>
    </div>
  );
}
```

### Using the Storage Layer

```typescript
import {
  getProjects,
  createProject,
  updateTask,
  deleteTask,
  getAgents,
} from '@/lib/storage';

// Get all projects
const projects = getProjects();

// Create new project
const newProject = createProject({
  project_id: 'proj-1',
  name: 'My Project',
  // ... other fields
});

// Update task
const updated = updateTask('task-1', { status: 'done' });

// Delete task
deleteTask('task-2');
```

### Using AI Prompt Generation

```typescript
import { generateTaskPrompt, setApiKey } from '@/lib/ai-prompt-generator';

// Generate prompt
const prompt = await generateTaskPrompt(
  'Add dark mode toggle',
  'Users should be able to switch themes'
);

// Set API key
setApiKey('sk-ant-...');

// Validate API key
const isValid = await validateApiKey('sk-ant-...');
```

---

## Styling

### Tailwind CSS

Maestro uses Tailwind CSS v3 with custom dark theme:

```tsx
// Use Tailwind classes
<div className="bg-slate-900 text-slate-50 p-4 rounded-lg">
  <h1 className="text-2xl font-bold text-blue-400">Title</h1>
  <p className="text-slate-400">Description</p>
</div>
```

### Color System

- **Background:** `bg-slate-950` (nearly black)
- **Cards:** `bg-slate-800` or `bg-slate-900`
- **Text:** `text-slate-50` (white), `text-slate-400` (gray)
- **Accent:** `text-blue-400` (primary action color)
- **Danger:** `text-red-500` (destructive actions)
- **Success:** `text-green-400` (positive feedback)

### Custom Styles

Add to `app/globals.css` if needed, but prefer Tailwind classes.

---

## Testing

### Manual Testing Checklist

- [ ] Create project
- [ ] Create task
- [ ] Generate AI prompt
- [ ] Edit prompt
- [ ] Assign to agent
- [ ] View on kanban
- [ ] Change task status
- [ ] Delete task
- [ ] Test API endpoints
- [ ] Check agent monitor

### Testing API Endpoints

```bash
# Get tasks for agent
curl "http://localhost:3000/api/projects/[id]/tasks?agent=agent-1"

# Update task status
curl -X PUT "http://localhost:3000/api/tasks/[id]/status" \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}'

# Get agent info
curl "http://localhost:3000/api/agents/agent-1"
```

---

## Debugging

### Browser DevTools

Open DevTools (F12):
- **Console:** Check for JavaScript errors
- **Network:** See API calls
- **Application:** View localStorage data
- **Performance:** Check load times

### localStorage Inspection

```javascript
// In browser console
localStorage.getItem('maestro:projects')
localStorage.getItem('maestro:tasks')
localStorage.getItem('maestro:agents')

// Clear all data
localStorage.clear()
```

### VSCode Debugging

Add `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/next",
      "args": ["dev"],
      "console": "integratedTerminal"
    }
  ]
}
```

---

## Performance Tips

### Optimize Renders
- Use `'use client'` for client components
- Memoize expensive operations
- Avoid re-renders with proper dependencies

### Optimize API Calls
- Batch requests when possible
- Cache task list locally
- Debounce search input

### Optimize Bundle
- Current build: ~120KB (excellent)
- Code split by route (automatic with Next.js)
- Monitor with `npm run analyze`

---

## Common Issues

### Issue: API key not working

**Solution:**
1. Verify key starts with `sk-ant-`
2. Check key has remaining credits
3. Test key at console.anthropic.com
4. Clear localStorage and retry

### Issue: Tasks not showing

**Solution:**
1. Hard refresh browser (Cmd+Shift+R)
2. Check browser console for errors
3. Verify data in localStorage
4. Check network tab for failed requests

### Issue: Styles not applying

**Solution:**
1. Check Tailwind class spelling
2. Verify `globals.css` is loaded
3. Restart dev server
4. Clear `.next` folder: `rm -rf .next`

### Issue: TypeScript errors

**Solution:**
1. Check variable types
2. Import missing types
3. Use `as any` as temporary fix
4. Run `npm run build` to see all errors

---

## Build & Deployment

### Local Build

```bash
# Test production build locally
npm run build
npm start
```

Opens at http://localhost:3000

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Configure environment
vercel env add ANTHROPIC_API_KEY
```

### Environment Variables

For production, set in Vercel dashboard:
```
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Contributing Guidelines

### Before Making Changes

1. Create a task in Maestro (meta!)
2. Assign to yourself
3. Create a branch: `git checkout -b feature/task-name`

### Code Style

- Use TypeScript strict mode
- Add JSDoc comments to functions
- Format with Prettier (built-in)
- Follow Tailwind naming conventions

### Commits

```bash
git commit -m "Feature: Add new capability

- What was added
- Why it was needed
- How it works
"
```

### Testing Before Push

```bash
npm run lint      # Check code quality
npm run build     # Verify build succeeds
npm test          # Run tests (if added)
```

---

## Architecture Decisions (Why This Way)

### Why localStorage?
- Fast development without backend
- Persistent across sessions
- Easy debugging (visible in browser)
- Clear migration path to PostgreSQL

### Why Anthropic Claude?
- Superior long-form prompt understanding
- Consistent output quality
- Handles complex technical prompts
- Good cost/quality ratio

### Why Next.js App Router?
- Modern React patterns
- Server components by default
- File-based routing
- Built-in API routes
- Great DX

### Why Tailwind?
- No CSS files to maintain
- Consistent design system
- Fast iteration
- Small bundle size

---

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com)

---

## Getting Help

1. Check existing code for patterns
2. Read error messages carefully
3. Search in browser console
4. Check network tab for API errors
5. Review README.md and QUICKSTART.md

---

Happy developing! 🚀
