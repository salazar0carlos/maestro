/**
 * API route: /api/database/migrate
 * POST - Migrate data from localStorage to Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createProject,
  createTask,
  createAgent,
  createImprovement,
} from '@/lib/storage-adapter';
import type { Project, MaestroTask, Agent, ImprovementSuggestion } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projects = [], tasks = [], agents = [], improvements = [] } = body;

    let migrated = {
      projects: 0,
      tasks: 0,
      agents: 0,
      improvements: 0,
    };

    // Migrate projects
    for (const project of projects as Project[]) {
      try {
        await createProject(project);
        migrated.projects++;
      } catch (error) {
        console.error(`[migrate] Failed to migrate project ${project.project_id}:`, error);
      }
    }

    // Migrate agents
    for (const agent of agents as Agent[]) {
      try {
        await createAgent(agent);
        migrated.agents++;
      } catch (error) {
        console.error(`[migrate] Failed to migrate agent ${agent.agent_id}:`, error);
      }
    }

    // Migrate tasks
    for (const task of tasks as MaestroTask[]) {
      try {
        await createTask(task);
        migrated.tasks++;
      } catch (error) {
        console.error(`[migrate] Failed to migrate task ${task.task_id}:`, error);
      }
    }

    // Migrate improvements
    for (const improvement of improvements as ImprovementSuggestion[]) {
      try {
        await createImprovement(improvement);
        migrated.improvements++;
      } catch (error) {
        console.error(`[migrate] Failed to migrate improvement ${improvement.improvement_id}:`, error);
      }
    }

    const total = migrated.projects + migrated.tasks + migrated.agents + migrated.improvements;

    return NextResponse.json({
      success: true,
      message: `Successfully migrated ${total} items`,
      migrated,
      total,
    });
  } catch (error) {
    console.error('[migrate] Error:', error);
    return NextResponse.json(
      {
        error: 'Migration failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
