# Maestro GitHub OAuth Setup - Production Guide

## ⚡ Quick Start

**Having trouble logging in?** Visit: `/auth/diagnostics` on your deployed app for a complete configuration checker.

---

## Overview

Maestro uses **GitHub OAuth ONLY** for authentication because:
- ✅ GitHub integration is required (Maestro builds apps from repos)
- ✅ Single sign-on - no passwords to manage
- ✅ Secure OAuth 2.0 protocol
- ✅ Each user only sees their own data (Row Level Security)

## Prerequisites

- Supabase project with database configured
- Vercel account with Maestro deployed
- GitHub account

---

## Setup Steps

### Step 1: Set Vercel Environment Variables

**Go to:** Vercel Dashboard → maestro-dusky → Settings → Environment Variables

**Add these 3 variables:**

| Variable Name | Where to Get It | Example |
|--------------|-----------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → anon/public key | `eyJhbGciOi...` (long JWT) |
| `NEXT_PUBLIC_APP_URL` | Your Vercel production URL | `https://maestro-dusky.vercel.app` |

**Important:**
- Set for **Production** environment
- **After adding variables, you MUST redeploy!**

---

### Step 2: Get Supabase Callback URL

1. Go to: https://app.supabase.com
2. Select your Maestro project
3. Navigate to: **Authentication** → **Providers**
4. Click **GitHub** in the provider list
5. **Copy the Callback URL** shown at the top
   - Looks like: `https://xxxxxxxxx.supabase.co/auth/v1/callback`
   - **YOU WILL NEED THIS FOR GITHUB**

---

### Step 3: Create GitHub OAuth App

1. Go to: https://github.com/settings/developers
2. Click **OAuth Apps**
3. Click **New OAuth App** (or edit existing)
4. Fill in:
   - **Application name:** `Maestro` (or whatever you prefer)
   - **Homepage URL:** `https://maestro-dusky.vercel.app`
   - **Authorization callback URL:** **PASTE SUPABASE CALLBACK URL FROM STEP 2**
     - Example: `https://xxxxxxxxx.supabase.co/auth/v1/callback`
     - ⚠️ **NOT** `https://maestro-dusky.vercel.app/auth/callback`
     - ⚠️ **NOT** anything with localhost
5. Click **Register application**
6. **Copy the Client ID** (you'll need it for Supabase)
7. Click **Generate a new client secret** and **copy it** (you'll need it for Supabase)

**CRITICAL:** The callback URL must be your Supabase URL, not your app's URL!

---

### Step 4: Configure Supabase GitHub Provider

1. Go to: https://app.supabase.com
2. Select your Maestro project
3. Navigate to: **Authentication** → **Providers**
4. Click **GitHub**
5. Toggle **Enable Sign in with GitHub** to **ON**
6. Enter credentials from GitHub:
   - **Client ID:** Paste from GitHub OAuth app
   - **Client Secret:** Paste from GitHub OAuth app
7. Scroll to bottom and click **Save**

---

### Step 5: Configure Supabase Redirect URLs

1. Still in Supabase Dashboard
2. Navigate to: **Authentication** → **URL Configuration**
3. Set these values:
   - **Site URL:** `https://maestro-dusky.vercel.app`
   - **Redirect URLs:** Add these (one per line):
     ```
     https://maestro-dusky.vercel.app/auth/callback
     https://maestro-dusky.vercel.app/**
     ```
4. Click **Save**

---

### Step 6: Run Database Migrations

#### Add user_id columns

1. Open Supabase SQL Editor: **SQL Editor** → **New Query**
2. Copy and paste the contents of `supabase/add_user_id_migration.sql`
3. Click **Run**

This adds `user_id` columns to all tables for multi-tenant data isolation.

#### Enable Row Level Security

1. Still in SQL Editor, open a new query
2. Copy and paste the contents of `supabase/rls_policies.sql`
3. Click **Run**

This ensures users can only see their own data.

---

### Step 7: Redeploy Vercel

**CRITICAL:** Environment variable changes require a redeploy!

1. Go to: Vercel Dashboard → Deployments
2. Click **⋮** (three dots) on the latest deployment
3. Click **Redeploy**
4. Wait ~2 minutes for deployment to complete

---

### Step 8: Test the Login Flow

1. **Clear browser cache and cookies** for `maestro-dusky.vercel.app`
2. **Open Browser DevTools** (F12) → Console tab
3. Visit: `https://maestro-dusky.vercel.app/login`
4. **Watch console for logs:**
   - `[Login] Creating Supabase client...`
   - `[Login] LoginForm mounted`
5. Click **"Sign in with GitHub"**
6. **Watch console:**
   - `[Login] Starting GitHub OAuth flow...`
   - `[Login] Redirect URL: ...`
   - `[Login] OAuth initiated successfully...`
7. You'll be redirected to GitHub
8. Click **Authorize**
9. GitHub redirects to Supabase
10. Supabase redirects to your app at `/auth/callback`
11. **Watch console:**
    - `[OAuth Callback] Received callback`
    - `[OAuth Callback] Exchanging code for session...`
    - `[OAuth Callback] Session established successfully for user: ...`
12. You should land on `/projects` logged in!

---

## Troubleshooting

### "No authorization code received"

**Cause:** GitHub OAuth callback URL is incorrect.

**Solution:**
1. Go to GitHub OAuth app settings
2. Verify **Authorization callback URL** is your **Supabase callback URL**
   - Should be: `https://xxxxx.supabase.co/auth/v1/callback`
   - Should NOT be: `https://maestro-dusky.vercel.app/...`
3. Make sure you copied it exactly from Supabase → Authentication → Providers → GitHub

### Page stuck on "Loading..."

**Cause:** Missing or invalid Vercel environment variables.

**Solution:**
1. Check Vercel → Settings → Environment Variables
2. Verify all 3 variables are set for **Production**
3. Make sure values don't have extra spaces or quotes
4. Redeploy after setting variables

### Configuration Error page

**Cause:** Environment variables not available at runtime.

**Solution:**
1. Verify variables are set in Vercel for **Production** environment
2. Variable names must start with `NEXT_PUBLIC_`
3. Redeploy Vercel after setting variables

### GitHub authorization fails

**Cause:** Client ID/Secret mismatch between GitHub and Supabase.

**Solution:**
1. Get fresh Client ID and Secret from GitHub OAuth app
2. Copy-paste them exactly into Supabase GitHub provider
3. Don't include extra spaces or quotes
4. Click Save in Supabase

---

## Diagnostic Tool

Visit `/auth/diagnostics` on your deployed app for a complete configuration checker that shows:
- ✅ Which environment variables are set
- ✅ Exact values to use in GitHub OAuth app
- ✅ Step-by-step Supabase configuration
- ✅ OAuth flow explanation
- ✅ Common errors and solutions

---

## OAuth Flow Diagram

```
User clicks "Sign in with GitHub" on Maestro
  ↓
Redirects to GitHub authorization page
  ↓
User clicks "Authorize" on GitHub
  ↓
GitHub redirects to SUPABASE callback URL
  ↓
Supabase exchanges auth code for session
  ↓
Supabase redirects to YOUR APP at /auth/callback
  ↓
Your app sets session cookies
  ↓
Redirects to /projects (user is logged in!)
```

**Key Point:** GitHub sends the auth code to Supabase, not directly to your app. This is why the GitHub callback URL must be Supabase's URL.

---

## Security

- ✅ Middleware protects all routes except `/login` and `/auth/callback`
- ✅ API routes verify authentication with `requireAuth()`
- ✅ Row Level Security (RLS) filters all database queries by user ID
- ✅ Users can only see/modify their own data

---

## Common Mistakes

❌ **Wrong:** GitHub callback URL = `https://maestro-dusky.vercel.app/auth/callback`
✅ **Correct:** GitHub callback URL = `https://xxxxx.supabase.co/auth/v1/callback`

❌ **Wrong:** Using localhost URLs in production
✅ **Correct:** Using `https://maestro-dusky.vercel.app` everywhere

❌ **Wrong:** Forgetting to redeploy after setting env vars
✅ **Correct:** Always redeploy Vercel after changing environment variables

❌ **Wrong:** Client ID/Secret don't match between GitHub and Supabase
✅ **Correct:** Copy-paste exactly from GitHub to Supabase

---

## Support

If you still can't login after following this guide:

1. Visit `/auth/diagnostics` on your deployed app
2. Open browser DevTools → Console
3. Try to login and copy ALL console messages
4. Check what the diagnostics page shows is missing
5. Share console messages and diagnostics output for debugging

The console logs and diagnostics will show exactly where the OAuth flow is breaking.
