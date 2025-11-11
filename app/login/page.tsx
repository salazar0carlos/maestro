'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Github } from 'lucide-react';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Github, AlertCircle } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check for OAuth errors in URL
    const errorParam = searchParams.get('error');
    if (errorParam) {
      switch (errorParam) {
        case 'auth_failed':
          setError('GitHub authentication failed. Please try again.');
          break;
        case 'no_code':
          setError('No authorization code received. Please try again.');
          break;
        case 'unexpected_error':
          setError('An unexpected error occurred. Please try again.');
          break;
        default:
          setError('Authentication error. Please try again.');
      }
      // Remove error from URL
      router.replace('/login');
    }
  }, [searchParams, router]);

  const handleGitHubLogin = async () => {
    setError(null);
    setIsLoading(true);

    try {
      // Use production URL from environment variable, fallback to current origin for local dev
      const redirectUrl = process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/projects`
        : `${window.location.origin}/projects`;
        ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
        : `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        setError(error.message);
        setIsLoading(false);
      }
      // If successful, Supabase will redirect to GitHub
        return;
      }

      // OAuth will redirect, so we don't need to manually navigate
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
          <p className="text-slate-400 mb-2">Sign in with GitHub to get started</p>
          <p className="text-xs text-slate-500">Maestro builds apps from GitHub repositories, so a GitHub account is required</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-900/20 border border-red-500 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{error}</p>
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
        <div className="space-y-4">
          <Button
            onClick={handleGitHubLogin}
            variant="primary"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3"
          >
            <Github className="w-5 h-5" />
            {isLoading ? 'Connecting to GitHub...' : 'Sign in with GitHub'}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-800 text-slate-400">
                Secure authentication via GitHub
              </span>
            </div>
          </div>

          <div className="text-center text-xs text-slate-500 space-y-1">
            <p>Maestro needs GitHub access to manage your repositories</p>
            <p>Agents will clone repos, create branches, and submit pull requests</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
