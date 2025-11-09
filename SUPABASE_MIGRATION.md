# Supabase Migration Guide

## Overview

This migration moves Maestro from localStorage to Supabase (PostgreSQL) for production-ready data persistence.

## What Changed

### 1. Database Schema
- **File**: `supabase/schema.sql`
- **Tables Created**:
  - `projects` - Project management
  - `tasks` - Task tracking
  - `agents` - Agent monitoring
  - `improvements` - Improvement suggestions
  - `cost_records` - API usage tracking
  - `events` - System events
  - Phase 3 tables: `analysis_history`, `pattern_library`, `impact_tracking`, etc.

### 2. Storage Layer
- **Adapter**: `lib/storage-adapter.ts` - Auto-detects database vs localStorage
- **Database Layer**: `lib/storage-db.ts` - Supabase CRUD operations
- **Fallback**: Falls back to localStorage if Supabase not configured

### 3. All Files Updated to Async/Await
- API routes
- Lib files (agent-stats, alerts, agent-registry, etc.)
- All storage function calls now use `await`

### 4. New Components
- **DatabaseStatus** - Shows connection status and database stats
- **DataMigration** - One-time migration from localStorage to Supabase

### 5. Settings Page Updates
- ❌ Removed API key input (now uses Vercel env vars)
- ✅ Added database connection status
- ✅ Added migration tool
- ✅ Added database statistics
- ✅ Updated export/import to use Supabase

### 6. New API Routes
- `/api/database/stats` - Get database statistics
- `/api/database/test` - Test database connection
- `/api/database/migrate` - Migrate localStorage data to Supabase
- `/api/database/export` - Export all data as JSON
- `/api/database/clear` - Clear all data (danger zone)

## Setup Instructions

### 1. Run Schema in Supabase

1. Go to your Supabase project: https://app.supabase.com
2. Navigate to SQL Editor
3. Copy contents of `supabase/schema.sql`
4. Paste and click "Run"
5. Verify all tables were created in the Table Editor

### 2. Environment Variables

Make sure these are set in Vercel (or `.env.local` for development):

```bash
# Supabase (public)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Anthropic API (server-side only)
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Optional: Supabase service role (for agents)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Deploy to Vercel

```bash
git push origin claude/migrate-localstorage-supabase-011CUxgft4q84goGxpc87fGa
```

Vercel will automatically deploy with the environment variables you've configured.

### 4. Migrate Existing Data

1. Go to **Settings** page in your deployed app
2. Scroll to "Database & API" section
3. Click "Check Data" to see what's in localStorage
4. Click "Migrate to Supabase" to transfer data
5. Confirm to clear localStorage after successful migration

## Testing

### Test Database Connection

1. Go to Settings page
2. Look for "Database Connection" card
3. Click "Test Connection" button
4. Should show "✓ Database connection successful"

### Test CRUD Operations

```bash
# Create a project via API
curl -X POST https://your-app.vercel.app/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project","description":"Test"}'

# Verify in Supabase dashboard
```

### Verify Health Checks

All health check endpoints should now pass:
- `/api/health/improvements` - Should return improvement suggestions
- `/api/health/database` - Should show database stats
- Other health check endpoints

## Rollback Plan

If something goes wrong:

1. **Data is safe**: Your localStorage data is not deleted until you explicitly confirm
2. **Automatic fallback**: If Supabase is not configured, app automatically uses localStorage
3. **Export first**: Always export data before migrating (Settings > Export Data)

## Architecture

```
┌─────────────────┐
│   Next.js App   │
└────────┬────────┘
         │
         ├─ Client (Browser)
         │  ├─ localStorage (fallback)
         │  └─ Fetch API → Server
         │
         └─ Server (Vercel)
            ├─ storage-adapter.ts (auto-detects)
            ├─ storage-db.ts (Supabase)
            └─ storage.ts (localStorage)
                    │
                    ▼
            ┌───────────────┐
            │   Supabase    │
            │  (PostgreSQL) │
            └───────────────┘
```

## Benefits

✅ **Data persists across devices** - Not tied to browser localStorage
✅ **API routes can access data** - Server-side operations work
✅ **Production-ready** - Scales beyond single browser
✅ **Health checks pass** - Endpoints have real data
✅ **Automatic backups** - Supabase handles backups
✅ **Easy migration** - One-click tool in Settings

## Next Steps

1. ✅ Run schema in Supabase
2. ✅ Set environment variables in Vercel
3. ✅ Deploy to production
4. ✅ Migrate existing data
5. ✅ Test all features
6. ✅ Monitor Supabase usage in dashboard

## Troubleshooting

### "Database not configured" error
- Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- Verify they don't have quotes or extra spaces
- Restart Vercel deployment after adding env vars

### "Connection test failed"
- Verify Supabase project is active
- Check that anon key has correct permissions
- Ensure RLS policies allow access (schema has permissive policies)

### "Migration failed"
- Check browser console for detailed errors
- Verify schema was run correctly
- Try migrating smaller batches (contact support if needed)

## Support

- **Schema issues**: Check `supabase/schema.sql`
- **Connection issues**: Test with `curl` to `/api/database/test`
- **Migration issues**: Check browser console and network tab
- **General issues**: Review Settings page error messages

---

**Migration completed successfully!** 🎉

Your app now uses Supabase for reliable, production-ready data storage.
