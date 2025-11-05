/**
 * Save Suggestions to Storage
 * Imports suggestions into the improvements system
 */

// This script would run in Node.js, but localStorage is browser-only
// So we'll create a static JSON file that can be loaded in the browser

const fs = require('fs');
const path = require('path');

const suggestions = require('./generate-suggestions.js');

// Create a data file that can be imported
const dataPath = path.join(__dirname, '..', 'data', 'maestro-analysis-suggestions.json');

// Ensure data directory exists
const dataDir = path.dirname(dataPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Write suggestions to data file
fs.writeFileSync(dataPath, JSON.stringify(suggestions, null, 2));

console.log(`✓ Saved ${suggestions.length} suggestions to ${dataPath}`);
console.log('\nTo load these suggestions in the browser:');
console.log('1. Open Maestro in browser');
console.log('2. Open browser console');
console.log('3. Run this code:\n');

console.log(`
fetch('/data/maestro-analysis-suggestions.json')
  .then(r => r.json())
  .then(suggestions => {
    suggestions.forEach(sug => {
      const existing = JSON.parse(localStorage.getItem('maestro:suggestions') || '[]');
      existing.push(sug);
      localStorage.setItem('maestro:suggestions', JSON.stringify(existing));
    });
    console.log('✓ Loaded', suggestions.length, 'suggestions');
    location.href = '/improvements';
  });
`);

// Also create a summary file
const summary = {
  analysis_date: new Date().toISOString(),
  total_suggestions: suggestions.length,
  by_category: {},
  by_priority: {},
  by_impact: {},
  high_priority_count: suggestions.filter(s => s.priority === 'high').length,
  critical_security_issues: suggestions.filter(s => s.category === 'security' && s.impact_score >= 5).length,
};

suggestions.forEach(s => {
  summary.by_category[s.category] = (summary.by_category[s.category] || 0) + 1;
  summary.by_priority[s.priority] = (summary.by_priority[s.priority] || 0) + 1;
  summary.by_impact[s.impact_score] = (summary.by_impact[s.impact_score] || 0) + 1;
});

const summaryPath = path.join(dataDir, 'analysis-summary.json');
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

console.log(`\n✓ Saved analysis summary to ${summaryPath}`);
