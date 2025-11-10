/**
 * Authentication Helper Functions
 *
 * Centralized auth utilities for checking user authentication
 * and getting user IDs in both client and server contexts
 */

import { getCurrentUser, getUserId } from './supabase';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Get the current user's ID from the session (client-side)
 * Returns null if not authenticated
 */
export async function getClientUserId(): Promise<string | null> {
  return await getUserId();
}

/**
 * Get the current user's ID from server-side (API routes, server components)
 * CRITICAL: Always use this in API routes to get the authenticated user
 * NEVER trust client-provided user_id
 */
export async function getServerUserId(): Promise<string | null> {
  try {
    const cookieStore = cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user.id;
  } catch (error) {
    console.error('[auth-helpers] Error getting server user ID:', error);
    return null;
  }
}

/**
 * Check if user is authenticated (server-side)
 * Use this at the top of API routes to protect them
 */
export async function requireAuth(): Promise<string> {
  const userId = await getServerUserId();

  if (!userId) {
    throw new Error('Unauthorized: User not authenticated');
  }

  return userId;
}

/**
 * Check if user is authenticated (client-side)
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user;
}
