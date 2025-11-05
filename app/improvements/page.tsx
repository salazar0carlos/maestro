'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ImprovementSuggestion,
  SuggestionStatus,
  SuggestionCategory,
} from '@/lib/types';
import {
  getSuggestions,
  updateSuggestionStatus,
  deleteSuggestion,
  getProjects,
} from '@/lib/storage';
import { convertSuggestionToTask } from '@/lib/suggestion-to-task';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

/**
 * Impact score color mapping
 */
const getImpactColor = (score: number): string => {
  if (score === 5) return 'bg-red-900 text-red-200 border-red-700';
  if (score === 4) return 'bg-orange-900 text-orange-200 border-orange-700';
  if (score === 3) return 'bg-yellow-900 text-yellow-200 border-yellow-700';
  if (score === 2) return 'bg-blue-900 text-blue-200 border-blue-700';
  return 'bg-gray-900 text-gray-200 border-gray-700';
};

/**
 * Category color mapping
 */
const getCategoryColor = (category: SuggestionCategory): string => {
  const colors = {
    'error-handling': 'bg-red-900/30 text-red-200',
    'performance': 'bg-purple-900/30 text-purple-200',
    'ux': 'bg-blue-900/30 text-blue-200',
    'code-quality': 'bg-green-900/30 text-green-200',
    'security': 'bg-red-900/30 text-red-200',
  };
  return colors[category] || 'bg-gray-900/30 text-gray-200';
};

/**
 * Suggestion Card Component
 */
function SuggestionCard({
  suggestion,
  onApprove,
  onReject,
  onDelete,
  onCreateTask,
}: {
  suggestion: ImprovementSuggestion;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  onCreateTask: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="mb-4">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`px-3 py-1 rounded-md text-sm font-bold border-2 ${getImpactColor(
                  suggestion.impact_score
                )}`}
              >
                Impact {suggestion.impact_score}/5
              </span>
              <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(suggestion.category)}`}>
                {suggestion.category}
              </span>
              <span className="px-2 py-1 rounded text-xs bg-slate-700 text-slate-300">
                {suggestion.priority}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-slate-50">{suggestion.title}</h3>
            <p className="text-sm text-slate-400 mt-1">{suggestion.description}</p>
          </div>

          {/* Status badge */}
          <div>
            <span
              className={`px-3 py-1 rounded text-xs font-medium ${
                suggestion.status === 'approved'
                  ? 'bg-green-900 text-green-200'
                  : suggestion.status === 'rejected'
                  ? 'bg-red-900 text-red-200'
                  : suggestion.status === 'implemented'
                  ? 'bg-blue-900 text-blue-200'
                  : 'bg-yellow-900 text-yellow-200'
              }`}
            >
              {suggestion.status}
            </span>
          </div>
        </div>

        {/* Reasoning (Expandable) */}
        <div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-400 hover:text-blue-300 transition"
          >
            {isExpanded ? '▼' : '▶'} Why this matters
          </button>
          {isExpanded && (
            <div className="mt-2 p-3 bg-slate-800 rounded text-sm text-slate-300">
              {suggestion.reasoning}
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-4 text-xs text-slate-400">
          <div>
            <span className="font-medium">Effort:</span> {suggestion.effort_estimate}
          </div>
          <div>
            <span className="font-medium">Agent:</span> {suggestion.agent_type}
          </div>
        </div>

        {/* Files affected */}
        {suggestion.files_affected.length > 0 && (
          <div className="text-xs">
            <span className="text-slate-400 font-medium">Files affected:</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {suggestion.files_affected.map((file, idx) => (
                <span key={idx} className="bg-slate-800 text-slate-300 px-2 py-1 rounded">
                  {file}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-slate-700">
          {suggestion.status === 'pending' && (
            <>
              <Button onClick={onApprove} variant="primary" className="flex-1">
                ✓ Approve & Create Task
              </Button>
              <Button onClick={onReject} variant="secondary" className="flex-1">
                ✗ Reject
              </Button>
            </>
          )}

          {suggestion.status === 'approved' && !suggestion.task_id && (
            <Button onClick={onCreateTask} variant="primary" className="flex-1">
              Create Task
            </Button>
          )}

          {suggestion.status === 'approved' && suggestion.task_id && (
            <div className="flex-1 text-sm text-green-400">
              ✓ Task created: {suggestion.task_id}
            </div>
          )}

          {(suggestion.status === 'rejected' || suggestion.status === 'implemented') && (
            <Button onClick={onDelete} variant="secondary" className="flex-1">
              Delete
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

/**
 * Improvements Page
 */
export default function ImprovementsPage() {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<ImprovementSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<SuggestionStatus | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<SuggestionCategory | 'all'>('all');

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = () => {
    try {
      const allSuggestions = getSuggestions();
      setSuggestions(allSuggestions);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (suggestionId: string) => {
    if (!confirm('Approve this suggestion and create a task?')) return;

    try {
      // Create task from suggestion
      const task = await convertSuggestionToTask(suggestionId);

      if (task) {
        // Update suggestion status is done in convertSuggestionToTask
        loadSuggestions();
        alert(`Task created successfully: ${task.title}`);
      }
    } catch (error) {
      console.error('Error approving suggestion:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleReject = (suggestionId: string) => {
    if (!confirm('Reject this suggestion? This cannot be undone.')) return;

    try {
      updateSuggestionStatus(suggestionId, 'rejected');
      loadSuggestions();
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
      alert('Error rejecting suggestion');
    }
  };

  const handleDelete = (suggestionId: string) => {
    if (!confirm('Delete this suggestion? This cannot be undone.')) return;

    try {
      deleteSuggestion(suggestionId);
      loadSuggestions();
    } catch (error) {
      console.error('Error deleting suggestion:', error);
      alert('Error deleting suggestion');
    }
  };

  const handleCreateTask = async (suggestionId: string) => {
    try {
      const task = await convertSuggestionToTask(suggestionId);

      if (task) {
        loadSuggestions();
        alert(`Task created: ${task.title}`);
      }
    } catch (error) {
      console.error('Error creating task:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Filter suggestions
  const filteredSuggestions = suggestions.filter(s => {
    const matchesProject = filterProject === 'all' || s.project_id === filterProject;
    const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || s.category === filterCategory;
    return matchesProject && matchesStatus && matchesCategory;
  });

  // Get unique projects
  const projects = getProjects();
  const uniqueCategories: SuggestionCategory[] = [
    'error-handling',
    'performance',
    'ux',
    'code-quality',
    'security',
  ];

  // Sort by impact score (high to low)
  const sortedSuggestions = [...filteredSuggestions].sort(
    (a, b) => b.impact_score - a.impact_score
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-400">Loading suggestions...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-50">Improvement Suggestions</h1>
        <p className="text-slate-400 mt-1">
          AI-generated improvement suggestions for your projects
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <select
          value={filterProject}
          onChange={e => setFilterProject(e.target.value)}
          className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-50 focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All Projects</option>
          {projects.map(project => (
            <option key={project.project_id} value={project.project_id}>
              {project.name}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as SuggestionStatus | 'all')}
          className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-50 focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="implemented">Implemented</option>
        </select>

        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value as SuggestionCategory | 'all')}
          className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-slate-50 focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All Categories</option>
          {uniqueCategories.map(category => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-50">{suggestions.length}</div>
            <div className="text-xs text-slate-400">Total</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {suggestions.filter(s => s.status === 'pending').length}
            </div>
            <div className="text-xs text-slate-400">Pending</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {suggestions.filter(s => s.status === 'approved').length}
            </div>
            <div className="text-xs text-slate-400">Approved</div>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {suggestions.filter(s => s.impact_score >= 4).length}
            </div>
            <div className="text-xs text-slate-400">High Impact</div>
          </div>
        </Card>
      </div>

      {/* Suggestions List */}
      {sortedSuggestions.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-slate-400 mb-4">No improvement suggestions yet</p>
            <Button onClick={() => router.push('/')} variant="primary">
              Go to Projects
            </Button>
          </div>
        </Card>
      ) : (
        <div>
          {sortedSuggestions.map(suggestion => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onApprove={() => handleApprove(suggestion.id)}
              onReject={() => handleReject(suggestion.id)}
              onDelete={() => handleDelete(suggestion.id)}
              onCreateTask={() => handleCreateTask(suggestion.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
