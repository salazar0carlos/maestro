'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

interface TestReport {
  id: string;
  feature: string;
  test_date: string;
  tests_run: number;
  tests_passed: number;
  tests_failed: number;
  passed: boolean;
  edge_cases: Array<{ name: string; description: string }>;
  bugs: Array<{ severity: string; description: string; details: string }>;
}

interface BugReport {
  bug_id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  found_in: string;
  created_at: string;
}

interface TestStats {
  total_tests: number;
  tests_passed: number;
  tests_failed: number;
  pass_rate: number;
  critical_bugs: number;
  open_bugs: number;
}

export default function TestingDashboard() {
  const [testReports, setTestReports] = useState<TestReport[]>([]);
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [selectedReport, setSelectedReport] = useState<TestReport | null>(null);
  const [stats, setStats] = useState<TestStats>({
    total_tests: 0,
    tests_passed: 0,
    tests_failed: 0,
    pass_rate: 0,
    critical_bugs: 0,
    open_bugs: 0,
  });

  useEffect(() => {
    loadTestData();
  }, []);

  const loadTestData = async () => {
    // Load test reports and bugs from API
    try {
      // Mock data for demonstration
      const mockReports: TestReport[] = [
        {
          id: 'report-1',
          feature: 'User Authentication',
          test_date: new Date().toISOString(),
          tests_run: 12,
          tests_passed: 10,
          tests_failed: 2,
          passed: false,
          edge_cases: [
            { name: 'Empty Input', description: 'Test with empty credentials' },
          ],
          bugs: [
            {
              severity: 'high',
              description: 'Login fails with special characters',
              details: 'Special characters in password cause validation error',
            },
          ],
        },
        {
          id: 'report-2',
          feature: 'Task Creation',
          test_date: new Date(Date.now() - 86400000).toISOString(),
          tests_run: 8,
          tests_passed: 8,
          tests_failed: 0,
          passed: true,
          edge_cases: [],
          bugs: [],
        },
      ];

      const mockBugs: BugReport[] = [
        {
          bug_id: 'BUG-001',
          title: 'Login fails with special characters',
          severity: 'high',
          status: 'open',
          found_in: 'Authentication',
          created_at: new Date().toISOString(),
        },
        {
          bug_id: 'BUG-002',
          title: 'UI layout breaks on mobile',
          severity: 'medium',
          status: 'open',
          found_in: 'Dashboard',
          created_at: new Date(Date.now() - 172800000).toISOString(),
        },
      ];

      setTestReports(mockReports);
      setBugReports(mockBugs);

      // Calculate stats
      const totalTests = mockReports.reduce((sum, r) => sum + r.tests_run, 0);
      const totalPassed = mockReports.reduce((sum, r) => sum + r.tests_passed, 0);
      const totalFailed = mockReports.reduce((sum, r) => sum + r.tests_failed, 0);
      const criticalBugs = mockBugs.filter((b) => b.severity === 'critical').length;
      const openBugs = mockBugs.filter((b) => b.status === 'open').length;

      setStats({
        total_tests: totalTests,
        tests_passed: totalPassed,
        tests_failed: totalFailed,
        pass_rate: totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0,
        critical_bugs: criticalBugs,
        open_bugs: openBugs,
      });
    } catch (error) {
      console.error('Error loading test data:', error);
    }
  };

  const runAllTests = async () => {
    setIsRunningTests(true);
    try {
      // Call test API endpoint
      const response = await fetch('/api/testing/run-tests', {
        method: 'POST',
      });

      if (response.ok) {
        await loadTestData();
      }
    } catch (error) {
      console.error('Error running tests:', error);
    } finally {
      setIsRunningTests(false);
    }
  };

  const runIntegrationTests = async () => {
    setIsRunningTests(true);
    try {
      const response = await fetch('/api/testing/run-integration-tests', {
        method: 'POST',
      });

      if (response.ok) {
        await loadTestData();
      }
    } catch (error) {
      console.error('Error running integration tests:', error);
    } finally {
      setIsRunningTests(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-500';
      case 'high':
        return 'text-orange-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-green-500';
      default:
        return 'text-slate-400';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '🔴';
      case 'high':
        return '🟠';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '⚪';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Testing Dashboard</h1>
          <p className="text-slate-400">
            Quality assurance, test results, and bug tracking
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard
            label="Total Tests"
            value={stats.total_tests}
            color="text-blue-500"
          />
          <StatCard
            label="Passed"
            value={stats.tests_passed}
            color="text-green-500"
            icon="✅"
          />
          <StatCard
            label="Failed"
            value={stats.tests_failed}
            color="text-red-500"
            icon="❌"
          />
          <StatCard
            label="Pass Rate"
            value={`${stats.pass_rate}%`}
            color={stats.pass_rate >= 80 ? 'text-green-500' : 'text-yellow-500'}
          />
          <StatCard
            label="Critical Bugs"
            value={stats.critical_bugs}
            color="text-red-500"
            icon="🔴"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          <Button
            onClick={runAllTests}
            isLoading={isRunningTests}
            disabled={isRunningTests}
          >
            Run All Tests
          </Button>
          <Button
            variant="secondary"
            onClick={runIntegrationTests}
            isLoading={isRunningTests}
            disabled={isRunningTests}
          >
            Run Integration Tests
          </Button>
          <Button variant="ghost" onClick={loadTestData}>
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Test Reports */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Recent Test Reports</h2>
            <div className="space-y-4">
              {testReports.length === 0 ? (
                <Card>
                  <p className="text-slate-400">No test reports yet</p>
                </Card>
              ) : (
                testReports.map((report) => (
                  <TestReportCard
                    key={report.id}
                    report={report}
                    onClick={() => setSelectedReport(report)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Bug Reports */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Open Bugs</h2>
            <div className="space-y-4">
              {bugReports.length === 0 ? (
                <Card>
                  <p className="text-slate-400">No bugs reported</p>
                </Card>
              ) : (
                bugReports.map((bug) => (
                  <BugCard
                    key={bug.bug_id}
                    bug={bug}
                    getSeverityColor={getSeverityColor}
                    getSeverityIcon={getSeverityIcon}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Test Report Detail Modal */}
        {selectedReport && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedReport(null)}
          >
            <div
              className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-4">
                Test Report: {selectedReport.feature}
              </h2>

              <div className="mb-4">
                <p className="text-slate-400 mb-2">
                  Date: {new Date(selectedReport.test_date).toLocaleString()}
                </p>
                <div className="flex gap-4">
                  <span className="text-green-500">
                    ✅ Passed: {selectedReport.tests_passed}
                  </span>
                  <span className="text-red-500">
                    ❌ Failed: {selectedReport.tests_failed}
                  </span>
                </div>
              </div>

              {selectedReport.edge_cases.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">Edge Cases Found</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {selectedReport.edge_cases.map((ec, i) => (
                      <li key={i} className="text-slate-300">
                        <strong>{ec.name}:</strong> {ec.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedReport.bugs.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">Bugs Found</h3>
                  <div className="space-y-2">
                    {selectedReport.bugs.map((bug, i) => (
                      <div key={i} className="border-l-4 border-red-500 pl-3">
                        <p className="text-orange-500 font-medium">
                          [{bug.severity.toUpperCase()}] {bug.description}
                        </p>
                        <p className="text-slate-400 text-sm">{bug.details}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={() => setSelectedReport(null)}>Close</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
  icon?: string;
}

function StatCard({ label, value, color = 'text-slate-100', icon }: StatCardProps) {
  return (
    <Card>
      <div className="text-sm text-slate-400 mb-1">{label}</div>
      <div className={`text-3xl font-bold ${color}`}>
        {icon && <span className="mr-2">{icon}</span>}
        {value}
      </div>
    </Card>
  );
}

interface TestReportCardProps {
  report: TestReport;
  onClick: () => void;
}

function TestReportCard({ report, onClick }: TestReportCardProps) {
  const passRate = Math.round((report.tests_passed / report.tests_run) * 100);

  return (
    <Card hover onClick={onClick}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold">{report.feature}</h3>
        <span
          className={`px-2 py-1 rounded text-sm font-medium ${
            report.passed
              ? 'bg-green-900 text-green-300'
              : 'bg-red-900 text-red-300'
          }`}
        >
          {report.passed ? 'PASS' : 'FAIL'}
        </span>
      </div>

      <p className="text-slate-400 text-sm mb-3">
        {new Date(report.test_date).toLocaleString()}
      </p>

      <div className="flex gap-4 text-sm">
        <span className="text-slate-300">
          Tests: {report.tests_run}
        </span>
        <span className="text-green-500">
          ✅ {report.tests_passed}
        </span>
        <span className="text-red-500">
          ❌ {report.tests_failed}
        </span>
        <span className="text-blue-500">
          {passRate}%
        </span>
      </div>

      {report.bugs.length > 0 && (
        <div className="mt-3 text-sm text-orange-500">
          {report.bugs.length} bug{report.bugs.length > 1 ? 's' : ''} found
        </div>
      )}
    </Card>
  );
}

interface BugCardProps {
  bug: BugReport;
  getSeverityColor: (severity: string) => string;
  getSeverityIcon: (severity: string) => string;
}

function BugCard({ bug, getSeverityColor, getSeverityIcon }: BugCardProps) {
  return (
    <Card hover>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span>{getSeverityIcon(bug.severity)}</span>
          <h3 className="text-lg font-semibold">{bug.title}</h3>
        </div>
        <span className="text-slate-400 text-sm">{bug.bug_id}</span>
      </div>

      <p className={`text-sm font-medium mb-2 ${getSeverityColor(bug.severity)}`}>
        {bug.severity.toUpperCase()} - {bug.status.toUpperCase()}
      </p>

      <div className="flex justify-between text-sm text-slate-400">
        <span>Found in: {bug.found_in}</span>
        <span>{new Date(bug.created_at).toLocaleDateString()}</span>
      </div>
    </Card>
  );
}
