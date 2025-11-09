/**
 * Comparison Engine
 * Analyzes how code evolved since last analysis
 */

import { getSupabase, Tables, CodeSnapshot } from './supabase';
import { createHash } from 'crypto';

export interface FileChange {
  file_path: string;
  change_type: 'added' | 'modified' | 'deleted' | 'unchanged';
  old_checksum?: string;
  new_checksum?: string;
  lines_changed?: number;
}

export interface CodeEvolution {
  project_id: string;
  old_snapshot_id: string;
  new_snapshot_id: string;
  files_added: number;
  files_modified: number;
  files_deleted: number;
  total_lines_changed: number;
  changes: FileChange[];
  summary: string;
}

export interface ProjectCodeSnapshot {
  files: Record<string, string>; // file_path -> content
  git_commit?: string;
}

/**
 * Comparison Engine Service
 * Analyzes code changes between snapshots
 */
export class ComparisonEngine {
  /**
   * Create code snapshot for a project
   */
  async createSnapshot(
    projectId: string,
    files: Record<string, string>,
    gitCommit?: string
  ): Promise<string> {
    const supabase = getSupabase();

    try {
      // Calculate checksums for each file
      const fileChecksums: Record<string, string> = {};
      let totalLines = 0;

      for (const [filePath, content] of Object.entries(files)) {
        fileChecksums[filePath] = this.calculateChecksum(content);
        totalLines += content.split('\n').length;
      }

      const snapshot = {
        project_id: projectId,
        snapshot_date: new Date().toISOString(),
        file_count: Object.keys(files).length,
        total_lines: totalLines,
        file_checksums: fileChecksums,
        git_commit: gitCommit || null,
      };

      const { data, error } = await supabase
        .from(Tables.CODE_SNAPSHOTS)
        .insert(snapshot)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create snapshot: ${error.message}`);
      }

      console.log(`✓ Created code snapshot: ${data.id}`);
      return data.id;
    } catch (error) {
      console.error('Error creating snapshot:', error);
      throw error;
    }
  }

  /**
   * Calculate checksum for file content
   */
  private calculateChecksum(content: string): string {
    return createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Get latest snapshot for a project
   */
  async getLatestSnapshot(projectId: string): Promise<CodeSnapshot | null> {
    const supabase = getSupabase();

    try {
      const { data, error } = await supabase
        .from(Tables.CODE_SNAPSHOTS)
        .select('*')
        .eq('project_id', projectId)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to get latest snapshot: ${error.message}`);
      }

      return data || null;
    } catch (error) {
      console.error('Error getting latest snapshot:', error);
      return null;
    }
  }

  /**
   * Get snapshot by ID
   */
  async getSnapshotById(snapshotId: string): Promise<CodeSnapshot | null> {
    const supabase = getSupabase();

    try {
      const { data, error } = await supabase
        .from(Tables.CODE_SNAPSHOTS)
        .select('*')
        .eq('id', snapshotId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to get snapshot: ${error.message}`);
      }

      return data || null;
    } catch (error) {
      console.error('Error getting snapshot by ID:', error);
      return null;
    }
  }

  /**
   * Compare current code state with last snapshot
   */
  async compareWithLastSnapshot(
    projectId: string,
    currentFiles: Record<string, string>
  ): Promise<CodeEvolution | null> {
    try {
      // Get latest snapshot
      const lastSnapshot = await this.getLatestSnapshot(projectId);

      if (!lastSnapshot) {
        console.log('No previous snapshot found for comparison');
        return null;
      }

      // Create new snapshot
      const newSnapshotId = await this.createSnapshot(projectId, currentFiles);
      const newSnapshot = await this.getSnapshotById(newSnapshotId);

      if (!newSnapshot) {
        throw new Error('Failed to retrieve newly created snapshot');
      }

      // Compare snapshots
      return this.compareSnapshots(lastSnapshot, newSnapshot);
    } catch (error) {
      console.error('Error comparing with last snapshot:', error);
      return null;
    }
  }

  /**
   * Compare two snapshots
   */
  async compareSnapshots(
    oldSnapshot: CodeSnapshot,
    newSnapshot: CodeSnapshot
  ): Promise<CodeEvolution> {
    const oldChecksums = oldSnapshot.file_checksums as Record<string, string>;
    const newChecksums = newSnapshot.file_checksums as Record<string, string>;

    const changes: FileChange[] = [];
    let filesAdded = 0;
    let filesModified = 0;
    let filesDeleted = 0;

    // Find added and modified files
    for (const [filePath, newChecksum] of Object.entries(newChecksums)) {
      if (!oldChecksums[filePath]) {
        // File added
        changes.push({
          file_path: filePath,
          change_type: 'added',
          new_checksum: newChecksum,
        });
        filesAdded++;
      } else if (oldChecksums[filePath] !== newChecksum) {
        // File modified
        changes.push({
          file_path: filePath,
          change_type: 'modified',
          old_checksum: oldChecksums[filePath],
          new_checksum: newChecksum,
        });
        filesModified++;
      }
    }

    // Find deleted files
    for (const [filePath, oldChecksum] of Object.entries(oldChecksums)) {
      if (!newChecksums[filePath]) {
        changes.push({
          file_path: filePath,
          change_type: 'deleted',
          old_checksum: oldChecksum,
        });
        filesDeleted++;
      }
    }

    // Calculate total lines changed (approximate)
    const totalLinesChanged = Math.abs(newSnapshot.total_lines - oldSnapshot.total_lines);

    // Generate summary
    const summary = this.generateSummary(filesAdded, filesModified, filesDeleted, totalLinesChanged);

    return {
      project_id: newSnapshot.project_id,
      old_snapshot_id: oldSnapshot.id,
      new_snapshot_id: newSnapshot.id,
      files_added: filesAdded,
      files_modified: filesModified,
      files_deleted: filesDeleted,
      total_lines_changed: totalLinesChanged,
      changes,
      summary,
    };
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(
    filesAdded: number,
    filesModified: number,
    filesDeleted: number,
    totalLinesChanged: number
  ): string {
    const parts: string[] = [];

    if (filesAdded > 0) {
      parts.push(`${filesAdded} file${filesAdded > 1 ? 's' : ''} added`);
    }
    if (filesModified > 0) {
      parts.push(`${filesModified} file${filesModified > 1 ? 's' : ''} modified`);
    }
    if (filesDeleted > 0) {
      parts.push(`${filesDeleted} file${filesDeleted > 1 ? 's' : ''} deleted`);
    }

    if (parts.length === 0) {
      return 'No changes detected';
    }

    const summary = parts.join(', ');
    return `${summary} (~${totalLinesChanged} lines changed)`;
  }

  /**
   * Get significant changes (filter out minor changes)
   */
  getSignificantChanges(
    evolution: CodeEvolution,
    threshold: number = 10
  ): FileChange[] {
    return evolution.changes.filter(
      (change) =>
        change.change_type === 'added' ||
        change.change_type === 'deleted' ||
        (change.lines_changed && change.lines_changed >= threshold)
    );
  }

  /**
   * Delete old snapshots (cleanup)
   */
  async deleteOldSnapshots(projectId: string, keepDays: number = 90): Promise<number> {
    const supabase = getSupabase();

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - keepDays);

      const { data, error } = await supabase
        .from(Tables.CODE_SNAPSHOTS)
        .delete()
        .eq('project_id', projectId)
        .lt('snapshot_date', cutoffDate.toISOString())
        .select();

      if (error) {
        throw new Error(`Failed to delete old snapshots: ${error.message}`);
      }

      const deletedCount = data?.length || 0;
      console.log(`Deleted ${deletedCount} old snapshots for project ${projectId}`);

      return deletedCount;
    } catch (error) {
      console.error('Error deleting old snapshots:', error);
      throw error;
    }
  }
}

// Singleton instance
let comparisonEngineInstance: ComparisonEngine | null = null;

export function getComparisonEngine(): ComparisonEngine {
  if (!comparisonEngineInstance) {
    comparisonEngineInstance = new ComparisonEngine();
  }
  return comparisonEngineInstance;
}
