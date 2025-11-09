'use client';

import { useState } from 'react';
import { Project } from '@/lib/types';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

interface SettingsTabProps {
  project: Project;
  onUpdateProject: (updates: Partial<Project>) => void;
}

interface ProjectSettings {
  intelligenceLayerEnabled: boolean;
  autoAssignTasks: boolean;
  notificationsEnabled: boolean;
  agentSpawnThreshold: number;
  maxConcurrentTasks: number;
  priorityRules: 'manual' | 'auto' | 'ai-driven';
  requireApproval: boolean;
}

export function SettingsTab({ project, onUpdateProject }: SettingsTabProps) {
  // Load settings from localStorage or use defaults
  const loadSettings = (): ProjectSettings => {
    if (typeof window === 'undefined') {
      return getDefaultSettings();
    }
    const stored = localStorage.getItem(`project_settings_${project.project_id}`);
    return stored ? JSON.parse(stored) : getDefaultSettings();
  };

  const getDefaultSettings = (): ProjectSettings => ({
    intelligenceLayerEnabled: true,
    autoAssignTasks: false,
    notificationsEnabled: true,
    agentSpawnThreshold: 5,
    maxConcurrentTasks: 3,
    priorityRules: 'manual',
    requireApproval: true,
  });

  const [settings, setSettings] = useState<ProjectSettings>(loadSettings());
  const [projectInfo, setProjectInfo] = useState({
    name: project.name,
    description: project.description,
    github_repo: project.github_repo || '',
    local_path: project.local_path || '',
  });

  const [hasChanges, setHasChanges] = useState(false);

  const handleSettingChange = <K extends keyof ProjectSettings>(
    key: K,
    value: ProjectSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleProjectInfoChange = (key: string, value: string) => {
    setProjectInfo((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    // Save settings to localStorage
    localStorage.setItem(`project_settings_${project.project_id}`, JSON.stringify(settings));

    // Update project info
    onUpdateProject(projectInfo);

    setHasChanges(false);
    alert('Settings saved successfully!');
  };

  const handleReset = () => {
    if (confirm('Reset all settings to defaults?')) {
      setSettings(getDefaultSettings());
      setHasChanges(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Save Bar */}
      {hasChanges && (
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 flex items-center justify-between">
          <p className="text-blue-200">You have unsaved changes</p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setHasChanges(false)}>
              Discard
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      )}

      {/* Project Information */}
      <Card>
        <h2 className="text-xl font-bold text-slate-50 mb-4">Project Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Project Name</label>
            <input
              type="text"
              value={projectInfo.name}
              onChange={(e) => handleProjectInfoChange('name', e.target.value)}
              className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-50 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Description</label>
            <textarea
              value={projectInfo.description}
              onChange={(e) => handleProjectInfoChange('description', e.target.value)}
              rows={3}
              className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-50 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">GitHub Repository</label>
            <input
              type="url"
              value={projectInfo.github_repo}
              onChange={(e) => handleProjectInfoChange('github_repo', e.target.value)}
              placeholder="https://github.com/username/repo"
              className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-50 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Local Path</label>
            <input
              type="text"
              value={projectInfo.local_path}
              onChange={(e) => handleProjectInfoChange('local_path', e.target.value)}
              placeholder="/path/to/project"
              className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-50 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </Card>

      {/* Intelligence Layer Settings */}
      <Card>
        <h2 className="text-xl font-bold text-slate-50 mb-4">Intelligence Layer</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-50 font-medium">Enable Intelligence Layer</div>
              <div className="text-sm text-slate-400">
                AI-powered analysis and improvement suggestions
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.intelligenceLayerEnabled}
                onChange={(e) =>
                  handleSettingChange('intelligenceLayerEnabled', e.target.checked)
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-50 font-medium">Require Approval</div>
              <div className="text-sm text-slate-400">
                Human approval required for AI suggestions
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.requireApproval}
                onChange={(e) => handleSettingChange('requireApproval', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </Card>

      {/* Task Management Settings */}
      <Card>
        <h2 className="text-xl font-bold text-slate-50 mb-4">Task Management</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-50 font-medium">Auto-assign Tasks</div>
              <div className="text-sm text-slate-400">
                Automatically assign new tasks to available agents
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoAssignTasks}
                onChange={(e) => handleSettingChange('autoAssignTasks', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Priority Rules</label>
            <select
              value={settings.priorityRules}
              onChange={(e) =>
                handleSettingChange('priorityRules', e.target.value as ProjectSettings['priorityRules'])
              }
              className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-50 focus:border-blue-500 focus:outline-none"
            >
              <option value="manual">Manual - Set by user</option>
              <option value="auto">Auto - Based on deadlines</option>
              <option value="ai-driven">AI-Driven - Intelligent prioritization</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Max Concurrent Tasks per Agent
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={settings.maxConcurrentTasks}
              onChange={(e) =>
                handleSettingChange('maxConcurrentTasks', parseInt(e.target.value))
              }
              className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-50 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </Card>

      {/* Agent Management Settings */}
      <Card>
        <h2 className="text-xl font-bold text-slate-50 mb-4">Agent Management</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Auto-spawn Agent Threshold
            </label>
            <div className="text-xs text-slate-500 mb-2">
              Automatically spawn new agents when todo tasks exceed this number
            </div>
            <input
              type="number"
              min="1"
              max="50"
              value={settings.agentSpawnThreshold}
              onChange={(e) =>
                handleSettingChange('agentSpawnThreshold', parseInt(e.target.value))
              }
              className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-50 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </Card>

      {/* Notifications */}
      <Card>
        <h2 className="text-xl font-bold text-slate-50 mb-4">Notifications</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-50 font-medium">Enable Notifications</div>
              <div className="text-sm text-slate-400">
                Get notified about task completions and issues
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notificationsEnabled}
                onChange={(e) => handleSettingChange('notificationsEnabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-900/50">
        <h2 className="text-xl font-bold text-red-400 mb-4">Danger Zone</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700">
            <div>
              <div className="text-slate-50 font-medium">Reset Settings</div>
              <div className="text-sm text-slate-400">Reset all settings to defaults</div>
            </div>
            <Button variant="danger" size="sm" onClick={handleReset}>
              Reset
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-50 font-medium">Delete Project</div>
              <div className="text-sm text-slate-400">
                Permanently delete this project and all its data
              </div>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (
                  confirm(
                    'Are you sure you want to delete this project? This action cannot be undone.'
                  )
                ) {
                  alert('Project deletion not implemented in this demo');
                }
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4">
        <Button variant="secondary" onClick={handleReset}>
          Reset to Defaults
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={!hasChanges}>
          Save All Changes
        </Button>
      </div>
    </div>
  );
}
