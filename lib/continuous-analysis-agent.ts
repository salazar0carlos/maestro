/**
 * Continuous Analysis Agent (Enhanced ProductImprovementAgent)
 * Integrates all Phase 3 Intelligence Layer features:
 * - Analysis History Tracking
 * - Pattern Library Learning
 * - Code Comparison Engine
 * - Impact Tracking
 * - Research Integration
 * - Self-Improvement Loop
 */

import { EventBus } from './event-system';
import { getAnalysisHistoryService } from './analysis-history';
import { getPatternLibrary } from './pattern-library';
import { getComparisonEngine } from './comparison-engine';
import { getImpactTracking } from './impact-tracking';
import { getResearchIntegration } from './research-integration';
import { getSelfImprovement } from './self-improvement';

export interface AnalysisConfig {
  project_id: string;
  project_name: string;
  code_files?: Record<string, string>;
  git_commit?: string;
  anthropic_api_key: string;
}

export interface Suggestion {
  id: string;
  title: string;
  description: string;
  code_example?: string;
  priority: number;
  estimated_impact: 'low' | 'medium' | 'high';
  confidence: number;
  pattern_match?: boolean;
  matched_pattern?: string;
  research_triggered?: boolean;
  research_request_id?: string;
}

export interface AnalysisOutput {
  project_id: string;
  suggestions: Suggestion[];
  code_evolution?: any;
  pattern_matches: number;
  research_triggers: number;
  execution_time_ms: number;
  analysis_id?: string;
}

/**
 * Continuous Analysis Agent
 * Runs intelligent analysis with full learning capabilities
 */
export class ContinuousAnalysisAgent {
  private historyService = getAnalysisHistoryService();
  private patternLibrary = getPatternLibrary();
  private comparisonEngine = getComparisonEngine();
  private impactTracking = getImpactTracking();
  private researchIntegration = getResearchIntegration();
  private selfImprovement = getSelfImprovement();

  /**
   * Run complete analysis on a project
   */
  async runAnalysis(config: AnalysisConfig): Promise<AnalysisOutput> {
    const startTime = Date.now();

    console.log(`\n🔍 Starting continuous analysis for ${config.project_name}...`);

    try {
      // Step 1: Compare with last snapshot (if code files provided)
      let codeEvolution = null;
      if (config.code_files) {
        console.log('📊 Comparing with last code snapshot...');
        codeEvolution = await this.comparisonEngine.compareWithLastSnapshot(
          config.project_id,
          config.code_files
        );

        if (codeEvolution) {
          console.log(`  ✓ ${codeEvolution.summary}`);
        }
      }

      // Step 2: Generate suggestions using AI
      console.log('🤖 Generating improvement suggestions...');
      const suggestions = await this.generateSuggestions(config, codeEvolution);
      console.log(`  ✓ Generated ${suggestions.length} suggestions`);

      // Step 3: Match against pattern library
      console.log('📚 Matching against pattern library...');
      const enhancedSuggestions = await this.enhanceSuggestionsWithPatterns(suggestions);
      const patternMatches = enhancedSuggestions.filter(s => s.pattern_match).length;
      console.log(`  ✓ Found ${patternMatches} pattern matches`);

      // Step 4: Trigger research for unfamiliar patterns
      console.log('🔬 Checking for unfamiliar patterns...');
      const researchTriggers = await this.triggerResearchForUnknownPatterns(
        enhancedSuggestions,
        config.project_id
      );
      console.log(`  ✓ Triggered ${researchTriggers} research requests`);

      // Step 5: Save analysis to history
      console.log('💾 Saving analysis to history...');
      const executionTime = Date.now() - startTime;
      const analysisId = await this.saveAnalysisToHistory(
        config,
        enhancedSuggestions,
        executionTime,
        config.git_commit
      );
      console.log(`  ✓ Saved analysis: ${analysisId}`);

      // Step 6: Run self-improvement analysis
      console.log('🎯 Analyzing suggestion quality...');
      await this.selfImprovement.analyzeSuggestionQuality(analysisId);
      console.log('  ✓ Quality analysis complete');

      // Step 7: Emit completion event
      await EventBus.emit('analysis.complete', {
        analysis_id: analysisId,
        project_id: config.project_id,
        suggestions_count: enhancedSuggestions.length,
        pattern_matches: patternMatches,
        research_triggers: researchTriggers,
        execution_time_ms: executionTime,
      });

      console.log(`✅ Analysis complete in ${executionTime}ms\n`);

      return {
        project_id: config.project_id,
        suggestions: enhancedSuggestions,
        code_evolution: codeEvolution,
        pattern_matches: patternMatches,
        research_triggers: researchTriggers,
        execution_time_ms: executionTime,
        analysis_id: analysisId,
      };
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      throw error;
    }
  }

  /**
   * Generate suggestions using Claude AI
   */
  private async generateSuggestions(
    config: AnalysisConfig,
    codeEvolution: any
  ): Promise<Suggestion[]> {
    const systemPrompt = `You are an expert Product Improvement Agent analyzing a software project.

Your task is to generate actionable improvement suggestions based on:
- Code quality and architecture
- User experience and features
- Performance optimizations
- Security best practices

${codeEvolution ? `Recent code changes: ${codeEvolution.summary}` : ''}

Return suggestions as a JSON array with this format:
[
  {
    "id": "unique-id",
    "title": "Brief title",
    "description": "Detailed description",
    "code_example": "Example code if applicable",
    "priority": 1-5,
    "estimated_impact": "low|medium|high",
    "confidence": 0.0-1.0
  }
]

Focus on high-impact, actionable suggestions.`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.anthropic_api_key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: `Analyze project: ${config.project_name}\nGenerate improvement suggestions.`,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.content?.[0]?.text || '[]';

      // Extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn('No valid JSON found in response, returning empty suggestions');
        return [];
      }

      const suggestions = JSON.parse(jsonMatch[0]);
      return suggestions;
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return [];
    }
  }

  /**
   * Enhance suggestions with pattern library matches
   */
  private async enhanceSuggestionsWithPatterns(
    suggestions: Suggestion[]
  ): Promise<Suggestion[]> {
    const enhanced = [];

    for (const suggestion of suggestions) {
      const matches = await this.patternLibrary.matchPattern(
        suggestion.description,
        suggestion.code_example || ''
      );

      if (matches.length > 0) {
        const bestMatch = matches[0];
        suggestion.pattern_match = true;
        suggestion.matched_pattern = bestMatch.pattern.pattern_name;

        // Adjust confidence based on pattern
        if (bestMatch.pattern.pattern_type === 'approved') {
          suggestion.confidence = Math.min(1.0, suggestion.confidence * 1.2);
        } else if (bestMatch.pattern.pattern_type === 'rejected') {
          suggestion.confidence = Math.max(0.1, suggestion.confidence * 0.5);
        }
      }

      enhanced.push(suggestion);
    }

    return enhanced;
  }

  /**
   * Trigger research for unknown/low-confidence patterns
   */
  private async triggerResearchForUnknownPatterns(
    suggestions: Suggestion[],
    projectId: string
  ): Promise<number> {
    let triggeredCount = 0;

    for (const suggestion of suggestions) {
      const shouldResearch = this.researchIntegration.shouldTriggerResearch(
        suggestion.title,
        suggestion.confidence,
        suggestion.pattern_match ? 1 : 0
      );

      if (shouldResearch) {
        const topic = this.researchIntegration.generateResearchTopic(
          suggestion.title,
          suggestion.description
        );

        const requestId = await this.researchIntegration.requestResearch({
          topic,
          context: {
            suggestion_id: suggestion.id,
            title: suggestion.title,
            description: suggestion.description,
          },
          trigger_reason: suggestion.pattern_match
            ? 'Low confidence match'
            : 'No pattern match found',
          improvement_id: suggestion.id,
          project_id: projectId,
        });

        suggestion.research_triggered = true;
        suggestion.research_request_id = requestId;
        triggeredCount++;
      }
    }

    return triggeredCount;
  }

  /**
   * Save analysis to history
   */
  private async saveAnalysisToHistory(
    config: AnalysisConfig,
    suggestions: Suggestion[],
    executionTime: number,
    gitCommit?: string
  ): Promise<string> {
    // Count approved/rejected (would come from user feedback in real implementation)
    // For now, using estimates based on confidence
    const approvedCount = suggestions.filter(s => s.confidence >= 0.7).length;
    const rejectedCount = suggestions.filter(s => s.confidence < 0.4).length;

    return await this.historyService.saveAnalysis({
      project_id: config.project_id,
      suggestions,
      approved_count: approvedCount,
      rejected_count: rejectedCount,
      implemented_count: 0, // Will be updated when implemented
      model_version: 'claude-sonnet-4-20250514',
      execution_time_ms: executionTime,
      code_snapshot: gitCommit,
    });
  }

  /**
   * Track impact of an implemented suggestion
   */
  async trackImpact(
    improvementId: string,
    projectId: string,
    metricType: 'performance' | 'errors' | 'code_quality' | 'user_experience',
    baselineValue: number,
    currentValue: number,
    metadata?: any
  ): Promise<void> {
    await this.impactTracking.recordImpact({
      improvement_id: improvementId,
      project_id: projectId,
      metric_type: metricType,
      baseline_value: baselineValue,
      current_value: currentValue,
      metadata,
    });
  }

  /**
   * Get analysis statistics for a project
   */
  async getProjectStats(projectId: string, days: number = 30) {
    const [
      analysisStats,
      patternStats,
      impactStats,
      qualityScore,
    ] = await Promise.all([
      this.historyService.getStats(projectId, days),
      this.patternLibrary.getStats(),
      this.impactTracking.getProjectImpactStats(projectId, days),
      this.selfImprovement.getAverageQualityScore(projectId, days),
    ]);

    return {
      analysis: analysisStats,
      patterns: patternStats,
      impact: impactStats,
      quality_score: qualityScore,
    };
  }
}

// Singleton instance
let continuousAnalysisAgentInstance: ContinuousAnalysisAgent | null = null;

export function getContinuousAnalysisAgent(): ContinuousAnalysisAgent {
  if (!continuousAnalysisAgentInstance) {
    continuousAnalysisAgentInstance = new ContinuousAnalysisAgent();
  }
  return continuousAnalysisAgentInstance;
}
