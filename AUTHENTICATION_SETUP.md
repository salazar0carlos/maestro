# Maestro Authentication Setup Guide

This guide walks you through setting up Supabase authentication with GitHub OAuth and Row Level Security (RLS) for the Maestro application.

## Overview

Maestro uses GitHub OAuth for authentication because:
- ✅ **GitHub integration is essential** - Maestro needs GitHub access to manage repositories
- ✅ **Single sign-on** - No separate password to manage
- ✅ **Secure by default** - OAuth 2.0 protocol
- ✅ **User data isolation** - Each user only sees their own projects, tasks, agents, and improvements
- ✅ **Row Level Security (RLS)** - Database-level security enforces data isolation

## Prerequisites

- Supabase project with database configured
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment variables set
- GitHub account for OAuth setup

## Setup Steps

### Step 1: Enable GitHub OAuth in Supabase

1. Go to your Supabase dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **Authentication** > **Providers**
4. Find **GitHub** in the list of providers
5. Toggle **Enable GitHub provider**

#### Get GitHub OAuth Credentials

1. Go to GitHub: https://github.com/settings/developers
2. Click **New OAuth App** (or **New GitHub App** for organizations)
3. Fill in the application details:
   - **Application name**: Maestro (or your preferred name)
   - **Homepage URL**: Your app URL (e.g., `http://localhost:3000` for development)
   - **Authorization callback URL**: Copy this from Supabase (shown on the GitHub provider page)
     - Format: `https://<your-project-ref>.supabase.co/auth/v1/callback`
4. Click **Register application**
5. Copy the **Client ID**
6. Click **Generate a new client secret** and copy it

#### Configure Supabase with GitHub Credentials

1. Back in Supabase, on the GitHub provider page:
   - Paste your **Client ID** from GitHub
   - Paste your **Client Secret** from GitHub
2. Click **Save**

### Step 2: Configure Redirect URLs

1. Still in **Authentication** settings
2. Navigate to **URL Configuration**
3. Add your site URLs:
   - **Site URL**: `http://localhost:3000` (development) or your production URL
   - **Redirect URLs**: Add these URLs:
     - `http://localhost:3000/projects`
     - `https://your-production-domain.com/projects` (when deployed)

### Step 3: Run Database Migrations

#### 3a. Add user_id columns

1. Open Supabase SQL Editor: **SQL Editor** > **New Query**
2. Copy and paste the contents of `supabase/add_user_id_migration.sql`
3. Click **Run** to execute

This migration adds `user_id` columns to all tables and creates indexes for efficient queries.

#### 3b. Clean up existing data (if any)

If you have existing test data without user IDs, you have two options:

**Option A: Delete test data**
```sql
DELETE FROM projects WHERE user_id IS NULL;
DELETE FROM tasks WHERE user_id IS NULL;
DELETE FROM agents WHERE user_id IS NULL;
DELETE FROM improvements WHERE user_id IS NULL;
```

**Option B: Assign to your user** (after signing in with GitHub)
```sql
-- First, sign in through the app to get your user_id
-- Check your user_id with: SELECT id, email FROM auth.users;
-- Then run this query, replacing 'your-user-id' with your actual user ID
UPDATE projects SET user_id = 'your-user-id' WHERE user_id IS NULL;
UPDATE tasks SET user_id = 'your-user-id' WHERE user_id IS NULL;
UPDATE agents SET user_id = 'your-user-id' WHERE user_id IS NULL;
UPDATE improvements SET user_id = 'your-user-id' WHERE user_id IS NULL;
```

### Step 4: Enable Row Level Security (RLS)

1. Open Supabase SQL Editor
2. Copy and paste the contents of `supabase/rls_policies.sql`
3. Click **Run** to execute

This creates RLS policies that ensure:
- Users can only view their own data
- Users can only create/update/delete their own data
- All operations are filtered by the authenticated user's ID

### Step 5: Verify RLS is Working

Run this query to see all active RLS policies:

```sql
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

You should see policies for:
- projects (SELECT, INSERT, UPDATE, DELETE)
- tasks (SELECT, INSERT, UPDATE, DELETE)
- agents (SELECT, INSERT, UPDATE, DELETE)
- improvements (SELECT, INSERT, UPDATE, DELETE)
- cost_records (SELECT, INSERT)
- events (SELECT, INSERT)

### Step 6: Test GitHub Authentication Flow

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Visit http://localhost:3000
   - Should automatically redirect to `/login`

3. Click "Sign in with GitHub"
   - Redirects to GitHub OAuth authorization page
   - Review the permissions Maestro is requesting
   - Click "Authorize" to grant access
   - Should redirect back to `/projects` after successful authentication

4. Create a project
   - Click "Create Project"
   - Fill in name and description
   - Project should appear in the list immediately

5. Test data isolation:
   - Open an incognito/private browser window
   - Sign in with a different GitHub account
   - Verify you cannot see the first user's projects
   - Create a project as the second user
   - Verify the second user only sees their own project

6. Test logout:
   - Click "Logout" in the navigation
   - Should redirect to `/login`
   - Verify you cannot access `/projects` without logging in
   - Sign in again with GitHub to access your data

## Architecture

### Authentication Flow

```
User visits any protected route
  ↓
Middleware checks authentication
  ↓
Not authenticated → Redirect to /login
  ↓
User clicks "Sign in with GitHub"
  ↓
Redirect to GitHub OAuth
  ↓
User authorizes Maestro
  ↓
GitHub redirects back with auth code
  ↓
Supabase exchanges code for session
  ↓
Redirect to /projects
  ↓
API routes verify auth with requireAuth()
  ↓
RLS policies filter database queries by user_id
```

### Why GitHub OAuth?

1. **Repository Access**: Maestro orchestrates AI agents that build applications. These agents need to:
   - Clone repositories
   - Create branches
   - Commit code
   - Create pull requests
   - Read repository structure

2. **Identity**: GitHub provides reliable user identity with email verification built-in

3. **Single Sign-On**: Users don't need to remember another password

4. **Permissions**: OAuth scopes let users control what Maestro can access

### Security Layers

1. **Middleware** (`middleware.ts`):
   - Redirects unauthenticated users to `/login`
   - Redirects authenticated users away from login page
   - Protects all routes except `/login`

2. **API Route Protection** (`requireAuth()`):
   - All protected API routes call `requireAuth()`
   - Returns `401 Unauthorized` if not authenticated
   - Never trusts client-provided user_id

3. **Row Level Security (RLS)**:
   - Database-level security
   - Automatically filters queries by `auth.uid()`
   - Prevents users from accessing other users' data
   - Works even if API protection is bypassed

### Key Files

- `app/login/page.tsx` - GitHub OAuth login page
- `middleware.ts` - Route protection
- `lib/auth-helpers.ts` - Authentication utility functions
- `lib/supabase.ts` - Supabase client configuration
- `components/LogoutButton.tsx` - Logout functionality
- `supabase/add_user_id_migration.sql` - Database migration
- `supabase/rls_policies.sql` - RLS policies

## GitHub OAuth Scopes

Maestro requests these GitHub permissions:
- **Read user profile** - Get your name and email
- **Access repositories** - Read and write to repos (required for agent operations)
- **Create pull requests** - Agents can submit code changes

You can revoke access anytime in GitHub Settings > Applications.

## API Route Protection Pattern

All protected API routes follow this pattern:

```typescript
import { requireAuth } from '@/lib/auth-helpers';

export async function GET() {
  try {
    // Verify user is authenticated (throws if not)
    await requireAuth();

    // Your API logic here
    // RLS will automatically filter by user_id
    const data = await getData();

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
}
```

## Troubleshooting

### "Unauthorized" error when accessing API routes

- Verify you're logged in with GitHub
- Check browser console for authentication errors
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly
- Check that GitHub OAuth is enabled in Supabase

### GitHub OAuth redirect fails

- Verify callback URL in GitHub matches Supabase callback URL exactly
- Check that Client ID and Client Secret are correct in Supabase
- Ensure redirect URLs are configured in Supabase URL Configuration

### Can see other users' data

- Verify RLS policies are enabled: `SELECT * FROM pg_policies WHERE schemaname = 'public';`
- Check that `user_id` column exists in all tables
- Verify RLS is enabled on tables: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`

### Cannot create projects/tasks

- Verify the `user_id` column exists and allows NULL or has a default
- Check RLS INSERT policies are created
- Check browser console and API logs for errors
- Verify you're logged in with GitHub

### Redirect loop between /login and /projects

- Clear browser cookies
- Verify Supabase URL and keys are correct
- Check middleware.ts logic
- Verify GitHub OAuth is properly configured

## Production Deployment

Before deploying to production:

1. **Update GitHub OAuth App**:
   - Add production callback URL: `https://your-domain.com`
   - Update authorization callback URL

2. **Update Supabase**:
   - Add production URL to redirect URLs
   - Update site URL to production domain

3. **Environment Variables**:
   - Set `NEXT_PUBLIC_SUPABASE_URL` in production
   - Set `NEXT_PUBLIC_SUPABASE_ANON_KEY` in production

4. **Test Authentication**:
   - Test GitHub login flow on production
   - Verify redirects work correctly
   - Test data isolation

5. **GitHub Permissions**:
   - Review requested OAuth scopes
   - Ensure only necessary permissions are requested

## Security Best Practices

✅ **DO:**
- Always use `requireAuth()` in API routes
- Let RLS handle data filtering
- Use server-side auth helpers (`getServerUserId()`)
- Check authentication before any data operations
- Review GitHub OAuth permissions regularly

❌ **DON'T:**
- Trust client-provided `user_id`
- Skip authentication checks in API routes
- Disable RLS policies
- Store sensitive data without encryption
- Request more GitHub permissions than needed

## GitHub Token Management

Supabase stores the GitHub access token securely. To access it in your code:

```typescript
const { data: { session } } = await supabase.auth.getSession();
const githubToken = session?.provider_token; // Use for GitHub API calls
```

This token can be used to:
- Make GitHub API requests on behalf of the user
- Clone repositories
- Create commits and pull requests
- Read repository data

## Next Steps

- ✅ GitHub OAuth authentication is set up
- ⏭️ Implement GitHub repository integration
- ⏭️ Add agent GitHub operations (clone, commit, PR)
- ⏭️ Update remaining API routes with `requireAuth()`
- ⏭️ Add user profile management with GitHub data
- ⏭️ Implement repository selection UI

## Support

If you encounter issues:
1. Check this guide thoroughly
2. Verify GitHub OAuth app is configured correctly
3. Verify all migrations have been run
4. Check Supabase dashboard for authentication logs
5. Review browser console for errors
6. Check Next.js server logs
7. Verify GitHub OAuth callback URL matches exactly
