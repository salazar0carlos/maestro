/**
 * Webhook Trigger API
 * Triggers agent execution by sending task via webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  TaskExecutionRequest,
  WebhookPayload,
} from '@/lib/webhook-types';
import { WebhookDeliveryService } from '@/lib/webhook-delivery';
import { getTask, updateTask } from '@/lib/storage';
import { CostTracker } from '@/lib/cost-tracker';

/**
 * POST /api/webhooks/trigger
 * Trigger agent to execute a task
 */
export async function POST(request: NextRequest) {
  try {
    const { task_id, agent_id } = await request.json();

    if (!task_id) {
      return NextResponse.json(
        { error: 'task_id is required' },
        { status: 400 }
      );
    }

    // Get task details
    const task = getTask(task_id);
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Get agent webhook configuration
    const targetAgentId = agent_id || task.assigned_to_agent;
    const agentConfig = WebhookDeliveryService.getAgentConfig(targetAgentId);

    if (!agentConfig) {
      return NextResponse.json(
        {
          error: `No webhook configured for agent: ${targetAgentId}`,
          suggestion: 'Configure agent webhook at /webhooks/manage',
        },
        { status: 404 }
      );
    }

    if (!agentConfig.enabled) {
      return NextResponse.json(
        { error: `Agent webhook is disabled: ${targetAgentId}` },
        { status: 400 }
      );
    }

    // Update task status
    updateTask(task_id, {
      status: 'in-progress',
      started_date: new Date().toISOString(),
    });

    // Prepare task execution request
    const executionRequest: TaskExecutionRequest = {
      task_id: task.task_id,
      task_title: task.title,
      task_description: task.description,
      ai_prompt: task.ai_prompt,
      priority: task.priority,
      project_id: task.project_id,
      metadata: {
        created_date: task.created_date,
        assigned_to: task.assigned_to_agent,
      },
    };

    // Prepare webhook payload
    const payload: WebhookPayload = {
      event: 'task.assigned',
      timestamp: new Date().toISOString(),
      data: executionRequest,
      metadata: {
        source: 'maestro',
        priority: task.priority >= 4 ? 'high' : 'medium',
      },
    };

    // Send webhook to agent
    const delivery = await WebhookDeliveryService.sendWebhook(
      agentConfig,
      payload
    );

    // Track cost
    CostTracker.trackWebhook(targetAgentId, agentConfig.agent_name);

    console.log(
      `[Webhook Trigger] Sent task ${task_id} to ${agentConfig.agent_name}`
    );

    return NextResponse.json({
      success: true,
      task_id,
      agent: agentConfig.agent_name,
      delivery_id: delivery.id,
      status: delivery.status,
      message: 'Task sent to agent',
    });
  } catch (error) {
    console.error('[Webhook Trigger] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/webhooks/trigger/broadcast
 * Broadcast event to all agents
 */
export async function PUT(request: NextRequest) {
  try {
    const { event, data, priority } = await request.json();

    if (!event || !data) {
      return NextResponse.json(
        { error: 'event and data are required' },
        { status: 400 }
      );
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
      metadata: {
        source: 'maestro',
        priority: priority || 'medium',
      },
    };

    const deliveries = await WebhookDeliveryService.broadcast(payload);

    return NextResponse.json({
      success: true,
      event,
      agents_notified: deliveries.length,
      deliveries: deliveries.map(d => ({
        id: d.id,
        agent: d.webhook_id,
        status: d.status,
      })),
    });
  } catch (error) {
    console.error('[Webhook Broadcast] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/trigger
 * Get webhook trigger information
 */
export async function GET() {
  const configs = WebhookDeliveryService.getAllConfigs();

  return NextResponse.json({
    service: 'Maestro Webhook Trigger',
    agents_configured: configs.length,
    agents: configs.map(c => ({
      id: c.agent_id,
      name: c.agent_name,
      enabled: c.enabled,
      events: c.events,
    })),
  });
}
