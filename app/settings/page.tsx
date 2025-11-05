'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

export default function SettingsPage() {
  const [apiKey, setApiKeyValue] = useState('');
  const [displayApiKey, setDisplayApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('anthropic_api_key') || '';
    setApiKeyValue(stored);
    setDisplayApiKey(stored ? '••••••••••••' + stored.slice(-4) : '');
  }, []);

  const handleSaveApiKey = () => {
    const trimmedKey = apiKey.trim();

    if (!trimmedKey) {
      setMessage('Please enter an API key');
      return;
    }

    // Validate format - must start with sk-ant-
    if (!trimmedKey.startsWith('sk-ant-')) {
      setMessage('Error: API key must start with sk-ant-. Please paste your actual Anthropic API key.');
      return;
    }

    // Warn if key seems too long (likely pasted content)
    if (trimmedKey.length > 200) {
      setMessage('Error: API key is too long. Did you paste the wrong content? Keys should be around 40-60 characters.');
      return;
    }

    setIsSaving(true);

    // Save the trimmed key
    localStorage.setItem('anthropic_api_key', trimmedKey);
    setDisplayApiKey('••••••••••••' + trimmedKey.slice(-4));
    setMessage('✓ API key saved successfully');

    setTimeout(() => {
      setMessage('');
    }, 3000);

    setIsSaving(false);
  };

  const handleClearApiKey = () => {
    localStorage.removeItem('anthropic_api_key');
    setApiKeyValue('');
    setDisplayApiKey('');
    setMessage('✓ API key cleared');
    setTimeout(() => {
      setMessage('');
    }, 2000);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-50 mb-2">Settings</h1>
        <p className="text-slate-400">Configure Maestro for your environment</p>
      </div>

      {/* API Key Configuration */}
      <Card className="mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-50 mb-4">Anthropic API Key</h2>

          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Your API key is used to generate AI prompts for tasks. Get your key from{' '}
              <a
                href="https://console.anthropic.com/account/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                console.anthropic.com
              </a>
            </p>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                API Key
              </label>
              {displayApiKey && !apiKey ? (
                <div className="flex items-center gap-2 mb-4">
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
                  <Button
                    variant="ghost"
                    onClick={handleClearApiKey}
                  >
                    Clear
                  </Button>
                </div>
              ) : (
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => {
                    setApiKeyValue(e.target.value);
                  }}
                  placeholder="sk-ant-..."
                  className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-50 placeholder-slate-500 focus:border-blue-500 focus:outline-none font-mono text-sm"
                />
              )}
            </div>

            {message && (
              <div className={`p-3 rounded-md text-sm ${
                message.startsWith('Error:')
                  ? 'bg-red-900 text-red-200'
                  : 'bg-green-900 text-green-200'
              }`}>
                {message}
              </div>
            )}

            {!displayApiKey && (
              <div className="flex gap-2 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setApiKeyValue('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveApiKey}
                  isLoading={isSaving}
                >
                  Save
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Information */}
      <Card>
        <h2 className="text-lg font-bold text-slate-50 mb-4">About Maestro</h2>
        <div className="space-y-4 text-sm text-slate-400">
          <p>
            <strong>Version:</strong> 0.1.0 (Phase 1)
          </p>
          <p>
            <strong>Storage:</strong> localStorage (persistent across sessions)
          </p>
          <p>
            <strong>Features:</strong> Project management, task creation, AI prompt generation,
            agent monitoring
          </p>
          <p>
            <strong>Coming Soon:</strong> Real-time updates, PostgreSQL backend, GitHub
            integration, team collaboration
          </p>
        </div>
      </Card>
    </div>
  );
}
