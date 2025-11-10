import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface ParsedProject {
  name: string;
  description?: string;
  phases?: string[];
  tasks?: Array<{
    title: string;
    description?: string;
    agent?: string;
  }>;
}

export async function POST(req: NextRequest) {
  try {
    const { pdfBase64, fileName } = await req.json();
    const apiKey = req.headers.get('x-anthropic-key');

    console.log('[parse-pdf API] Request received');
    console.log('[parse-pdf API] File name:', fileName);
    console.log('[parse-pdf API] PDF Base64 length:', pdfBase64?.length || 0);
    console.log('[parse-pdf API] API Key present:', !!apiKey);

    if (!pdfBase64) {
      console.error('[parse-pdf API] ERROR: PDF base64 not provided');
      return NextResponse.json(
        { error: 'PDF file is required' },
        { status: 400 }
      );
    }

    if (!apiKey) {
      console.error('[parse-pdf API] ERROR: API key not provided');
      return NextResponse.json(
        { error: 'API key not provided' },
        { status: 400 }
      );
    }

    // Validate file size (max 32MB)
    const maxSizeBytes = 32 * 1024 * 1024;
    if (pdfBase64.length > maxSizeBytes) {
      return NextResponse.json(
        { error: 'PDF file is too large (max 32MB)' },
        { status: 400 }
      );
    }

    const parsingPrompt = `You are an expert project plan analyzer. I've provided a PDF document that contains a project plan or specification document.

Your task is to:
1. Analyze the PDF content
2. Extract all projects, phases, and tasks mentioned
3. Return the data in the following JSON structure:

{
  "projects": [
    {
      "name": "Project Name",
      "description": "Project description or overview",
      "phases": ["Phase 1", "Phase 2", "Phase 3"],
      "tasks": [
        {
          "title": "Task name",
          "description": "What needs to be done",
          "agent": "Agent or role responsible"
        }
      ]
    }
  ]
}

Important guidelines:
- Extract ONLY information explicitly mentioned in the document
- Group tasks by project when possible
- Use clear, concise titles for all items
- Include descriptions where available
- Identify phases or stages if mentioned
- Return valid JSON only, no markdown formatting

If the document is not a project plan, return an appropriate error message.`;

    const trimmedApiKey = apiKey.trim();

    console.log('[parse-pdf API] Calling Anthropic API with native PDF support...');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': trimmedApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: parsingPrompt,
              },
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: pdfBase64,
                },
              },
            ],
          },
        ],
      }),
    });

    console.log('[parse-pdf API] Response status:', response.status);

    if (!response.ok) {
      let errorMessage = 'API request failed';
      try {
        const errorData = (await response.json()) as Record<string, unknown>;
        console.log('[parse-pdf API] Error data:', JSON.stringify(errorData));
        if (errorData.error) {
          if (typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          } else if (typeof errorData.error === 'object' && errorData.error !== null) {
            const errorObj = errorData.error as Record<string, unknown>;
            errorMessage = (errorObj.message as string) || 'API request failed';
          }
        }
      } catch (e) {
        console.error('[parse-pdf API] Failed to parse error response:', e);
      }
      console.error('[parse-pdf API] API Error:', errorMessage);

      let userFriendlyError = `Anthropic API Error: ${errorMessage}`;
      if (
        errorMessage.includes('invalid x-api-key') ||
        errorMessage.includes('authentication')
      ) {
        userFriendlyError =
          'API key is invalid or expired. Please verify your key at https://console.anthropic.com/account/keys';
      } else if (errorMessage.includes('rate_limit')) {
        userFriendlyError = 'API rate limit exceeded. Please wait a moment and try again.';
      } else if (errorMessage.includes('overloaded')) {
        userFriendlyError = 'Anthropic API is temporarily overloaded. Please try again in a moment.';
      }

      return NextResponse.json(
        { error: userFriendlyError },
        { status: response.status }
      );
    }

    const data = (await response.json()) as Record<string, unknown>;
    const content = (data.content as Array<Record<string, unknown>> | undefined)?.[0];

    if (!content || content.type !== 'text') {
      return NextResponse.json(
        { error: 'No text response from API' },
        { status: 500 }
      );
    }

    const responseText = content.text as string;
    console.log('[parse-pdf API] API response received, length:', responseText.length);

    // Parse JSON from response - handle markdown code blocks
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const parsedData = JSON.parse(jsonStr) as { projects: ParsedProject[] };

    if (!parsedData.projects || !Array.isArray(parsedData.projects)) {
      return NextResponse.json(
        { error: 'Invalid PDF format or unable to extract projects' },
        { status: 400 }
      );
    }

    console.log('[parse-pdf API] Successfully parsed', parsedData.projects.length, 'projects');

    return NextResponse.json({
      projects: parsedData.projects,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[parse-pdf API] Exception:', errorMessage);
    return NextResponse.json(
      { error: `Failed to parse PDF: ${errorMessage}` },
      { status: 500 }
    );
  }
}
