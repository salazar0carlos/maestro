/**
 * AI Prompt Generator for Maestro
 * Expands simple task titles into detailed, executable prompts for agents
 */

import Anthropic from '@anthropic-ai/sdk';

/**
 * Reference template for prompt generation (currently handled by API route)
 *
 * Template structure:
 * - GOAL: Clear, specific objective
 * - CONTEXT: Why this matters, what it connects to, existing patterns
 * - REQUIREMENTS: Functional and technical requirements (bullet list)
 * - VALIDATION: How to test/verify it works
 * - CONSTRAINTS: Architecture rules, patterns to follow, tech stack limitations
 */

/**
 * Generate a detailed task prompt from a title and optional description
 *
 * @param title - Simple task title (e.g., "Add dark mode toggle")
 * @param description - Optional additional context about the task
 * @returns Generated detailed prompt
 * @throws Error if API call fails
 */
export async function generateTaskPrompt(
  title: string,
  description?: string
): Promise<string> {
  const apiKey = typeof window !== 'undefined'
    ? localStorage.getItem('anthropic_api_key')
    : process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('API key not configured. Please set your API key in Settings.');
  }

  try {
    const response = await fetch('/api/generate-prompt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-anthropic-key': apiKey,
      },
      body: JSON.stringify({
        taskTitle: title,
        taskDescription: description,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json() as Record<string, unknown>;
      const errorMessage = (errorData.error as string) || 'API request failed';
      throw new Error(errorMessage);
    }

    const data = await response.json() as Record<string, unknown>;
    const prompt = data.prompt as string;

    if (!prompt) {
      throw new Error('No prompt generated');
    }

    return prompt;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate prompt: ${error.message}`);
    }
    throw new Error('Failed to generate prompt: Unknown error');
  }
}

/**
 * Validate that an API key is configured and working
 *
 * @param apiKey - The API key to validate
 * @returns true if API key is valid
 * @throws Error with helpful message if validation fails
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('API key cannot be empty');
  }

  if (!apiKey.startsWith('sk-ant-')) {
    throw new Error('Invalid API key format. Must start with sk-ant-');
  }

  const tempClient = new Anthropic({ apiKey });

  try {
    // Make a minimal API call to test the key
    const message = await tempClient.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 10,
      messages: [
        {
          role: 'user',
          content: 'Say "OK"',
        },
      ],
    });

    // Check if we got a valid response
    if (!message.content || message.content.length === 0) {
      throw new Error('No response from API');
    }

    return true;
  } catch (error) {
    // Re-throw with more context about what went wrong
    if (error instanceof Error) {
      // Check for specific Anthropic API errors
      const errorMessage = error.message.toLowerCase();
      if (errorMessage.includes('401') || errorMessage.includes('authentication')) {
        throw new Error('Invalid or expired API key. Please check your key at console.anthropic.com');
      }
      if (errorMessage.includes('429')) {
        throw new Error('API rate limit exceeded. Please try again later.');
      }
      if (errorMessage.includes('overloaded')) {
        throw new Error('Anthropic API is temporarily overloaded. Please try again in a moment.');
      }
      throw error;
    }
    throw new Error('Failed to validate API key. Please check your connection and try again.');
  }
}

/**
 * Set API key for client-side usage
 */
export function setApiKey(apiKey: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('anthropic_api_key', apiKey);
    // client = null; // Reset client to use new key (client not currently used)
  }
}

/**
 * Get stored API key (for display in settings)
 */
export function getStoredApiKey(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('anthropic_api_key') || '';
  }
  return '';
}
