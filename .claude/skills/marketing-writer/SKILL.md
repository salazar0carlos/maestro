---
name: marketing-writer
description: Write marketing content for product features and launches in Carlos's brand voice. Use when Carlos ships features, needs marketing copy, wants to announce updates, or requests landing page content, tweet threads, or launch emails. Automatically reads codebase context to understand the product, features, and value proposition without requiring manual explanation. Applies casual, direct, no-bullshit voice with focus on real benefits.
---

# Marketing Writer

## Overview

Generate marketing content for product features and launches that matches Carlos's brand voice: casual, direct, no corporate buzzwords, and focused on real benefits. This skill reads codebase context to understand what the product does, then writes landing page sections, tweet threads, and launch emails without requiring manual explanation of features.

## When to Use This Skill

Trigger this skill when:
- Shipping a new feature and need to announce it
- Writing landing page content for a product or feature
- Creating tweet threads about product updates
- Drafting launch emails to users
- Need marketing copy that explains what something does
- Carlos mentions "marketing", "announce", "write copy", or "launch"

## Workflow

### Step 1: Understand the Product Context

**If codebase is available** (files uploaded or in Drive):
1. Read relevant code files to understand:
   - What the product/feature does
   - How it works technically
   - What problems it solves
   - Key user workflows
2. Identify the core value proposition
3. Note any unique differentiators

**If no codebase** (Carlos is describing something new):
1. Ask targeted questions:
   - What does this feature do?
   - What problem does it solve?
   - Who uses it and why?
   - What changes for the user?
2. Get specific examples of the feature in action
3. Understand the before/after state

**Example questions to ask**:
- "What does [feature] actually do for users?"
- "What's the problem this solves?"
- "Walk me through what happens when someone uses this"
- "What was the manual process before this?"

### Step 2: Load Brand Voice Guidelines

Read the brand voice reference to ensure content matches Carlos's style.

```
view references/brand-voice.md
```

Key principles:
- Write like talking to a friend
- No buzzwords (avoid: "leverage", "ecosystem", "innovative", etc.)
- Focus on what actually happens, not hypotheticals
- Simple language a 10th grader would understand
- Show real benefits, not hype

### Step 3: Choose Content Type and Load Template

Based on what Carlos needs, read the appropriate template:

```
view references/templates.md
```

**Content types available**:
- Landing page feature sections (Problem → Solution → Benefit)
- Tweet threads (Hook → Build Credibility → Show Value → CTA)
- Launch emails (Personal → Specific Value → Easy CTA)
- Feature announcements (Short social posts)

### Step 4: Write the Content

Apply the template to the product/feature context:

**For landing page sections**:
1. Write the problem (what sucks now)
2. Write the solution (what the feature does)
3. Write the benefit (what changes for the user)
4. Keep it 3-5 short paragraphs max

**For tweet threads**:
1. Hook: Bold claim or relatable problem
2. Build: Why you/Carlos knows this
3. Value: What solves it, with specifics
4. CTA: What to do next (low friction)
5. Keep it 4-6 tweets max

**For launch emails**:
1. Personal opener about the problem
2. What this solves and how it works
3. Specific benefit for recipient
4. Clear, low-friction CTA
5. Keep it 4-6 short paragraphs max

### Step 5: Apply Voice Check

Before finalizing, verify:
- [ ] Sounds like a real person, not a robot
- [ ] Explains what actually happens (not vague benefits)
- [ ] No corporate buzzwords
- [ ] Someone outside tech would understand it
- [ ] Focuses on what changes for user, not tech coolness

## Examples

### Example 1: Landing Page Feature Section

**Context**: PANTRYiQ has automated inventory tracking feature

**Output**:
```
## Stop Losing Track of Inventory

Right now you're probably juggling spreadsheets, manually counting stock, and hoping you remember to order more before you run out. It's a pain, and it costs you money when you either run out or over-order.

PANTRYiQ automatically tracks everything. Every sale updates your inventory in real-time, and you get alerts before you run low.

You'll always know what you have, what's selling, and what to order. No more guessing, no more surprise stockouts.
```

### Example 2: Tweet Thread for Feature Launch

**Context**: Shipping smart reorder alerts in FlwBx

**Output**:
```
1/ Shipped a feature today that I wish existed when I was running fleet operations.

2/ The problem: You know a tank's running low, but by the time you remember to order a refill, it's too late. Costs you downtime and money.

3/ The fix: FlwBx now predicts when tanks will run empty based on actual usage and warns you with enough time to refill.

4/ Not a vague "low level" alert. It tells you "order fuel by Thursday or this tank runs dry Monday."

5/ One beta customer caught 2 potential shutdowns last week they would've missed.

6/ Live now for all FlwBx users.
```

### Example 3: Launch Email

**Context**: Launching PANTRYiQ to early users

**Output**:
```
Subject: Built something for retail owners who hate spreadsheets

Hey Alex,

If you've ever spent an hour updating inventory counts in a spreadsheet and thought "there has to be a better way," this is for you.

PANTRYiQ is a simple dashboard that automatically tracks your inventory, alerts you before you run out, and creates purchase orders for you. It integrates with your POS and suppliers, so you set it up once and it just works.

I built this because I spent years watching businesses lose money on stockouts and manual tracking. This fixes that.

Try it free for 30 days: [link]

Carlos
```

## Reading Codebase for Context

When Carlos has code uploaded or in Drive:

**For web apps** (React, Next.js, etc.):
1. Read `README.md` or `package.json` for project overview
2. Check `pages/` or `app/` directory for main features
3. Look at component names to understand functionality
4. Read API routes to understand backend capabilities

**For backend systems** (Python, Node, etc.):
1. Read main entry file or routes
2. Check model/schema definitions for data structure
3. Review key functions for core logic
4. Identify integrations and external services

**What to extract**:
- Core functionality (what does it do?)
- User workflows (how do people use it?)
- Problem it solves (why does this exist?)
- Key differentiators (what makes it different?)

**Example search queries for Google Drive**:
- "product requirements" or "PRD"
- "feature spec" or "technical design"
- "roadmap" or "feature list"
- Product name + "documentation"

## Bundled Resources

### references/brand-voice.md
Complete brand voice guidelines with examples of good vs. bad copy, tone checklist, and voice principles. Read this file before writing any content.

### references/templates.md
Detailed templates for all content types: landing pages, tweet threads, launch emails, and social posts. Includes structure, examples, and writing checklists.
