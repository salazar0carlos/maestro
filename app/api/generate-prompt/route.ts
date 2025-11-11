import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { taskTitle, taskDescription } = await req.json();
    const apiKey = req.headers.get('x-anthropic-key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not provided' },
        { status: 400 }
      );
    }

    if (!taskTitle) {
      return NextResponse.json(
        { error: 'Task title is required' },
        { status: 400 }
      );
    }

    const userMessage = `Generate a detailed, executable prompt for the following task:

Title: ${taskTitle}
${taskDescription ? `Description: ${taskDescription}` : ''}

Create a comprehensive prompt that will guide an AI agent to successfully implement this task. Include:
- Clear objective
- Technical requirements
- Implementation steps
- Success criteria
- Edge cases to consider`;

    const trimmedApiKey = apiKey.trim();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': trimmedApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: userMessage,
          },
        ],
      }),
    });

    if (!response.ok) {
      let errorMessage = 'API request failed';
      let rawError = '';
      try {
        const errorData = await response.json() as Record<string, unknown>;
        rawError = JSON.stringify(errorData);
        if (errorData.error) {
          if (typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          } else if (typeof errorData.error === 'object' && errorData.error !== null) {
            const errorObj = errorData.error as Record<string, unknown>;
            errorMessage = (errorObj.message as string) || 'API request failed';
          }
        }
      } catch (e) {
        // Failed to parse error response
      }

      // Provide helpful error messages based on the error type
      let userFriendlyError = `Anthropic API Error: ${errorMessage}`;
      if (errorMessage.includes('invalid x-api-key') || errorMessage.includes('authentication')) {
        userFriendlyError = 'API key is invalid or expired. Please verify your key at https://console.anthropic.com/account/keys';
      } else if (errorMessage.includes('rate_limit')) {
        userFriendlyError = 'API rate limit exceeded. Please wait a moment and try again.';
      } else if (errorMessage.includes('overloaded')) {
        userFriendlyError = 'Anthropic API is temporarily overloaded. Please try again in a moment.';
      }

      return NextResponse.json(
        { error: userFriendlyError, debug: { rawError, apiKeyPrefix: apiKey.substring(0, 10) + '...' } },
        { status: response.status }
      );
    }

    const data = await response.json() as Record<string, unknown>;
    const content = (data.content as Array<Record<string, unknown>> | undefined)?.[0];

    if (!content || content.type !== 'text') {
      return NextResponse.json(
        { error: 'No text response from API' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      prompt: content.text as string
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to generate prompt: ${errorMessage}` },
      { status: 500 }
    );
  }
}
