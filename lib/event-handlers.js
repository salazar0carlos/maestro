/**
 * Event Handlers for Maestro Event System
 * Handles all event-triggered actions
 */

import { EventTypes } from './event-system.js';

/**
 * Analysis Event Handler
 * Triggers Product Improvement Agent analysis
 */
export async function handleAnalyzeProject(payload) {
  const { projectId, files, anthropicApiKey, source } = payload;

  console.log(`[AnalysisHandler] Starting analysis for project ${projectId} (source: ${source})`);

  if (!projectId) {
    throw new Error('Project ID is required');
  }

  if (!files || !Array.isArray(files) || files.length === 0) {
    throw new Error('Files array is required and must not be empty');
  }

  if (!anthropicApiKey) {
    throw new Error('Anthropic API key is required');
  }

  try {
    // Dynamic import to avoid circular dependencies
    const { AnalysisEngine } = await import('./analysis-engine.js');
    const { SuggestionGenerator } = await import('./suggestion-generator.js');
    const { createSuggestions } = await import('./storage');
    const { EventSystem } = await import('./event-system.js');

    // Emit analysis started event
    EventSystem.emit(EventTypes.ANALYSIS_STARTED, {
      projectId,
      timestamp: new Date().toISOString(),
      source,
    });

    // Step 1: Analyze codebase
    console.log(`[AnalysisHandler] Running codebase analysis on ${files.length} files`);
    const analysisReport = AnalysisEngine.analyzeCodebase(files);

    // Step 2: Generate suggestions using AI
    console.log('[AnalysisHandler] Generating AI suggestions');
    const generator = new SuggestionGenerator(anthropicApiKey);
    const suggestions = await generator.generateWithRetry(analysisReport, projectId, 3);

    // Step 3: Save suggestions to storage
    console.log(`[AnalysisHandler] Saving ${suggestions.length} suggestions`);
    const savedSuggestions = createSuggestions(suggestions);

    // Emit analysis completed event
    EventSystem.emit(EventTypes.ANALYSIS_COMPLETED, {
      projectId,
      suggestionsCount: savedSuggestions.length,
      analysisReport: {
        summary: analysisReport.summary,
        filesAnalyzed: files.length,
      },
      timestamp: new Date().toISOString(),
      source,
    });

    // Emit suggestions generated event
    EventSystem.emit(EventTypes.SUGGESTIONS_GENERATED, {
      projectId,
      suggestions: savedSuggestions,
      count: savedSuggestions.length,
      timestamp: new Date().toISOString(),
    });

    console.log(`[AnalysisHandler] Analysis complete: ${savedSuggestions.length} suggestions generated`);

    return {
      success: true,
      projectId,
      suggestionsCount: savedSuggestions.length,
      suggestions: savedSuggestions,
      analysisReport: {
        summary: analysisReport.summary,
        filesAnalyzed: files.length,
      },
    };
  } catch (error) {
    console.error('[AnalysisHandler] Error during analysis:', error);

    // Emit analysis failed event
    const { EventSystem } = await import('./event-system.js');
    EventSystem.emit(EventTypes.ANALYSIS_FAILED, {
      projectId,
      error: error.message,
      timestamp: new Date().toISOString(),
      source,
    });

    throw error;
  }
}

/**
 * Suggestion Approved Event Handler
 * Converts suggestion to task
 */
export async function handleSuggestionApproved(payload) {
  const { suggestionId, anthropicApiKey } = payload;

  console.log(`[SuggestionHandler] Suggestion approved: ${suggestionId}`);

  try {
    const { convertSuggestionToTask } = await import('./suggestion-to-task');
    const { EventSystem } = await import('./event-system.js');

    // Convert suggestion to task
    const task = await convertSuggestionToTask(suggestionId, anthropicApiKey);

    if (task) {
      // Emit task created event
      EventSystem.emit(EventTypes.TASK_CREATED, {
        taskId: task.task_id,
        projectId: task.project_id,
        suggestionId,
        timestamp: new Date().toISOString(),
      });

      console.log(`[SuggestionHandler] Task created: ${task.task_id}`);
    }

    return { success: true, task };
  } catch (error) {
    console.error('[SuggestionHandler] Error creating task:', error);
    throw error;
  }
}

/**
 * GitHub Push Event Handler
 * Analyzes changes and triggers analysis if significant
 */
export async function handleGitHubPush(payload) {
  const { repository, commits, ref, anthropicApiKey } = payload;

  console.log(`[GitHubHandler] Push received: ${repository?.name} on ${ref}`);

  if (!commits || commits.length === 0) {
    console.log('[GitHubHandler] No commits in push, skipping');
    return { success: true, skipped: true, reason: 'no_commits' };
  }

  try {
    // Check if changes are significant enough to trigger analysis
    const significance = calculateChangeSignificance(commits);

    console.log(`[GitHubHandler] Change significance: ${significance.score}/100`);

    // Only trigger analysis if significance > 30
    if (significance.score < 30) {
      console.log('[GitHubHandler] Changes not significant enough, skipping analysis');
      return {
        success: true,
        skipped: true,
        reason: 'insufficient_significance',
        score: significance.score,
      };
    }

    // Find or create project from repository
    const { getProjects, createProject } = await import('./storage');
    const projects = getProjects();
    let project = projects.find(p => p.github_repo === repository.full_name);

    if (!project) {
      console.log(`[GitHubHandler] Creating new project for ${repository.name}`);
      project = createProject({
        project_id: `gh-${repository.id}`,
        name: repository.name,
        description: repository.description || `GitHub project: ${repository.full_name}`,
        github_repo: repository.full_name,
        status: 'active',
        created_date: new Date().toISOString(),
        agent_count: 0,
        task_count: 0,
      });
    }

    // Extract file changes from commits
    const changedFiles = extractChangedFiles(commits);

    console.log(`[GitHubHandler] ${changedFiles.length} files changed`);

    if (changedFiles.length === 0) {
      return { success: true, skipped: true, reason: 'no_files' };
    }

    // Trigger analysis event
    const { EventSystem } = await import('./event-system.js');
    await EventSystem.trigger(EventTypes.ANALYZE_PROJECT, {
      projectId: project.project_id,
      files: changedFiles,
      anthropicApiKey,
      source: 'github_push',
      metadata: {
        repository: repository.full_name,
        ref,
        commitCount: commits.length,
        significance: significance.score,
      },
    });

    return {
      success: true,
      projectId: project.project_id,
      filesAnalyzed: changedFiles.length,
      commitCount: commits.length,
      significance: significance.score,
    };
  } catch (error) {
    console.error('[GitHubHandler] Error handling GitHub push:', error);
    throw error;
  }
}

/**
 * Calculate significance of code changes
 * @param {Array} commits - Array of commit objects
 * @returns {Object} Significance score and breakdown
 */
function calculateChangeSignificance(commits) {
  let score = 0;
  const factors = {
    commitCount: commits.length,
    filesChanged: 0,
    linesAdded: 0,
    linesRemoved: 0,
  };

  commits.forEach(commit => {
    // Count files changed
    const added = commit.added?.length || 0;
    const modified = commit.modified?.length || 0;
    const removed = commit.removed?.length || 0;

    factors.filesChanged += added + modified + removed;

    // Estimate lines changed from commit message patterns
    // (In real implementation, you'd parse the actual diff)
    const message = commit.message.toLowerCase();
    if (message.includes('refactor')) score += 15;
    if (message.includes('feature') || message.includes('add')) score += 20;
    if (message.includes('fix')) score += 10;
    if (message.includes('breaking')) score += 30;
  });

  // Score based on files changed
  if (factors.filesChanged > 10) score += 30;
  else if (factors.filesChanged > 5) score += 20;
  else if (factors.filesChanged > 2) score += 10;

  // Score based on commit count
  if (factors.commitCount > 5) score += 15;
  else if (factors.commitCount > 2) score += 10;

  return {
    score: Math.min(100, score), // Cap at 100
    factors,
  };
}

/**
 * Extract changed files from commits
 * @param {Array} commits - Array of commit objects
 * @returns {Array} Array of file objects with path and content
 */
function extractChangedFiles(commits) {
  const files = [];
  const seen = new Set();

  commits.forEach(commit => {
    const allFiles = [
      ...(commit.added || []),
      ...(commit.modified || []),
    ];

    allFiles.forEach(filePath => {
      if (!seen.has(filePath)) {
        seen.add(filePath);

        // For demo purposes, create placeholder file objects
        // In production, you'd fetch actual file content from GitHub API
        files.push({
          path: filePath,
          content: `// File: ${filePath}\n// Content would be fetched from GitHub API`,
        });
      }
    });
  });

  return files;
}

/**
 * Task Completed Event Handler
 * Triggers follow-up actions
 */
export async function handleTaskCompleted(payload) {
  const { taskId, projectId, suggestionId } = payload;

  console.log(`[TaskHandler] Task completed: ${taskId}`);

  try {
    // Update suggestion status to implemented
    if (suggestionId) {
      const { updateSuggestion } = await import('./storage');
      updateSuggestion(suggestionId, {
        status: 'implemented',
        implemented_at: new Date().toISOString(),
      });

      console.log(`[TaskHandler] Suggestion ${suggestionId} marked as implemented`);
    }

    // Could trigger new analysis to see if implementation created new improvement opportunities
    // EventSystem.emit(EventTypes.PROJECT_UPDATED, { projectId });

    return { success: true };
  } catch (error) {
    console.error('[TaskHandler] Error handling task completion:', error);
    throw error;
  }
}

/**
 * Register all default event handlers
 * Call this on application startup
 */
export function registerDefaultHandlers() {
  const { EventSystem, EventTypes } = require('./event-system.js');

  console.log('[EventHandlers] Registering default event handlers');

  // Analysis events
  EventSystem.on(EventTypes.ANALYZE_PROJECT, handleAnalyzeProject, { priority: 100 });

  // Suggestion events
  EventSystem.on(EventTypes.SUGGESTION_APPROVED, handleSuggestionApproved, { priority: 90 });

  // Task events
  EventSystem.on(EventTypes.TASK_COMPLETED, handleTaskCompleted, { priority: 80 });

  // GitHub events
  EventSystem.on(EventTypes.GITHUB_PUSH, handleGitHubPush, { priority: 70 });

  console.log('[EventHandlers] Default handlers registered');
}
