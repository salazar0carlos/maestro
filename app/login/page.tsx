'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Github } from 'lucide-react';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGitHubLogin = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/projects`,
        },
      });

      if (error) {
        setError(error.message);
        setIsLoading(false);
      }
      // If successful, Supabase will redirect to GitHub
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during login');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-blue-400 mb-2">⚡ Maestro</div>
          <h1 className="text-2xl font-bold text-slate-50 mb-2">Welcome to Maestro</h1>
          <p className="text-slate-400">Sign in with GitHub to get started</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-900/20 border border-red-500 text-red-400 text-sm">
            {error}
          </div>
        )}

        <Button
          onClick={handleGitHubLogin}
          variant="primary"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 py-3"
        >
          <Github className="w-5 h-5" />
          {isLoading ? 'Connecting to GitHub...' : 'Sign in with GitHub'}
        </Button>

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500">
            By signing in, you agree to connect your GitHub account.
            <br />
            Maestro needs GitHub access to manage your repositories.
          </p>
        </div>
      </Card>
    </div>
  );
}
