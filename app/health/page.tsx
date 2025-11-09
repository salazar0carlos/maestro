'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message?: string;
  error?: string;
  duration_ms?: number;
}

interface HealthResponse {
  healthy: boolean;
  timestamp: string;
  checks: HealthCheck[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

export default function HealthPage() {
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const runHealthCheck = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setHealthData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run health check');
      setHealthData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  const getStatusIcon = (status: 'pass' | 'fail' | 'warn') => {
    switch (status) {
      case 'pass':
        return '✅';
      case 'fail':
        return '❌';
      case 'warn':
        return '⚠️';
    }
  };

  const getStatusColor = (status: 'pass' | 'fail' | 'warn') => {
    switch (status) {
      case 'pass':
        return 'text-green-400';
      case 'fail':
        return 'text-red-400';
      case 'warn':
        return 'text-yellow-400';
    }
  };

  const groupChecksByCategory = (checks: HealthCheck[]) => {
    const categories: Record<string, HealthCheck[]> = {};

    checks.forEach(check => {
      const category = check.name.split(':')[0];
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(check);
    });

    return categories;
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-5xl mb-4">⏳</div>
            <p className="text-slate-400 text-lg">Running health checks...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-50 mb-2">System Health</h1>
          <p className="text-slate-400">Comprehensive health check and testing system</p>
        </div>

        <Card>
          <div className="text-center py-8">
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-xl font-bold text-red-400 mb-2">Health Check Failed</h2>
            <p className="text-slate-300 mb-6">{error}</p>
            <Button onClick={runHealthCheck} variant="primary">
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!healthData) {
    return null;
  }

  const categories = groupChecksByCategory(healthData.checks);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-50 mb-2">System Health</h1>
          <p className="text-slate-400">
            Last checked: {new Date(healthData.timestamp).toLocaleString()}
          </p>
        </div>
        <Button
          onClick={runHealthCheck}
          variant="primary"
          disabled={isLoading}
          isLoading={isLoading}
        >
          🔄 Run Tests
        </Button>
      </div>

      {/* Overall Status Card */}
      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-5xl">
              {healthData.healthy ? '✅' : '❌'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-50">
                {healthData.healthy ? 'All Systems Operational' : 'System Issues Detected'}
              </h2>
              <p className="text-slate-400 mt-1">
                {healthData.summary.passed} passed • {healthData.summary.failed} failed • {healthData.summary.warnings} warnings
              </p>
            </div>
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-green-400">
                {healthData.summary.passed}
              </div>
              <div className="text-sm text-slate-400">Passed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-red-400">
                {healthData.summary.failed}
              </div>
              <div className="text-sm text-slate-400">Failed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-yellow-400">
                {healthData.summary.warnings}
              </div>
              <div className="text-sm text-slate-400">Warnings</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Checks by Category */}
      <div className="space-y-6">
        {Object.entries(categories).map(([category, checks]) => {
          const categoryPassed = checks.filter(c => c.status === 'pass').length;
          const categoryFailed = checks.filter(c => c.status === 'fail').length;
          const categoryWarnings = checks.filter(c => c.status === 'warn').length;

          return (
            <Card key={category}>
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-50">{category}</h3>
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-400">{categoryPassed} passed</span>
                    {categoryFailed > 0 && (
                      <span className="text-red-400">{categoryFailed} failed</span>
                    )}
                    {categoryWarnings > 0 && (
                      <span className="text-yellow-400">{categoryWarnings} warnings</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {checks.map((check, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-md border ${
                      check.status === 'pass'
                        ? 'bg-green-950 border-green-800'
                        : check.status === 'warn'
                        ? 'bg-yellow-950 border-yellow-800'
                        : 'bg-red-950 border-red-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="text-xl mt-0.5">
                          {getStatusIcon(check.status)}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-slate-50">
                            {check.name.split(':')[1]?.trim() || check.name}
                          </div>
                          {check.message && (
                            <div className="text-sm text-slate-300 mt-1">
                              {check.message}
                            </div>
                          )}
                          {check.error && (
                            <div className={`text-sm mt-1 ${getStatusColor(check.status)}`}>
                              Error: {check.error}
                            </div>
                          )}
                        </div>
                      </div>
                      {check.duration_ms !== undefined && (
                        <div className="text-xs text-slate-400 ml-4">
                          {check.duration_ms}ms
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="mt-8 p-4 bg-slate-800 rounded-md border border-slate-700">
        <div className="text-sm text-slate-400">
          <p className="mb-2">
            <strong className="text-slate-300">About Health Checks:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Tests all critical API endpoints for availability and correct responses</li>
            <li>Verifies database connectivity and configuration</li>
            <li>Checks required environment variables are set</li>
            <li>Validates agent files exist and are readable</li>
            <li>Verifies file system permissions for critical directories</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
