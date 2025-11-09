/**
 * Impact Tracking
 * Measures results of approved suggestions (performance, errors, etc.)
 */

import { getSupabase, Tables, ImpactTracking } from './supabase';
import { EventBus } from './event-system';

export interface ImpactMetric {
  improvement_id: string;
  project_id: string;
  metric_type: 'performance' | 'errors' | 'code_quality' | 'user_experience';
  baseline_value: number;
  current_value: number;
  metadata?: any;
}

export interface ImpactSummary {
  improvement_id: string;
  project_id: string;
  total_impact: number;
  metrics_tracked: number;
  performance_improvement: number | null;
  error_reduction: number | null;
  quality_improvement: number | null;
  ux_improvement: number | null;
}

/**
 * Impact Tracking Service
 * Measures real-world results of implemented suggestions
 */
export class ImpactTrackingService {
  /**
   * Record impact metric
   */
  async recordImpact(metric: ImpactMetric): Promise<string> {
    const supabase = getSupabase();

    try {
      const improvementPercentage = this.calculateImprovement(
        metric.baseline_value,
        metric.current_value,
        metric.metric_type
      );

      const record = {
        improvement_id: metric.improvement_id,
        project_id: metric.project_id,
        metric_type: metric.metric_type,
        baseline_value: metric.baseline_value,
        current_value: metric.current_value,
        improvement_percentage: improvementPercentage,
        measurement_date: new Date().toISOString(),
        metadata: metric.metadata || null,
      };

      const { data, error } = await supabase
        .from(Tables.IMPACT_TRACKING)
        .insert(record)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to record impact: ${error.message}`);
      }

      console.log(
        `✓ Recorded ${metric.metric_type} impact: ${improvementPercentage.toFixed(2)}% improvement`
      );

      await EventBus.emit('impact.recorded', {
        impact_id: data.id,
        improvement_id: metric.improvement_id,
        metric_type: metric.metric_type,
        improvement_percentage: improvementPercentage,
      });

      return data.id;
    } catch (error) {
      console.error('Error recording impact:', error);
      throw error;
    }
  }

  /**
   * Calculate improvement percentage
   */
  private calculateImprovement(
    baseline: number,
    current: number,
    metricType: string
  ): number {
    if (baseline === 0) return 0;

    let improvement: number;

    if (metricType === 'errors') {
      // For errors, lower is better
      improvement = ((baseline - current) / baseline) * 100;
    } else {
      // For performance, quality, UX, higher is better
      improvement = ((current - baseline) / baseline) * 100;
    }

    return Math.round(improvement * 100) / 100;
  }

  /**
   * Get impact summary for an improvement
   */
  async getImpactSummary(improvementId: string): Promise<ImpactSummary | null> {
    const supabase = getSupabase();

    try {
      const { data, error } = await supabase
        .from(Tables.IMPACT_TRACKING)
        .select('*')
        .eq('improvement_id', improvementId);

      if (error) {
        throw new Error(`Failed to get impact summary: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return null;
      }

      const projectId = data[0].project_id;
      const totalImpact = data.reduce((sum, m) => sum + m.improvement_percentage, 0) / data.length;

      const performanceMetrics = data.filter(m => m.metric_type === 'performance');
      const errorMetrics = data.filter(m => m.metric_type === 'errors');
      const qualityMetrics = data.filter(m => m.metric_type === 'code_quality');
      const uxMetrics = data.filter(m => m.metric_type === 'user_experience');

      const avgImprovement = (metrics: any[]) =>
        metrics.length > 0
          ? metrics.reduce((sum, m) => sum + m.improvement_percentage, 0) / metrics.length
          : null;

      return {
        improvement_id: improvementId,
        project_id: projectId,
        total_impact: Math.round(totalImpact * 100) / 100,
        metrics_tracked: data.length,
        performance_improvement: avgImprovement(performanceMetrics),
        error_reduction: avgImprovement(errorMetrics),
        quality_improvement: avgImprovement(qualityMetrics),
        ux_improvement: avgImprovement(uxMetrics),
      };
    } catch (error) {
      console.error('Error getting impact summary:', error);
      return null;
    }
  }

  /**
   * Get all impact metrics for a project
   */
  async getProjectImpacts(
    projectId: string,
    days: number = 30
  ): Promise<ImpactTracking[]> {
    const supabase = getSupabase();

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { data, error } = await supabase
        .from(Tables.IMPACT_TRACKING)
        .select('*')
        .eq('project_id', projectId)
        .gte('measurement_date', cutoffDate.toISOString())
        .order('measurement_date', { ascending: false });

      if (error) {
        throw new Error(`Failed to get project impacts: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error getting project impacts:', error);
      return [];
    }
  }

  /**
   * Get impact metrics by type
   */
  async getMetricsByType(
    projectId: string,
    metricType: 'performance' | 'errors' | 'code_quality' | 'user_experience',
    limit: number = 20
  ): Promise<ImpactTracking[]> {
    const supabase = getSupabase();

    try {
      const { data, error } = await supabase
        .from(Tables.IMPACT_TRACKING)
        .select('*')
        .eq('project_id', projectId)
        .eq('metric_type', metricType)
        .order('measurement_date', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to get metrics by type: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error getting metrics by type:', error);
      return [];
    }
  }

  /**
   * Get overall project impact statistics
   */
  async getProjectImpactStats(
    projectId: string,
    days: number = 30
  ): Promise<{
    total_improvements: number;
    avg_performance_improvement: number;
    avg_error_reduction: number;
    avg_quality_improvement: number;
    avg_ux_improvement: number;
    overall_impact_score: number;
  }> {
    try {
      const impacts = await this.getProjectImpacts(projectId, days);

      if (impacts.length === 0) {
        return {
          total_improvements: 0,
          avg_performance_improvement: 0,
          avg_error_reduction: 0,
          avg_quality_improvement: 0,
          avg_ux_improvement: 0,
          overall_impact_score: 0,
        };
      }

      const performanceImpacts = impacts.filter(i => i.metric_type === 'performance');
      const errorImpacts = impacts.filter(i => i.metric_type === 'errors');
      const qualityImpacts = impacts.filter(i => i.metric_type === 'code_quality');
      const uxImpacts = impacts.filter(i => i.metric_type === 'user_experience');

      const avg = (arr: any[]) =>
        arr.length > 0
          ? arr.reduce((sum, i) => sum + i.improvement_percentage, 0) / arr.length
          : 0;

      const avgPerformance = avg(performanceImpacts);
      const avgErrors = avg(errorImpacts);
      const avgQuality = avg(qualityImpacts);
      const avgUX = avg(uxImpacts);

      // Overall impact score (weighted average)
      const overallImpact = (avgPerformance + avgErrors + avgQuality + avgUX) / 4;

      return {
        total_improvements: new Set(impacts.map(i => i.improvement_id)).size,
        avg_performance_improvement: Math.round(avgPerformance * 100) / 100,
        avg_error_reduction: Math.round(avgErrors * 100) / 100,
        avg_quality_improvement: Math.round(avgQuality * 100) / 100,
        avg_ux_improvement: Math.round(avgUX * 100) / 100,
        overall_impact_score: Math.round(overallImpact * 100) / 100,
      };
    } catch (error) {
      console.error('Error getting project impact stats:', error);
      throw error;
    }
  }

  /**
   * Track performance metric (convenience method)
   */
  async trackPerformance(
    improvementId: string,
    projectId: string,
    baselineMs: number,
    currentMs: number,
    operation: string
  ): Promise<string> {
    return this.recordImpact({
      improvement_id: improvementId,
      project_id: projectId,
      metric_type: 'performance',
      baseline_value: baselineMs,
      current_value: currentMs,
      metadata: { operation },
    });
  }

  /**
   * Track error metric (convenience method)
   */
  async trackErrors(
    improvementId: string,
    projectId: string,
    baselineErrors: number,
    currentErrors: number,
    errorType?: string
  ): Promise<string> {
    return this.recordImpact({
      improvement_id: improvementId,
      project_id: projectId,
      metric_type: 'errors',
      baseline_value: baselineErrors,
      current_value: currentErrors,
      metadata: { error_type: errorType },
    });
  }

  /**
   * Delete old impact records (cleanup)
   */
  async deleteOldImpacts(projectId: string, keepDays: number = 90): Promise<number> {
    const supabase = getSupabase();

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - keepDays);

      const { data, error } = await supabase
        .from(Tables.IMPACT_TRACKING)
        .delete()
        .eq('project_id', projectId)
        .lt('measurement_date', cutoffDate.toISOString())
        .select();

      if (error) {
        throw new Error(`Failed to delete old impacts: ${error.message}`);
      }

      const deletedCount = data?.length || 0;
      console.log(`Deleted ${deletedCount} old impact records for project ${projectId}`);

      return deletedCount;
    } catch (error) {
      console.error('Error deleting old impacts:', error);
      throw error;
    }
  }
}

// Singleton instance
let impactTrackingInstance: ImpactTrackingService | null = null;

export function getImpactTracking(): ImpactTrackingService {
  if (!impactTrackingInstance) {
    impactTrackingInstance = new ImpactTrackingService();
  }
  return impactTrackingInstance;
}
