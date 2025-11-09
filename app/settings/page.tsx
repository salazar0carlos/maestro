'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { CostTracker } from '@/lib/cost-tracking';
import { clearAllData } from '@/lib/storage';

type ViewDensity = 'compact' | 'comfortable';
type ColorScheme = 'blue' | 'purple' | 'green' | 'orange';

interface Settings {
  // Project Defaults
  defaultAgentType: string;
  defaultTaskPriority: string;
  autoApproveLowRisk: boolean;

  // Notifications
  emailNotifications: boolean;
  emailAddress: string;
  slackWebhook: string;
  discordWebhook: string;

  // Theme & Display
  viewDensity: ViewDensity;
  colorScheme: ColorScheme;
}

const defaultSettings: Settings = {
  defaultAgentType: 'Backend',
  defaultTaskPriority: 'medium',
  autoApproveLowRisk: false,
  emailNotifications: false,
  emailAddress: '',
  slackWebhook: '',
  discordWebhook: '',
  viewDensity: 'comfortable',
  colorScheme: 'blue',
};

export default function SettingsPage() {
  const [apiKey, setApiKeyValue] = useState('');
  const [displayApiKey, setDisplayApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [usageStats, setUsageStats] = useState({ calls: 0, tokens: 0, cost: 0 });

  useEffect(() => {
    // Load API key
    const stored = localStorage.getItem('anthropic_api_key') || '';
    setApiKeyValue(stored);
    setDisplayApiKey(stored ? '••••••••••••' + stored.slice(-4) : '');

    // Load settings
    const savedSettings = localStorage.getItem('maestro:settings');
    if (savedSettings) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
      } catch (e) {
        console.error('Failed to parse settings', e);
      }
    }

    // Load usage stats
    const stats = CostTracker.getStats();
    setUsageStats({
      calls: stats.total_calls,
      tokens: stats.total_tokens,
      cost: stats.total_cost_usd,
    });
  }, []);

  const showMessage = (msg: string, isError: boolean = false) => {
    setMessage(isError ? `Error: ${msg}` : `✓ ${msg}`);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSaveApiKey = () => {
    const trimmedKey = apiKey.trim();

    if (!trimmedKey) {
      showMessage('Please enter an API key', true);
      return;
    }

    if (!trimmedKey.startsWith('sk-ant-')) {
      showMessage('API key must start with sk-ant-', true);
      return;
    }

    if (trimmedKey.length > 200) {
      showMessage('API key is too long. Keys should be around 40-60 characters.', true);
      return;
    }

    setIsSaving(true);
    localStorage.setItem('anthropic_api_key', trimmedKey);
    setDisplayApiKey('••••••••••••' + trimmedKey.slice(-4));
    showMessage('API key saved successfully');
    setIsSaving(false);
  };

  const handleClearApiKey = () => {
    localStorage.removeItem('anthropic_api_key');
    setApiKeyValue('');
    setDisplayApiKey('');
    showMessage('API key cleared');
  };

  const handleTestConnection = async () => {
    const key = localStorage.getItem('anthropic_api_key');
    if (!key) {
      showMessage('Please set an API key first', true);
      return;
    }

    setIsTestingConnection(true);
    try {
      const response = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskTitle: 'Connection Test',
          taskDescription: 'Testing API connection',
          projectContext: '',
        }),
      });

      if (response.ok) {
        showMessage('Connection successful!');
      } else {
        const error = await response.json();
        showMessage(error.error || 'Connection failed', true);
      }
    } catch (error) {
      showMessage('Connection failed', true);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSaveSettings = () => {
    localStorage.setItem('maestro:settings', JSON.stringify(settings));
    showMessage('Settings saved successfully');
  };

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleExportData = () => {
    try {
      const data = {
        apiKey: localStorage.getItem('anthropic_api_key'),
        settings: settings,
        projects: localStorage.getItem('maestro:projects'),
        tasks: localStorage.getItem('maestro:tasks'),
        agents: localStorage.getItem('maestro:agents'),
        improvements: localStorage.getItem('maestro:improvements'),
        costRecords: localStorage.getItem('maestro:cost_records'),
        exportDate: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `maestro-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showMessage('Data exported successfully');
    } catch (error) {
      showMessage('Export failed', true);
    }
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (confirm('This will replace all current data. Continue?')) {
          if (data.apiKey) localStorage.setItem('anthropic_api_key', data.apiKey);
          if (data.settings) localStorage.setItem('maestro:settings', JSON.stringify(data.settings));
          if (data.projects) localStorage.setItem('maestro:projects', data.projects);
          if (data.tasks) localStorage.setItem('maestro:tasks', data.tasks);
          if (data.agents) localStorage.setItem('maestro:agents', data.agents);
          if (data.improvements) localStorage.setItem('maestro:improvements', data.improvements);
          if (data.costRecords) localStorage.setItem('maestro:cost_records', data.costRecords);

          showMessage('Data imported successfully. Refreshing...');
          setTimeout(() => window.location.reload(), 1500);
        }
      } catch (error) {
        showMessage('Import failed - invalid file format', true);
      }
    };
    input.click();
  };

  const handleClearAllData = () => {
    if (confirm('⚠️ This will delete ALL data including projects, tasks, and agents. This cannot be undone. Continue?')) {
      if (confirm('Are you absolutely sure? This is permanent!')) {
        clearAllData();
        CostTracker.clearRecords();
        localStorage.removeItem('maestro:settings');
        showMessage('All data cleared. Refreshing...');
        setTimeout(() => window.location.reload(), 1500);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-50 mb-2">Settings</h1>
        <p className="text-slate-400">Configure Maestro for your workflow</p>
      </div>

      {/* Message Banner */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg text-sm font-medium ${
          message.startsWith('Error:')
            ? 'bg-red-900/50 text-red-200 border border-red-700'
            : 'bg-green-900/50 text-green-200 border border-green-700'
        }`}>
          {message}
        </div>
      )}

      {/* 1. API Configuration */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-50 mb-4">API Configuration</h2>

        <Card className="mb-4">
          <h3 className="text-lg font-semibold text-slate-50 mb-4">Anthropic API Key</h3>

          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Your API key is used to generate AI prompts for tasks. Get your key from{' '}
              <a
                href="https://console.anthropic.com/account/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                console.anthropic.com
              </a>
            </p>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                API Key
              </label>
              {displayApiKey && !apiKey ? (
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="password"
                    value={displayApiKey}
                    disabled
                    className="flex-1 rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-400 cursor-not-allowed"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setApiKeyValue('');
                      setDisplayApiKey('');
                    }}
                  >
                    Change
                  </Button>
                  <Button variant="ghost" onClick={handleClearApiKey}>
                    Clear
                  </Button>
                </div>
              ) : (
                <>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={e => setApiKeyValue(e.target.value)}
                    placeholder="sk-ant-..."
                    className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-50 placeholder-slate-500 focus:border-blue-500 focus:outline-none font-mono text-sm mb-2"
                  />
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setApiKeyValue('')}>
                      Cancel
                    </Button>
                    <Button variant="primary" onClick={handleSaveApiKey} isLoading={isSaving}>
                      Save
                    </Button>
                  </div>
                </>
              )}
            </div>

            {displayApiKey && (
              <div className="pt-4 border-t border-slate-700">
                <Button
                  variant="secondary"
                  onClick={handleTestConnection}
                  isLoading={isTestingConnection}
                  className="w-full sm:w-auto"
                >
                  {isTestingConnection ? 'Testing...' : 'Test Connection'}
                </Button>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-slate-50 mb-4">Usage Statistics</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">API Calls</div>
              <div className="text-2xl font-bold text-slate-50">{usageStats.calls.toLocaleString()}</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">Tokens Used</div>
              <div className="text-2xl font-bold text-slate-50">{usageStats.tokens.toLocaleString()}</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">Total Cost</div>
              <div className="text-2xl font-bold text-slate-50">${usageStats.cost.toFixed(4)}</div>
            </div>
          </div>
        </Card>
      </section>

      {/* 2. Project Defaults */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-50 mb-4">Project Defaults</h2>

        <Card>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Default Agent Type
              </label>
              <select
                value={settings.defaultAgentType}
                onChange={e => updateSetting('defaultAgentType', e.target.value)}
                className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-50 focus:border-blue-500 focus:outline-none"
              >
                <option value="Frontend">Frontend</option>
                <option value="Backend">Backend</option>
                <option value="Testing">Testing</option>
                <option value="Research">Research</option>
                <option value="Product-Improvement">Product Improvement</option>
                <option value="Supervisor">Supervisor</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">Default agent for new tasks</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Default Task Priority
              </label>
              <select
                value={settings.defaultTaskPriority}
                onChange={e => updateSetting('defaultTaskPriority', e.target.value)}
                className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-50 focus:border-blue-500 focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">Default priority for new tasks</p>
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="autoApprove"
                checked={settings.autoApproveLowRisk}
                onChange={e => updateSetting('autoApproveLowRisk', e.target.checked)}
                className="mt-1 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <label htmlFor="autoApprove" className="text-sm font-medium text-slate-300 cursor-pointer">
                  Auto-approve low-risk improvements
                </label>
                <p className="text-xs text-slate-500 mt-1">
                  Automatically approve and implement low-risk suggestions (e.g., documentation, code comments)
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-700">
              <Button variant="primary" onClick={handleSaveSettings}>
                Save Project Defaults
              </Button>
            </div>
          </div>
        </Card>
      </section>

      {/* 3. Notification Preferences */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-50 mb-4">Notification Preferences</h2>

        <Card>
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="emailNotif"
                checked={settings.emailNotifications}
                onChange={e => updateSetting('emailNotifications', e.target.checked)}
                className="mt-1 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <label htmlFor="emailNotif" className="text-sm font-medium text-slate-300 cursor-pointer">
                  Email notifications for completed tasks
                </label>
                {settings.emailNotifications && (
                  <input
                    type="email"
                    value={settings.emailAddress}
                    onChange={e => updateSetting('emailAddress', e.target.value)}
                    placeholder="your-email@example.com"
                    className="mt-2 w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-50 placeholder-slate-500 focus:border-blue-500 focus:outline-none text-sm"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Slack Webhook URL
              </label>
              <input
                type="url"
                value={settings.slackWebhook}
                onChange={e => updateSetting('slackWebhook', e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-50 placeholder-slate-500 focus:border-blue-500 focus:outline-none text-sm font-mono"
              />
              <p className="text-xs text-slate-500 mt-1">
                Send task completion notifications to Slack
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Discord Webhook URL
              </label>
              <input
                type="url"
                value={settings.discordWebhook}
                onChange={e => updateSetting('discordWebhook', e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-50 placeholder-slate-500 focus:border-blue-500 focus:outline-none text-sm font-mono"
              />
              <p className="text-xs text-slate-500 mt-1">
                Send task completion notifications to Discord
              </p>
            </div>

            <div className="pt-4 border-t border-slate-700">
              <Button variant="primary" onClick={handleSaveSettings}>
                Save Notification Settings
              </Button>
            </div>
          </div>
        </Card>
      </section>

      {/* 4. Theme & Display */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-50 mb-4">Theme & Display</h2>

        <Card>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                View Density
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => updateSetting('viewDensity', 'compact')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition ${
                    settings.viewDensity === 'compact'
                      ? 'border-blue-500 bg-blue-900/30 text-blue-300'
                      : 'border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="font-medium">Compact</div>
                  <div className="text-xs mt-1 opacity-75">Smaller spacing</div>
                </button>
                <button
                  onClick={() => updateSetting('viewDensity', 'comfortable')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition ${
                    settings.viewDensity === 'comfortable'
                      ? 'border-blue-500 bg-blue-900/30 text-blue-300'
                      : 'border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="font-medium">Comfortable</div>
                  <div className="text-xs mt-1 opacity-75">Default spacing</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Color Scheme
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(['blue', 'purple', 'green', 'orange'] as ColorScheme[]).map(color => (
                  <button
                    key={color}
                    onClick={() => updateSetting('colorScheme', color)}
                    className={`px-4 py-3 rounded-lg border-2 transition capitalize ${
                      settings.colorScheme === color
                        ? `border-${color}-500 bg-${color}-900/30 text-${color}-300`
                        : 'border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <div className={`w-8 h-8 mx-auto mb-2 rounded-full ${
                      color === 'blue' ? 'bg-blue-500' :
                      color === 'purple' ? 'bg-purple-500' :
                      color === 'green' ? 'bg-green-500' :
                      'bg-orange-500'
                    }`} />
                    {color}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Accent color for buttons and highlights (coming soon)
              </p>
            </div>

            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <span className="text-blue-400">ℹ️</span>
                <div className="text-sm text-blue-300">
                  <strong>Dark mode is enabled by default.</strong> Light mode support coming soon.
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-700">
              <Button variant="primary" onClick={handleSaveSettings}>
                Save Display Settings
              </Button>
            </div>
          </div>
        </Card>
      </section>

      {/* 5. Danger Zone */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-red-400 mb-4">Danger Zone</h2>

        <Card className="border-red-700/50">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-700">
              <div>
                <h3 className="text-sm font-semibold text-slate-300">Export All Data</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Download all projects, tasks, agents, and settings as JSON
                </p>
              </div>
              <Button variant="secondary" onClick={handleExportData}>
                Export
              </Button>
            </div>

            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-700">
              <div>
                <h3 className="text-sm font-semibold text-slate-300">Import Data</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Restore data from a previously exported JSON file
                </p>
              </div>
              <Button variant="secondary" onClick={handleImportData}>
                Import
              </Button>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-red-400">Clear All Data</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Permanently delete all projects, tasks, agents, and settings. This cannot be undone.
                </p>
              </div>
              <Button variant="danger" onClick={handleClearAllData}>
                Clear All
              </Button>
            </div>
          </div>
        </Card>
      </section>

      {/* About */}
      <Card>
        <h2 className="text-lg font-bold text-slate-50 mb-4">About Maestro</h2>
        <div className="space-y-3 text-sm text-slate-400">
          <p>
            <strong className="text-slate-300">Version:</strong> 0.1.0 (Phase 1)
          </p>
          <p>
            <strong className="text-slate-300">Storage:</strong> localStorage (browser-based, persistent across sessions)
          </p>
          <p>
            <strong className="text-slate-300">Features:</strong> Project management, task creation, AI prompt generation, agent monitoring, cost tracking
          </p>
          <p>
            <strong className="text-slate-300">Coming Soon:</strong> Real-time updates, PostgreSQL backend, GitHub integration, team collaboration
          </p>
        </div>
      </Card>
    </div>
  );
}
