# BoyaCep

BoyaCep helps homeowners plan, calculate and manage painting jobs, and helps painters manage projects and quotes. Mobile first (Android, iOS) with a web version, built from one codebase.

## Stack

- Expo + Expo Router + React Native + TypeScript
- Supabase (Postgres, Auth, Storage, Edge Functions) from phase 2
- Jest + React Native Testing Library

## Getting started

```bash
npm install
npm start          # then scan the QR code with the Expo Go app
npm run web        # run in the browser
```

## Checks

```bash
npm run typecheck  # TypeScript
npm run lint       # ESLint
npm test           # unit and screen tests
npm run check      # all of the above
```

CI runs the same checks plus a web build on every push and pull request.

## Layout

```
src/app/        Screens (Expo Router: file path = URL)
src/engine/     Paint calculation engine: pure TypeScript, fully unit tested
src/features/   Feature modules (calculator, home, ...)
src/ui/         Design system: tokens (theme.ts) and shared components
src/lib/        Small helpers (number parsing/formatting)
docs/           Decisions and phase notes
```

## Calculation rules

The engine never guesses silently. Every number carries a source: manufacturer data sheet, user input, or a generic estimate. Estimates are labelled as such in the UI. See [docs/calculation.md](docs/calculation.md).
