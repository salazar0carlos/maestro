/**
 * Bug Tracker
 * System for tracking, managing, and converting bugs to tasks
 */

/**
 * Generate a simple UUID alternative
 */
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Bug severity levels
 */
export const BugSeverity = {
  CRITICAL: 'critical', // System crash, data loss
  HIGH: 'high',         // Major feature broken
  MEDIUM: 'medium',     // Minor feature issue
  LOW: 'low',          // Cosmetic issue
};

/**
 * Bug status
 */
export const BugStatus = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  FIXED: 'fixed',
  VERIFIED: 'verified',
  CLOSED: 'closed',
  WONT_FIX: 'wont_fix',
};

/**
 * Create a new bug report
 * @param {Object} bug - Bug details
 * @returns {Object} Created bug with ID and metadata
 */
export function createBug(bug) {
  const bugId = generateBugId();

  const newBug = {
    bug_id: bugId,
    title: bug.title,
    description: bug.description || '',
    severity: bug.severity || BugSeverity.MEDIUM,
    status: BugStatus.OPEN,

    // Reproduction details
    steps_to_reproduce: bug.steps || [],
    expected_behavior: bug.expected || '',
    actual_behavior: bug.actual || '',

    // Context
    found_in: bug.feature || 'unknown',
    found_by: bug.found_by || 'Testing Agent',
    environment: bug.environment || 'production',

    // Metadata
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    assigned_to: bug.assigned_to || null,
    related_task_id: null,

    // Additional info
    tags: bug.tags || [],
    attachments: bug.attachments || [],
    comments: [],
  };

  return newBug;
}

/**
 * Generate unique bug ID
 * @returns {string} Bug ID
 */
function generateBugId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `BUG-${timestamp}-${random}`.toUpperCase();
}

/**
 * Update bug status
 * @param {Object} bug - Bug to update
 * @param {string} newStatus - New status
 * @param {string} comment - Optional comment
 * @returns {Object} Updated bug
 */
export function updateBugStatus(bug, newStatus, comment = '') {
  bug.status = newStatus;
  bug.updated_at = new Date().toISOString();

  if (comment) {
    addComment(bug, {
      author: 'System',
      text: `Status changed to ${newStatus}: ${comment}`,
    });
  }

  return bug;
}

/**
 * Add comment to bug
 * @param {Object} bug - Bug to comment on
 * @param {Object} comment - Comment details
 * @returns {Object} Updated bug
 */
export function addComment(bug, comment) {
  bug.comments.push({
    comment_id: uuidv4(),
    author: comment.author || 'Anonymous',
    text: comment.text,
    timestamp: new Date().toISOString(),
  });

  bug.updated_at = new Date().toISOString();
  return bug;
}

/**
 * Convert bug severity to task priority
 * @param {string} severity - Bug severity
 * @returns {number} Task priority (1-5)
 */
export function severityToPriority(severity) {
  const mapping = {
    [BugSeverity.CRITICAL]: 1, // Highest priority
    [BugSeverity.HIGH]: 2,
    [BugSeverity.MEDIUM]: 3,
    [BugSeverity.LOW]: 4,
  };

  return mapping[severity] || 3;
}

/**
 * Convert bug to task
 * Creates a task from a bug report for agent execution
 * @param {Object} bug - Bug to convert
 * @param {Object} options - Additional task options
 * @returns {Object} Task object
 */
export function createTaskFromBug(bug, options = {}) {
  const task = {
    task_id: options.task_id || generateTaskId(),
    project_id: options.project_id || 'default-project',

    // Task details
    title: `Fix: ${bug.title}`,
    description: buildTaskDescription(bug),
    ai_prompt: buildAIPrompt(bug),

    // Assignment
    assigned_to_agent: determineAgentType(bug),
    priority: severityToPriority(bug.severity),
    status: 'todo',

    // Metadata
    source: 'bug_report',
    source_id: bug.bug_id,
    created_date: new Date().toISOString(),

    // Tags
    tags: ['bug-fix', `severity-${bug.severity}`, ...bug.tags],
  };

  // Link bug to task
  bug.related_task_id = task.task_id;
  bug.status = BugStatus.IN_PROGRESS;
  bug.updated_at = new Date().toISOString();

  return task;
}

/**
 * Generate task ID
 * @returns {string} Task ID
 */
function generateTaskId() {
  return `task-${uuidv4()}`;
}

/**
 * Build detailed task description from bug
 * @param {Object} bug - Bug report
 * @returns {string} Task description
 */
function buildTaskDescription(bug) {
  let description = `# Bug Fix: ${bug.title}\n\n`;

  description += `## Bug Details\n`;
  description += `- **Severity:** ${bug.severity}\n`;
  description += `- **Found In:** ${bug.found_in}\n`;
  description += `- **Environment:** ${bug.environment}\n\n`;

  if (bug.steps_to_reproduce.length > 0) {
    description += `## Steps to Reproduce\n`;
    bug.steps_to_reproduce.forEach((step, i) => {
      description += `${i + 1}. ${step}\n`;
    });
    description += '\n';
  }

  description += `## Expected Behavior\n`;
  description += `${bug.expected_behavior}\n\n`;

  description += `## Actual Behavior\n`;
  description += `${bug.actual_behavior}\n\n`;

  if (bug.description) {
    description += `## Additional Context\n`;
    description += `${bug.description}\n\n`;
  }

  description += `## Requirements\n`;
  description += `- Fix the issue described above\n`;
  description += `- Ensure no regression in related features\n`;
  description += `- Add tests to prevent this bug from recurring\n`;

  return description;
}

/**
 * Build AI prompt from bug
 * @param {Object} bug - Bug report
 * @returns {string} AI prompt
 */
function buildAIPrompt(bug) {
  let prompt = `Fix the following bug:\n\n`;
  prompt += `**Issue:** ${bug.title}\n\n`;

  if (bug.steps_to_reproduce.length > 0) {
    prompt += `**Reproduction Steps:**\n`;
    bug.steps_to_reproduce.forEach((step, i) => {
      prompt += `${i + 1}. ${step}\n`;
    });
    prompt += '\n';
  }

  prompt += `**Expected:** ${bug.expected_behavior}\n`;
  prompt += `**Actual:** ${bug.actual_behavior}\n\n`;

  prompt += `Please:\n`;
  prompt += `1. Identify the root cause\n`;
  prompt += `2. Implement a fix\n`;
  prompt += `3. Add tests to prevent regression\n`;
  prompt += `4. Verify the fix works\n`;

  return prompt;
}

/**
 * Determine appropriate agent type for bug
 * @param {Object} bug - Bug report
 * @returns {string} Agent type
 */
function determineAgentType(bug) {
  const feature = bug.found_in.toLowerCase();

  // Frontend bugs
  if (
    feature.includes('ui') ||
    feature.includes('component') ||
    feature.includes('page') ||
    feature.includes('form') ||
    feature.includes('button')
  ) {
    return 'frontend-agent';
  }

  // Backend bugs
  if (
    feature.includes('api') ||
    feature.includes('database') ||
    feature.includes('endpoint') ||
    feature.includes('server') ||
    feature.includes('auth')
  ) {
    return 'backend-agent';
  }

  // Testing bugs
  if (
    feature.includes('test') ||
    feature.includes('validation')
  ) {
    return 'testing-agent';
  }

  // Default to backend for unknown
  return 'backend-agent';
}

/**
 * Get bugs by severity
 * @param {Array} bugs - List of bugs
 * @param {string} severity - Severity level
 * @returns {Array} Filtered bugs
 */
export function getBugsBySeverity(bugs, severity) {
  return bugs.filter((bug) => bug.severity === severity);
}

/**
 * Get bugs by status
 * @param {Array} bugs - List of bugs
 * @param {string} status - Status
 * @returns {Array} Filtered bugs
 */
export function getBugsByStatus(bugs, status) {
  return bugs.filter((bug) => bug.status === status);
}

/**
 * Get critical open bugs
 * @param {Array} bugs - List of bugs
 * @returns {Array} Critical open bugs
 */
export function getCriticalOpenBugs(bugs) {
  return bugs.filter(
    (bug) =>
      bug.severity === BugSeverity.CRITICAL &&
      bug.status === BugStatus.OPEN
  );
}

/**
 * Generate bug statistics
 * @param {Array} bugs - List of bugs
 * @returns {Object} Bug statistics
 */
export function generateBugStats(bugs) {
  const stats = {
    total: bugs.length,
    by_severity: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    },
    by_status: {
      open: 0,
      in_progress: 0,
      fixed: 0,
      verified: 0,
      closed: 0,
      wont_fix: 0,
    },
    critical_open: 0,
    average_age_days: 0,
  };

  if (bugs.length === 0) {
    return stats;
  }

  let totalAge = 0;

  for (const bug of bugs) {
    // Count by severity
    stats.by_severity[bug.severity] = (stats.by_severity[bug.severity] || 0) + 1;

    // Count by status
    stats.by_status[bug.status] = (stats.by_status[bug.status] || 0) + 1;

    // Critical open bugs
    if (bug.severity === BugSeverity.CRITICAL && bug.status === BugStatus.OPEN) {
      stats.critical_open++;
    }

    // Calculate age
    const createdDate = new Date(bug.created_at);
    const ageMs = Date.now() - createdDate.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    totalAge += ageDays;
  }

  stats.average_age_days = Math.round(totalAge / bugs.length);

  return stats;
}

/**
 * Generate bug report
 * @param {Array} bugs - List of bugs
 * @returns {string} Formatted report
 */
export function generateBugReport(bugs) {
  const stats = generateBugStats(bugs);

  let report = `# Bug Report\n\n`;
  report += `**Generated:** ${new Date().toLocaleString()}\n\n`;

  report += `## Summary\n`;
  report += `- **Total Bugs:** ${stats.total}\n`;
  report += `- **Critical Open:** 🔴 ${stats.critical_open}\n`;
  report += `- **Average Age:** ${stats.average_age_days} days\n\n`;

  report += `## By Severity\n`;
  report += `- 🔴 Critical: ${stats.by_severity.critical}\n`;
  report += `- 🟠 High: ${stats.by_severity.high}\n`;
  report += `- 🟡 Medium: ${stats.by_severity.medium}\n`;
  report += `- 🟢 Low: ${stats.by_severity.low}\n\n`;

  report += `## By Status\n`;
  report += `- Open: ${stats.by_status.open}\n`;
  report += `- In Progress: ${stats.by_status.in_progress}\n`;
  report += `- Fixed: ${stats.by_status.fixed}\n`;
  report += `- Verified: ${stats.by_status.verified}\n`;
  report += `- Closed: ${stats.by_status.closed}\n`;
  report += `- Won't Fix: ${stats.by_status.wont_fix}\n\n`;

  // Critical bugs section
  const criticalBugs = getCriticalOpenBugs(bugs);
  if (criticalBugs.length > 0) {
    report += `## 🚨 Critical Open Bugs\n`;
    for (const bug of criticalBugs) {
      report += `\n### ${bug.bug_id}: ${bug.title}\n`;
      report += `- **Found In:** ${bug.found_in}\n`;
      report += `- **Created:** ${new Date(bug.created_at).toLocaleString()}\n`;
      report += `- **Description:** ${bug.description}\n`;
    }
  }

  return report;
}

/**
 * Validate bug report completeness
 * @param {Object} bug - Bug to validate
 * @returns {Object} Validation result
 */
export function validateBugReport(bug) {
  const validation = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // Required fields
  if (!bug.title || bug.title.trim() === '') {
    validation.valid = false;
    validation.errors.push('Title is required');
  }

  if (!bug.severity) {
    validation.valid = false;
    validation.errors.push('Severity is required');
  }

  // Recommended fields
  if (!bug.steps_to_reproduce || bug.steps_to_reproduce.length === 0) {
    validation.warnings.push('Steps to reproduce are recommended');
  }

  if (!bug.expected_behavior) {
    validation.warnings.push('Expected behavior should be specified');
  }

  if (!bug.actual_behavior) {
    validation.warnings.push('Actual behavior should be specified');
  }

  return validation;
}
