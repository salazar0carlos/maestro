'use client';

import { useState } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

interface MigrationStats {
  projects: number;
  tasks: number;
  agents: number;
  improvements: number;
}

export function DataMigration() {
  const [isMigrating, setIsMigrating] = useState(false);
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState<MigrationStats | null>(null);

  const checkLocalStorageData = () => {
    try {
      const projects = JSON.parse(localStorage.getItem('maestro:projects') || '[]');
      const tasks = JSON.parse(localStorage.getItem('maestro:tasks') || '[]');
      const agents = JSON.parse(localStorage.getItem('maestro:agents') || '[]');
      const improvements = JSON.parse(localStorage.getItem('maestro:improvements') || '[]');

      const localStats = {
        projects: projects.length,
        tasks: tasks.length,
        agents: agents.length,
        improvements: improvements.length,
      };

      setStats(localStats);

      const total = localStats.projects + localStats.tasks + localStats.agents + localStats.improvements;
      if (total === 0) {
        setMessage('No data found in localStorage');
      } else {
        setMessage(`Found ${total} items to migrate`);
      }
    } catch (error) {
      setMessage('Error reading localStorage data');
    }
  };

  const migrateData = async () => {
    setIsMigrating(true);
    setMessage('Starting migration...');

    try {
      // Get data from localStorage
      const projects = JSON.parse(localStorage.getItem('maestro:projects') || '[]');
      const tasks = JSON.parse(localStorage.getItem('maestro:tasks') || '[]');
      const agents = JSON.parse(localStorage.getItem('maestro:agents') || '[]');
      const improvements = JSON.parse(localStorage.getItem('maestro:improvements') || '[]');

      const response = await fetch('/api/database/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projects,
          tasks,
          agents,
          improvements,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(`✓ Migration successful! Migrated ${result.total} items.`);

        // Optional: Clear localStorage after successful migration
        if (confirm('Migration successful! Clear localStorage data?')) {
          localStorage.removeItem('maestro:projects');
          localStorage.removeItem('maestro:tasks');
          localStorage.removeItem('maestro:agents');
          localStorage.removeItem('maestro:improvements');
          setMessage('✓ Migration complete and localStorage cleared');
          setStats({ projects: 0, tasks: 0, agents: 0, improvements: 0 });
        }
      } else {
        setMessage(`✗ Migration failed: ${result.error}`);
      }
    } catch (error) {
      setMessage(`✗ Migration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <Card className="border-blue-700/50">
      <h3 className="text-lg font-semibold text-slate-50 mb-4">
        Migrate from localStorage to Supabase
      </h3>

      <div className="space-y-4">
        <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <span className="text-blue-400">ℹ️</span>
            <div className="text-sm text-blue-300">
              <p className="mb-2">
                <strong>One-time migration:</strong> Transfer your existing localStorage data to Supabase database.
              </p>
              <p>
                This allows your data to persist across devices and enables API access for agents.
              </p>
            </div>
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded-lg text-sm font-medium ${
            message.startsWith('✓')
              ? 'bg-green-900/50 text-green-200 border border-green-700'
              : message.startsWith('✗')
              ? 'bg-red-900/50 text-red-200 border border-red-700'
              : 'bg-slate-700/50 text-slate-300 border border-slate-600'
          }`}>
            {message}
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1">Projects</div>
              <div className="text-xl font-bold text-slate-50">{stats.projects}</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1">Tasks</div>
              <div className="text-xl font-bold text-slate-50">{stats.tasks}</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1">Agents</div>
              <div className="text-xl font-bold text-slate-50">{stats.agents}</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="text-xs text-slate-400 mb-1">Improvements</div>
              <div className="text-xl font-bold text-slate-50">{stats.improvements}</div>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-4 border-t border-slate-700">
          <Button
            variant="secondary"
            onClick={checkLocalStorageData}
            disabled={isMigrating}
          >
            Check Data
          </Button>
          <Button
            variant="primary"
            onClick={migrateData}
            isLoading={isMigrating}
            disabled={!stats || (stats.projects + stats.tasks + stats.agents + stats.improvements === 0)}
          >
            {isMigrating ? 'Migrating...' : 'Migrate to Supabase'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
