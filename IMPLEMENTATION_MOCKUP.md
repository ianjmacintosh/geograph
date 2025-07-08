# Mobile Persistent Game Info - Implementation Mockup

## Overview
This implementation addresses Issue #4: "Ensure everything important stays in the window" by creating a persistent, compact header that displays all critical game information on mobile devices.

## Current Problem
- On mobile devices, important game information can scroll off screen
- Players may lose track of time remaining, target location, and scores
- Game state information is scattered across different UI sections

## Proposed Solution: Sticky Mobile Header

### Design Layout
```
┌─────────────────────────────────────────────────────────────┐
│ FIND: Paris, France                    5.08s remaining     │
│ ─────────────────────────────────────────────────────────── │
│ ROUND 3        Score: 18        LEADER: Aline (20)         │
└─────────────────────────────────────────────────────────────┘
│                                                             │
│                     MAP AREA                                │
│                                                             │
```

### Mobile Breakpoints
- **Small phones (< 380px)**: Ultra-compact layout with abbreviations
- **Standard mobile (380px - 640px)**: Compact two-line layout 
- **Tablet (640px+)**: Enhanced layout with more detail
- **Desktop (1024px+)**: Existing desktop layout unchanged

### Header Components

#### Top Row
- **Left**: Target location ("FIND: Paris, France")
- **Right**: Timer with visual urgency indicators (red when < 10s)

#### Bottom Row  
- **Left**: Round indicator ("ROUND 3")
- **Center**: Current player score ("Score: 18")
- **Right**: Leader information ("LEADER: Aline (20)")

### Technical Implementation

#### Positioning
- `position: sticky` with `top: 0`
- High z-index to stay above map content
- Safe area insets for devices with notches
- Backdrop blur for visual separation

#### Responsive Behavior
```css
/* Ultra-compact for very small screens */
@media (max-width: 380px) {
  /* Single line with icons and short text */
}

/* Standard mobile */
@media (min-width: 381px) and (max-width: 640px) {
  /* Two-line compact layout as shown in mockup */
}

/* Tablet and up */
@media (min-width: 641px) {
  /* More spacious layout with full text */
}
```

#### Visual Urgency Indicators
- Timer turns red when < 10 seconds
- Subtle animations for time running out
- Color-coded status indicators

### Data Requirements
The header will need access to:
- `currentRound.city.name` and `currentRound.city.country`
- `timeLeft` state
- Current round number and total rounds
- Player's current total score
- Leader's name and score
- Game phase (playing, results, etc.)

### Accessibility Features
- High contrast text for readability
- Touch-friendly minimum sizes (44px)
- Screen reader friendly labels
- Reduced motion support

### Performance Considerations
- Memoized components to prevent unnecessary re-renders
- Efficient timer updates (1-second intervals)
- Minimal DOM manipulation

## Files to Modify
1. `app/routes/game.tsx` - Add persistent header component
2. `app/components/PersistentGameHeader.tsx` - New component (to be created)
3. `app/app.css` - Add mobile-specific styles

## Testing Strategy
- Test on various mobile device sizes
- Verify sticky positioning works across browsers
- Ensure information remains readable in all game states
- Test with very long city/country names

This implementation ensures that players always have access to the most critical game information without having to scroll, addressing the core requirement of Issue #4.