import React from 'react';

interface CardSkeletonProps {
  className?: string;
}

/**
 * Card skeleton loading state
 */
export function CardSkeleton({ className = '' }: CardSkeletonProps) {
  return (
    <div className={`rounded-lg border border-slate-700 bg-slate-800 p-6 animate-pulse ${className}`}>
      <div className="h-6 bg-slate-700 rounded w-3/4 mb-4"></div>
      <div className="h-4 bg-slate-700 rounded w-full mb-2"></div>
      <div className="h-4 bg-slate-700 rounded w-5/6"></div>
    </div>
  );
}

interface TableSkeletonProps {
  rows?: number;
  className?: string;
}

/**
 * Table skeleton loading state
 */
export function TableSkeleton({ rows = 5, className = '' }: TableSkeletonProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-slate-800 rounded animate-pulse"></div>
      ))}
    </div>
  );
}

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Spinner loading indicator
 */
export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-4'
  };

  return (
    <div
      className={`${sizeClasses[size]} border-slate-700 border-t-blue-500 rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

interface LoadingOverlayProps {
  message?: string;
}

/**
 * Full-screen loading overlay
 */
export function LoadingOverlay({ message = 'Loading...' }: LoadingOverlayProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
      <Spinner size="lg" />
      <p className="text-slate-400 mt-4">{message}</p>
    </div>
  );
}

interface SuggestionCardSkeletonProps {
  className?: string;
}

/**
 * Suggestion card skeleton (specific to improvements page)
 */
export function SuggestionCardSkeleton({ className = '' }: SuggestionCardSkeletonProps) {
  return (
    <div className={`rounded-lg border border-slate-700 bg-slate-800 p-6 animate-pulse ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="h-6 bg-slate-700 rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-slate-700 rounded w-1/3"></div>
        </div>
        <div className="h-8 w-8 bg-slate-700 rounded"></div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-slate-700 rounded w-full"></div>
        <div className="h-4 bg-slate-700 rounded w-5/6"></div>
      </div>
      <div className="flex gap-2 mt-4">
        <div className="h-9 bg-slate-700 rounded w-24"></div>
        <div className="h-9 bg-slate-700 rounded w-24"></div>
      </div>
    </div>
  );
}
