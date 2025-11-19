# Repository Guidelines

## Orientation

- **Backend**: `src/` (NestJS + Prisma + PostgreSQL + Redis). Phase 1 (Foundation) and Phase 2 (Scheduling) are complete. Phase 3 (Execution) is in progress.
- **Mobile App**: `mobile-app/` (React Native + Expo). Phase 3 deliverable. Currently in scaffolding/early implementation.
- **Web App**: `web/` (React + Vite). Phase 4 deliverable, but some scaffolding exists.
- **Documentation**: `product-docs/` holds v2.0 production-ready specs. `docs/IMPLEMENTATION_TRACKING.md` is the authoritative progress tracker.
- **Legacy/Reference**: `roadshow-mockup/` is archived. `business-requirements/` are read-only source materials. `mobile/` and `web-app/` may contain reference implementations or alternative scaffolds but `mobile-app/` and `web/` are the active targets.

## Build, Run, and Test

### Backend (`src/`)

- **Setup**: `npm ci`, `docker-compose up -d`, `npm run prisma:migrate`, `npm run prisma:generate`.
- **Run**: `npm run start:dev`.
- **Test**:
  - Unit: `npm test -- --runInBand` (expect some noise from mocks).
  - E2E: `npm run test:e2e` (requires DB setup, see `test/README.md`).
  - Coverage: `npm run test:cov`.

### Mobile App (`mobile-app/`)

- **Setup**: `cd mobile-app && npm install`.
- **Run**: `npx expo start`.
- **Test**: Jest setup pending (check `package.json`).

### Web App (`web/`)

- **Setup**: `cd web && npm install`.
- **Run**: `npm run dev`.
- **Test**: `npm run test` (Vitest).

## Coding Style & Conventions

- **Backend**: Strict TypeScript, NestJS patterns (`*.module.ts`, `*.service.ts`), DTOs with `class-validator`. Follow REST naming.
- **Mobile**: React Native with Expo. Functional components, hooks, strong typing.
- **Web**: React with Vite. Functional components, hooks.
- **General**: 2-space formatting, Prettier/ESLint.

## Testing Expectations

- **Backend**: Aim for ≥80% coverage. Unit specs alongside code (`*.spec.ts`). E2E suites in `test/`.
- **Frontend**: Component testing (React Testing Library) and logic testing.

## Documentation Guardrails & Active Notes

- **Specs are authoritative**: Align code with `product-docs`.
- **Track Progress**: Update `docs/IMPLEMENTATION_TRACKING.md` when completing tasks.
- **Avoid Deletions**: Append to tracking docs rather than deleting history.

