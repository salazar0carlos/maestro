'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { ImprovementSuggestion } from '@/lib/types';

type ImprovementFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'implemented';

export default function ImprovementsPage() {
  const [improvements, setImprovements] = useState<ImprovementSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState<ImprovementFilter>('pending');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchImprovements();
  }, [filter]);

  const fetchImprovements = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        project_id: 'maestro-self-improvement',
        ...(filter !== 'all' && { status: filter })
      });

      const response = await fetch(`/api/improvements?${params}`);
      if (!response.ok) throw new Error('Failed to fetch improvements');

      const data = await response.json();
      setImprovements(data.improvements || []);
    } catch (error) {
      console.error('Error fetching improvements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (improvementId: string, convertToTask: boolean = true) => {
    try {
      const response = await fetch(`/api/improvements/${improvementId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          reviewed_by: 'user',
          convert_to_task: convertToTask
        })
      });

      if (!response.ok) throw new Error('Failed to approve improvement');

      await fetchImprovements();
      alert(`Improvement approved${convertToTask ? ' and converted to task!' : '!'}`);
    } catch (error) {
      console.error('Error approving improvement:', error);
      alert('Failed to approve improvement');
    }
  };

  const handleReject = async (improvementId: string) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    try {
      const response = await fetch(`/api/improvements/${improvementId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'rejected',
          reviewed_by: 'user',
          rejection_reason: rejectionReason
        })
      });

      if (!response.ok) throw new Error('Failed to reject improvement');

      setRejectingId(null);
      setRejectionReason('');
      await fetchImprovements();
      alert('Improvement rejected');
    } catch (error) {
      console.error('Error rejecting improvement:', error);
      alert('Failed to reject improvement');
    }
  };

  const handleGenerateImprovements = async () => {
    try {
      setGenerating(true);
      const initialCount = improvements.length;

      const response = await fetch('/api/analysis/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: 'maestro-self-improvement',
          project_name: 'Maestro Intelligence Layer',
          code_files: [],
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate improvements');
      }

      // Refresh the improvements list
      await fetchImprovements();

      // Calculate new suggestions
      const newCount = improvements.length - initialCount;
      const message = newCount > 0
        ? `Analysis complete - ${newCount} new suggestion${newCount !== 1 ? 's' : ''} found`
        : 'Analysis complete - No new suggestions found';

      alert(message);
    } catch (error) {
      console.error('Error generating improvements:', error);
      alert('Failed to generate improvements');
    } finally {
      setGenerating(false);
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority === 1) return 'text-red-400 bg-red-950 border-red-800';
    if (priority === 2) return 'text-orange-400 bg-orange-950 border-orange-800';
    if (priority === 3) return 'text-yellow-400 bg-yellow-950 border-yellow-800';
    if (priority === 4) return 'text-blue-400 bg-blue-950 border-blue-800';
    return 'text-slate-400 bg-slate-800 border-slate-700';
  };

  const getImpactColor = (impact: string) => {
    if (impact === 'high') return 'text-green-400';
    if (impact === 'medium') return 'text-yellow-400';
    return 'text-slate-400';
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-950 text-yellow-400 border-yellow-800',
      approved: 'bg-green-950 text-green-400 border-green-800',
      rejected: 'bg-red-950 text-red-400 border-red-800',
      implemented: 'bg-blue-950 text-blue-400 border-blue-800'
    };
    return colors[status as keyof typeof colors] || 'bg-slate-800 text-slate-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-slate-50 text-center py-12">Loading improvements...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-slate-50">Improvement Suggestions</h1>
            <Button
              onClick={handleGenerateImprovements}
              disabled={generating}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </>
              ) : (
                'Generate Improvements'
              )}
            </Button>
          </div>
          <p className="text-slate-400">
            Review and approve improvements suggested by the Product Analyzer
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-2 bg-slate-900 rounded-lg p-1">
          {(['all', 'pending', 'approved', 'rejected', 'implemented'] as ImprovementFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Improvements List */}
        {improvements.length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-5xl mb-4">💡</div>
            <p className="text-slate-400 mb-4">
              {filter !== 'all'
                ? `No ${filter} improvements found`
                : "No suggestions yet. Click 'Generate Improvements' to analyze this project for potential enhancements."}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {improvements.map((improvement) => (
              <Card key={improvement.improvement_id} className="border-l-4 border-blue-600">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-slate-50">{improvement.title}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusBadge(improvement.status)}`}>
                        {improvement.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm mb-3">
                      <span className={`px-2 py-1 rounded border ${getPriorityColor(improvement.priority)}`}>
                        Priority: {improvement.priority}
                      </span>
                      <span className={`font-medium ${getImpactColor(improvement.estimated_impact)}`}>
                        Impact: {improvement.estimated_impact}
                      </span>
                      <span className="text-slate-500">
                        Suggested by: {improvement.suggested_by}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-slate-300 whitespace-pre-wrap">{improvement.description}</p>
                </div>

                {improvement.status === 'pending' && (
                  <div className="flex gap-3 pt-4 border-t border-slate-700">
                    {rejectingId === improvement.improvement_id ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          placeholder="Reason for rejection..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="flex-1 px-3 py-2 bg-slate-800 text-slate-50 rounded border border-slate-700 focus:border-blue-500 focus:outline-none"
                        />
                        <Button
                          onClick={() => handleReject(improvement.improvement_id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Confirm Reject
                        </Button>
                        <Button
                          onClick={() => {
                            setRejectingId(null);
                            setRejectionReason('');
                          }}
                          className="bg-slate-700 hover:bg-slate-600"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button
                          onClick={() => handleApprove(improvement.improvement_id, true)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Approve & Create Task
                        </Button>
                        <Button
                          onClick={() => handleApprove(improvement.improvement_id, false)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Approve Only
                        </Button>
                        <Button
                          onClick={() => setRejectingId(improvement.improvement_id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                )}

                {improvement.status === 'rejected' && improvement.rejection_reason && (
                  <div className="mt-4 p-3 bg-red-950/30 border border-red-800 rounded">
                    <p className="text-sm text-red-400">
                      <span className="font-semibold">Rejection reason:</span> {improvement.rejection_reason}
                    </p>
                  </div>
                )}

                {improvement.status === 'implemented' && improvement.converted_to_task_id && (
                  <div className="mt-4 p-3 bg-blue-950/30 border border-blue-800 rounded">
                    <p className="text-sm text-blue-400">
                      <span className="font-semibold">Converted to task:</span> {improvement.converted_to_task_id}
                    </p>
                  </div>
                )}

                <div className="mt-3 text-xs text-slate-500">
                  Created: {new Date(improvement.created_date).toLocaleString()}
                  {improvement.reviewed_date && (
                    <> • Reviewed: {new Date(improvement.reviewed_date).toLocaleString()}</>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
