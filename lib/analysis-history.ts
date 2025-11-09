/**
 * Analysis History Tracking
 * Stores and retrieves analysis results from Supabase
 */

import { getSupabase, Tables, AnalysisHistory } from './supabase';
import { EventBus } from './event-system';

export interface AnalysisResult {
  project_id: string;
  suggestions: any[];
  approved_count: number;
  rejected_count: number;
  implemented_count: number;
  model_version: string;
  execution_time_ms: number;
  code_snapshot?: string;
}

export interface AnalysisStats {
  total_analyses: number;
  total_suggestions: number;
  total_approved: number;
  total_rejected: number;
  total_implemented: number;
  avg_execution_time: number;
  approval_rate: number;
  implementation_rate: number;
}

/**
 * Analysis History Service
 * Manages storage and retrieval of analysis results
 */
export class AnalysisHistoryService {
  /**
   * Save analysis result to database
   */
  async saveAnalysis(result: AnalysisResult): Promise<string> {
    const supabase = getSupabase();

    try {
      const record = {
        project_id: result.project_id,
        analysis_date: new Date().toISOString(),
        suggestions_count: result.suggestions.length,
        approved_count: result.approved_count,
        rejected_count: result.rejected_count,
        implemented_count: result.implemented_count,
        analysis_data: result.suggestions,
        code_snapshot: result.code_snapshot || null,
        model_version: result.model_version,
        execution_time_ms: result.execution_time_ms,
      };

      const { data, error } = await supabase
        .from(Tables.ANALYSIS_HISTORY)
        .insert(record)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save analysis: ${error.message}`);
      }

      console.log(`✓ Saved analysis for project ${result.project_id}: ${data.id}`);

      // Emit event
      await EventBus.emit('analysis.saved', {
        analysis_id: data.id,
        project_id: result.project_id,
        suggestions_count: result.suggestions.length,
      });

      return data.id;
    } catch (error) {
      console.error('Error saving analysis:', error);
      throw error;
    }
  }

  /**
   * Get analysis history for a project
   */
  async getHistory(
    projectId: string,
    limit: number = 10
  ): Promise<AnalysisHistory[]> {
    const supabase = getSupabase();

    try {
      const { data, error } = await supabase
        .from(Tables.ANALYSIS_HISTORY)
        .select('*')
        .eq('project_id', projectId)
        .order('analysis_date', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to get history: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error getting analysis history:', error);
      throw error;
    }
  }

  /**
   * Get latest analysis for a project
   */
  async getLatestAnalysis(projectId: string): Promise<AnalysisHistory | null> {
    const supabase = getSupabase();

    try {
      const { data, error } = await supabase
        .from(Tables.ANALYSIS_HISTORY)
        .select('*')
        .eq('project_id', projectId)
        .order('analysis_date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to get latest analysis: ${error.message}`);
      }

      return data || null;
    } catch (error) {
      console.error('Error getting latest analysis:', error);
      return null;
    }
  }

  /**
   * Get analysis by ID
   */
  async getAnalysisById(analysisId: string): Promise<AnalysisHistory | null> {
    const supabase = getSupabase();

    try {
      const { data, error } = await supabase
        .from(Tables.ANALYSIS_HISTORY)
        .select('*')
        .eq('id', analysisId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to get analysis: ${error.message}`);
      }

      return data || null;
    } catch (error) {
      console.error('Error getting analysis by ID:', error);
      return null;
    }
  }

  /**
   * Get analysis statistics for a project
   */
  async getStats(projectId: string, days: number = 30): Promise<AnalysisStats> {
    const supabase = getSupabase();

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { data, error } = await supabase
        .from(Tables.ANALYSIS_HISTORY)
        .select('*')
        .eq('project_id', projectId)
        .gte('analysis_date', cutoffDate.toISOString());

      if (error) {
        throw new Error(`Failed to get stats: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return {
          total_analyses: 0,
          total_suggestions: 0,
          total_approved: 0,
          total_rejected: 0,
          total_implemented: 0,
          avg_execution_time: 0,
          approval_rate: 0,
          implementation_rate: 0,
        };
      }

      const totalAnalyses = data.length;
      const totalSuggestions = data.reduce((sum, a) => sum + a.suggestions_count, 0);
      const totalApproved = data.reduce((sum, a) => sum + a.approved_count, 0);
      const totalRejected = data.reduce((sum, a) => sum + a.rejected_count, 0);
      const totalImplemented = data.reduce((sum, a) => sum + a.implemented_count, 0);
      const avgExecutionTime = data.reduce((sum, a) => sum + a.execution_time_ms, 0) / totalAnalyses;

      const approvalRate = totalSuggestions > 0 ? (totalApproved / totalSuggestions) * 100 : 0;
      const implementationRate = totalApproved > 0 ? (totalImplemented / totalApproved) * 100 : 0;

      return {
        total_analyses: totalAnalyses,
        total_suggestions: totalSuggestions,
        total_approved: totalApproved,
        total_rejected: totalRejected,
        total_implemented: totalImplemented,
        avg_execution_time: Math.round(avgExecutionTime),
        approval_rate: Math.round(approvalRate * 100) / 100,
        implementation_rate: Math.round(implementationRate * 100) / 100,
      };
    } catch (error) {
      console.error('Error getting analysis stats:', error);
      throw error;
    }
  }

  /**
   * Compare two analyses
   */
  async compareAnalyses(
    analysisId1: string,
    analysisId2: string
  ): Promise<{
    analysis1: AnalysisHistory;
    analysis2: AnalysisHistory;
    differences: {
      suggestions_diff: number;
      approval_rate_diff: number;
      execution_time_diff: number;
    };
  } | null> {
    try {
      const analysis1 = await this.getAnalysisById(analysisId1);
      const analysis2 = await this.getAnalysisById(analysisId2);

      if (!analysis1 || !analysis2) {
        return null;
      }

      const approvalRate1 = analysis1.suggestions_count > 0
        ? (analysis1.approved_count / analysis1.suggestions_count) * 100
        : 0;

      const approvalRate2 = analysis2.suggestions_count > 0
        ? (analysis2.approved_count / analysis2.suggestions_count) * 100
        : 0;

      return {
        analysis1,
        analysis2,
        differences: {
          suggestions_diff: analysis2.suggestions_count - analysis1.suggestions_count,
          approval_rate_diff: approvalRate2 - approvalRate1,
          execution_time_diff: analysis2.execution_time_ms - analysis1.execution_time_ms,
        },
      };
    } catch (error) {
      console.error('Error comparing analyses:', error);
      return null;
    }
  }

  /**
   * Delete old analyses (cleanup)
   */
  async deleteOldAnalyses(projectId: string, keepDays: number = 90): Promise<number> {
    const supabase = getSupabase();

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - keepDays);

      const { data, error } = await supabase
        .from(Tables.ANALYSIS_HISTORY)
        .delete()
        .eq('project_id', projectId)
        .lt('analysis_date', cutoffDate.toISOString())
        .select();

      if (error) {
        throw new Error(`Failed to delete old analyses: ${error.message}`);
      }

      const deletedCount = data?.length || 0;
      console.log(`Deleted ${deletedCount} old analyses for project ${projectId}`);

      return deletedCount;
    } catch (error) {
      console.error('Error deleting old analyses:', error);
      throw error;
    }
  }
}

// Singleton instance
let historyServiceInstance: AnalysisHistoryService | null = null;

export function getAnalysisHistoryService(): AnalysisHistoryService {
  if (!historyServiceInstance) {
    historyServiceInstance = new AnalysisHistoryService();
  }
  return historyServiceInstance;
}
