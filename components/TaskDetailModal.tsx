'use client';

import { MaestroTask, TaskStatus } from '@/lib/types';
import { Modal } from './Modal';
import { Button } from './Button';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: MaestroTask;
  onStatusChange: (status: TaskStatus) => void;
  onDelete: () => void;
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  'todo': 'bg-slate-700 text-slate-300',
  'in-progress': 'bg-blue-900 text-blue-200',
  'done': 'bg-green-900 text-green-200',
  'blocked': 'bg-red-900 text-red-200',
};

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
  onDelete,
}: TaskDetailModalProps) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={task.title}>
      <div className="space-y-4">
        {/* Status and Priority */}
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs text-slate-400 mb-1">Status</p>
            <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${STATUS_COLORS[task.status]}`}>
              {STATUS_LABELS[task.status]}
            </span>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Priority</p>
            <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${
              task.priority === 1 || task.priority === 2
                ? 'bg-red-900 text-red-200'
                : task.priority === 3
                ? 'bg-yellow-900 text-yellow-200'
                : 'bg-green-900 text-green-200'
            }`}>
              P{task.priority}
            </span>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Agent</p>
            <span className="inline-block px-3 py-1 rounded text-sm font-medium bg-blue-900 text-blue-200">
              {task.assigned_to_agent}
            </span>
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

        {/* Blocked Reason */}
        {task.status === 'blocked' && task.blocked_reason && (
          <div className="bg-red-900/30 border border-red-800 rounded p-3">
            <p className="text-xs text-red-300 font-medium mb-1">Blocked Reason</p>
            <p className="text-red-200 text-sm">{task.blocked_reason}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 pt-4 border-t border-slate-700">
          <div>
            <p className="text-xs text-slate-400 mb-2">Change Status</p>
            <div className="grid grid-cols-2 gap-2">
              {(['todo', 'in-progress', 'done', 'blocked'] as TaskStatus[]).map(status => (
                <button
                  key={status}
                  onClick={() => onStatusChange(status)}
                  disabled={task.status === status}
                  className={`px-3 py-2 rounded text-sm font-medium transition ${
                    task.status === status
                      ? 'opacity-50 cursor-not-allowed ' + STATUS_COLORS[status]
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-slate-100'
                  }`}
                >
                  {STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={onClose}
              className="flex-1"
            >
              Close
            </Button>
            <Button
              variant="danger"
              onClick={onDelete}
              className="flex-1"
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
