'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login page since we use GitHub OAuth for both login and signup
    router.replace('/login');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-3xl mb-4">🔄</div>
        <p className="text-slate-400">Redirecting to login...</p>
      </div>
    </div>
  );
}
