# Field Nexus

Field Nexus is a React + TypeScript dashboard for coordinating field issues, volunteers, and agent-driven action planning.

## Tech Stack

- Vite
- React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (data storage)
- Vitest + Testing Library
- Playwright (base config included)

## Prerequisites

- Node.js 18+
- One package manager: `npm`, `pnpm`, or `yarn`
- A Supabase project with required tables

## Environment Variables

Create a `.env` file at project root:

```bash
VITE_SUPABASE_URL="https://<your-project>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<your-anon-key>"
# Optional (not required by client code, but useful for your own scripts)
VITE_SUPABASE_PROJECT_ID="<your-project-id>"
```

## Install

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

The app runs on `http://localhost:8080`.

## Available Scripts

- `npm run dev` - Start dev server
- `npm run build` - Production build
- `npm run build:dev` - Development-mode build
- `npm run preview` - Preview built app
- `npm run lint` - Run ESLint
- `npm run test` - Run Vitest once
- `npm run test:watch` - Run Vitest in watch mode

## Project Routes

- `/` - Dashboard
- `/run` - Run Agents
- `/issues` - Issues
- `/volunteers` - Volunteers
- `/action-plan` - Action Plan
- `/logs` - Agent Logs

## Supabase Tables Used

The UI currently reads/writes these tables:

- `issues`
- `volunteers`
- `agent_runs`
- `profiles`
- `auth_events`

Make sure these tables (and referenced columns) exist before running the app in a new Supabase project.

For auth setup SQL (profiles + login/signup event logging + RLS), run:

```bash
supabase/sql/auth_setup.sql
```

## Testing

Unit tests:

```bash
npm run test
```

E2E tests (Playwright config present):

```bash
npx playwright test
```

## Project Structure

```text
src/
  agents/         # Agent orchestration logic
  components/     # Layout and UI components
  integrations/   # External service clients (Supabase)
  pages/          # Route-level screens
  test/           # Vitest setup and example tests
```

## Notes

- Agent pipeline in `src/agents/orchestrator.ts` is scaffolded with stubs and ready for implementation.
- Dashboard and pages already include demo-data actions to help bootstrap local testing.
