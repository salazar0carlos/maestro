'use client';

import { useState, useEffect } from 'react';
import { MaestroTask, TaskStatus, TaskPriority } from '@/lib/types';
import { Modal } from './Modal';
import { Button } from './Button';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: MaestroTask;
  onStatusChange: (status: TaskStatus) => void;
  onPriorityChange?: (priority: TaskPriority) => void;
  onBlockedReasonChange?: (reason: string) => void;
  onDelete: () => void;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  'todo': 'To Do',
  'in-progress': 'In Progress',
  'done': 'Done',
  'blocked': 'Blocked',
};

export default function TaskDetailModal({
  isOpen,
  onClose,
  task,
  onStatusChange,
  onPriorityChange,
  onBlockedReasonChange,
  onDelete,
}: TaskDetailModalProps) {
  const [localStatus, setLocalStatus] = useState(task.status);
  const [localPriority, setLocalPriority] = useState(task.priority);
  const [localBlockedReason, setLocalBlockedReason] = useState(task.blocked_reason || '');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalStatus(task.status);
    setLocalPriority(task.priority);
    setLocalBlockedReason(task.blocked_reason || '');
    setHasChanges(false);
  }, [task]);

  const handleStatusChange = (status: TaskStatus) => {
    setLocalStatus(status);
    setHasChanges(true);
    // Optimistic update
    onStatusChange(status);
  };

  const handlePriorityChange = (priority: TaskPriority) => {
    setLocalPriority(priority);
    setHasChanges(true);
    if (onPriorityChange) {
      onPriorityChange(priority);
    }
  };

  const handleBlockedReasonChange = (reason: string) => {
    setLocalBlockedReason(reason);
    setHasChanges(true);
  };

  const handleSaveBlockedReason = () => {
    if (onBlockedReasonChange && localBlockedReason.trim()) {
      onBlockedReasonChange(localBlockedReason.trim());
      setHasChanges(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={task.title}>
      <div className="space-y-4">
        {/* Status and Priority - Editable */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="status-select" className="block text-xs font-medium text-slate-400 mb-2">
              Status
            </label>
            <select
              id="status-select"
              value={localStatus}
              onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {(['todo', 'in-progress', 'done', 'blocked'] as TaskStatus[]).map(status => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="priority-select" className="block text-xs font-medium text-slate-400 mb-2">
              Priority
            </label>
            <select
              id="priority-select"
              value={localPriority}
              onChange={(e) => handlePriorityChange(parseInt(e.target.value) as TaskPriority)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[1, 2, 3, 4, 5].map(p => (
                <option key={p} value={p}>
                  P{p} {p <= 2 ? '(High)' : p === 3 ? '(Medium)' : '(Low)'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Agent Info */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">
            Assigned Agent
          </label>
          <div className="px-3 py-2 bg-slate-800 rounded text-sm text-slate-300">
            {task.assigned_to_agent}
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">Description</h3>
            <p className="text-slate-400 text-sm bg-slate-800 p-3 rounded">
              {task.description}
            </p>
          </div>
        )}

        {/* AI Prompt */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-300">AI Prompt</h3>
            <button
              onClick={() => {
                navigator.clipboard.writeText(task.ai_prompt);
                alert('Copied to clipboard!');
              }}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              📋 Copy
            </button>
          </div>
          <div className="bg-slate-800 p-3 rounded text-sm text-slate-300 max-h-64 overflow-y-auto whitespace-pre-wrap font-mono text-xs">
            {task.ai_prompt}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-400 mb-1">Created</p>
            <p className="text-slate-300">
              {new Date(task.created_date).toLocaleString()}
            </p>
          </div>
          {task.started_date && (
            <div>
              <p className="text-xs text-slate-400 mb-1">Started</p>
              <p className="text-slate-300">
                {new Date(task.started_date).toLocaleString()}
              </p>
            </div>
          )}
          {task.completed_date && (
            <div>
              <p className="text-xs text-slate-400 mb-1">Completed</p>
              <p className="text-slate-300">
                {new Date(task.completed_date).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* Blocked Reason - Editable if status is blocked */}
        {localStatus === 'blocked' && (
          <div className="bg-red-900/30 border border-red-800 rounded p-3">
            <label htmlFor="blocked-reason" className="block text-xs text-red-300 font-medium mb-2">
              Blocked Reason
            </label>
            <textarea
              id="blocked-reason"
              value={localBlockedReason}
              onChange={(e) => handleBlockedReasonChange(e.target.value)}
              onBlur={handleSaveBlockedReason}
              placeholder="Explain why this task is blocked..."
              className="w-full px-3 py-2 bg-red-950 border border-red-800 rounded text-red-100 placeholder-red-400/50 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
              rows={3}
            />
            {hasChanges && localBlockedReason.trim() && (
              <p className="text-xs text-red-300 mt-1">Changes will be saved automatically</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 pt-4 border-t border-slate-700">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              className="flex-1"
            >
              Close
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirm('Are you sure you want to delete this task?')) {
                  onDelete();
                }
              }}
              className="flex-1"
            >
              Delete Task
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
