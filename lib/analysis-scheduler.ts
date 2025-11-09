/**
 * Continuous Analysis Engine - Scheduler
 * Runs ProductImprovementAgent analysis every 24 hours for each active project
 */

import { getSupabase, Tables } from './supabase';
import { EventBus, EventTypes } from './event-system';

export interface ScheduledAnalysis {
  project_id: string;
  project_name: string;
  last_analysis_date: string | null;
  next_analysis_date: string;
  is_active: boolean;
}

export interface AnalysisSchedulerConfig {
  interval_hours: number; // Default: 24
  enabled: boolean;
  auto_start: boolean;
}

/**
 * Analysis Scheduler Service
 * Manages periodic analysis runs for all active projects
 */
export class AnalysisScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private config: AnalysisSchedulerConfig;
  private isRunning: boolean = false;

  constructor(config: Partial<AnalysisSchedulerConfig> = {}) {
    this.config = {
      interval_hours: config.interval_hours || 24,
      enabled: config.enabled !== false,
      auto_start: config.auto_start !== false,
    };
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️ Analysis scheduler is already running');
      return;
    }

    if (!this.config.enabled) {
      console.log('⚠️ Analysis scheduler is disabled');
      return;
    }

    console.log(`🚀 Starting analysis scheduler (interval: ${this.config.interval_hours}h)`);
    this.isRunning = true;

    // Run immediately on start
    if (this.config.auto_start) {
      this.runScheduledAnalysis().catch((error) => {
        console.error('❌ Error in initial analysis run:', error);
      });
    }

    // Set up recurring interval
    const intervalMs = this.config.interval_hours * 60 * 60 * 1000;
    this.intervalId = setInterval(() => {
      this.runScheduledAnalysis().catch((error) => {
        console.error('❌ Error in scheduled analysis run:', error);
      });
    }, intervalMs);

    EventBus.emit('scheduler.started', {
      interval_hours: this.config.interval_hours,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('⚠️ Analysis scheduler is not running');
      return;
    }

    console.log('🛑 Stopping analysis scheduler');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;

    EventBus.emit('scheduler.stopped', {
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Run analysis for all active projects
   */
  async runScheduledAnalysis(): Promise<void> {
    console.log('📊 Running scheduled analysis for all active projects...');
    const startTime = Date.now();

    try {
      // Get all active projects
      const projects = await this.getActiveProjects();

      if (projects.length === 0) {
        console.log('ℹ️ No active projects found for analysis');
        return;
      }

      console.log(`📋 Found ${projects.length} active project(s) to analyze`);

      // Run analysis for each project
      const results = await Promise.allSettled(
        projects.map((project) => this.runProjectAnalysis(project))
      );

      // Count successes and failures
      const successes = results.filter((r) => r.status === 'fulfilled').length;
      const failures = results.filter((r) => r.status === 'rejected').length;

      const duration = Date.now() - startTime;

      console.log(`✅ Analysis complete: ${successes} succeeded, ${failures} failed (${duration}ms)`);

      EventBus.emit('scheduler.analysis_complete', {
        total_projects: projects.length,
        successes,
        failures,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Error in scheduled analysis:', error);
      EventBus.emit('scheduler.error', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Run analysis for a specific project
   */
  async runProjectAnalysis(project: { project_id: string; name: string }): Promise<void> {
    console.log(`🔍 Analyzing project: ${project.name} (${project.project_id})`);

    try {
      // Check if analysis is due
      const isDue = await this.isAnalysisDue(project.project_id);

      if (!isDue) {
        console.log(`⏭️ Skipping ${project.name} - analysis not due yet`);
        return;
      }

      // Trigger analysis event for ProductImprovementAgent
      await EventBus.emit('analysis.requested', {
        project_id: project.project_id,
        project_name: project.name,
        trigger: 'scheduler',
        timestamp: new Date().toISOString(),
      });

      console.log(`✓ Analysis triggered for ${project.name}`);
    } catch (error) {
      console.error(`❌ Error analyzing project ${project.name}:`, error);
      throw error;
    }
  }

  /**
   * Check if analysis is due for a project
   */
  async isAnalysisDue(projectId: string): Promise<boolean> {
    try {
      const supabase = getSupabase();

      // Get last analysis date
      const { data, error } = await supabase
        .from(Tables.ANALYSIS_HISTORY)
        .select('analysis_date')
        .eq('project_id', projectId)
        .order('analysis_date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking analysis due date:', error);
        return true; // Assume due if error
      }

      // If no previous analysis, it's due
      if (!data) {
        return true;
      }

      // Check if enough time has passed
      const lastAnalysis = new Date(data.analysis_date);
      const now = new Date();
      const hoursSinceLastAnalysis = (now.getTime() - lastAnalysis.getTime()) / (1000 * 60 * 60);

      return hoursSinceLastAnalysis >= this.config.interval_hours;
    } catch (error) {
      console.error('Error in isAnalysisDue:', error);
      return true; // Assume due if error
    }
  }

  /**
   * Get all active projects
   */
  private async getActiveProjects(): Promise<Array<{ project_id: string; name: string }>> {
    // For now, use localStorage-based approach
    // TODO: Migrate to Supabase when project data is moved there

    if (typeof window !== 'undefined') {
      // Browser environment
      const projectsData = localStorage.getItem('maestro-projects');
      if (!projectsData) return [];

      const projects = JSON.parse(projectsData);
      return projects
        .filter((p: any) => p.status === 'active')
        .map((p: any) => ({
          project_id: p.project_id,
          name: p.name,
        }));
    } else {
      // Server environment - would need to fetch from Supabase or API
      try {
        const response = await fetch('http://localhost:3000/api/projects');
        if (!response.ok) {
          throw new Error(`Failed to fetch projects: ${response.statusText}`);
        }
        const projects = await response.json();
        return projects
          .filter((p: any) => p.status === 'active')
          .map((p: any) => ({
            project_id: p.project_id,
            name: p.name,
          }));
      } catch (error) {
        console.error('Error fetching active projects:', error);
        return [];
      }
    }
  }

  /**
   * Get scheduled analysis info for all projects
   */
  async getScheduledAnalyses(): Promise<ScheduledAnalysis[]> {
    const projects = await this.getActiveProjects();
    const supabase = getSupabase();

    const scheduledAnalyses: ScheduledAnalysis[] = [];

    for (const project of projects) {
      try {
        // Get last analysis
        const { data, error } = await supabase
          .from(Tables.ANALYSIS_HISTORY)
          .select('analysis_date')
          .eq('project_id', project.project_id)
          .order('analysis_date', { ascending: false })
          .limit(1)
          .single();

        let lastAnalysisDate: string | null = null;
        let nextAnalysisDate: Date;

        if (data && !error) {
          lastAnalysisDate = data.analysis_date;
          const lastDate = new Date(lastAnalysisDate);
          nextAnalysisDate = new Date(lastDate.getTime() + this.config.interval_hours * 60 * 60 * 1000);
        } else {
          // No previous analysis, next is now
          nextAnalysisDate = new Date();
        }

        scheduledAnalyses.push({
          project_id: project.project_id,
          project_name: project.name,
          last_analysis_date: lastAnalysisDate,
          next_analysis_date: nextAnalysisDate.toISOString(),
          is_active: true,
        });
      } catch (error) {
        console.error(`Error getting schedule for ${project.name}:`, error);
      }
    }

    return scheduledAnalyses;
  }

  /**
   * Force analysis for a specific project (bypass schedule)
   */
  async forceAnalysis(projectId: string, projectName?: string): Promise<void> {
    console.log(`🔧 Forcing analysis for project: ${projectId}`);

    await EventBus.emit('analysis.requested', {
      project_id: projectId,
      project_name: projectName || projectId,
      trigger: 'manual',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    config: AnalysisSchedulerConfig;
    nextRunTime: string | null;
  } {
    let nextRunTime: string | null = null;

    if (this.isRunning && this.intervalId) {
      // Estimate next run time (current time + interval)
      const next = new Date(Date.now() + this.config.interval_hours * 60 * 60 * 1000);
      nextRunTime = next.toISOString();
    }

    return {
      isRunning: this.isRunning,
      config: this.config,
      nextRunTime,
    };
  }
}

// Singleton instance
let schedulerInstance: AnalysisScheduler | null = null;

/**
 * Get the global scheduler instance
 */
export function getScheduler(config?: Partial<AnalysisSchedulerConfig>): AnalysisScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new AnalysisScheduler(config);
  }
  return schedulerInstance;
}
