---
name: kma-web-contract-change
description: Wire a KMA Web BFF route or entity mapper to a backend contract change, or trace a mismatch between what the web sends/expects and what the backend actually returns.
---

# KMA Web contract change

Use when a change crosses the boundary between `app/api/**/route.ts` and `../kma-backend`, or when
a mapper under `src/entities/*/lib` disagrees with the backend DTO. Read the [contracts and
mismatches map](../../../docs/agents/project-context.md#domain-and-contracts), then inspect the
current backend handler and the current web code; do not assume a code comment claiming a backend
limitation is still true.

1. Read the backend Go DTO and handler in `../kma-backend/lambdas/*/internal/dto` and the matching
   `cmd/bootstrap/routes.go`. Confirm its branch. Check `../KMA_app` for the same contract when the
   change affects it.
2. In the BFF route, update `forwardQuery`, `numericQuery`, `query`, `expectJson`, or the method,
   following the existing pattern in `src/shared/api/backend-proxy.ts`. Keep every path parameter
   through `pathSegment`.
3. Update the repo implementation (`src/features/*/api/*.repo.impl.ts`), the DTO and mapper
   (`src/entities/*/lib/*.mappers.ts`), tolerating an absent field rather than defaulting it into a
   value the UI could mistake for real data.
4. Check the affected React Query keys and invalidations for the new or changed field.
5. Add or update tests colocated in `__tests__` next to the changed file. Run the affected unit
   tests, then lint and typecheck. Report any part of the contract that could not be verified because
   the backend was unavailable or on a different branch.
