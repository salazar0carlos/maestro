/**
 * Self-Improvement Loop
 * ProductImprovementAgent analyzes its own suggestion quality
 */

import { getSupabase, Tables, SuggestionQualityMetrics } from './supabase';
import { EventBus } from './event-system';
import { getAnalysisHistoryService } from './analysis-history';

export interface QualityAnalysis {
  analysis_id: string;
  total_suggestions: number;
  approval_rate: number;
  implementation_rate: number;
  avg_confidence_score: number;
  pattern_matches: number;
  research_triggers: number;
  quality_score: number;
  insights: string[];
  recommendations: string[];
}

/**
 * Self-Improvement Service
 * Analyzes suggestion quality to improve over time
 */
export class SelfImprovementService {
  /**
   * Analyze suggestion quality for a completed analysis
   */
  async analyzeSuggestionQuality(analysisId: string): Promise<QualityAnalysis> {
    try {
      const historyService = getAnalysisHistoryService();
      const analysis = await historyService.getAnalysisById(analysisId);

      if (!analysis) {
        throw new Error(`Analysis not found: ${analysisId}`);
      }

      // Calculate metrics
      const totalSuggestions = analysis.suggestions_count;
      const approvedCount = analysis.approved_count;
      const implementedCount = analysis.implemented_count;

      const approvalRate = totalSuggestions > 0
        ? (approvedCount / totalSuggestions) * 100
        : 0;

      const implementationRate = approvedCount > 0
        ? (implementedCount / approvedCount) * 100
        : 0;

      // Extract pattern matches and research triggers from analysis data
      const analysisData = analysis.analysis_data || {};
      const patternMatches = this.countPatternMatches(analysisData);
      const researchTriggers = this.countResearchTriggers(analysisData);

      // Calculate average confidence score
      const avgConfidence = this.calculateAvgConfidence(analysisData);

      // Calculate overall quality score
      const qualityScore = this.calculateQualityScore(
        approvalRate,
        implementationRate,
        avgConfidence,
        patternMatches,
        totalSuggestions
      );

      // Generate insights
      const insights = this.generateInsights(
        approvalRate,
        implementationRate,
        avgConfidence,
        patternMatches,
        researchTriggers,
        totalSuggestions
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        approvalRate,
        implementationRate,
        avgConfidence,
        patternMatches,
        researchTriggers
      );

      // Save quality metrics
      await this.saveQualityMetrics(analysisId, {
        total_suggestions: totalSuggestions,
        approval_rate: approvalRate,
        implementation_rate: implementationRate,
        avg_confidence_score: avgConfidence,
        pattern_matches: patternMatches,
        research_triggers: researchTriggers,
        quality_score: qualityScore,
      });

      const result: QualityAnalysis = {
        analysis_id: analysisId,
        total_suggestions: totalSuggestions,
        approval_rate: Math.round(approvalRate * 100) / 100,
        implementation_rate: Math.round(implementationRate * 100) / 100,
        avg_confidence_score: avgConfidence,
        pattern_matches: patternMatches,
        research_triggers: researchTriggers,
        quality_score: Math.round(qualityScore * 100) / 100,
        insights,
        recommendations,
      };

      console.log(`🎯 Quality analysis complete for ${analysisId}: ${qualityScore.toFixed(2)}/100`);

      await EventBus.emit('quality.analyzed', result);

      return result;
    } catch (error) {
      console.error('Error analyzing suggestion quality:', error);
      throw error;
    }
  }

  /**
   * Save quality metrics to database
   */
  private async saveQualityMetrics(
    analysisId: string,
    metrics: Omit<SuggestionQualityMetrics, 'id' | 'created_at' | 'analysis_id'>
  ): Promise<void> {
    const supabase = getSupabase();

    try {
      const { error } = await supabase
        .from(Tables.SUGGESTION_QUALITY_METRICS)
        .insert({
          analysis_id: analysisId,
          ...metrics,
        });

      if (error) {
        throw new Error(`Failed to save quality metrics: ${error.message}`);
      }
    } catch (error) {
      console.error('Error saving quality metrics:', error);
      throw error;
    }
  }

  /**
   * Count pattern matches in analysis
   */
  private countPatternMatches(analysisData: any): number {
    if (!Array.isArray(analysisData)) return 0;

    return analysisData.filter((suggestion: any) =>
      suggestion.pattern_match === true || suggestion.matched_pattern
    ).length;
  }

  /**
   * Count research triggers in analysis
   */
  private countResearchTriggers(analysisData: any): number {
    if (!Array.isArray(analysisData)) return 0;

    return analysisData.filter((suggestion: any) =>
      suggestion.research_triggered === true || suggestion.research_requested
    ).length;
  }

  /**
   * Calculate average confidence score
   */
  private calculateAvgConfidence(analysisData: any): number {
    if (!Array.isArray(analysisData) || analysisData.length === 0) return 0.5;

    const confidences = analysisData
      .map((s: any) => s.confidence || 0.5)
      .filter((c: number) => c > 0);

    if (confidences.length === 0) return 0.5;

    const avg = confidences.reduce((sum: number, c: number) => sum + c, 0) / confidences.length;
    return Math.round(avg * 100) / 100;
  }

  /**
   * Calculate overall quality score (0-100)
   */
  private calculateQualityScore(
    approvalRate: number,
    implementationRate: number,
    avgConfidence: number,
    patternMatches: number,
    totalSuggestions: number
  ): number {
    // Weighted scoring:
    // - Approval rate: 30%
    // - Implementation rate: 30%
    // - Avg confidence: 20%
    // - Pattern match rate: 20%

    const approvalScore = approvalRate * 0.3;
    const implementationScore = implementationRate * 0.3;
    const confidenceScore = (avgConfidence * 100) * 0.2;

    const patternMatchRate = totalSuggestions > 0
      ? (patternMatches / totalSuggestions) * 100
      : 0;
    const patternScore = patternMatchRate * 0.2;

    return approvalScore + implementationScore + confidenceScore + patternScore;
  }

  /**
   * Generate insights from metrics
   */
  private generateInsights(
    approvalRate: number,
    implementationRate: number,
    avgConfidence: number,
    patternMatches: number,
    researchTriggers: number,
    totalSuggestions: number
  ): string[] {
    const insights: string[] = [];

    // Approval rate insights
    if (approvalRate > 70) {
      insights.push('High approval rate indicates relevant and valuable suggestions');
    } else if (approvalRate < 30) {
      insights.push('Low approval rate suggests suggestions may not align with project needs');
    }

    // Implementation rate insights
    if (implementationRate > 80 && approvalRate > 50) {
      insights.push('Excellent implementation rate shows high-quality approved suggestions');
    } else if (implementationRate < 40) {
      insights.push('Low implementation rate may indicate approved suggestions are too complex');
    }

    // Confidence insights
    if (avgConfidence < 0.4) {
      insights.push('Low average confidence suggests unfamiliar patterns or uncertainty');
    } else if (avgConfidence > 0.8) {
      insights.push('High confidence indicates strong pattern recognition');
    }

    // Pattern matching insights
    const patternMatchRate = totalSuggestions > 0
      ? (patternMatches / totalSuggestions) * 100
      : 0;

    if (patternMatchRate > 60) {
      insights.push('Good pattern library utilization improving suggestion quality');
    } else if (patternMatchRate < 20) {
      insights.push('Low pattern matching suggests encountering new code patterns');
    }

    // Research insights
    if (researchTriggers > totalSuggestions * 0.3) {
      insights.push('Frequent research requests indicate exploration of unfamiliar domains');
    }

    return insights;
  }

  /**
   * Generate recommendations for improvement
   */
  private generateRecommendations(
    approvalRate: number,
    implementationRate: number,
    avgConfidence: number,
    patternMatches: number,
    researchTriggers: number
  ): string[] {
    const recommendations: string[] = [];

    // Approval rate recommendations
    if (approvalRate < 40) {
      recommendations.push('Focus on project-specific context and user needs');
      recommendations.push('Review rejected suggestions to identify common patterns');
    }

    // Implementation rate recommendations
    if (implementationRate < 50 && approvalRate > 40) {
      recommendations.push('Break down complex suggestions into smaller, actionable tasks');
      recommendations.push('Provide more detailed implementation guidance');
    }

    // Confidence recommendations
    if (avgConfidence < 0.5) {
      recommendations.push('Trigger more research for unfamiliar patterns');
      recommendations.push('Build up pattern library with successful suggestions');
    }

    // Pattern library recommendations
    if (patternMatches < 3) {
      recommendations.push('Continue building pattern library from approved/rejected suggestions');
    }

    // Research recommendations
    if (researchTriggers === 0 && avgConfidence < 0.6) {
      recommendations.push('Consider triggering research for low-confidence suggestions');
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Maintain current approach and continue monitoring quality metrics');
    }

    return recommendations;
  }

  /**
   * Get quality trends over time
   */
  async getQualityTrends(
    projectId: string,
    days: number = 30
  ): Promise<SuggestionQualityMetrics[]> {
    const supabase = getSupabase();

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Get quality metrics joined with analysis history
      const { data, error } = await supabase
        .from(Tables.SUGGESTION_QUALITY_METRICS)
        .select(`
          *,
          analysis_history!inner (
            project_id,
            analysis_date
          )
        `)
        .eq('analysis_history.project_id', projectId)
        .gte('created_at', cutoffDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get quality trends: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error getting quality trends:', error);
      return [];
    }
  }

  /**
   * Get average quality score for a project
   */
  async getAverageQualityScore(projectId: string, days: number = 30): Promise<number> {
    try {
      const trends = await this.getQualityTrends(projectId, days);

      if (trends.length === 0) return 0;

      const totalScore = trends.reduce((sum, t) => sum + t.quality_score, 0);
      return Math.round((totalScore / trends.length) * 100) / 100;
    } catch (error) {
      console.error('Error getting average quality score:', error);
      return 0;
    }
  }
}

// Singleton instance
let selfImprovementInstance: SelfImprovementService | null = null;

export function getSelfImprovement(): SelfImprovementService {
  if (!selfImprovementInstance) {
    selfImprovementInstance = new SelfImprovementService();
  }
  return selfImprovementInstance;
}
