/**
 * Task Completion Webhook
 * Receives task completion reports from distributed agents
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { TaskExecutionResponse } from '@/lib/webhook-types';
import { updateTask, getTask } from '@/lib/storage';
import { AgentCommunication } from '@/lib/agent-communication';
import { KnowledgeBase } from '@/lib/knowledge-base';
import { CostTracker } from '@/lib/cost-tracker';

/**
 * Verify webhook signature
 */
function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !signature.startsWith('sha256=')) {
    return false;
  }

  const receivedSig = signature.replace('sha256=', '');
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(receivedSig),
    Buffer.from(expectedSig)
  );
}

/**
 * POST /api/tasks/complete
 * Receive task completion from agents
 */
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-maestro-signature');
    const agentId = request.headers.get('x-agent-id');

    // Get raw body for signature verification
    const body = await request.text();
    const response: TaskExecutionResponse = JSON.parse(body);

    // Verify signature if configured
    const secret = process.env.WEBHOOK_SECRET || process.env.AGENT_WEBHOOK_SECRET;
    if (secret && signature) {
      const isValid = verifySignature(body, signature, secret);
      if (!isValid) {
        console.error('[Task Complete] Invalid signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    console.log(
      `[Task Complete] Task ${response.task_id} from agent ${agentId}: ${
        response.success ? 'SUCCESS' : 'FAILED'
      }`
    );

    // Get task details
    const task = getTask(response.task_id);
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Update task status
    if (response.success) {
      updateTask(response.task_id, {
        status: 'done',
        completed_date: response.timestamp,
      });

      // Broadcast completion to other agents
      AgentCommunication.broadcast(
        agentId || task.assigned_to_agent,
        'task_complete',
        {
          task_id: response.task_id,
          files_changed: response.result?.files_changed,
          summary: response.result?.summary,
        },
        'high'
      );

      // Save learnings to knowledge base if provided
      if (response.result?.summary) {
        KnowledgeBase.saveKnowledge(
          agentId || task.assigned_to_agent,
          `Task: ${task.title}`,
          response.result.summary,
          'solution',
          {
            task_id: response.task_id,
            project_id: task.project_id,
            confidence: 'high',
          }
        );
      }

      // Track cost if provided
      if (response.result?.cost_usd) {
        CostTracker.trackEvent({
          event_type: 'agent_execution',
          agent_id: agentId,
          agent_name: task.assigned_to_agent,
          cost_usd: response.result.cost_usd,
          details: {
            duration_ms: response.execution_time_ms,
          },
          project_id: task.project_id,
          task_id: response.task_id,
        });
      }

      console.log(`[Task Complete] ✓ Task ${response.task_id} marked as done`);
    } else {
      // Task failed
      updateTask(response.task_id, {
        status: 'blocked',
        blocked_reason: response.error?.message || 'Agent execution failed',
      });

      // Broadcast error to supervisor
      AgentCommunication.sendMessage(
        agentId || task.assigned_to_agent,
        'Supervisor Agent',
        'error_report',
        {
          task_id: response.task_id,
          error: response.error,
        },
        'high'
      );

      console.error(
        `[Task Complete] ✗ Task ${response.task_id} failed: ${response.error?.message}`
      );
    }

    return NextResponse.json({
      success: true,
      task_id: response.task_id,
      status: response.success ? 'completed' : 'failed',
      message: response.success
        ? 'Task marked as complete'
        : 'Task marked as blocked',
    });
  } catch (error) {
    console.error('[Task Complete] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tasks/complete
 * Health check
 */
export async function GET() {
  return NextResponse.json({
    service: 'Maestro Task Completion Webhook',
    status: 'active',
  });
}
