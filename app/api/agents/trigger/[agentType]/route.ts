/**
 * Agent Trigger API - Event-Driven Task Assignment
 * Triggers specific agent types via webhook to execute tasks
 * Replaces polling with push-based architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTask } from '@/lib/storage';
import { getAgentConfig } from '@/lib/agent-config';

export async function POST(
  request: NextRequest,
  { params }: { params: { agentType: string } }
) {
  try {
    const { agentType } = params;
    const body = await request.json();
    const { taskId } = body;

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId is required' },
        { status: 400 }
      );
    }

    // Verify task exists
    const task = getTask(taskId);
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Get agent webhook configuration
    const agentConfig = getAgentConfig();
    const agentWebhook = agentConfig[agentType];

    if (!agentWebhook || !agentWebhook.webhook) {
      return NextResponse.json(
        { error: `No webhook configured for agent type: ${agentType}` },
        { status: 404 }
      );
    }

    // Trigger agent via webhook
    console.log(`[Agent Trigger] Triggering ${agentType} for task ${taskId}`);
    console.log(`[Agent Trigger] Webhook URL: ${agentWebhook.webhook}`);

    const webhookResponse = await fetch(agentWebhook.webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Maestro-Task-Id': taskId,
        'X-Maestro-Agent-Type': agentType,
      },
      body: JSON.stringify({
        taskId,
        task,
        maestroUrl: process.env.MAESTRO_URL || 'http://localhost:3000',
      }),
    }).catch(error => {
      console.error(`[Agent Trigger] Webhook call failed: ${error.message}`);
      return null;
    });

    if (!webhookResponse) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to trigger agent webhook',
          agentType,
          taskId,
        },
        { status: 500 }
      );
    }

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text().catch(() => 'Unknown error');
      console.error(`[Agent Trigger] Webhook returned error: ${errorText}`);

      return NextResponse.json(
        {
          success: false,
          error: 'Agent webhook returned error',
          statusCode: webhookResponse.status,
          agentType,
          taskId,
        },
        { status: 500 }
      );
    }

    console.log(`[Agent Trigger] Successfully triggered ${agentType} for task ${taskId}`);

    return NextResponse.json({
      success: true,
      agentType,
      taskId,
      webhookUrl: agentWebhook.webhook,
      message: `Agent ${agentType} triggered successfully`,
    });

  } catch (error) {
    console.error('[Agent Trigger] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
