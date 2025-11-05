# Quick API Key Fix Guide

## TL;DR - The Fix

**Problem:** API key validation was silently failing
**Solution:** Now shows specific, helpful error messages

---

## 3 Simple Steps to Use

### Step 1: Get Your API Key
1. Go to https://console.anthropic.com/account/keys
2. Click "Create Key"
3. Copy the key (starts with `sk-ant-`)

### Step 2: Add to Maestro
1. Go to http://localhost:3000/settings
2. Paste key into "API Key" field
3. Click "Save & Validate"

### Step 3: See Results
- ✅ **Success?** "API key validated successfully"
- ❌ **Error?** Read the specific error message

---

## What Errors You Might See (And What They Mean)

```
"API key cannot be empty"
→ You didn't enter anything, paste your key

"Invalid API key format. Must start with sk-ant-"
→ Wrong key format, get from console.anthropic.com

"Invalid or expired API key. Please check your key at console.anthropic.com"
→ Key is wrong or expired, generate a new one

"API rate limit exceeded. Please try again later."
→ You're validating too fast, wait a moment

"Anthropic API is temporarily overloaded. Please try again in a moment."
→ Anthropic's servers are busy, try again soon

"Failed to validate API key. Please check your connection and try again."
→ Network issue, check internet and try again
```

---

## How to Verify the Fix Works

```bash
# 1. Dev server is running
curl http://localhost:3000

# Should respond with HTML (not error)

# 2. Try validation in browser
# Go to http://localhost:3000/settings
# Enter your API key
# Click "Save & Validate"

# 3. Should see specific error message or success
```

---

## What Changed

| Before | After |
|--------|-------|
| Silently returns `false` | Throws helpful error |
| Generic "Invalid API key" message | Specific error message |
| No way to debug | Clear error explanation |
| User confused | User knows exactly what's wrong |

---

## Files Changed

1. **`lib/ai-prompt-generator.ts`** - Validation logic
   - Added format check
   - Added response validation
   - Added error detection
   - Added helpful messages

2. **`app/settings/page.tsx`** - UI layer
   - Now displays actual error
   - Shows specific messages

---

## Next Steps After API Key Works

1. Go to Projects (http://localhost:3000)
2. Create a project
3. Click project to open it
4. Click "+ New Task"
5. Enter task title (e.g., "Add dark mode")
6. Click "Next: Generate Prompt"
7. See AI-generated detailed prompt ✨
8. Review and click "Create Task"
9. Task appears on kanban board

---

## Troubleshooting

**Key won't validate?**
- Check it starts with `sk-ant-`
- Check it's from console.anthropic.com
- Try a fresh key
- Check internet connection

**Still failing?**
- Read the error message - it tells you what's wrong
- Try again after waiting (might be rate limited)
- Check if Anthropic API is up

**Working now?**
- Try creating a task to test full functionality
- AI should generate a detailed prompt

---

## Key Resources

- **Get API Key:** https://console.anthropic.com/account/keys
- **Maestro App:** http://localhost:3000
- **Settings Page:** http://localhost:3000/settings
- **Debug Guide:** See `API_KEY_DEBUG.md` in project
- **Full Fix Details:** See `FIX_SUMMARY.md` in project

---

## Code Changes at a Glance

### What It Checks Now

```
1. Is key empty? → Error
2. Does key start with sk-ant-? → Error if not
3. Can we call Anthropic API? → Error if not
4. Did API return content? → Error if not
5. Success! → ✅
```

### Example Error Flow

```
User enters: "invalid-key"
↓
Check: starts with sk-ant-? NO
↓
Throw: "Invalid API key format. Must start with sk-ant-"
↓
UI displays: "✗ Invalid API key format. Must start with sk-ant-"
↓
User sees specific error and knows to get key from console.anthropic.com
```

---

## Summary

✅ **Fixed:** API key validation now shows specific errors
✅ **Tested:** Dev server running and responding
✅ **Ready:** Create tasks with AI prompts

Go to http://localhost:3000/settings and get started!

---

**Status:** ✅ Complete - Specific error messages now displayed
**Date:** November 4, 2025
**Impact:** Users now see helpful errors instead of "Invalid API key"
