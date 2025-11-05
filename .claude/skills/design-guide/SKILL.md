---
name: design-guide
description: Modern UI design principles for building clean, professional interfaces. Use when creating any UI component, interface element, web page, dashboard, form, button, card, or visual element in HTML, React, or any frontend framework. Ensures consistent, professional design with proper spacing, typography, colors, and interactive states.
---

# Design Guide

This skill provides design principles for building modern, professional user interfaces that are clean, minimal, and easy to use.

## Core Principles

### Clean and Minimal
- Prioritize white space over clutter
- Each element should have breathing room
- Remove unnecessary visual elements
- Let content be the focus

### Color Palette
- **Base**: Use grays (light and dark) and off-whites as the foundation
- **Accent**: Choose ONE accent color and use it sparingly for:
  - Primary CTAs
  - Active states
  - Important highlights
- **Avoid**: Generic purple/blue gradients, rainbow effects, multiple competing colors

### Spacing System
Use an 8px grid system for all spacing:
- **8px**: Tight spacing (within components)
- **16px**: Standard spacing (between related elements)
- **24px**: Medium spacing (between component groups)
- **32px**: Large spacing (between sections)
- **48px**: Extra large spacing (major section breaks)
- **64px**: Maximum spacing (page-level separation)

### Typography
- **Hierarchy**: Clear distinction between headings, subheadings, and body text
- **Minimum size**: 16px for body text (never smaller)
- **Font limit**: Maximum 2 fonts (one for headings, one for body)
- **Line height**: 1.5-1.75 for body text, 1.2-1.4 for headings
- **Font weight**: Use weight variations (400, 500, 600, 700) instead of color for hierarchy

### Shadows and Depth
- Use subtle shadows, never heavy or overdone
- Standard shadow: `0 1px 3px rgba(0, 0, 0, 0.1)`
- Hover shadow: `0 4px 6px rgba(0, 0, 0, 0.1)`
- Card shadow: `0 2px 4px rgba(0, 0, 0, 0.08)`
- Avoid multiple shadows on the same element

### Borders and Corners
- Rounded corners: Use consistently but selectively
  - Buttons: 6-8px border radius
  - Cards: 8-12px border radius
  - Inputs: 6-8px border radius
- Not everything needs to be rounded
- Border colors: Use subtle grays (e.g., `#e5e7eb`)

### Interactive States
Always define clear states for interactive elements:
- **Default**: Base appearance
- **Hover**: Subtle change (slight shadow, background shift)
- **Active/Pressed**: Visible feedback (darker, slightly scaled)
- **Disabled**: Reduced opacity (50-60%), no cursor interaction
- **Focus**: Visible outline for keyboard navigation

### Mobile-First Thinking
- Design for mobile screens first
- Scale up to larger screens
- Touch targets minimum 44x44px
- Ensure spacing works on small screens

## Component Guidelines

### Buttons
**Good:**
```
- Subtle shadow (0 1px 3px rgba(0,0,0,0.1))
- Proper padding (12px 24px for medium, 8px 16px for small)
- Clear hover state (slight shadow increase)
- No gradients
- Border radius: 6-8px
```

**Bad:**
```
- Heavy shadows
- Gradient backgrounds
- Inconsistent padding
- No hover feedback
```

### Cards
**Good:**
```
- Clean border (1px solid #e5e7eb) OR subtle shadow
- Never both border and shadow
- Padding: 24px or 32px
- Border radius: 8-12px
- White or off-white background
```

**Bad:**
```
- Both border and shadow
- Inconsistent padding
- Too many colors
- Overcomplicated structure
```

### Forms
**Good:**
```
- Clear labels above inputs
- Consistent spacing between fields (16-24px)
- Visible error states (red text, red border)
- Proper input height (44px minimum)
- Clear focus states
- Helpful error messages
```

**Bad:**
```
- Labels inside inputs (placeholder as label)
- Tiny text
- Inconsistent field spacing
- Unclear error states
- No focus indicators
```

### Layout Patterns
**Good:**
```
- Consistent grid system (12-column or flexbox)
- Maximum content width (1200-1400px)
- Proper margins and padding
- Responsive breakpoints at 640px, 768px, 1024px, 1280px
```

**Bad:**
```
- No max width (content stretches too wide)
- Inconsistent spacing
- No responsive behavior
- Breaking on small screens
```

## Common Mistakes to Avoid

1. **Rainbow gradients everywhere** - Use solid colors
2. **Tiny unreadable text** - Minimum 16px for body text
3. **Inconsistent spacing** - Stick to 8px grid
4. **Every element is a different color** - Limit color palette
5. **Heavy shadows on everything** - Use subtle shadows sparingly
6. **No interactive states** - Always show hover/active/disabled
7. **Cluttered interfaces** - Embrace white space
8. **Too many fonts** - Maximum 2 font families

## Implementation Checklist

Before finalizing any UI component:
- [ ] Spacing follows 8px grid system
- [ ] Typography is readable (16px+ body text)
- [ ] Only one accent color used
- [ ] Interactive states defined (hover, active, disabled)
- [ ] Shadows are subtle, not heavy
- [ ] Mobile-responsive (works on 375px width)
- [ ] Color contrast meets accessibility standards (4.5:1 for text)
- [ ] Touch targets are 44x44px minimum

## Quick Reference

**Spacing Scale**: 8, 16, 24, 32, 48, 64px
**Border Radius**: 6-8px (buttons), 8-12px (cards)
**Shadow**: `0 1px 3px rgba(0,0,0,0.1)` (default), `0 4px 6px rgba(0,0,0,0.1)` (hover)
**Min Text Size**: 16px
**Touch Target**: 44x44px minimum
**Max Fonts**: 2
**Accent Colors**: 1
