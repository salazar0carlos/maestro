# Maestro Authentication Setup Guide

This guide walks you through setting up Supabase authentication with Row Level Security (RLS) for the Maestro application.

## Overview

Maestro now uses Supabase Authentication to ensure:
- ✅ Users must log in to access the application
- ✅ Each user only sees their own projects, tasks, agents, and improvements
- ✅ Row Level Security (RLS) enforces data isolation at the database level
- ✅ API routes are protected with authentication checks

## Prerequisites

- Supabase project with database configured
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment variables set

## Setup Steps

### Step 1: Enable Supabase Authentication

1. Go to your Supabase dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **Authentication** > **Providers**
4. Enable **Email** provider (enabled by default)
5. Configure redirect URLs:
   - Go to **Authentication** > **URL Configuration**
   - Add your site URL (e.g., `http://localhost:3000` for development)
   - Add redirect URLs: `http://localhost:3000/login`, `http://localhost:3000/projects`

### Step 2: Run Database Migrations

#### 2a. Add user_id columns

1. Open Supabase SQL Editor: **SQL Editor** > **New Query**
2. Copy and paste the contents of `supabase/add_user_id_migration.sql`
3. Click **Run** to execute

This migration adds `user_id` columns to all tables and creates indexes for efficient queries.

#### 2b. Clean up existing data (if any)

If you have existing test data without user IDs, you have two options:

**Option A: Delete test data**
```sql
DELETE FROM projects WHERE user_id IS NULL;
DELETE FROM tasks WHERE user_id IS NULL;
DELETE FROM agents WHERE user_id IS NULL;
DELETE FROM improvements WHERE user_id IS NULL;
```

**Option B: Assign to your user** (after creating an account)
```sql
-- First, sign up through the app to get your user_id
-- Then run this query, replacing 'your-user-id' with your actual user ID
UPDATE projects SET user_id = 'your-user-id' WHERE user_id IS NULL;
UPDATE tasks SET user_id = 'your-user-id' WHERE user_id IS NULL;
UPDATE agents SET user_id = 'your-user-id' WHERE user_id IS NULL;
UPDATE improvements SET user_id = 'your-user-id' WHERE user_id IS NULL;
```

### Step 3: Enable Row Level Security (RLS)

1. Open Supabase SQL Editor
2. Copy and paste the contents of `supabase/rls_policies.sql`
3. Click **Run** to execute

This creates RLS policies that ensure:
- Users can only view their own data
- Users can only create/update/delete their own data
- All operations are filtered by the authenticated user's ID

### Step 4: Verify RLS is Working

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

### Step 5: Test Authentication Flow

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Visit http://localhost:3000
   - Should automatically redirect to `/login`

3. Click "Sign up" and create an account
   - Use a valid email address
   - Password must be at least 6 characters
   - Should redirect to `/projects` after signup

4. Create a project
   - Click "Create Project"
   - Fill in name and description
   - Project should appear in the list immediately

5. Test data isolation:
   - Open an incognito/private browser window
   - Sign up with a different email
   - Verify you cannot see the first user's projects
   - Create a project as the second user
   - Verify the second user only sees their own project

6. Test logout:
   - Click "Logout" in the navigation
   - Should redirect to `/login`
   - Verify you cannot access `/projects` without logging in

## Architecture

### Authentication Flow

```
User visits any protected route
  ↓
Middleware checks authentication
  ↓
Not authenticated → Redirect to /login
  ↓
Authenticated → Allow access
  ↓
API routes verify auth with requireAuth()
  ↓
RLS policies filter database queries by user_id
```

### Security Layers

1. **Middleware** (`middleware.ts`):
   - Redirects unauthenticated users to `/login`
   - Redirects authenticated users away from auth pages
   - Protects all routes except `/login` and `/signup`

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

- `app/login/page.tsx` - Login page
- `app/signup/page.tsx` - Signup page
- `middleware.ts` - Route protection
- `lib/auth-helpers.ts` - Authentication utility functions
- `lib/supabase.ts` - Supabase client configuration
- `components/LogoutButton.tsx` - Logout functionality
- `supabase/add_user_id_migration.sql` - Database migration
- `supabase/rls_policies.sql` - RLS policies

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

## Creating Records with user_id

When creating new records, the `user_id` is automatically set by RLS policies. However, for clarity, you can explicitly set it:

```typescript
const userId = await requireAuth();

const newProject = {
  ...projectData,
  user_id: userId, // Explicitly set (optional, RLS will handle it)
};

await createProject(newProject);
```

## Troubleshooting

### "Unauthorized" error when accessing API routes

- Verify you're logged in
- Check browser console for authentication errors
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly

### Can see other users' data

- Verify RLS policies are enabled: `SELECT * FROM pg_policies WHERE schemaname = 'public';`
- Check that `user_id` column exists in all tables
- Verify RLS is enabled on tables: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`

### Cannot create projects/tasks

- Verify the `user_id` column exists and allows NULL or has a default
- Check RLS INSERT policies are created
- Check browser console and API logs for errors

### Redirect loop between /login and /projects

- Clear browser cookies
- Verify Supabase URL and keys are correct
- Check middleware.ts logic

## Security Best Practices

✅ **DO:**
- Always use `requireAuth()` in API routes
- Let RLS handle data filtering
- Use server-side auth helpers (`getServerUserId()`)
- Check authentication before any data operations

❌ **DON'T:**
- Trust client-provided `user_id`
- Skip authentication checks in API routes
- Disable RLS policies
- Store sensitive data without encryption

## Production Deployment

Before deploying to production:

1. Update Supabase redirect URLs to include production domain
2. Verify all environment variables are set in production
3. Test authentication flow on production
4. Enable email confirmation (optional): **Authentication** > **Email Templates**
5. Set up custom SMTP (optional): **Project Settings** > **SMTP Settings**

## Next Steps

- ✅ Basic authentication is now set up
- ⏭️ Add password reset functionality
- ⏭️ Add email verification
- ⏭️ Add social login providers (Google, GitHub, etc.)
- ⏭️ Update remaining API routes with `requireAuth()`
- ⏭️ Add user profile management

## Support

If you encounter issues:
1. Check this guide thoroughly
2. Verify all migrations have been run
3. Check Supabase dashboard for authentication logs
4. Review browser console for errors
5. Check Next.js server logs
