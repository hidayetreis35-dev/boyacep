# BoyaCep

Read `AGENTS.md` for Expo rules (SDK version, routing, `npx expo install`). Product decisions and phase plan live in the project's planning doc; calculation rules in `docs/calculation.md`.

## Rules

- `src/engine/` stays pure TypeScript: no React, no network, no AI. Every change there gets unit tests.
- Every number shown to users carries a source (`manufacturer`, `user`, `estimate`); never present an estimate as exact.
- Unfinished features show an honest "Yakında" state; never ship a fake working demo.
- UI text is written in Turkish and wrapped in `t()` (or `msg()` for constants, translated where shown); every new text gets an English entry in `src/i18n/en.ts`. The i18n tests fail on unwrapped Turkish text or a missing translation.
- Colours, spacing and type come from `src/ui/theme.ts`; reuse `src/ui/components.tsx`.
- Every screen handles loading, error, empty and success states.
- Secrets never go in the client. Supabase tables always get RLS policies and RLS tests.
- Run `npm run check` before committing.
