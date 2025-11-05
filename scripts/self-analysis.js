/**
 * Self-Analysis Script
 * Runs Product Improvement Agent on Maestro codebase
 */

const fs = require('fs');
const path = require('path');

// Files to analyze (project source only, no node_modules)
const filesToAnalyze = [
  'lib/ai-prompt-generator.ts',
  'lib/analysis-engine.js',
  'lib/suggestion-generator.js',
  'lib/event-system.js',
  'lib/event-handlers.js',
  'lib/storage.ts',
  'components/NewTaskModal.tsx',
  'components/TaskDetailModal.tsx',
  'components/ImportPDFModal.tsx',
  'app/page.tsx',
  'app/projects/[id]/page.tsx',
  'app/improvements/page.tsx',
  'app/api/analyze/route.ts',
  'app/api/events/trigger/route.ts',
  'app/api/webhooks/github/route.ts',
  'agents/product-improvement-agent.js',
  'agents/agent-base.js',
];

// Read all files
const files = filesToAnalyze.map(filePath => {
  const fullPath = path.join('/home/user/maestro', filePath);
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    return { path: filePath, content };
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}).filter(Boolean);

console.log(`Collected ${files.length} files for analysis`);

// Import analysis engine
const { AnalysisEngine } = require('/home/user/maestro/lib/analysis-engine.js');
const { SuggestionGenerator } = require('/home/user/maestro/lib/suggestion-generator.js');

// Run analysis
console.log('\n=== RUNNING CODEBASE ANALYSIS ===\n');
const analysisReport = AnalysisEngine.analyzeCodebase(files);

console.log('Analysis Summary:');
console.log(`  Total Issues: ${analysisReport.summary.totalIssues}`);
console.log(`  High Severity: ${analysisReport.summary.highSeverity}`);
console.log(`  Medium Severity: ${analysisReport.summary.mediumSeverity}`);
console.log(`  Low Severity: ${analysisReport.summary.lowSeverity}`);

console.log('\n--- Duplicate Code Patterns ---');
analysisReport.duplicateCode.forEach((dup, i) => {
  console.log(`${i + 1}. Found in ${dup.count} locations (${dup.severity} severity)`);
  console.log(`   Pattern: ${dup.pattern.substring(0, 80)}...`);
});

console.log('\n--- Missing Error Handling ---');
analysisReport.errorHandling.slice(0, 10).forEach((issue, i) => {
  console.log(`${i + 1}. ${issue.file}:${issue.line} - ${issue.issue}`);
});

console.log('\n--- UX Friction Points ---');
analysisReport.uxFriction.slice(0, 10).forEach((friction, i) => {
  console.log(`${i + 1}. ${friction.location} - ${friction.issue}`);
  console.log(`   Impact: ${friction.impact}, Suggestion: ${friction.suggestion}`);
});

console.log('\n--- Performance Issues ---');
analysisReport.performance.slice(0, 10).forEach((perf, i) => {
  console.log(`${i + 1}. ${perf.location} - ${perf.issue}`);
  console.log(`   Impact: ${perf.estimated_impact}`);
});

// Generate AI suggestions
const apiKey = process.env.ANTHROPIC_API_KEY || '';

if (!apiKey) {
  console.error('\n❌ ANTHROPIC_API_KEY not set. Cannot generate AI suggestions.');
  console.error('Set the environment variable to enable AI suggestion generation.');
  process.exit(1);
}

console.log('\n=== GENERATING AI SUGGESTIONS ===\n');
console.log('Using Claude Sonnet 4 to analyze patterns...');

const generator = new SuggestionGenerator(apiKey);

(async () => {
  try {
    const suggestions = await generator.generateWithRetry(analysisReport, 'maestro-self-analysis', 3);

    console.log(`\n✓ Generated ${suggestions.length} improvement suggestions\n`);

    console.log('=== IMPROVEMENT SUGGESTIONS ===\n');
    suggestions.forEach((sug, i) => {
      console.log(`${i + 1}. [Impact ${sug.impact_score}/5] ${sug.title}`);
      console.log(`   Category: ${sug.category} | Priority: ${sug.priority} | Effort: ${sug.effort_estimate}`);
      console.log(`   Description: ${sug.description}`);
      console.log(`   Reasoning: ${sug.reasoning}`);
      console.log(`   Files: ${sug.files_affected.join(', ')}`);
      console.log('');
    });

    // Save to storage (would need browser environment for localStorage)
    console.log('=== SAVING SUGGESTIONS ===');
    console.log('(Suggestions would be saved to localStorage in browser environment)');
    console.log('\nSuggestions JSON:');
    console.log(JSON.stringify(suggestions, null, 2));

  } catch (error) {
    console.error('Error generating suggestions:', error.message);
    process.exit(1);
  }
})();
