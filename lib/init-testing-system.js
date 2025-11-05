/**
 * Initialize Event-Driven Testing System
 * Run this to start the event-triggered testing infrastructure
 */

import { initializeEventListeners } from './event-listeners.js';
import eventBus, { Events } from './event-bus.js';

/**
 * Initialize the testing system
 */
export function initializeTestingSystem() {
  console.log('='.repeat(60));
  console.log('🧪 Initializing Event-Driven Testing System');
  console.log('='.repeat(60));

  // Initialize event listeners
  initializeEventListeners();

  // Log configuration
  console.log('\n📋 Configuration:');
  console.log(`- Project Root: ${process.cwd()}`);
  console.log(`- Maestro URL: ${process.env.MAESTRO_URL || 'http://localhost:3000'}`);
  console.log(`- GitHub Token: ${process.env.GITHUB_TOKEN ? '✓ Set' : '✗ Not set'}`);

  // Log registered events
  console.log('\n📡 Event Listeners:');
  const events = eventBus.getEvents();
  for (const event of events) {
    const count = eventBus.listenerCount(event);
    console.log(`   ${event}: ${count} listener(s)`);
  }

  console.log('\n✅ Testing system initialized and ready!');
  console.log('\nTriggers:');
  console.log('  • Task completed → Quick validation tests');
  console.log('  • PR created → Full integration tests + comment');
  console.log('  • PR updated → Quick tests + comment');
  console.log('  • Build failed → Create bug report');
  console.log('  • Bug found (critical/high) → Auto-create fix task');
  console.log('\nManual Triggers:');
  console.log('  • POST /api/testing/run-tests (quick tests)');
  console.log('  • POST /api/testing/run-integration-tests (deep tests)');
  console.log('  • POST /api/webhooks/github/pr (GitHub webhook)');
  console.log('='.repeat(60));
}

/**
 * Shutdown the testing system
 */
export function shutdownTestingSystem() {
  console.log('\n🛑 Shutting down testing system...');
  eventBus.removeAllListeners();
  console.log('✅ Testing system shutdown complete');
}

// Auto-initialize if run directly
if (process.env.AUTO_INIT !== 'false') {
  initializeTestingSystem();
}

// Handle shutdown gracefully
process.on('SIGINT', () => {
  shutdownTestingSystem();
  process.exit(0);
});

process.on('SIGTERM', () => {
  shutdownTestingSystem();
  process.exit(0);
});
