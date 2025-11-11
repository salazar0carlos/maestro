import { NextResponse } from 'next/server';

/**
 * OAuth Diagnostics Endpoint
 *
 * Shows the current OAuth configuration and what needs to be set.
 * Access at: /api/auth/diagnostics
 */
export async function GET() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,

    // Environment Variables (without exposing secrets)
    config: {
      NEXT_PUBLIC_SUPABASE_URL: {
        set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        value: process.env.NEXT_PUBLIC_SUPABASE_URL ?
          process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30) + '...' :
          'NOT SET',
        valid: process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https://') || false
      },
      NEXT_PUBLIC_SUPABASE_ANON_KEY: {
        set: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        length: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
        valid: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0) > 100
      },
      NEXT_PUBLIC_APP_URL: {
        set: !!process.env.NEXT_PUBLIC_APP_URL,
        value: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET',
        valid: process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://') || false
      }
    },

    // What needs to be configured
    requiredConfiguration: {
      vercel: {
        title: 'Vercel Environment Variables',
        url: 'https://vercel.com/dashboard → Settings → Environment Variables',
        variables: [
          {
            name: 'NEXT_PUBLIC_SUPABASE_URL',
            example: 'https://xxxxx.supabase.co',
            howToGet: 'Supabase Dashboard → Settings → API → Project URL',
            status: !!process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ SET' : '❌ MISSING'
          },
          {
            name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
            example: 'eyJhbG... (long JWT token)',
            howToGet: 'Supabase Dashboard → Settings → API → anon/public key',
            status: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ SET' : '❌ MISSING'
          },
          {
            name: 'NEXT_PUBLIC_APP_URL',
            example: 'https://maestro-dusky.vercel.app',
            howToGet: 'Your Vercel production URL',
            status: !!process.env.NEXT_PUBLIC_APP_URL ? '✅ SET' : '❌ MISSING'
          }
        ]
      },

      github: {
        title: 'GitHub OAuth App',
        url: 'https://github.com/settings/developers',
        settings: [
          {
            name: 'Homepage URL',
            value: process.env.NEXT_PUBLIC_APP_URL || 'https://maestro-dusky.vercel.app',
            status: '⚠️ VERIFY IN GITHUB'
          },
          {
            name: 'Authorization callback URL',
            value: process.env.NEXT_PUBLIC_SUPABASE_URL ?
              `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/callback` :
              'https://YOUR-PROJECT.supabase.co/auth/v1/callback',
            status: '⚠️ CRITICAL - MUST BE SUPABASE CALLBACK URL',
            note: 'This MUST be your Supabase callback URL, NOT your app URL!'
          }
        ]
      },

      supabase: {
        title: 'Supabase Configuration',
        url: 'https://app.supabase.com',
        settings: [
          {
            name: 'GitHub Provider',
            location: 'Authentication → Providers → GitHub',
            checks: [
              '✓ Enable Sign in with GitHub: ON',
              '✓ Client ID: Copied from GitHub OAuth app',
              '✓ Client Secret: Copied from GitHub OAuth app'
            ]
          },
          {
            name: 'URL Configuration',
            location: 'Authentication → URL Configuration',
            checks: [
              `✓ Site URL: ${process.env.NEXT_PUBLIC_APP_URL || 'https://maestro-dusky.vercel.app'}`,
              `✓ Redirect URLs: ${process.env.NEXT_PUBLIC_APP_URL || 'https://maestro-dusky.vercel.app'}/auth/callback`
            ]
          }
        ]
      }
    },

    // OAuth Flow explanation
    oauthFlow: {
      description: 'How GitHub OAuth works',
      steps: [
        '1. User clicks "Sign in with GitHub" on your app',
        '2. App redirects to GitHub authorization page',
        '3. User authorizes your app on GitHub',
        '4. GitHub redirects to SUPABASE callback URL (not your app!)',
        '5. Supabase exchanges code for session',
        '6. Supabase redirects to YOUR APP at /auth/callback',
        '7. Your app sets session cookies and redirects to /projects'
      ],
      criticalPoint: 'GitHub MUST redirect to Supabase, not directly to your app. This is why the GitHub OAuth callback URL must be your Supabase callback URL.'
    },

    // Common errors
    troubleshooting: {
      'No authorization code received': {
        cause: 'GitHub OAuth callback URL is incorrect',
        solution: 'In GitHub OAuth app settings, set callback URL to: ' +
          (process.env.NEXT_PUBLIC_SUPABASE_URL ?
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/callback` :
            'YOUR-SUPABASE-URL/auth/v1/callback')
      },
      'Page stuck on Loading...': {
        cause: 'Missing Vercel environment variables',
        solution: 'Set all 3 environment variables in Vercel and redeploy'
      },
      'Configuration Error page': {
        cause: 'Environment variables not set correctly',
        solution: 'Check that all env vars are set in Vercel for Production environment'
      }
    }
  };

  return NextResponse.json(diagnostics, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    }
  });
}
