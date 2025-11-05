'use client';

import { useState, useEffect } from 'react';
import { ImprovementSuggestion, Project } from '@/lib/types';
import {
  getSuggestions,
  updateSuggestion,
  getProjects,
  getProject,
} from '@/lib/storage';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { SuggestionCardSkeleton } from '@/components/LoadingStates';
import { ChevronDown, ChevronUp, CheckCircle, XCircle } from 'lucide-react';

interface SuggestionCardProps {
  suggestion: ImprovementSuggestion;
  project: Project | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

function SuggestionCard({ suggestion, project, onApprove, onReject }: SuggestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showConfirm, setShowConfirm] = useState<'approve' | 'reject' | null>(null);

  // Impact score color mapping
  const getImpactColor = (score: number) => {
    switch (score) {
      case 5: return 'bg-red-600 text-white';
      case 4: return 'bg-orange-600 text-white';
      case 3: return 'bg-yellow-600 text-slate-900';
      case 2: return 'bg-blue-600 text-white';
      case 1: return 'bg-slate-600 text-white';
      default: return 'bg-slate-600 text-white';
    }
  };

  // Effort estimate color mapping
  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-slate-400';
    }
  };

  const handleApprove = () => {
    if (showConfirm === 'approve') {
      onApprove(suggestion.suggestion_id);
      setShowConfirm(null);
    } else {
      setShowConfirm('approve');
    }
  };

  const handleReject = () => {
    if (showConfirm === 'reject') {
      onReject(suggestion.suggestion_id);
      setShowConfirm(null);
    } else {
      setShowConfirm('reject');
    }
  };

  return (
    <Card className="hover:border-slate-600 transition">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-50 mb-1">{suggestion.title}</h3>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span>{project?.name || 'Unknown Project'}</span>
            <span>•</span>
            <span>{new Date(suggestion.created_date).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full text-sm font-bold ${getImpactColor(suggestion.impact_score)}`}>
            Impact: {suggestion.impact_score}
          </div>
        </div>
      </div>

      <p className="text-slate-300 mb-4">{suggestion.description}</p>

      <div className="flex items-center gap-4 mb-4 text-sm">
        <div>
          <span className="text-slate-400">Effort: </span>
          <span className={`font-medium ${getEffortColor(suggestion.effort_estimate)}`}>
            {suggestion.effort_estimate.toUpperCase()}
          </span>
        </div>
        <div>
          <span className="text-slate-400">Status: </span>
          <span className="text-slate-300 capitalize">{suggestion.status}</span>
        </div>
      </div>

      {/* Expandable Reasoning */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition mb-4"
      >
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        {isExpanded ? 'Hide' : 'Show'} Reasoning
      </button>

      {isExpanded && (
        <div className="bg-slate-900 rounded-lg p-4 mb-4 border border-slate-700">
          <p className="text-sm text-slate-300 whitespace-pre-line">{suggestion.reasoning}</p>
        </div>
      )}

      {/* Action Buttons */}
      {suggestion.status === 'pending' && (
        <div className="flex gap-2">
          <Button
            variant={showConfirm === 'approve' ? 'primary' : 'secondary'}
            size="sm"
            onClick={handleApprove}
            className="flex items-center gap-2"
          >
            <CheckCircle size={16} />
            {showConfirm === 'approve' ? 'Confirm Approve?' : 'Approve'}
          </Button>
          <Button
            variant={showConfirm === 'reject' ? 'danger' : 'secondary'}
            size="sm"
            onClick={handleReject}
            className="flex items-center gap-2"
          >
            <XCircle size={16} />
            {showConfirm === 'reject' ? 'Confirm Reject?' : 'Reject'}
          </Button>
          {showConfirm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConfirm(null)}
            >
              Cancel
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

export default function ImprovementsPage() {
  const [suggestions, setSuggestions] = useState<ImprovementSuggestion[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState({ project: 'all', status: 'pending' });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load data
    const allSuggestions = getSuggestions();
    const allProjects = getProjects();

    setSuggestions(allSuggestions);
    setProjects(allProjects);
    setIsLoading(false);
  }, []);

  const handleApprove = (suggestionId: string) => {
    updateSuggestion(suggestionId, {
      status: 'approved',
      reviewed_date: new Date().toISOString(),
    });
    // Refresh suggestions
    setSuggestions(getSuggestions());
  };

  const handleReject = (suggestionId: string) => {
    updateSuggestion(suggestionId, {
      status: 'rejected',
      reviewed_date: new Date().toISOString(),
    });
    // Refresh suggestions
    setSuggestions(getSuggestions());
  };

  // Apply filters
  const filteredSuggestions = suggestions.filter(s => {
    if (filter.project !== 'all' && s.project_id !== filter.project) return false;
    if (filter.status !== 'all' && s.status !== filter.status) return false;
    return true;
  });

  // Sort by impact score (highest first) and date (newest first)
  const sortedSuggestions = [...filteredSuggestions].sort((a, b) => {
    if (b.impact_score !== a.impact_score) {
      return b.impact_score - a.impact_score;
    }
    return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
  });

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="h-8 bg-slate-800 rounded w-64 mb-2 animate-pulse"></div>
        <div className="h-4 bg-slate-800 rounded w-48 mb-8 animate-pulse"></div>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <SuggestionCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-50 mb-2">Improvement Suggestions</h1>
        <p className="text-slate-400 mb-6">
          Review AI-generated suggestions from the Product Improvement Agent
        </p>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div>
            <label htmlFor="project-filter" className="block text-sm font-medium text-slate-400 mb-2">
              Project
            </label>
            <select
              id="project-filter"
              value={filter.project}
              onChange={(e) => setFilter({ ...filter, project: e.target.value })}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Projects</option>
              {projects.map(p => (
                <option key={p.project_id} value={p.project_id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-slate-400 mb-2">
              Status
            </label>
            <select
              id="status-filter"
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="implemented">Implemented</option>
            </select>
          </div>
        </div>
      </header>

      {/* Suggestions List */}
      {sortedSuggestions.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-5xl mb-4">💡</div>
          <h3 className="text-xl font-bold text-slate-50 mb-2">No suggestions yet</h3>
          <p className="text-slate-400">
            {filter.project !== 'all' || filter.status !== 'all'
              ? 'Try adjusting your filters'
              : 'The Product Improvement Agent will analyze your projects and suggest improvements'}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sortedSuggestions.map(suggestion => (
            <SuggestionCard
              key={suggestion.suggestion_id}
              suggestion={suggestion}
              project={getProject(suggestion.project_id)}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {suggestions.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {[
            { label: 'Total', count: suggestions.length, color: 'text-blue-400' },
            {
              label: 'Pending',
              count: suggestions.filter(s => s.status === 'pending').length,
              color: 'text-yellow-400',
            },
            {
              label: 'Approved',
              count: suggestions.filter(s => s.status === 'approved').length,
              color: 'text-green-400',
            },
            {
              label: 'Implemented',
              count: suggestions.filter(s => s.status === 'implemented').length,
              color: 'text-purple-400',
            },
          ].map(stat => (
            <Card key={stat.label} className="text-center">
              <p className="text-sm text-slate-400 mb-2">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
