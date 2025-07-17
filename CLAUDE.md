# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Geograph is a multiplayer geography guessing game where friends can test their geography knowledge by identifying cities on a map without country labels. Built with React Router 7, TypeScript, and TailwindCSS.

## Development Commands

### Essential Commands

- `npm run dev` - Start development server with HMR at http://localhost:5173
- `npm run build` - Create production build
- `npm run start` - Start production server from build
- `npm run typecheck` - Run TypeScript type checking and generate types

### Testing and Quality

- No test framework configured yet - check with user before adding tests
- TypeScript checking available via `npm run typecheck`
- ALWAYS run linters, formatters, and tests before preparing to commit changes:
  - npm run format
  - npm run lint:fix
  - npm run test
  - npm run test:e2e
  - npm run typecheck
- While linting, also perform type checks (tsc)

## Architecture Overview

### React Router 7 Structure

- **File-based routing**: Routes defined in `app/routes.ts` and `app/routes/` directory
- **Server-side rendering**: Enabled by default via `react-router.config.ts`
- **Full-stack capable**: Can handle both client and server logic

### Key Directories

- `app/` - Main application code
- `app/routes/` - Route components and logic
- `app/routes.ts` - Route configuration
- `public/` - Static assets
- `build/` - Production build output (client/ and server/)

### Technology Stack

- **Frontend**: React 19, TypeScript, TailwindCSS
- **Routing**: React Router 7 (file-based, SSR-enabled)
- **Build**: Vite with React Router dev tools
- **Styling**: TailwindCSS v4 (configured via @tailwindcss/vite)

## Game-Specific Context

This is a geography guessing game that will need:

- Interactive map component (likely canvas or SVG-based)
- City/location data management
- Multiplayer session handling
- Scoring and game state management
- Real-time updates for multiplayer functionality

## Development Notes

### React Router 7 Patterns

- Routes use file-based routing system
- Each route exports default component and can export loader/action functions
- SSR is enabled - consider data loading patterns for map data
- Use `app/routes.ts` to define route structure

### State Management

- No global state management configured yet
- Consider React Context or external library for game state
- Multiplayer will likely need WebSocket or similar for real-time updates

### Styling

- TailwindCSS v4 already configured
- Custom CSS in `app/app.css`
- Use Tailwind utility classes for rapid development

## Docker Support

- Dockerfile included for containerized deployment
- Supports deployment to various cloud platforms
- Production build serves from `build/server/index.js`
