# Repository Guidelines

## Project Structure & Module Organization
`product-docs/README.md` is the canonical table of contents; keep it synchronized whenever a spec moves. Use `architecture`, `domain`, `api`, and `integration` for the primary designs, while security, infrastructure, operations, and testing sit in their sibling directories (`product-docs/README.md:7-97`). The README promises six development guides (`product-docs/README.md:98-106`), yet `product-docs/development` is empty, so backfill those workflow/coding/git/review/setup/CI-CD documents before branching into new topics.

## Build, Test, and Development Commands
Target Node 20 + TypeScript 5.x with NestJS/React scaffolding (`product-docs/architecture/02-technical-stack.md:13-25`). Run `npm ci`, `npm run lint`, `npm run test:unit`, and `npm run test:integration`; the CI workflow mirrors this sequence before building containers (`product-docs/architecture/02-technical-stack.md:670-690`). For local confidence also run `npm run test:watch`, `npm run typecheck`, `npm run test:e2e:local`, and `npm run build` as outlined in the testing strategy (`product-docs/testing/01-testing-strategy.md:253-263`).

## Coding Style & Naming Conventions
Default to strict TypeScript, 2-space indentation, and shared ESLint/Prettier configs noted in the technical stack doc (`product-docs/architecture/02-technical-stack.md:70-150,788-799`). Follow REST resource naming with plural collections, singular instances, and snake_case query params (`product-docs/api/01-api-design-principles.md:511-548`). Backend modules should keep NestJS naming (`*.module.ts`, `*.service.ts`) and align topic names such as `projects.service_order.created` when working with Kafka (`product-docs/architecture/05-event-driven-architecture.md:122-247`).

## Testing Guidelines
Quality gates require ≥80% overall coverage and 90% on critical flows (`product-docs/testing/01-testing-strategy.md:19-41`). Place unit specs under `src/__tests__` or `*.spec.ts` per the Jest config in `product-docs/testing/02-unit-testing-standards.md:11-45`, keeping state-machine modules at 95%. Integration suites live in `__tests__/integration`, while Playwright drives `tests/e2e` journeys (`product-docs/testing/04-e2e-testing.md:5-105`). Record flaky cases, attach HTML/JUnit artifacts for `npm run test:e2e`, and document any data-seeding quirks so they roll into the testing runbook.

## Commit & Pull Request Guidelines
Use Conventional Commits (e.g., `feat: add provider SLA guard`) per the toolchain table (`product-docs/architecture/02-technical-stack.md:788-799`). Each PR must state the affected specs, link to any architectural decision, and confirm docs stay current, mirroring the “Contributing to Documentation” checklist (`product-docs/README.md:138-146`). Before requesting review, verify security items like validation, secrets, and rate limiting using the security checklist (`product-docs/security/01-security-architecture.md:360-403`), and attach coverage or CI evidence when available.

## Active Documentation Improvements
1. Populate `product-docs/development` with the six guides linked in `product-docs/README.md:98-106`, landing at least one of those specs per sprint.
2. Split `product-docs/architecture/02-technical-stack.md` into technology, CI/CD, observability, and migration docs so edits stay scoped; the current 845-line monolith mixes all of that and slows reviews.
3. Extend `product-docs/testing/01-testing-strategy.md:247-292` (and reference it from `product-docs/testing/04-e2e-testing.md`) with a reproducible environment bootstrap covering datasets, secrets, and service flags so anyone can run the prescribed commands without guesswork.
