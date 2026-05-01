# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Environment

- **OS:** Windows 11, running Claude Code via Git Bash (Unix shell syntax applies)
- **Shell:** bash — use forward slashes and Unix commands, not Windows cmd syntax
- **Home directory:** `C:\Users\Uživatel` (bash path: `/c/Users/Uživatel`)
- **Language:** User communicates in Czech. Respond in Czech, keep technical terms and code identifiers in English.

## Rules

- **Never use `rm` to delete files.** Always delete to Recycle Bin using PowerShell:
  ```powershell
  powershell -NoProfile -Command "Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('CESTA', 'OnlyErrorDialogs', 'SendToRecycleBin')"
  ```
  For directories use `::DeleteDirectory()` with the same approach.

## Commands

```bash
npm run dev        # Dev server (Vite HMR)
npm run build      # tsc -b && vite build
npm run lint       # ESLint
npm run preview    # Preview production build locally
```

No test suite exists. Type-check via `npm run build` (tsc is part of the build step).

## Architecture

**Kaloriak** is a Czech-language calorie tracking PWA — React 19 + TypeScript + Vite, deployed to Vercel. Authentication is Google Sign-In via Firebase Auth; data is persisted in both `localStorage` and Firestore.

### Routing & shell (`src/App.tsx`)

`AppProvider` wraps the entire app. `Shell` handles auth gating: shows a spinner while Firebase resolves, redirects to `/onboarding` for new users, hides `BottomNav` on full-screen pages (`/add`, `/activity`, `/onboarding`). Routes: `/` → Today, `/add` → AddMeal, `/activity` → AddActivity, `/profile` → Profile, `/onboarding` → Onboarding.

### Global state (`src/state/AppState.tsx`)

Single context (`AppContext`) holds all user data (`AppData`): profile, meals, activities, water log, Gemini API key, onboarding flag. Storage key: `kaloriak:v1`.

**Dual-layer persistence:**
- `localStorage` — written **synchronously** on every state change via a `useEffect`.
- Firestore — written **debounced 1500 ms** after each state change, only when logged in. Base64 image blobs are stripped before upload (`stripBlobs`) because of Firestore's 1 MB document limit; images live only in `localStorage`.

**Startup merge logic** (in `onAuthStateChanged`): cloud data takes precedence over local, but locally-added meals not yet synced to cloud (e.g. app closed within the debounce window) are merged in and immediately re-uploaded. `skipNextSync` flag prevents a pointless round-trip after the initial cloud load.

### AI food analysis (`api/gemini.ts` + `src/lib/gemini.ts`)

The browser calls the Vercel serverless function at `/api/gemini` (never AI providers directly — API keys are server-side only). The function implements a **provider fallback chain**: Gemini 2.5 Flash → Groq (llama-4-scout for images, llama-3.3-70b for text) → OpenAI gpt-4o-mini → Claude Haiku 4.5. Each provider is skipped on quota/503 errors; other errors fail immediately. Prompts are in Czech.

Two request types:
- `type: 'name'` — estimates nutrition per 100 g from a food name; returns `FoodEstimate`.
- `type: 'image'` — analyses a photo for the full portion; returns `FoodAnalysis`.

### Food search (`src/pages/AddMeal.tsx`)

Three input modes: **photo** (AI image analysis), **search** (local DB → Open Food Facts API → barcode scanner), **manual** (direct number entry). The local DB (`src/lib/foodDb.ts`) contains common Czech foods with nutrition per 100 g. Recent foods (`src/lib/recentFoods.ts`) are derived from meal history in memory — not stored separately.

### TDEE calculation (`src/lib/tdee.ts`)

Mifflin-St Jeor BMR × activity factor + goal intensity adjustment (±kcal/day). Supports both static targets (saved in profile) and dynamic TDEE (`useDynamicTdee` flag) where today's logged activity kcal are added on top of the NEAT baseline.

### Design system

Dark theme. Custom Tailwind tokens in `tailwind.config.js`:
- **Surfaces:** `bg`, `surface`, `surface-2`, `surface-3`, `border`, `border-soft`
- **Text:** `ink` (white), `ink-soft` (zinc-400), `ink-mute` (zinc-500)
- **Primary accent:** `coral-*` (peach/rose gradient)
- **Macros:** `macro-protein` (rose), `macro-carbs` (amber), `macro-fat` (violet)
- **Font:** Geist / Inter

All `<input type="range">` sliders must have `onWheel={(e) => e.currentTarget.blur()}` to prevent scroll from changing values unintentionally.

### Key data types (`src/types.ts`)

`AppData` → `{ profile: UserProfile | null, meals: Meal[], activities: Activity[], water: WaterLog, geminiApiKey: string, onboarded: boolean }`. `Meal.imageDataUrl` is stored only in `localStorage`, never Firestore. `MealType` values: `breakfast | lunch | snack | dinner` (inferred from `createdAt` time for legacy entries without `mealType`).
