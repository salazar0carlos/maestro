'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { CostTracker } from '@/lib/cost-tracker';
import { CostSummary, CostTrackingEvent } from '@/lib/webhook-types';

type TimeRange = '24h' | '7d' | '30d' | 'month' | 'all';

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [allEvents, setAllEvents] = useState<CostTrackingEvent[]>([]);
  const [costTrend, setCostTrend] = useState<Array<{ date: string; cost: number }>>([]);
  const [projection, setProjection] = useState<any>(null);
  const [highCostEvents, setHighCostEvents] = useState<CostTrackingEvent[]>([]);
  const [threshold, setThreshold] = useState<number>(100);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = () => {
    try {
      // Get date range
      const { startDate, endDate } = getDateRange(timeRange);

      // Get summary for selected range
      const summaryData = CostTracker.getSummary(startDate, endDate);
      setSummary(summaryData);

      // Get all events
      const events = CostTracker.getAllEvents();
      setAllEvents(events);

      // Get cost trend
      const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30;
      const trend = CostTracker.getCostTrend(days);
      setCostTrend(trend);

      // Get projection
      const proj = CostTracker.getMonthlyProjection();
      setProjection(proj);

      // Get high cost events
      const expensive = CostTracker.getHighCostEvents(0.01, 10);
      setHighCostEvents(expensive);

      // Get current threshold
      const currentThreshold = CostTracker.getThreshold();
      setThreshold(currentThreshold);

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      setIsLoading(false);
    }
  };

  const getDateRange = (range: TimeRange): { startDate: Date; endDate: Date } => {
    const now = new Date();
    const endDate = now;
    let startDate = new Date();

    switch (range) {
      case '24h':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'all':
        startDate = new Date(0);
        break;
    }

    return { startDate, endDate };
  };

  const handleUpdateThreshold = () => {
    const newThreshold = prompt('Enter new cost alert threshold (USD):', threshold.toString());
    if (newThreshold && !isNaN(parseFloat(newThreshold))) {
      CostTracker.setAlertThreshold(parseFloat(newThreshold));
      loadData();
    }
  };

  const handleExportData = () => {
    const data = CostTracker.export();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maestro-costs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getMaxCost = () => {
    return Math.max(...costTrend.map(d => d.cost), 0.01);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-3xl mb-4">📊</div>
          <p className="text-slate-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-50 mb-2">Cost Analytics</h1>
          <p className="text-slate-400">
            Track API usage, webhook costs, and agent execution expenses
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleUpdateThreshold}>
            ⚙️ Set Alert Threshold
          </Button>
          <Button variant="secondary" onClick={handleExportData}>
            📥 Export Data
          </Button>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2 mb-6">
        {(['24h', '7d', '30d', 'month', 'all'] as TimeRange[]).map((range) => (
          <Button
            key={range}
            variant={timeRange === range ? 'primary' : 'ghost'}
            onClick={() => setTimeRange(range)}
          >
            {range === '24h' ? 'Last 24h' :
             range === '7d' ? 'Last 7 days' :
             range === '30d' ? 'Last 30 days' :
             range === 'month' ? 'This Month' : 'All Time'}
          </Button>
        ))}
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <div className="text-sm text-slate-400 mb-1">Total Cost</div>
          <div className="text-3xl font-bold text-green-400">
            {formatCurrency(summary?.total_cost || 0)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {timeRange === 'month' ? 'This month' : `Last ${timeRange}`}
          </div>
        </Card>

        <Card>
          <div className="text-sm text-slate-400 mb-1">API Calls</div>
          <div className="text-3xl font-bold text-blue-400">
            {formatNumber(summary?.api_call_count || 0)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Total requests
          </div>
        </Card>

        <Card>
          <div className="text-sm text-slate-400 mb-1">Webhooks</div>
          <div className="text-3xl font-bold text-purple-400">
            {formatNumber(summary?.webhook_count || 0)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Deliveries sent
          </div>
        </Card>

        <Card>
          <div className="text-sm text-slate-400 mb-1">Agent Executions</div>
          <div className="text-3xl font-bold text-orange-400">
            {formatNumber(summary?.agent_execution_count || 0)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Tasks completed
          </div>
        </Card>
      </div>

      {/* Monthly Projection */}
      {projection && timeRange === 'month' && (
        <Card className="mb-8">
          <h2 className="text-xl font-bold text-slate-50 mb-4">Monthly Projection</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-slate-400 mb-2">Current Spend</div>
              <div className="text-2xl font-bold text-blue-400">
                {formatCurrency(projection.current)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {projection.days_elapsed} days elapsed
              </div>
            </div>

            <div>
              <div className="text-sm text-slate-400 mb-2">Projected Total</div>
              <div className="text-2xl font-bold text-yellow-400">
                {formatCurrency(projection.projected)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                End of month estimate
              </div>
            </div>

            <div>
              <div className="text-sm text-slate-400 mb-2">Alert Threshold</div>
              <div className={`text-2xl font-bold ${
                projection.projected > threshold ? 'text-red-400' : 'text-green-400'
              }`}>
                {formatCurrency(threshold)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {projection.projected > threshold ? '⚠️ May exceed' : '✅ Within limit'}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-sm text-slate-400 mb-2">
              <span>Progress</span>
              <span>{Math.round((projection.current / threshold) * 100)}% of threshold</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  projection.current > threshold ? 'bg-red-500' :
                  projection.current > threshold * 0.8 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min((projection.current / threshold) * 100, 100)}%` }}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Cost Trend Chart */}
      <Card className="mb-8">
        <h2 className="text-xl font-bold text-slate-50 mb-4">Cost Trend</h2>

        {costTrend.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            No cost data available
          </div>
        ) : (
          <div className="relative h-64">
            <div className="absolute inset-0 flex items-end justify-between gap-1">
              {costTrend.map((point, index) => {
                const maxCost = getMaxCost();
                const height = maxCost > 0 ? (point.cost / maxCost) * 100 : 0;

                return (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center group"
                  >
                    {/* Bar */}
                    <div className="w-full flex flex-col items-center justify-end h-full">
                      <div
                        className="w-full bg-blue-500 hover:bg-blue-400 transition-all rounded-t cursor-pointer"
                        style={{ height: `${height}%`, minHeight: point.cost > 0 ? '4px' : '0' }}
                        title={`${point.date}: ${formatCurrency(point.cost)}`}
                      />
                    </div>

                    {/* Label */}
                    <div className="text-xs text-slate-500 mt-2 transform -rotate-45 origin-top-left w-16">
                      {new Date(point.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>

                    {/* Tooltip */}
                    <div className="invisible group-hover:visible absolute bottom-full mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded shadow-lg z-10">
                      {formatCurrency(point.cost)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-12 pt-4 border-t border-slate-700 flex justify-between text-sm text-slate-400">
          <span>Daily average: {formatCurrency((summary?.total_cost || 0) / costTrend.length)}</span>
          <span>Peak: {formatCurrency(Math.max(...costTrend.map(d => d.cost)))}</span>
        </div>
      </Card>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* By Agent */}
        <Card>
          <h3 className="text-lg font-bold text-slate-50 mb-4">Cost by Agent</h3>

          {Object.keys(summary?.by_agent || {}).length === 0 ? (
            <div className="text-center py-4 text-slate-400 text-sm">
              No agent data
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(summary?.by_agent || {})
                .sort(([, a], [, b]) => b - a)
                .map(([agent, cost]) => (
                  <div key={agent}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">{agent}</span>
                      <span className="text-slate-400 font-mono">
                        {formatCurrency(cost)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{
                          width: `${((cost / (summary?.total_cost || 1)) * 100).toFixed(1)}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Card>

        {/* By Provider */}
        <Card>
          <h3 className="text-lg font-bold text-slate-50 mb-4">Cost by Provider</h3>

          {Object.keys(summary?.by_provider || {}).length === 0 ? (
            <div className="text-center py-4 text-slate-400 text-sm">
              No provider data
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(summary?.by_provider || {})
                .sort(([, a], [, b]) => b - a)
                .map(([provider, cost]) => (
                  <div key={provider}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300 capitalize">{provider}</span>
                      <span className="text-slate-400 font-mono">
                        {formatCurrency(cost)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{
                          width: `${((cost / (summary?.total_cost || 1)) * 100).toFixed(1)}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Card>

        {/* By Event Type */}
        <Card>
          <h3 className="text-lg font-bold text-slate-50 mb-4">Cost by Type</h3>

          {Object.keys(summary?.by_event_type || {}).length === 0 ? (
            <div className="text-center py-4 text-slate-400 text-sm">
              No event data
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(summary?.by_event_type || {})
                .sort(([, a], [, b]) => b - a)
                .map(([type, cost]) => (
                  <div key={type}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">{type.replace('_', ' ')}</span>
                      <span className="text-slate-400 font-mono">
                        {formatCurrency(cost)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all"
                        style={{
                          width: `${((cost / (summary?.total_cost || 1)) * 100).toFixed(1)}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Card>
      </div>

      {/* High Cost Events */}
      <Card>
        <h2 className="text-xl font-bold text-slate-50 mb-4">High Cost Events</h2>

        {highCostEvents.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            No high-cost events (>$0.01)
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-slate-400 border-b border-slate-700">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Agent</th>
                  <th className="pb-3 font-medium">Provider</th>
                  <th className="pb-3 font-medium text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                {highCostEvents.map((event) => (
                  <tr key={event.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="py-3 text-sm text-slate-300">
                      {new Date(event.timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 text-sm text-slate-300">
                      {event.event_type.replace('_', ' ')}
                    </td>
                    <td className="py-3 text-sm text-slate-400">
                      {event.agent_name || '-'}
                    </td>
                    <td className="py-3 text-sm text-slate-400 capitalize">
                      {event.details.provider || '-'}
                    </td>
                    <td className="py-3 text-sm text-right font-mono text-orange-400">
                      {formatCurrency(event.cost_usd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
