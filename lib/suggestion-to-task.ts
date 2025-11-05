/**
 * Suggestion to Task Conversion
 * Converts approved improvement suggestions into executable Maestro tasks
 */

import { ImprovementSuggestion, MaestroTask } from './types';
import { getSuggestion, updateSuggestion } from './storage';
import { createTask } from './storage';

/**
 * Generate unique ID for tasks
 */
function generateTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate detailed AI prompt for a task from a suggestion
 * Uses Claude API to expand suggestion into comprehensive task prompt
 * @param suggestion - The improvement suggestion
 * @param anthropicApiKey - Anthropic API key
 * @returns Promise with generated prompt
 */
export async function generateTaskPrompt(
  suggestion: ImprovementSuggestion,
  anthropicApiKey?: string
): Promise<string> {
  // If no API key provided, generate a basic prompt
  if (!anthropicApiKey) {
    return generateBasicTaskPrompt(suggestion);
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        temperature: 0.7,
        system: `You are a task prompt generator for an AI agent system.
Generate a comprehensive, detailed prompt for an AI agent to execute a specific improvement task.
The prompt should be clear, actionable, and include all necessary context.`,
        messages: [
          {
            role: 'user',
            content: `Generate a detailed task prompt for an AI agent based on this improvement suggestion:

**Title:** ${suggestion.title}
**Description:** ${suggestion.description}
**Reasoning:** ${suggestion.reasoning}
**Files Affected:** ${suggestion.files_affected.join(', ')}
**Estimated Effort:** ${suggestion.effort_estimate}
**Category:** ${suggestion.category}

The prompt should include:
1. What needs to be built/changed
2. Why it matters (user benefit)
3. Specific files to modify
4. Implementation approach
5. Testing requirements
6. Success criteria
7. Code quality standards (TypeScript strict mode, error handling, JSDoc comments)

Return ONLY the task prompt text, no additional formatting or explanations.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('Failed to generate AI prompt, falling back to basic prompt');
      return generateBasicTaskPrompt(suggestion);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';

    return content || generateBasicTaskPrompt(suggestion);
  } catch (error) {
    console.error('Error generating task prompt:', error);
    return generateBasicTaskPrompt(suggestion);
  }
}

/**
 * Generate a basic task prompt without AI
 * @param suggestion - The improvement suggestion
 * @returns Task prompt string
 */
function generateBasicTaskPrompt(suggestion: ImprovementSuggestion): string {
  return `# ${suggestion.title}

## Objective
${suggestion.description}

## Why This Matters
${suggestion.reasoning}

## Files to Modify
${suggestion.files_affected.map(file => `- ${file}`).join('\n')}

## Implementation Requirements
- Category: ${suggestion.category}
- Estimated Effort: ${suggestion.effort_estimate}
- Priority: ${suggestion.priority}

## Code Quality Standards
- Use TypeScript strict mode
- Add JSDoc comments to all functions
- Implement proper error handling with try/catch
- Add loading states for async operations
- No 'any' types
- Follow existing code patterns

## Success Criteria
- Code builds without errors (\`npm run build\` succeeds)
- No TypeScript errors
- Implementation matches description
- Error handling in place
- Code is tested and working

## Testing
- Verify the changes work as expected
- Test error cases
- Ensure no regressions`;
}

/**
 * Convert an improvement suggestion to a Maestro task
 * @param suggestionId - ID of the suggestion to convert
 * @param anthropicApiKey - Optional Anthropic API key for AI prompt generation
 * @returns Promise with created task, or null if suggestion not found
 */
export async function convertSuggestionToTask(
  suggestionId: string,
  anthropicApiKey?: string
): Promise<MaestroTask | null> {
  const suggestion = getSuggestion(suggestionId);

  if (!suggestion) {
    throw new Error(`Suggestion ${suggestionId} not found`);
  }

  if (suggestion.status === 'implemented') {
    throw new Error('This suggestion has already been implemented');
  }

  try {
    // Generate detailed AI prompt for the task
    const aiPrompt = await generateTaskPrompt(suggestion, anthropicApiKey);

    // Map priority to task priority (1-5)
    const taskPriority = suggestion.priority === 'high' ? 1 : suggestion.priority === 'medium' ? 3 : 5;

    // Create task object
    const task: MaestroTask = {
      task_id: generateTaskId(),
      project_id: suggestion.project_id,
      title: suggestion.title,
      description: suggestion.description,
      ai_prompt: aiPrompt,
      assigned_to_agent: suggestion.agent_type,
      priority: taskPriority as 1 | 2 | 3 | 4 | 5,
      status: 'todo',
      created_date: new Date().toISOString(),
    };

    // Save task
    const createdTask = createTask(task);

    // Update suggestion status
    updateSuggestion(suggestionId, {
      status: 'approved',
      task_id: createdTask.task_id,
      approved_at: new Date().toISOString(),
      approved_by: 'Product Improvement Agent',
    });

    return createdTask;
  } catch (error) {
    console.error('Error converting suggestion to task:', error);
    throw error;
  }
}

/**
 * Convert multiple suggestions to tasks
 * @param suggestionIds - Array of suggestion IDs
 * @param anthropicApiKey - Optional Anthropic API key
 * @returns Promise with array of created tasks
 */
export async function convertSuggestionsToTasks(
  suggestionIds: string[],
  anthropicApiKey?: string
): Promise<MaestroTask[]> {
  const tasks: MaestroTask[] = [];
  const errors: string[] = [];

  for (const suggestionId of suggestionIds) {
    try {
      const task = await convertSuggestionToTask(suggestionId, anthropicApiKey);
      if (task) {
        tasks.push(task);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`${suggestionId}: ${errorMsg}`);
    }
  }

  if (errors.length > 0) {
    console.error('Errors converting suggestions:', errors);
  }

  return tasks;
}
