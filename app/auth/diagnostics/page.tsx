'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/Card';

interface DiagnosticsData {
  config: {
    [key: string]: {
      set: boolean;
      value?: string;
      length?: number;
      valid: boolean;
    };
  };
  requiredConfiguration: {
    vercel: {
      title: string;
      url: string;
      variables: Array<{
        name: string;
        example: string;
        howToGet: string;
        status: string;
      }>;
    };
    github: {
      title: string;
      url: string;
      settings: Array<{
        name: string;
        value: string;
        status: string;
        note?: string;
      }>;
    };
    supabase: {
      title: string;
      url: string;
      settings: Array<{
        name: string;
        location: string;
        checks: string[];
      }>;
    };
  };
  oauthFlow: {
    description: string;
    steps: string[];
    criticalPoint: string;
  };
  troubleshooting: {
    [key: string]: {
      cause: string;
      solution: string;
    };
  };
}

export default function DiagnosticsPage() {
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/diagnostics')
      .then(res => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">Loading diagnostics...</h1>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-4 text-red-400">Failed to load diagnostics</h1>
        </div>
      </div>
    );
  }

  const allConfigured = Object.values(data.config).every(c => c.set && c.valid);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🔍 OAuth Configuration Diagnostics</h1>
          <p className="text-slate-400">
            This page shows exactly what needs to be configured for GitHub OAuth to work.
          </p>
        </div>

        {/* Status Overview */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">
            {allConfigured ? '✅ Configuration Status: Ready' : '⚠️ Configuration Status: Incomplete'}
          </h2>
          <div className="space-y-2">
            {Object.entries(data.config).map(([key, value]) => (
              <div key={key} className="flex items-center gap-3 text-sm">
                <span className={value.set && value.valid ? 'text-green-400' : 'text-red-400'}>
                  {value.set && value.valid ? '✅' : '❌'}
                </span>
                <span className="font-mono text-blue-400">{key}</span>
                <span className="text-slate-400">
                  {value.set ? (value.value || `Length: ${value.length}`) : 'NOT SET'}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Vercel Configuration */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">1️⃣ {data.requiredConfiguration.vercel.title}</h2>
          <p className="text-slate-400 mb-4">
            <a href={data.requiredConfiguration.vercel.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              Open Vercel Dashboard →
            </a>
          </p>
          <div className="space-y-4">
            {data.requiredConfiguration.vercel.variables.map(v => (
              <div key={v.name} className="bg-slate-800 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{v.status.includes('✅') ? '✅' : '❌'}</span>
                  <span className="font-mono text-blue-400">{v.name}</span>
                </div>
                <div className="text-sm text-slate-400 space-y-1">
                  <p><strong>Example:</strong> {v.example}</p>
                  <p><strong>How to get:</strong> {v.howToGet}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-500 rounded-lg text-yellow-400 text-sm">
            <p className="font-bold">⚠️ Important:</p>
            <p>After setting environment variables, you MUST redeploy in Vercel!</p>
          </div>
        </Card>

        {/* GitHub Configuration */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">2️⃣ {data.requiredConfiguration.github.title}</h2>
          <p className="text-slate-400 mb-4">
            <a href={data.requiredConfiguration.github.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              Open GitHub OAuth Apps →
            </a>
          </p>
          <div className="space-y-4">
            {data.requiredConfiguration.github.settings.map((s, i) => (
              <div key={i} className="bg-slate-800 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-slate-50">{s.name}</span>
                </div>
                <p className="font-mono text-sm text-green-400 mb-2">{s.value}</p>
                {s.note && (
                  <p className="text-red-400 text-sm font-bold">⚠️ {s.note}</p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400 text-sm">
            <p className="font-bold mb-2">🚨 CRITICAL - Most Common Mistake:</p>
            <p>The Authorization callback URL in GitHub MUST be your <strong>Supabase callback URL</strong>, NOT your app&apos;s URL!</p>
            <p className="mt-2 font-mono text-xs">
              ❌ Wrong: https://maestro-dusky.vercel.app/auth/callback<br/>
              ✅ Correct: {data.requiredConfiguration.github.settings[1].value}
            </p>
          </div>
        </Card>

        {/* Supabase Configuration */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">3️⃣ {data.requiredConfiguration.supabase.title}</h2>
          <p className="text-slate-400 mb-4">
            <a href={data.requiredConfiguration.supabase.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              Open Supabase Dashboard →
            </a>
          </p>
          <div className="space-y-4">
            {data.requiredConfiguration.supabase.settings.map((s, i) => (
              <div key={i} className="bg-slate-800 p-4 rounded-lg">
                <h3 className="font-bold text-slate-50 mb-2">{s.name}</h3>
                <p className="text-sm text-slate-400 mb-3">{s.location}</p>
                <ul className="space-y-1">
                  {s.checks.map((check, j) => (
                    <li key={j} className="text-sm text-slate-300">{check}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>

        {/* OAuth Flow Explanation */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">📖 How GitHub OAuth Works</h2>
          <div className="space-y-2 mb-4">
            {data.oauthFlow.steps.map((step, i) => (
              <p key={i} className="text-sm text-slate-300">{step}</p>
            ))}
          </div>
          <div className="p-4 bg-blue-900/20 border border-blue-500 rounded-lg text-blue-400 text-sm">
            <p className="font-bold mb-2">💡 Key Understanding:</p>
            <p>{data.oauthFlow.criticalPoint}</p>
          </div>
        </Card>

        {/* Troubleshooting */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">🔧 Common Errors & Solutions</h2>
          <div className="space-y-4">
            {Object.entries(data.troubleshooting).map(([error, info]) => (
              <div key={error} className="bg-slate-800 p-4 rounded-lg">
                <h3 className="font-bold text-red-400 mb-2">Error: {error}</h3>
                <p className="text-sm text-slate-400 mb-2"><strong>Cause:</strong> {info.cause}</p>
                <p className="text-sm text-green-400"><strong>Solution:</strong> {info.solution}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">🚀 Next Steps</h2>
          <div className="space-y-2 text-sm">
            <p className="text-slate-300">1. Set all 3 environment variables in Vercel</p>
            <p className="text-slate-300">2. Configure GitHub OAuth app with correct callback URL</p>
            <p className="text-slate-300">3. Configure Supabase GitHub provider</p>
            <p className="text-slate-300">4. Redeploy in Vercel</p>
            <p className="text-slate-300">5. Test login at <a href="/login" className="text-blue-400 hover:underline">/login</a></p>
          </div>
        </Card>
      </div>
    </div>
  );
}
