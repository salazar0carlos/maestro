# API Key Diagnostics and Troubleshooting Guide

## Current Status

Your Maestro app is now configured with **comprehensive debug logging** to help diagnose the "invalid x-api-key" error. The app will now show you exactly what's happening with your API key.

## What Changed

### 1. **Better Error Messages**
When you get an authentication error, the app now tells you specifically:
- "API key is invalid or expired. Please verify your key at https://console.anthropic.com/account/keys"
- Plus a link to check and regenerate your key if needed

### 2. **Debug Logging**
Both the client and server now log detailed information:
- **Client logs** (in browser DevTools): Show what API key is being sent
- **Server logs** (in terminal): Show what API key was received and used

### 3. **API Key Trimming**
The API key is now automatically trimmed of any leading/trailing whitespace before being sent to Anthropic

## How to Debug the "invalid x-api-key" Error

### Step 1: Check Your API Key

1. Go to https://console.anthropic.com/account/keys
2. Verify that:
   - Your key exists
   - It starts with `sk-ant-`
   - It hasn't been deactivated
   - You're viewing the full key (not a truncated version)

### Step 2: Copy and Save Your Key

1. Copy the **entire** key from Anthropic console
2. Go to http://localhost:3000/settings
3. Paste the key into the "API Key" field
4. Click "Save"

### Step 3: Open Browser DevTools to See Debug Logs

1. Open DevTools (F12 or Cmd+Option+I on Mac)
2. Go to the "Console" tab
3. Look for logs starting with `[generateTaskPrompt]` - these show what key is being sent

### Step 4: Create a Task to Test

1. Go to http://localhost:3000
2. Create a project (or use an existing one)
3. Click the project to open it
4. Click "+ New Task"
5. Enter a task title (e.g., "Test task")
6. Click "Next: Generate Prompt"

### Step 5: Check the Logs

**In Browser Console (DevTools):**
```
[generateTaskPrompt] Client function called
[generateTaskPrompt] Title: Test task
[generateTaskPrompt] API Key present: true
[generateTaskPrompt] API Key length: XX
[generateTaskPrompt] API Key starts with sk-ant-: true
[generateTaskPrompt] API Key first 10 chars: sk-ant-XXX...
[generateTaskPrompt] Sending request to /api/generate-prompt...
[generateTaskPrompt] Response status: 401 (or 200 if it worked)
```

**In Terminal (where npm run dev is running):**
```
[generate-prompt API] Request received
[generate-prompt API] Task Title: Test task
[generate-prompt API] API Key present: true
[generate-prompt API] API Key length: XX
[generate-prompt API] API Key starts with sk-ant-: true
[generate-prompt API] API Key first 10 chars: sk-ant-XXX...
[generate-prompt API] API Key has leading/trailing spaces: false
[generate-prompt API] Calling Anthropic API with trimmed key...
[generate-prompt API] Response status: 401 (or 200 if it worked)
```

## What to Look For

### If you see "invalid x-api-key" error:

1. **Check the logs** - they'll show the exact first 10 characters of the key being sent
2. **Verify in Anthropic console** - make sure the key matches what you saved
3. **Check for whitespace** - look for `API Key has leading/trailing spaces: true` in the logs
4. **Regenerate the key** - if the logs show the key is being sent correctly but Anthropic says it's invalid, your key might be expired

### If the logs show the key correctly but still fails:

1. Your API key is genuinely invalid or expired
2. Log into https://console.anthropic.com
3. Go to API Keys section
4. Delete the old key and create a new one
5. Copy the new key and save it to Maestro

### If the logs show the key is truncated or malformed:

1. There may be an issue with how the key is being stored
2. Go to Settings and clear the field
3. Copy a fresh key from Anthropic console
4. Paste and save again

## Key Information Displayed

The error response now includes safe debug info:
- `rawError`: The actual response from Anthropic API
- `apiKeyPrefix`: First 10 characters of the key being used (safe to log)

## Next Steps

1. **With a valid key**: The prompt generation will work and you'll see a success message
2. **With an invalid key**: You'll see the clear error directing you to Anthropic console
3. **With any other issue**: The debug logs will help identify what's wrong

## Testing with curl (Advanced)

If you want to test the API route directly:

```bash
curl -X POST http://localhost:3000/api/generate-prompt \
  -H "Content-Type: application/json" \
  -H "x-anthropic-key: sk-ant-YOUR-KEY-HERE" \
  -d '{
    "taskTitle": "Test Task"
  }'
```

Replace `sk-ant-YOUR-KEY-HERE` with your actual API key.

## Files Modified

- **lib/ai-prompt-generator.ts**: Added client-side debug logging
- **app/api/generate-prompt/route.ts**: Added server-side debug logging, API key trimming, and user-friendly error messages

## Summary

The app now has the tools to diagnose the issue:
✅ Debug logging shows exactly what key is being sent
✅ User-friendly error messages point you to the solution
✅ API key is automatically trimmed of whitespace
✅ Server and client logs can be cross-referenced

**Next**: Try creating a task again with your API key and check the console logs to see what's happening!
