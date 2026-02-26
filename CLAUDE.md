# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Suun Terveystalo Marketing Engine — a real-time campaign management platform for dental health services across 40+ clinic branches in Finland. Built with React 18, TypeScript, Vite, and Supabase.

## Commands

```bash
npm run dev        # Start Vite dev server
npm run build      # Production build
npm run lint       # ESLint
npm run preview    # Preview production build
```

No test framework is configured — there are no unit or E2E tests.

## Architecture

### State Management: Singleton Store (`src/lib/store.ts`)

The app uses a **custom singleton store** that lives outside React. This is the most important architectural decision:

- Data persists across route changes — no re-fetching on navigation
- Components subscribe via `useStore()` hook which returns a `StoreSnapshot`
- The store manages: `user`, `branches`, `services`, `campaigns`, `activityLogs`, `videos`, `users`
- `store.initAuth()` initializes auth, `store.loadAllData()` hydrates from Supabase
- React Query (`@tanstack/react-query`) is also available with 5-min stale time and 30-min cache

### Authentication (`src/lib/authContext.tsx`)

- Supabase Auth with PKCE flow
- Session stored in localStorage under key `suun-terveystalo-auth`
- Auto token refresh every 10 minutes
- Four roles: `admin`, `manager`, `partner`, `viewer`

### Routing (`src/App.tsx`)

All page imports are direct (no lazy loading) for instant navigation. Protected routes wrap in `ProtectedLayout` which reads from the global store. Key routes:

- `/campaigns/create` — 7-step campaign creation wizard (service → branch → location → schedule → budget → creative → review)
- `/admin/editor/:templateId?` — Visual WYSIWYG template editor
- `/bidtheatre` — BidTheatre programmatic ad integration
- `/media-screens` — DOOH screen management

### Service Layer (`src/lib/`)

Each domain has a dedicated service file that handles Supabase queries and business logic:

- `campaignService.ts` — Campaign CRUD, status transitions
- `creativeService.ts` — Creative generation, template rendering
- `analyticsService.ts` — Performance metrics, budget tracking
- `branchService.ts` — Branch management, budget allocation
- `aiService.ts` — AI insights and chat
- `bidTheatre.ts` — BidTheatre API integration
- `mediaScreensService.ts` — DOOH screen data
- `googleSheets.ts` — Google Sheets API sync for master feed
- `slackService.ts` — Slack notifications
- `editorService.ts` / `editorActions.ts` — Visual editor state and actions
- `demoService.ts` — Demo mode with sample data

### Visual Template Editor (`src/components/editor/`)

A full WYSIWYG editor for ad creative templates with: `VisualEditor.tsx` (canvas), `ElementRenderer.tsx`, `PropertyInspector.tsx`, `LayersPanel.tsx`, `SelectionOverlay.tsx`, `EditorToolbar.tsx`, `TemplateVariablesManager.tsx`, `AssetManager.tsx`.

### Types (`src/types/index.ts`)

Central type definitions for all domain models: `User`, `Branch`, `Service`, `DentalCampaign`, `Creative`, `CreativeTemplate`, `CampaignAnalytics`, `MediaScreen`, `AIConfig`, etc.

## Deployment

- **Platform:** Netlify
- **Build output:** `dist/`
- **Netlify Functions** (`functions/`):
  - `createBidTheatreCampaign-background` — creates BidTheatre campaigns with Cloudinary asset uploads
  - `updateBidTheatreCampaign-background` — updates existing BidTheatre campaigns
  - `pauseBidTheatreCampaign-background` — pauses BidTheatre campaigns
  - `sync-media-costs-background` — syncs BidTheatre campaign stats to Supabase (scheduled daily at 7 PM)
  - `sync-historical-media-costs-background` — backfills historical BidTheatre stats
  - `syncMediaScreens-background` — syncs DOOH screen data (scheduled daily at 3 AM)
  - `slack-bot` — handles Slack slash commands for campaign management
  - `proxy-json` — CORS-free JSON proxy (also in `netlify/functions/`)
  - `testBidTheatreVideoUpload` — test utility for BidTheatre video uploads
- **Note:** `netlify.toml` still references a legacy `syncApartments-background` schedule from the old kiinteistomaailma system — this function no longer exists

## Legacy References

Some files still contain references from the previous kiinteistomaailma/Norr3 system:
- `vite.config.ts` — `/api/apartments` proxy to `vilpas.kiinteistomaailma.fi` and `Norr3-Marketing-Engine` user agent
- `netlify.toml` — `syncApartments-background` scheduled function (no matching function exists)

These are inactive leftovers and not part of the Terveystalo platform.

## Tech Stack

- **UI:** Radix UI primitives, Lucide icons, react-hot-toast, Chart.js, Leaflet + Google Maps
- **PDF:** @react-pdf/renderer, jspdf + jspdf-autotable
- **Styling:** Tailwind CSS with class-based dark mode, Inter font family
- **Brand colors:** Primary `#00A5B5` (teal), Secondary `#E31E24` (red), Accent `#1B365D` (navy)

## Environment Variables

Prefixed with `VITE_` for client-side access. Key vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_SERVICE_ROLE_KEY`, `VITE_GOOGLE_MAPS_API_KEY`, `VITE_GOOGLE_SHEET_ID`, plus Google OAuth credentials.
