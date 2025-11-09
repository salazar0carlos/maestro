#!/usr/bin/env node

/**
 * Supervisor Agent
 * 
 * Monitors overall system health and coordinates agents
 */

require('dotenv').config();

const AGENT_TYPE = 'Supervisor';
const CHECK_INTERVAL = parseInt(process.env.HEALTH_CHECK_INTERVAL || '60000'); // 1 minute

console.log(`[${AGENT_TYPE}] Starting supervisor agent...`);
console.log(`[${AGENT_TYPE}] Health check interval: ${CHECK_INTERVAL}ms`);

async function checkSystemHealth() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    
    // Check if API is responsive
    const response = await fetch(`${apiUrl}/api/supervisor/alerts`);
    
    if (response.ok) {
      const alerts = await response.json();
      
      if (alerts.length > 0) {
        console.log(`[${AGENT_TYPE}] ⚠️  ${alerts.length} alert(s) detected`);
        alerts.forEach(alert => {
          console.log(`[${AGENT_TYPE}]   - ${alert.type}: ${alert.message}`);
        });
      } else {
        console.log(`[${AGENT_TYPE}] ✓ System healthy, no alerts`);
      }
    } else {
      console.error(`[${AGENT_TYPE}] ❌ Health check failed: API returned ${response.status}`);
    }
  } catch (error) {
    console.error(`[${AGENT_TYPE}] ❌ Health check error:`, error.message);
  }
}

// Initial check
console.log(`[${AGENT_TYPE}] ✓ Supervisor started, running initial health check...`);
checkSystemHealth();

// Schedule regular checks
const intervalId = setInterval(checkSystemHealth, CHECK_INTERVAL);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log(`\n[${AGENT_TYPE}] Received SIGTERM, shutting down...`);
  clearInterval(intervalId);
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log(`\n[${AGENT_TYPE}] Received SIGINT, shutting down...`);
  clearInterval(intervalId);
  process.exit(0);
});

console.log(`[${AGENT_TYPE}] Supervisor ready, monitoring system...`);
