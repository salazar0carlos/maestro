/**
 * Pattern Library
 * Learns from past approved/rejected suggestions to improve future analysis
 */

import { getSupabase, Tables, PatternLibrary } from './supabase';
import { EventBus } from './event-system';

export interface Pattern {
  pattern_name: string;
  pattern_type: 'approved' | 'rejected';
  description: string;
  code_example: string;
  context?: any;
}

export interface PatternMatch {
  pattern: PatternLibrary;
  confidence: number;
  reason: string;
}

export interface PatternStats {
  total_patterns: number;
  approved_patterns: number;
  rejected_patterns: number;
  most_common_approved: PatternLibrary[];
  most_common_rejected: PatternLibrary[];
}

/**
 * Pattern Library Service
 * Manages learning from past suggestions
 */
export class PatternLibraryService {
  /**
   * Add a new pattern to the library
   */
  async addPattern(pattern: Pattern): Promise<string> {
    const supabase = getSupabase();

    try {
      // Check if similar pattern already exists
      const existing = await this.findSimilarPattern(
        pattern.pattern_name,
        pattern.pattern_type
      );

      if (existing) {
        // Update frequency instead of creating duplicate
        return await this.incrementPatternFrequency(existing.id);
      }

      // Create new pattern
      const record = {
        pattern_name: pattern.pattern_name,
        pattern_type: pattern.pattern_type,
        description: pattern.description,
        code_example: pattern.code_example,
        context: pattern.context || null,
        frequency: 1,
        confidence_score: 0.5, // Start with neutral confidence
        last_seen: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from(Tables.PATTERN_LIBRARY)
        .insert(record)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to add pattern: ${error.message}`);
      }

      console.log(`✓ Added new pattern: ${pattern.pattern_name} (${pattern.pattern_type})`);

      await EventBus.emit('pattern.added', {
        pattern_id: data.id,
        pattern_name: pattern.pattern_name,
        pattern_type: pattern.pattern_type,
      });

      return data.id;
    } catch (error) {
      console.error('Error adding pattern:', error);
      throw error;
    }
  }

  /**
   * Find similar pattern
   */
  private async findSimilarPattern(
    patternName: string,
    patternType: 'approved' | 'rejected'
  ): Promise<PatternLibrary | null> {
    const supabase = getSupabase();

    try {
      const { data, error } = await supabase
        .from(Tables.PATTERN_LIBRARY)
        .select('*')
        .eq('pattern_name', patternName)
        .eq('pattern_type', patternType)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to find similar pattern: ${error.message}`);
      }

      return data || null;
    } catch (error) {
      console.error('Error finding similar pattern:', error);
      return null;
    }
  }

  /**
   * Increment pattern frequency
   */
  private async incrementPatternFrequency(patternId: string): Promise<string> {
    const supabase = getSupabase();

    try {
      // Get current frequency
      const { data: current, error: fetchError } = await supabase
        .from(Tables.PATTERN_LIBRARY)
        .select('frequency, confidence_score')
        .eq('id', patternId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch pattern: ${fetchError.message}`);
      }

      // Calculate new confidence based on frequency
      const newFrequency = current.frequency + 1;
      const newConfidence = Math.min(0.95, current.confidence_score + 0.05);

      // Update pattern
      const { error: updateError } = await supabase
        .from(Tables.PATTERN_LIBRARY)
        .update({
          frequency: newFrequency,
          confidence_score: newConfidence,
          last_seen: new Date().toISOString(),
        })
        .eq('id', patternId);

      if (updateError) {
        throw new Error(`Failed to update pattern: ${updateError.message}`);
      }

      console.log(`✓ Updated pattern frequency: ${patternId} (${newFrequency}x)`);
      return patternId;
    } catch (error) {
      console.error('Error incrementing pattern frequency:', error);
      throw error;
    }
  }

  /**
   * Check if a suggestion matches known patterns
   */
  async matchPattern(
    suggestionDescription: string,
    _codeExample: string
  ): Promise<PatternMatch[]> {
    const supabase = getSupabase();

    try {
      // Get all patterns
      const { data, error } = await supabase
        .from(Tables.PATTERN_LIBRARY)
        .select('*')
        .order('confidence_score', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch patterns: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return [];
      }

      const matches: PatternMatch[] = [];

      // Simple matching algorithm (can be enhanced with ML)
      for (const pattern of data) {
        const similarity = this.calculateSimilarity(
          suggestionDescription,
          pattern.description
        );

        if (similarity > 0.6) { // 60% similarity threshold
          matches.push({
            pattern,
            confidence: similarity * pattern.confidence_score,
            reason: `${Math.round(similarity * 100)}% similar to known ${pattern.pattern_type} pattern`,
          });
        }
      }

      // Sort by confidence
      matches.sort((a, b) => b.confidence - a.confidence);

      return matches.slice(0, 5); // Return top 5 matches
    } catch (error) {
      console.error('Error matching patterns:', error);
      return [];
    }
  }

  /**
   * Simple similarity calculation (Jaccard similarity)
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Get pattern statistics
   */
  async getStats(): Promise<PatternStats> {
    const supabase = getSupabase();

    try {
      const { data, error } = await supabase
        .from(Tables.PATTERN_LIBRARY)
        .select('*');

      if (error) {
        throw new Error(`Failed to get pattern stats: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return {
          total_patterns: 0,
          approved_patterns: 0,
          rejected_patterns: 0,
          most_common_approved: [],
          most_common_rejected: [],
        };
      }

      const approvedPatterns = data.filter(p => p.pattern_type === 'approved');
      const rejectedPatterns = data.filter(p => p.pattern_type === 'rejected');

      // Sort by frequency
      const mostCommonApproved = [...approvedPatterns]
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 5);

      const mostCommonRejected = [...rejectedPatterns]
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 5);

      return {
        total_patterns: data.length,
        approved_patterns: approvedPatterns.length,
        rejected_patterns: rejectedPatterns.length,
        most_common_approved: mostCommonApproved,
        most_common_rejected: mostCommonRejected,
      };
    } catch (error) {
      console.error('Error getting pattern stats:', error);
      throw error;
    }
  }

  /**
   * Get patterns by type
   */
  async getPatternsByType(
    patternType: 'approved' | 'rejected',
    limit: number = 20
  ): Promise<PatternLibrary[]> {
    const supabase = getSupabase();

    try {
      const { data, error } = await supabase
        .from(Tables.PATTERN_LIBRARY)
        .select('*')
        .eq('pattern_type', patternType)
        .order('frequency', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to get patterns: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error getting patterns by type:', error);
      return [];
    }
  }

  /**
   * Update pattern confidence score
   */
  async updateConfidence(patternId: string, newScore: number): Promise<void> {
    const supabase = getSupabase();

    try {
      // Clamp score between 0 and 1
      const clampedScore = Math.max(0, Math.min(1, newScore));

      const { error } = await supabase
        .from(Tables.PATTERN_LIBRARY)
        .update({ confidence_score: clampedScore })
        .eq('id', patternId);

      if (error) {
        throw new Error(`Failed to update confidence: ${error.message}`);
      }

      console.log(`✓ Updated pattern confidence: ${patternId} -> ${clampedScore}`);
    } catch (error) {
      console.error('Error updating pattern confidence:', error);
      throw error;
    }
  }

  /**
   * Delete low-confidence patterns (cleanup)
   */
  async deleteLowConfidencePatterns(threshold: number = 0.2): Promise<number> {
    const supabase = getSupabase();

    try {
      const { data, error } = await supabase
        .from(Tables.PATTERN_LIBRARY)
        .delete()
        .lt('confidence_score', threshold)
        .eq('frequency', 1) // Only delete patterns seen once
        .select();

      if (error) {
        throw new Error(`Failed to delete low-confidence patterns: ${error.message}`);
      }

      const deletedCount = data?.length || 0;
      console.log(`Deleted ${deletedCount} low-confidence patterns`);

      return deletedCount;
    } catch (error) {
      console.error('Error deleting low-confidence patterns:', error);
      throw error;
    }
  }
}

// Singleton instance
let patternLibraryInstance: PatternLibraryService | null = null;

export function getPatternLibrary(): PatternLibraryService {
  if (!patternLibraryInstance) {
    patternLibraryInstance = new PatternLibraryService();
  }
  return patternLibraryInstance;
}
