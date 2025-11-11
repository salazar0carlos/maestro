import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * OAuth Callback Handler
 *
 * Handles the redirect from GitHub OAuth authentication.
 * Exchanges the auth code for a session and redirects to the app.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');
  const next = requestUrl.searchParams.get('next') || '/projects';

  console.log('[OAuth Callback] Received callback:', {
    hasCode: !!code,
    hasError: !!error,
    errorDescription,
    origin: requestUrl.origin
  });

  // Check if GitHub returned an error
  if (error) {
    console.error('[OAuth Callback] GitHub OAuth error:', error, errorDescription);
    const encodedDescription = encodeURIComponent(errorDescription || error);
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=${error}&error_description=${encodedDescription}`
    );
  }

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch (error) {
              // The `set` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
          remove(name: string, options) {
            try {
              cookieStore.set({ name, value: '', ...options });
            } catch (error) {
              // The `delete` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    try {
      console.log('[OAuth Callback] Exchanging code for session...');
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error('[OAuth Callback] Error exchanging code for session:', exchangeError);
        const encodedError = encodeURIComponent(exchangeError.message);
        return NextResponse.redirect(
          `${requestUrl.origin}/login?error=auth_failed&error_description=${encodedError}`
        );
      }

      console.log('[OAuth Callback] Session established successfully for user:', data.user?.email);
      // Successful authentication - redirect to the app
      return NextResponse.redirect(`${requestUrl.origin}${next}`);
    } catch (err) {
      console.error('[OAuth Callback] Unexpected error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      const encodedError = encodeURIComponent(errorMsg);
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=unexpected_error&error_description=${encodedError}`
      );
    }
  }

  // No code parameter - redirect to login
  console.error('[OAuth Callback] No authorization code received from GitHub');
  return NextResponse.redirect(
    `${requestUrl.origin}/login?error=no_code&error_description=No authorization code received from GitHub. Please check your GitHub OAuth app settings.`
  );
}
