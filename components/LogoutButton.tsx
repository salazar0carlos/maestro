'use client';

import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LogOut } from 'lucide-react';

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 text-sm text-slate-300 hover:text-red-400 transition"
      title="Logout"
    >
      <LogOut className="w-4 h-4" />
      Logout
    </button>
  );
}
