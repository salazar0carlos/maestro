# GitHub OAuth Authentication Setup Guide

This guide walks you through setting up GitHub OAuth authentication for Maestro.

---

## Why GitHub OAuth?

✅ **Seamless authentication** - Users already have GitHub accounts
✅ **No password management** - More secure than email/password
✅ **Already integrated** - You're using GitHub for repos anyway
✅ **Better developer experience** - One-click login

---

## Setup Steps

### 1. Create a GitHub OAuth App

1. Go to **GitHub Settings** → **Developer settings** → **OAuth Apps**
   - Direct link: https://github.com/settings/developers

2. Click **"New OAuth App"**

3. Fill in the application details:
   ```
   Application name: Maestro (or your preferred name)
   Homepage URL: https://maestro-dusky.vercel.app
   Authorization callback URL: https://maestro-dusky.vercel.app/auth/callback
   ```

4. Click **"Register application"**

5. You'll see your **Client ID** - copy this

6. Click **"Generate a new client secret"** - copy this secret immediately (you won't see it again)

### 2. Configure Supabase GitHub Provider

1. Go to your **Supabase Dashboard** → **Authentication** → **Providers**
   - Direct link: https://app.supabase.com/project/YOUR_PROJECT_ID/auth/providers

2. Find **GitHub** in the list and click to expand it

3. Enable the GitHub provider:
   - Toggle **"Enable Sign in with GitHub"** to ON

4. Enter your GitHub OAuth credentials:
   ```
   Client ID: [paste from GitHub OAuth app]
   Client Secret: [paste from GitHub OAuth app]
   ```

5. Note the **Callback URL** shown in Supabase:
   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```

6. Click **"Save"**

### 3. Update GitHub OAuth App Callback URL

⚠️ **IMPORTANT:** Supabase uses its own callback URL first, then redirects to your app.

1. Go back to your **GitHub OAuth App settings**

2. Update the **Authorization callback URL** to:
   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```

   Replace `YOUR_PROJECT_REF` with your actual Supabase project reference (found in your Supabase project URL)

3. Click **"Update application"**

### 4. Configure Vercel Environment Variables

You should already have these from the E2E testing report, but verify:

1. Go to **Vercel Dashboard** → Your project → **Settings** → **Environment Variables**

2. Ensure these are set:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. These values come from **Supabase Dashboard** → **Project Settings** → **API**

### 5. Deploy and Test

1. **Redeploy your Vercel app** (if environment variables were just added, redeploy is needed)

2. Visit your live app: https://maestro-dusky.vercel.app/login

3. Click **"Sign in with GitHub"**

4. You should be redirected to GitHub to authorize the app

5. After authorization, you'll be redirected back to Maestro at `/projects`

---

## For Local Development

If you want to test GitHub OAuth locally:

### Option 1: Use Production Supabase (Recommended)

Just use the same Supabase credentials in your `.env.local`:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Update your GitHub OAuth app to add another callback URL:
```
http://localhost:3000/auth/callback
```

### Option 2: Separate GitHub OAuth App for Development

1. Create a **second GitHub OAuth App** for local development

2. Use these settings:
   ```
   Application name: Maestro (Local Dev)
   Homepage URL: http://localhost:3000
   Authorization callback URL: https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```

3. Update Supabase to use the dev credentials when needed

---

## Testing the Flow

### Happy Path

1. User visits `/login`
2. Clicks "Sign in with GitHub"
3. Redirected to GitHub authorization page
4. User authorizes the app
5. GitHub redirects to Supabase callback: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback?code=...`
6. Supabase exchanges code for session
7. Supabase redirects to your app: `https://maestro-dusky.vercel.app/auth/callback?code=...`
8. Your callback handler exchanges code for session
9. Sets authentication cookies
10. Redirects to `/projects`

### Error Handling

The app handles these error cases:

- **No authorization code** → Redirects to `/login?error=no_code`
- **Code exchange fails** → Redirects to `/login?error=auth_failed`
- **Unexpected errors** → Redirects to `/login?error=unexpected_error`

Error messages are displayed on the login page with a clear UI.

---

## Security Notes

### What GitHub Data We Access

By default, the app only requests:
- ✅ Public profile information (name, email, avatar)
- ✅ Email address (for user identification)

We do **NOT** request:
- ❌ Repository access
- ❌ Organization data
- ❌ Private information

### Scopes

The default scope is minimal. If you need additional permissions in the future, update the OAuth configuration in Supabase.

### Session Management

- Sessions are stored as httpOnly cookies (secure)
- Middleware automatically refreshes expired sessions
- Sessions persist across browser tabs
- Logout clears all session data

---

## Troubleshooting

### "Redirect URI mismatch" error

**Problem:** GitHub shows an error about redirect URI not matching

**Solution:**
1. Verify your GitHub OAuth app callback URL matches exactly: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
2. No trailing slash
3. Must be HTTPS (not HTTP) in production

### "Invalid client credentials" error

**Problem:** Supabase shows error about invalid credentials

**Solution:**
1. Re-check your Client ID and Client Secret in Supabase
2. Make sure you copied the entire secret (they're long!)
3. Try generating a new client secret and updating Supabase

### Login button does nothing

**Problem:** Clicking "Sign in with GitHub" does nothing

**Solution:**
1. Check browser console for JavaScript errors
2. Verify `NEXT_PUBLIC_SUPABASE_URL` is set correctly
3. Make sure you're not blocking popups/redirects

### Callback fails with "no_code" error

**Problem:** Redirected back but no authentication code

**Solution:**
1. Verify GitHub OAuth app is properly configured
2. Check that the authorization callback URL in GitHub matches Supabase
3. Try re-authorizing the app from GitHub settings

### "Session not found" after callback

**Problem:** Callback succeeds but you're still not logged in

**Solution:**
1. Check that cookies are enabled in your browser
2. Verify middleware is not blocking the callback route
3. Check Vercel logs for errors during callback processing

---

## Architecture Diagram

```
┌─────────────┐
│   Browser   │
│  (User)     │
└──────┬──────┘
       │ 1. Click "Sign in with GitHub"
       ↓
┌─────────────────────────────┐
│  Maestro Frontend           │
│  /login                     │
│  - Calls supabase.auth      │
│    .signInWithOAuth()       │
└──────┬──────────────────────┘
       │ 2. Redirect to GitHub
       ↓
┌─────────────────────────────┐
│  GitHub OAuth               │
│  - User authorizes app      │
│  - Generates auth code      │
└──────┬──────────────────────┘
       │ 3. Redirect with code
       ↓
┌─────────────────────────────┐
│  Supabase Auth              │
│  /auth/v1/callback?code=... │
│  - Exchange code for token  │
└──────┬──────────────────────┘
       │ 4. Redirect to app
       ↓
┌─────────────────────────────┐
│  Maestro Callback           │
│  /auth/callback?code=...    │
│  - Exchange code for session│
│  - Set cookies              │
└──────┬──────────────────────┘
       │ 5. Redirect to projects
       ↓
┌─────────────────────────────┐
│  Maestro App                │
│  /projects                  │
│  - User is authenticated    │
│  - Session stored in cookies│
└─────────────────────────────┘
```

---

## Next Steps After Setup

Once GitHub OAuth is working:

1. ✅ **Test the complete flow** with a real GitHub account
2. ✅ **Verify RLS policies** in Supabase (see E2E_TESTING_REPORT.md)
3. ✅ **Create a test project** to ensure data isolation works
4. ✅ **Test logout** and re-login
5. ✅ **Monitor Supabase logs** for any authentication errors

---

## Files Modified for GitHub OAuth

### New Files
- ✅ `app/auth/callback/route.ts` - OAuth callback handler
- ✅ `GITHUB_AUTH_SETUP.md` - This setup guide

### Modified Files
- ✅ `app/login/page.tsx` - GitHub OAuth button and error handling
- ✅ `app/signup/page.tsx` - Redirects to login (GitHub handles both)
- ✅ `middleware.ts` - Allows `/auth/callback` as public route

---

## Support

If you encounter issues:

1. Check **Supabase Dashboard** → **Logs** → **Auth Logs**
2. Check **Vercel Dashboard** → **Functions** → Logs
3. Check browser console for JavaScript errors
4. Verify all environment variables are set correctly

---

**Setup Time:** ~10 minutes
**Difficulty:** Easy
**Prerequisites:** GitHub account, Supabase project, Vercel deployment

