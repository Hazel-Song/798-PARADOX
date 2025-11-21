# 798 Art District Interactive System - Project Documentation

## Project Overview

This is an interactive, AI-powered visualization system documenting the history and sociopolitical dynamics of the 798 Art District in Beijing. The application is a Next.js-based interactive timeline that simulates the interaction between artists, government authorities, and the evolving urban landscape across four historical periods (1995-2017).

**Project Type:** Full-stack Next.js React Application with TypeScript
**Version:** 0.1.0
**Status:** Active Development (Last commit: Nov 20, 2025 - Pink ripple animations for protest tags)

## Technology Stack

### Core Framework & Runtime
- **Next.js 15.5.2** - React meta-framework with App Router
- **React 19.1.0** - UI library with latest hooks
- **TypeScript 5.x** - Type-safe development
- **Node.js** - Runtime environment

### UI & Styling
- **Tailwind CSS 4** with @tailwindcss/postcss
- **Framer Motion 12.23.12** - Advanced animations and transitions
- **GSAP 3.13.0** - Professional animation library
- **Lucide React 0.543.0** - Icon library

### 3D & Canvas
- **Three.js 0.180.0** - 3D WebGL rendering
- **@react-three/fiber 9.3.0** - React renderer for Three.js
- **@react-three/drei 10.7.5** - Useful abstractions for Three.js
- **p5 2.0.5** - Creative coding library (for canvas interactions)

### AI & Backend Integration
- **OpenAI API 5.20.0** - GPT models for artistic evaluation prompts
- **Supabase JS 2.57.4** - Backend database and auth (prepared for future use)

### Development Tools
- **ESLint 9** with Next.js config
- **Turbopack** - Next.js build acceleration (enabled in dev & build)

## Build & Development Commands

```bash
# Development server with Turbopack
npm run dev          # Starts dev server on http://localhost:3000

# Production build
npm run build         # Builds optimized production bundle with Turbopack

# Production server
npm run start         # Runs production server

# Linting
npm run lint          # Runs ESLint on codebase
```

## Project Structure

```
src/
├── app/                           # Next.js App Router
│   ├── page.tsx                   # Root page (redirects to /homepage)
│   ├── layout.tsx                 # Root layout with fonts & metadata
│   ├── globals.css                # Global styles (Tailwind imports)
│   ├── homepage/                  # Landing page with image distortion
│   │   └── page.tsx               # Intro page with glitch effects
│   ├── proceeding/                # Main interactive experience
│   │   └── page.tsx               # Routes to MapLayout
│   ├── config/                    # Configuration page
│   │   └── page.tsx
│   └── api/                       # API routes
│       ├── generate-text/route.ts # OpenAI text generation endpoint
│       └── generate-image/route.ts# Image generation endpoint
│
├── components/                    # React components
│   ├── ui/                        # 22 reusable UI components
│   │   ├── MapLayout.tsx          # Main interactive map container (1300+ lines)
│   │   ├── WanderingCharacter.tsx # Artist character movement & AI evaluation
│   │   ├── WanderingGovernment.tsx# Government agent simulation
│   │   ├── CommentTags.tsx        # Floating evaluation tags with animations
│   │   ├── StudioCircles.tsx      # Studio area visualization (12x8 grid)
│   │   ├── GridOverlay.tsx        # Grid display with labels
│   │   ├── Timeline.tsx           # Period selector & progression
│   │   ├── PeriodInfoPanel.tsx    # Historical period descriptions
│   │   ├── RolePanel.tsx          # Role descriptions for current period
│   │   ├── GridCursor.tsx         # Interactive cursor system
│   │   ├── InputInteractionSystem.tsx # Government input interface
│   │   ├── EvaluationPopup.tsx    # Pop-up evaluation display
│   │   ├── DebugPanel.tsx         # Development debugging interface
│   │   ├── ConfirmDialog.tsx      # Modal confirmation dialogs
│   │   ├── DistortedImage.tsx     # Image distortion effects
│   │   ├── LetterGlitch.tsx       # Text glitch animations
│   │   ├── SimpleArtistDot.tsx    # Artist position indicator
│   │   ├── PolygonOverlay.tsx     # Geometric overlays
│   │   ├── BackgroundGrid.tsx     # Background grid pattern
│   │   ├── GridRenderer.tsx       # Grid rendering utilities
│   │   └── P5Wrapper.tsx          # p5.js wrapper component
│   ├── p5/                        # p5.js specific components
│   │   └── P5Wrapper.tsx
│   └── three/                     # Three.js components
│       └── Scene.tsx              # 3D scene setup
│
├── lib/                           # Core business logic & utilities
│   ├── ai/
│   │   └── AIEvaluationService.ts # LLM-based evaluation queue system
│   ├── api/
│   │   ├── openai.ts              # OpenAI API wrapper
│   │   └── fal.ts                 # Image generation API wrapper
│   ├── character/
│   │   ├── TrajectorySystem.ts    # Character movement & path planning
│   │   └── CharacterRenderer.ts   # Character visualization
│   ├── map-grid/
│   │   ├── GridSystem.ts          # 12x8 grid management & keyword assignment
│   │   └── GridRenderer.ts        # Grid visualization utilities
│   ├── supabase/
│   │   └── client.ts              # Supabase client configuration
│   └── data/
│       └── timelineData.ts        # Historical period data & role definitions
│
├── types/                         # TypeScript type definitions
│   ├── index.ts                   # Main type exports
│   ├── character.ts               # Character, trajectory, personality types
│   ├── map-grid.ts                # Grid cell, location category types
│   ├── periodSnapshot.ts          # State snapshot for time travel feature
│
├── hooks/                         # React hooks
│   └── useAIEvaluation.ts         # AI evaluation hook
│
└── public/                        # Static assets
    ├── assets/
    │   └── images/                # Background images & artwork
    ├── backgrounds/               # UI background images
    ├── maps/                      # Base map image (798-base-map.png)
    └── favicon.ico
```

## Key Architectural Patterns

### 1. State Management
- **React Context + Hooks** for global state (MapLayout manages most state)
- **Refs** for imperative control (WanderingCharacter, WanderingGovernment, StudioCircles)
- **Custom state snapshots** for time-travel feature (period-based state restoration)

### 2. Grid System Architecture
- **12x8 fixed grid** representing the 798 Art District spatial layout
- **Dynamic scaling** - adapts to viewport while maintaining 4:3 aspect ratio
- **Grid-to-Screen conversion** - maps grid coordinates to pixel coordinates
- **Keyword database** - location-based keywords for AI evaluation context
- **Tag counting** - tracks comment tags per grid cell for studio emergence

### 3. Character Movement System
- **TrajectorySystem class** - manages character paths, speed, and trajectory points
- **Personality-based AI** - artists have different evaluation styles
- **Restricted zones** - artists avoid passed/evaluating studio areas (government zones)
- **Lazy trajectory generation** - creates paths as needed for performance

### 4. AI Evaluation Pipeline
- **AIEvaluationService** - queued request processor (2s rate limit)
- **LLM integration** - OpenAI API for artistic/cultural evaluations
- **Context-aware prompts** - uses grid keywords and artist personality
- **Queue-based processing** - prevents API rate limit issues
- **Confidence scoring** - evaluates reliability of each assessment

### 5. Dynamic Environment Simulation
- **Four historical periods** (1995-2002, 2002-2006, 2006-2010, 2010-2017)
- **Progressive unlocking** - periods unlock based on game state
- **State snapshots** - save/restore period data for backward time travel
- **Role-based simulation** - Artist, Government, Visitor agents

### 6. Interactive Systems
- **Comment tags** - floating evaluations with glitch/ripple animations
- **Studio emergence** - 2+ tags in same grid cell → studio circle
- **Government evaluation** - demolish or pass studio areas
- **Public opinion heat** - tracks government pressure/intervention level
- **Government input** - user-controlled government decision prompts

## Configuration Files

### TypeScript Configuration (`tsconfig.json`)
- Target: ES2017
- Strict mode enabled
- Path alias: `@/*` -> `./src/*`
- Isolated modules: true
- Next.js plugin enabled

### Tailwind Configuration (`postcss.config.mjs`)
- Uses @tailwindcss/postcss v4
- Minimal configuration (plugin-based)

### Next.js Configuration (`next.config.ts`)
- Currently empty (default configuration)
- Can be extended for custom rules

### ESLint Configuration (`eslint.config.mjs`)
- Extends Next.js core-web-vitals
- Extends Next.js/TypeScript config
- Ignores: node_modules, .next, out, build, next-env.d.ts

## Environment Variables

Required environment variables (see `.env.example`):

```env
# Supabase (for database/auth - prepared for future use)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# OpenAI (required for artist evaluation AI)
OPENAI_API_KEY=your_openai_api_key_here

# Image Generation (optional)
STABILITY_API_KEY=your_stability_api_key_here
REPLICATE_API_TOKEN=your_replicate_token_here
```

## Core Type Definitions

### Character System
- **Character** - Individual artist with position, trajectory, personality
- **ArtistPersonality** - Background, style, critique perspective
- **TrajectoryPoint** - Path waypoints with optional wait times
- **LocationEvaluation** - Assessment of a grid location

### Grid System
- **MapGrid** - 12x8 grid structure with cells
- **GridCell** - Individual cell with keywords, category, neighbors
- **LocationCategory** - Type (studio, gallery, commercial, etc.)
- **Position** - Screen (x,y) + grid (gridX, gridY) coordinates

### Game State
- **CommentTag** - Floating evaluation with position, content, keywords
- **StudioCircle** - Visualized studio area with evaluation result
- **PeriodSnapshot** - State snapshot for time-travel (tags, circles, artists, vitality)
- **RestrictedZone** - No-go areas for artist movement

## Recent Development History

- **4120f5c** (Nov 20) - Implement pink ripple animations for protest tags
- **f95bb62** - Fix infinite loop errors in React components
- **d200218** - Implement artist movement restrictions for government zones
- **eb4069e** - Implement government input interaction system
- **ccda0a4** - Implement comprehensive 798 interactive system with time travel
- **348af4c** - Initial project setup

## Data Structure: Timeline

The system simulates 4 historical periods with role-based gameplay:

### Period 1: Silence and Reconstruction (1995-2002)
- **Artists**: Transform abandoned ruins into studios
- **Mechanics**: Generate evaluations, create comment tags, form studios (2+ tags)
- **Goal**: Accumulate 50+ evaluation tags to trigger period transition
- **Auto-transition**: When `commentTags.length >= 50`, automatically transitions to Period 2

### Period 2: Confrontation and Naming (2002-2006)
- **Artists**: Strategic creation (festivals, exhibitions)
- **Government**: Evaluates studios, demolishes or approves
- **Mechanics**: Government agents move and evaluate studio circles
- **Features**: Public opinion heat tracking, input system for government rules
- **Auto-transition**: When `publicOpinionHeat >= 20`, automatically transitions to Period 3

### Period 3: Illusion of Freedom (2006-2010)
- **Artists**: Create while facing commercialization
- **Government**: Selective display, controlled freedom
- **Visitors**: Appear as consumption forces
- **Mechanics**: Same core systems with modified behaviors
- **Auto-transition**: When `publicOpinionHeat >= 50`, automatically transitions to Period 4

### Period 4: Migration and Circulation (2010-2017)
- **Artists**: Move to periphery, face erasure
- **Government**: Expanded control, system replication
- **Mechanics**: Final period with wind-down mechanics

### Period Transition Logic (MapLayout.tsx)

**Implementation Location:** `src/components/ui/MapLayout.tsx` (lines ~441-478)

Three useEffect hooks monitor different metrics and trigger automatic period transitions:

1. **Period 1 → Period 2** (Area Vitality threshold)
   - Monitors: `commentTags.length`
   - Condition: `commentTags.length >= 50 && currentPeriodId === 'period-1'`
   - Actions:
     - Saves current period snapshot
     - Sets `currentPeriodId` to `'period-2'`
     - Unlocks period-2 (`setMaxUnlockedPeriodIndex(1)`)
     - Activates government role
   - Console log: `🚀 Auto-transitioning to next period! Area vitality (comment tags): X`

2. **Period 2 → Period 3** (Public Opinion Heat threshold)
   - Monitors: `publicOpinionHeat`
   - Condition: `publicOpinionHeat >= 20 && currentPeriodId === 'period-2'`
   - Actions:
     - Saves current period snapshot
     - Sets `currentPeriodId` to `'period-3'`
     - Unlocks period-3 (`setMaxUnlockedPeriodIndex(2)`)
   - Console log: `🚀 Auto-transitioning from period2 to period3! Public Opinion Heat: X`

3. **Period 3 → Period 4** (Public Opinion Heat threshold)
   - Monitors: `publicOpinionHeat`
   - Condition: `publicOpinionHeat >= 50 && currentPeriodId === 'period-3'`
   - Actions:
     - Saves current period snapshot
     - Sets `currentPeriodId` to `'period-4'`
     - Unlocks period-4 (`setMaxUnlockedPeriodIndex(3)`)
   - Console log: `🚀 Auto-transitioning from period3 to period4! Public Opinion Heat: X`

## Key Features & Systems

### 1. Homepage (Landing Page)
- Glitch text animation ("THE 798 PARADOX")
- Distorted image backgrounds with random positioning
- Click-to-refresh image arrangement
- Smooth transition to main experience

### 2. Interactive Map System
- Responsive 12x8 grid overlay on base map image
- Real-time artist position tracking
- Studio area visualization with colored circles
- Grid-based keyword assignment
- Comment tag rendering with animations

### 3. Artist Agent System
- Autonomous movement with trajectory planning
- Personality-driven evaluation generation via LLM
- Periodic evaluation triggers (every 5 seconds default)
- Movement speed and direction control
- Restricted zone avoidance

### 4. Government Agent System
- Autonomous studio evaluation
- Demolish vs. Pass decision making
- Public opinion heat tracking
- User-influenced input system
- Animation feedback for actions

### 5. Comment Tag System
- Floating tags with sight/thought content
- Glitch animation effects
- Pink ripple animation for protest tags
- Auto-cleanup of expired tags
- Grid-cell-based positioning

### 6. Studio Emergence Mechanic
- Tracks tags per grid cell
- Creates studio circles at 2+ tags
- Studio circles support government evaluation
- Different evaluation states (evaluating, passed, demolished)

### 7. Time Travel System
- Save state snapshots per period
- Backward travel requires confirmation
- Restores all period data on travel
- Forward progression auto-saves

### 8. Responsive Layout
- 2/3 left panel for map
- 1/3 right panel for info
- Period info display
- Role descriptions
- Debug panel (development mode)

## Component Communication Flow

```
MapLayout (State Hub)
├── Timeline → handlePeriodChange()
├── WanderingCharacter → onCharacterUpdate(), onAIEvaluation()
├── WanderingGovernment → onStudioEvaluation(), onAnimationComplete()
├── CommentTags ← commentTags[] state
├── StudioCircles ← studioAreas state, → onStudioEvaluation()
├── GridCursor ← character state
├── InputInteractionSystem → handleInputSubmit()
└── DebugPanel ← debugData state
```

## Important Development Notes

### Canvas Dimension Synchronization
- GridSystem stores both grid dimensions and canvas pixel dimensions
- TrajectorySystem syncs canvas dimensions on initialization
- WanderingCharacter updates canvas dimensions on period change
- ResizeObserver updates MapLayout dimensions responsively

### AI Evaluation Queue
- AIEvaluationService maintains request queue to avoid API flooding
- 2-second delay between requests (configurable)
- Handles concurrent requests gracefully
- Missing API key falls back to placeholder evaluations

### Restricted Zones (2002-2006+ only)
- Passed studio circles become restricted zones (artists cannot enter)
- Government evaluation zones also restricted temporarily
- 1000ms refresh interval for zone calculations
- Prevents artist overlap with evaluation areas

### Comment Tag Lifecycle
1. **Pending** (created) - "Observing...", "Thinking..." placeholder
2. **Completed** (after AI evaluation) - Real sight/thought content
3. **Protest** (in passed zones) - Marked for pink ripple animation
4. **Cleanup** - Auto-removed after 15 seconds if unresolved

### Performance Optimizations
- Turbopack enabled for faster builds
- Canvas rendering with requestAnimationFrame
- Lazy trajectory generation
- Tag count tracking via Map structure
- Ref-based communication for imperative operations

## Styling Approach

- **Tailwind CSS v4** for utility-first styling
- **CSS Grid & Flexbox** for layouts
- **Framer Motion** for React component animations
- **Canvas/WebGL** for map and 3D effects
- **Custom CSS classes** for grid slider styling

## Next Steps for Development

1. **Enhance period mechanics** - Fine-tune artist/government behavior
2. **Add more AI personalities** - Multiple artist types with different styles
3. **Expand visitor mechanics** - More complex tourism simulation
4. **Optimize performance** - Canvas rendering for many tags
5. **Add user persistence** - Save game progress to Supabase
6. **Implement sound design** - Audio feedback for interactions
7. **Expand visualization** - 3D map view with Three.js
8. **Localization** - Support multiple languages

## Debugging & Development

### Available Debug Tools
- Console logging (detailed throughout components)
- Debug Panel (toggle in MapLayout)
- Visual grid overlay (can be toggled)
- Manual evaluation triggers
- Trajectory regeneration controls
- Speed adjustment controls

### Common Debug Commands in Browser Console
```js
// Access grid system (from refs)
// Check character position
// Monitor tag creation
console.log('Debug info available via MapLayout state')
```

## Common Issues & Solutions

### Canvas Dimension Mismatch
- **Symptom**: Characters appear offset from grid
- **Solution**: Check GridSystem initialization and canvas sync in TrajectorySystem

### AI Evaluations Not Appearing
- **Symptom**: Comment tags remain "Observing..." indefinitely
- **Solution**: Verify OPENAI_API_KEY env var, check AIEvaluationService queue

### Studio Circles Not Forming
- **Symptom**: 2+ tags don't create circles
- **Solution**: Verify tags in same grid cell, check StudioCircles.tsx emergence logic

### Government Not Moving
- **Symptom**: Government agent static
- **Solution**: Check isGovernmentActive state, verify period is 2 or later

## File Naming Conventions

- **Components**: PascalCase (MapLayout.tsx)
- **Utilities/Services**: camelCase with Class for services (AIEvaluationService.ts)
- **Types**: camelCase with Interface prefix (character.ts, map-grid.ts)
- **Hooks**: camelCase with 'use' prefix (useAIEvaluation.ts)

## Code Style Guidelines

- TypeScript strict mode enforced
- React functional components with hooks
- Comments for complex logic
- Console logging for debugging (prefixed with emoji)
- Utility-first Tailwind styling
- Ref-based imperative control where needed

---

**Last Updated:** November 21, 2025
**Maintainer:** Development Team
**License:** (Specify your license here)
