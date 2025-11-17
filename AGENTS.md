# Repository Guidelines

## Orientation
- Yellow Grid Field Service Execution Platform backend lives in `src/` (NestJS + Prisma + PostgreSQL + Redis); Phase 1 modules cover auth/users/providers/config/service-catalog. Phase 2 adds scheduling + assignment (calendar pre-booking, provider ranking, assignment modes), and Phase 3 has execution + Work Closing Form stubs under `src/modules/execution`.
- `product-docs/` holds v2.0 production-ready specs (69 docs). Use `product-docs/README.md` and `00-ENGINEERING_KIT_SUMMARY.md` as entry points and keep navigation current whenever specs move.
- `roadshow-mockup/` is archived demo-only; avoid basing new work on it. `business-requirements/` are source materials (read-only). Generated/compiled outputs live in `dist/` and `node_modules/`—leave untouched.

## Build, Run, and Test
- Node 20+ / npm 9+ required. Typical flow: `npm ci` (or `npm install`), `docker-compose up -d` for Postgres + Redis, `npm run prisma:migrate` and `npm run prisma:generate`, then `npm run start:dev` (or `npm run start`/`npm run start:prod` after `npm run build`).
- Quality checks: `npm run lint`, `npm run typecheck`, `npm run test` (unit), `npm run test:e2e` (integration; see `test/README.md` for `.env.test` and DB setup), `npm run test:cov` for coverage, `npm run format` for Prettier writes.
- Prisma/test data helpers: `npm run db:seed`, `npm run prisma:studio`; adjust `DATABASE_URL`, `JWT_SECRET`, and Redis environment variables in `.env.local`/`.env.test` as needed.
- Unit suite currently green via `npm test -- --runInBand`; expect noisy error logs from service-catalog sync/consumers (intentional mocks) and stubbed dependencies in `node_modules` (e.g., `kafkajs`, `csv-parse`).

## Coding Style & Conventions
- Strict TypeScript with NestJS patterns (`*.module.ts`, `*.service.ts`, DTOs with `class-validator`), 2-space formatting via shared ESLint/Prettier config.
- Follow REST naming from `product-docs/api/01-api-design-principles.md` (plural collections, singular instances, snake_case query params) and keep Swagger decorators aligned with existing controllers.
- Maintain validation, rate limiting, and interceptors/globals configured in `src/main.ts` when adding endpoints; prefer Prisma for data access and keep multi-tenancy fields (`country_code`, `business_unit`, `user_type`) intact.

## Testing Expectations
- Aim for ≥80% coverage overall and higher on critical auth/domain flows; place unit specs alongside code as `*.spec.ts` and E2E suites under `test/`.
- E2E tests spin up a real Nest app + Postgres instance; ensure migrations and cleanup steps follow `test/README.md` (auth provider/technician flows).

## Documentation Guardrails & Active Notes
- Specs are authoritative: align code changes with `product-docs` content and update indexes (`product-docs/README.md`, `00-ENGINEERING_KIT_SUMMARY.md`, `CLAUDE.md`) when adding or moving specs.
- Avoid reviving deleted analysis files listed in `DOCUMENTATION_CONSOLIDATION_PLAN.md`; keep navigation focused on authoritative specs.
- `product-docs/architecture/02-technical-stack.md` remains a large monolith (~1.8k lines); scope edits carefully and plan the eventual split into tech/CI-CD/observability/migration docs.
- Implementation tracking lives in `docs/IMPLEMENTATION_TRACKING.md`; append updates instead of deleting earlier entries so teams can merge contributions.
