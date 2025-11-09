'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { isSupabaseConfigured } from '@/lib/supabase';

interface DatabaseStats {
  projects: number;
  tasks: number;
  agents: number;
  improvements: number;
  connected: boolean;
  error?: string;
}

export function DatabaseStatus() {
  const [stats, setStats] = useState<DatabaseStats>({
    projects: 0,
    tasks: 0,
    agents: 0,
    improvements: 0,
    connected: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/database/stats');
      if (response.ok) {
        const data = await response.json();
        setStats({ ...data, connected: true });
      } else {
        setStats(prev => ({ ...prev, connected: false, error: 'Failed to fetch stats' }));
      }
    } catch (error) {
      setStats(prev => ({ ...prev, connected: false, error: 'Connection error' }));
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    setIsTesting(true);
    setTestMessage('');
    try {
      const response = await fetch('/api/database/test');
      const data = await response.json();

      if (response.ok) {
        setTestMessage(`✓ ${data.message}`);
        await loadStats();
      } else {
        setTestMessage(`✗ ${data.error || 'Connection test failed'}`);
      }
    } catch (error) {
      setTestMessage('✗ Connection test failed');
    } finally {
      setIsTesting(false);
      setTimeout(() => setTestMessage(''), 5000);
    }
  };

  const isConfigured = isSupabaseConfigured();

  return (
    <Card>
      <h3 className="text-lg font-semibold text-slate-50 mb-4">Database Connection</h3>

      {!isConfigured ? (
        <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <span className="text-yellow-400">⚠️</span>
            <div className="text-sm text-yellow-300">
              <strong>Database not configured.</strong> Set NEXT_PUBLIC_SUPABASE_URL and
              NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment variables.
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-3 h-3 rounded-full ${stats.connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm font-medium text-slate-300">
              {stats.connected ? '✓ Connected to Supabase' : '✗ Not connected'}
            </span>
          </div>

          {testMessage && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              testMessage.startsWith('✓')
                ? 'bg-green-900/50 text-green-200 border border-green-700'
                : 'bg-red-900/50 text-red-200 border border-red-700'
            }`}>
              {testMessage}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-4 text-slate-400">Loading stats...</div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
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

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={testConnection}
                  isLoading={isTesting}
                >
                  {isTesting ? 'Testing...' : 'Test Connection'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={loadStats}
                  disabled={isLoading}
                >
                  Refresh
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </Card>
  );
}
