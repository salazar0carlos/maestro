---
name: roadmap-builder
description: Product roadmap decision-making framework for solo founders and small teams. Use when evaluating feature ideas, deciding what to build next, prioritizing the product roadmap, or challenging whether a feature should be built. Applies Impact vs Effort analysis, stage-based rules (pre-launch vs post-launch), and ruthless prioritization to prevent feature creep and keep focus on core value delivery.
---

# Roadmap Builder

Framework for deciding what to build next. Prevents feature creep, premature optimization, and building for imaginary users.

## Prioritization Matrix

Evaluate every feature using Impact vs Effort:

**Impact** = How much does this move core metrics (retention, revenue, core usage)?
**Effort** = Time to ship a working version (not perfect, just working)

Build in this order:
1. High Impact, Low Effort (Quick wins)
2. High Impact, High Effort (Strategic bets - only if validated)
3. Low Impact, Low Effort (Maybe, if bored)
4. Low Impact, High Effort (Never build)

## Category Priority Order

When deciding between features, respect this hierarchy:

1. **Retention** - Keeps users coming back, reduces churn
2. **Core Features** - Makes the core use case work better
3. **Monetization** - Enables or improves revenue generation
4. **Growth** - Brings new users in

If a feature doesn't fit these categories, it's probably not important.

## Stage-Based Rules

### Pre-Launch (No Users Yet)

**ONLY build:**
- Core loop features that prove the value prop
- Minimum viable version of the main use case
- Authentication if required for the product to function

**DO NOT build:**
- Settings pages
- Profile customization
- Social features
- Analytics dashboards
- "Nice to have" features
- Admin panels (unless you're the admin)

**Test:** Can a user complete the core action in under 2 minutes?

### Post-Launch (Users Exist)

**ONLY build:**
- Features users explicitly request (multiple times)
- Fixes for broken core functionality
- Features that remove friction from the core loop

**DO NOT build:**
- Features only one person asked for
- Features users "might" want
- Features that sound cool but solve no real problem

**Test:** Have at least 3 users asked for this in the last 30 days?

### Growth Phase (Traction Exists)

**Build features that:**
- Reduce churn (people leaving because X is missing)
- Increase sharing (users inviting others)
- Remove blockers to expansion (upsell/cross-sell)

**Test:** Will this feature increase Day 7 or Day 30 retention by >10%?

## Three Critical Questions

Ask these about EVERY feature before building:

### 1. Does this serve the core use case?

If the answer is no, don't build it. Period.

**Core use case** = The single most important thing users come to your product to do.

### 2. Will users actually use this, or just say they want it?

Users are terrible at predicting their own behavior. They'll say "yes, I'd use that" to be polite, then never touch it.

**Reality check:**
- How often would they use it? (Daily? Weekly? Once?)
- Is this solving a real pain point or a theoretical one?
- Would they pay for this feature specifically?

### 3. Can we fake it first to validate demand?

Before building, test demand with:
- Manual processes (Concierge MVP)
- Smoke tests (button that doesn't work yet, measure clicks)
- Landing page validation (describe it, track signups)
- Wizard of Oz (fake automation, do it manually)

If nobody clicks the fake button, nobody will use the real feature.

## Red Flags - Do Not Build If

- **Feature Creep**: "It would be cool if..." or "What if we also..."
- **Premature Optimization**: Obsessing over performance, scale, or edge cases before you have real users
- **Imaginary Users**: Building for a persona you made up instead of actual users with actual problems
- **Competitor Mimicry**: "Competitor X has this feature" (they might be wrong too)
- **Scope Inflation**: Simple feature morphs into complex system during planning
- **Vanity Features**: Features that impress other founders but don't serve users
- **"Future-Proofing"**: Building infrastructure for scale you don't have yet

## Decision Process

When evaluating a feature idea:

1. **Name the stage** - Pre-launch, Post-launch, or Growth phase
2. **Apply stage rules** - Does this feature fit the stage rules? If no, reject.
3. **Score Impact vs Effort** - High/Low on both axes, plot on matrix
4. **Check category** - Which category (Retention/Core/Monetization/Growth)?
5. **Ask three questions** - Core use case? Real usage? Fake it first?
6. **Scan red flags** - Any red flags present? If yes, challenge hard.
7. **Decide** - Build now, build later, or never build

Default answer is "No" or "Later" unless there's overwhelming evidence to build now.

## Output Format

When advising on roadmap decisions, structure response as:

**Feature:** [Name]
**Stage:** [Pre-launch/Post-launch/Growth]
**Impact:** [High/Low] - [Why]
**Effort:** [High/Low] - [Why]
**Category:** [Retention/Core/Monetization/Growth]
**Verdict:** [Build Now/Build Later/Don't Build]
**Reasoning:** [1-2 sentences]
**Alternative:** [If rejecting, suggest what to build instead]

Be direct. If something is feature creep, say it. Protect the founder's time by rejecting weak ideas confidently.
