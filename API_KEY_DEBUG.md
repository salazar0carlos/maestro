# Maestro API Key Validation - Debug Guide

## Issue Fixed

The API key validation had a bug where it was silently swallowing errors and returning `false` without any helpful debugging information.

**What was wrong:**
- Validation function caught all errors and returned `false`
- Settings page showed generic "Invalid API key" message
- No way to know if issue was format, authentication, rate limiting, etc.
- Silent failures made debugging impossible

## What Was Fixed

### 1. Enhanced Error Handling in `lib/ai-prompt-generator.ts`

```typescript
export async function validateApiKey(apiKey: string): Promise<boolean> {
  // Now validates format first
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('API key cannot be empty');
  }

  if (!apiKey.startsWith('sk-ant-')) {
    throw new Error('Invalid API key format. Must start with sk-ant-');
  }

  // Makes actual API call
  const tempClient = new Anthropic({ apiKey });
  try {
    const message = await tempClient.messages.create({...});

    // Validates response
    if (!message.content || message.content.length === 0) {
      throw new Error('No response from API');
    }
    return true;
  } catch (error) {
    // Re-throws with helpful context
    const errorMessage = error.message.toLowerCase();
    if (errorMessage.includes('401') || errorMessage.includes('authentication')) {
      throw new Error('Invalid or expired API key. Please check your key at console.anthropic.com');
    }
    if (errorMessage.includes('429')) {
      throw new Error('API rate limit exceeded. Please try again later.');
    }
    if (errorMessage.includes('overloaded')) {
      throw new Error('Anthropic API is temporarily overloaded. Please try again in a moment.');
    }
    throw error; // Re-throw original error for other cases
  }
}
```

### 2. Better Error Display in Settings Page

The Settings page now:
- Displays full error message to user
- Shows specific errors (format, authentication, rate limit, etc.)
- Helps user understand what went wrong

```typescript
const handleValidateApiKey = async () => {
  // ... validation code ...

  try {
    const isValid = await validateApiKey(apiKey);
    // Success case
  } catch (error) {
    // Now displays actual error message
    const errorMessage = error instanceof Error ? error.message : 'Failed to validate API key';
    setMessage(`✗ ${errorMessage}`);
  }
}
```

---

## How to Test the Fix

### Test 1: Empty API Key

1. Go to Settings
2. Leave API Key field empty
3. Click "Save & Validate"
4. **Expected:** Error message "Please enter an API key"

### Test 2: Wrong Format

1. Go to Settings
2. Enter `abc-123` (doesn't start with sk-ant-)
3. Click "Save & Validate"
4. **Expected:** Error message "Invalid API key format. Must start with sk-ant-"

### Test 3: Invalid Key (Wrong Credentials)

1. Go to Settings
2. Enter valid format but wrong key: `sk-ant-invalid1234567890`
3. Click "Save & Validate"
4. **Expected:** Error message "Invalid or expired API key. Please check your key at console.anthropic.com"

### Test 4: Valid Key (Success)

1. Go to Settings
2. Enter your actual Anthropic API key (from https://console.anthropic.com/account/keys)
3. Click "Save & Validate"
4. **Expected:** Success message "✓ API key validated successfully"
5. **Then:** You can create tasks with AI prompt generation

### Test 5: Rate Limiting (if key is being hammered)

1. Validate same key multiple times rapidly
2. **Expected:** Error message "API rate limit exceeded. Please try again later."

### Test 6: API Overload

1. Try validation when Anthropic API is down
2. **Expected:** Error message "Anthropic API is temporarily overloaded. Please try again in a moment."

---

## Troubleshooting

### "Invalid API key format"

**Problem:** Key doesn't start with `sk-ant-`
**Solution:**
- Get key from https://console.anthropic.com/account/keys
- Anthropic keys always start with `sk-ant-`
- Copy the full key, including the prefix

### "Invalid or expired API key"

**Problem:** Key format is correct but credentials are wrong
**Solution:**
1. Go to https://console.anthropic.com/account/keys
2. Verify the key still exists (not deleted)
3. Verify you copied the complete key
4. Check if key has remaining credits/quota
5. Try creating a new key if this one is old

### "API rate limit exceeded"

**Problem:** Too many validation requests in quick succession
**Solution:**
- Wait a few seconds before trying again
- Don't spam the validation button

### "Anthropic API is temporarily overloaded"

**Problem:** Anthropic servers are experiencing issues
**Solution:**
- Wait a few minutes and try again
- Check https://status.anthropic.com for service status
- Try validation at different time

### "Failed to validate API key"

**Problem:** Generic error not matching known patterns
**Solution:**
1. Check browser console (F12) for full error details
2. Check internet connection
3. Try a different API key
4. Check if Anthropic API is accessible from your network

---

## Testing API Key with Curl

You can also test your API key directly using curl:

```bash
# Test if API key works
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: YOUR_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 10,
    "messages": [{"role": "user", "content": "Say OK"}]
  }'
```

**Success Response:** Will return JSON with message content

**401 Error:** Invalid or expired API key

**429 Error:** Rate limited

---

## Browser Console Debugging

1. Open DevTools (F12)
2. Go to Console tab
3. Try to validate API key in Settings
4. Look for any JavaScript errors or network errors
5. Network tab will show:
   - Request to validation endpoint
   - Response from Anthropic API
   - Any error details

---

## Creating Tasks After API Key is Set

Once API key validation succeeds:

1. Navigate to a project
2. Click "+ New Task"
3. Enter title and description
4. Click "Next: Generate Prompt"
5. System will call Anthropic API to generate detailed prompt
6. Wait for prompt generation (shows "✨")
7. Review the generated prompt
8. Click "Create Task"
9. Task appears on kanban board with AI-generated prompt

### If Prompt Generation Fails

- Check API key is still valid
- Check you have remaining API credits
- Check internet connection
- Wait a moment and try again (might be rate limited)

---

## Key Locations in Code

**Validation function:** `/lib/ai-prompt-generator.ts` (line 131-179)
- `validateApiKey()` - Main validation function
- `setApiKey()` - Save key to localStorage
- `getStoredApiKey()` - Retrieve stored key

**Settings page:** `/app/settings/page.tsx` (line 25-55)
- `handleValidateApiKey()` - Handles validation UI

**Prompt generation:** `/lib/ai-prompt-generator.ts` (line 82-122)
- `generateTaskPrompt()` - Generates detailed prompts from titles

---

## Summary of Changes

### Before (Broken)
```typescript
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const message = await tempClient.messages.create({...});
    return message.content.length > 0;
  } catch (error) {
    return false;  // ❌ Silent failure
  }
}
```

### After (Fixed)
```typescript
export async function validateApiKey(apiKey: string): Promise<boolean> {
  // ✅ Validates format first
  if (!apiKey.startsWith('sk-ant-')) {
    throw new Error('Invalid API key format...');
  }

  try {
    const message = await tempClient.messages.create({...});

    // ✅ Validates response
    if (!message.content?.length) {
      throw new Error('No response from API');
    }
    return true;
  } catch (error) {
    // ✅ Throws with helpful context
    if (errorMessage.includes('401')) {
      throw new Error('Invalid or expired API key...');
    }
    // ... more specific error handling
    throw error;
  }
}
```

---

## Next Steps

1. **Get API Key** from https://console.anthropic.com/account/keys
2. **Go to Settings** in Maestro (top right navigation)
3. **Paste API key** into the field
4. **Click "Save & Validate"**
5. **See specific error message** if something is wrong
6. **Create tasks** once key is validated

---

**Fixed by:** API key validation debugging
**Date:** November 4, 2025
**Status:** ✅ Enhanced error handling and user feedback
