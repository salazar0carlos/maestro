/**
 * Webhook Configuration API
 * Manage agent webhook configurations
 */

import { NextRequest, NextResponse } from 'next/server';
import { WebhookDeliveryService } from '@/lib/webhook-delivery';
import { AgentWebhookConfig } from '@/lib/webhook-types';
import crypto from 'crypto';

/**
 * GET /api/webhooks/config
 * Get all webhook configurations
 */
export async function GET() {
  try {
    const configs = WebhookDeliveryService.getAllConfigs();

    return NextResponse.json({
      success: true,
      count: configs.length,
      configs: configs.map(c => ({
        ...c,
        secret: '***', // Hide secret in response
      })),
    });
  } catch (error) {
    console.error('[Webhook Config] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/webhooks/config
 * Create new webhook configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      agent_id,
      agent_name,
      webhook_url,
      events,
      enabled = true,
      retry_config,
      headers,
      timeout,
    } = body;

    // Validation
    if (!agent_id || !agent_name || !webhook_url) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['agent_id', 'agent_name', 'webhook_url'],
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        {
          error: 'events must be a non-empty array',
          example: ['task.assigned', 'task.updated'],
        },
        { status: 400 }
      );
    }

    // Generate secret if not provided
    const secret = body.secret || crypto.randomBytes(32).toString('hex');

    const config: AgentWebhookConfig = {
      agent_id,
      agent_name,
      webhook_url,
      secret,
      enabled,
      events,
      retry_config: retry_config || {
        max_attempts: 3,
        backoff_multiplier: 2,
        initial_delay: 1000,
      },
      headers,
      timeout: timeout || 30000,
    };

    WebhookDeliveryService.registerAgent(config);

    return NextResponse.json({
      success: true,
      message: 'Webhook configuration created',
      config: {
        ...config,
        secret: body.secret ? '***' : secret, // Return secret only if it was auto-generated
      },
    });
  } catch (error) {
    console.error('[Webhook Config] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/webhooks/config
 * Update webhook configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { agent_id, ...updates } = body;

    if (!agent_id) {
      return NextResponse.json(
        { error: 'agent_id is required' },
        { status: 400 }
      );
    }

    const config = WebhookDeliveryService.updateAgentConfig(agent_id, updates);

    if (!config) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook configuration updated',
      config: {
        ...config,
        secret: '***',
      },
    });
  } catch (error) {
    console.error('[Webhook Config] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/webhooks/config
 * Delete webhook configuration
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agent_id = searchParams.get('agent_id');

    if (!agent_id) {
      return NextResponse.json(
        { error: 'agent_id is required' },
        { status: 400 }
      );
    }

    const deleted = WebhookDeliveryService.deleteAgentConfig(agent_id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook configuration deleted',
    });
  } catch (error) {
    console.error('[Webhook Config] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
