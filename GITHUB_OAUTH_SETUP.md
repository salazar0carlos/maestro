# GitHub OAuth Setup for Maestro (Production)

## Quick Diagnosis

If you're getting "No authorization code received" error, follow this guide **exactly**.

## The Problem

The OAuth flow is:
```
Maestro App → GitHub (authorization) → Supabase (processes code) → Maestro App (logged in)
```

If any link is broken, authentication fails.

## Step-by-Step Fix

### 1. Get Your Supabase Callback URL

1. Go to **Supabase Dashboard**: https://app.supabase.com
2. Select your **Maestro** project
3. Click **Authentication** (left sidebar) → **Providers**
4. Click **GitHub** in the provider list
5. **COPY the Callback URL** shown at the top of the page
   - It looks like: `https://xxxxxxxxx.supabase.co/auth/v1/callback`
   - **This is critical** - you'll use this in GitHub

### 2. Configure GitHub OAuth App

1. Go to **GitHub Developer Settings**: https://github.com/settings/developers
2. Click **OAuth Apps**
3. Find your **Maestro** OAuth App (or create new if needed)
4. Click the app name to edit it

**Set these EXACT values:**
- **Application name**: `Maestro` (or whatever you prefer)
- **Homepage URL**: `https://maestro-dusky.vercel.app`
- **Authorization callback URL**: **PASTE YOUR SUPABASE CALLBACK URL FROM STEP 1**
  - Example: `https://xxxxxxxxx.supabase.co/auth/v1/callback`
  - ⚠️ **NOT** `https://maestro-dusky.vercel.app/auth/callback`
  - ⚠️ **NOT** anything with localhost

5. Click **Update application**
6. Copy the **Client ID** (you'll need it for Supabase)
7. Generate a new **Client Secret** if needed and copy it

### 3. Configure Supabase GitHub Provider

1. Back in **Supabase Dashboard** → **Authentication** → **Providers** → **GitHub**
2. Toggle **Enable Sign in with GitHub** to **ON**
3. Enter your GitHub OAuth credentials:
   - **Client ID**: Paste from GitHub OAuth app
   - **Client Secret**: Paste from GitHub OAuth app
4. Scroll down to **Additional Settings**:
   - **Skip nonce check**: Leave **OFF**
5. Click **Save**

### 4. Configure Supabase Redirect URLs

1. In Supabase, go to **Authentication** → **URL Configuration**
2. Set these values:
   - **Site URL**: `https://maestro-dusky.vercel.app`
   - **Redirect URLs**: Add these (one per line):
     ```
     https://maestro-dusky.vercel.app/auth/callback
     https://maestro-dusky.vercel.app/**
     ```
3. Click **Save**

### 5. Set Vercel Environment Variables

1. Go to **Vercel Dashboard**: https://vercel.com
2. Select your **maestro-dusky** project
3. Go to **Settings** → **Environment Variables**
4. Add/verify these variables:

**Required:**
- **Name**: `NEXT_PUBLIC_SUPABASE_URL`
  - **Value**: Your Supabase project URL (from Supabase → Settings → API)
  - **Environment**: Production

- **Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - **Value**: Your Supabase anon/public key (from Supabase → Settings → API)
  - **Environment**: Production

- **Name**: `NEXT_PUBLIC_APP_URL`
  - **Value**: `https://maestro-dusky.vercel.app`
  - **Environment**: Production

5. Click **Save** for each variable

### 6. Redeploy Vercel

**Important**: Environment variable changes require a redeploy!

1. Go to **Vercel Dashboard** → **Deployments**
2. Click the **⋮** (three dots) on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete (~2 minutes)

### 7. Test the Flow

1. **Clear browser cache and cookies** for `maestro-dusky.vercel.app`
2. Open **Browser DevTools** (F12) → **Console** tab
3. Visit: https://maestro-dusky.vercel.app/login
4. Click **"Sign in with GitHub"**
5. **Watch the console** for log messages:
   - `[Login] Starting GitHub OAuth flow...`
   - `[Login] Redirect URL: https://maestro-dusky.vercel.app/auth/callback`
   - `[Login] OAuth initiated successfully...`
6. You'll be redirected to GitHub
7. Click **Authorize** on GitHub
8. GitHub redirects to Supabase
9. Supabase redirects to your app at `/auth/callback`
10. **Watch console** for:
    - `[OAuth Callback] Received callback`
    - `[OAuth Callback] Exchanging code for session...`
    - `[OAuth Callback] Session established successfully`
11. You should land on `/projects` logged in!

## Troubleshooting

### Still getting "No authorization code received"

**Check these in order:**

1. **Browser Console Logs**:
   - Open DevTools → Console
   - Look for `[Login]` and `[OAuth Callback]` messages
   - Share any error messages you see

2. **Verify GitHub OAuth App**:
   - Go to https://github.com/settings/developers
   - Click your Maestro OAuth app
   - **Callback URL MUST be**: `https://xxxxxxxxx.supabase.co/auth/v1/callback`
   - **NOT your app's URL**

3. **Verify Supabase Provider**:
   - Supabase → Authentication → Providers → GitHub
   - **Enabled**: Toggle is ON
   - **Client ID** and **Client Secret** are filled in
   - Match your GitHub OAuth app credentials

4. **Verify Redirect URLs**:
   - Supabase → Authentication → URL Configuration
   - Site URL: `https://maestro-dusky.vercel.app`
   - Redirect URLs include: `https://maestro-dusky.vercel.app/auth/callback`

5. **Verify Environment Variables**:
   - Vercel → Settings → Environment Variables
   - `NEXT_PUBLIC_APP_URL` = `https://maestro-dusky.vercel.app`
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
   - **After changing**: You MUST redeploy!

6. **Check Supabase Logs**:
   - Supabase Dashboard → Logs
   - Look for authentication errors
   - Share any errors you see

### "Access denied" or "Application suspended"

- Your GitHub OAuth app might be suspended
- Go to https://github.com/settings/applications
- Check if Maestro is listed and active
- Revoke and re-authorize if needed

### Redirect loop

- Clear browser cookies for your domain
- Check middleware isn't blocking `/auth/callback`
- Verify session is being set correctly

### Error messages on login page

- Read the error message carefully
- Check browser console for details
- Most errors include the specific issue

## Common Mistakes

❌ **WRONG**: GitHub callback URL = `https://maestro-dusky.vercel.app/auth/callback`
✅ **CORRECT**: GitHub callback URL = `https://xxxxxxxxx.supabase.co/auth/v1/callback`

❌ **WRONG**: Using localhost URLs in production
✅ **CORRECT**: Using `https://maestro-dusky.vercel.app` everywhere

❌ **WRONG**: Forgetting to redeploy after changing environment variables
✅ **CORRECT**: Always redeploy Vercel after changing env vars

❌ **WRONG**: Client ID/Secret mismatch between GitHub and Supabase
✅ **CORRECT**: Copy-paste exactly from GitHub to Supabase

## Support

If you've followed all steps and still can't login:

1. Open browser DevTools → Console
2. Try to login
3. Copy ALL console messages (including errors)
4. Share them for debugging

The console logs will show exactly where the OAuth flow is breaking.
