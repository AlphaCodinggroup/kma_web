---
name: kma-web-local-validation
description: Run KMA Web against the local backend platform, seed data, and verify a change in a real browser, including Playwright.
---

# KMA Web local validation

Use when a task needs the mutable local stack, seeded data, or a real-browser check instead of unit
tests alone. Assumes `../kma-backend` is checked out as a sibling; its
[local validation skill](../../../../kma-backend/.agents/skills/kma-local-validation/SKILL.md) and
[development guide](../../../../kma-backend/docs/development.md) operate the shared stack.

1. From `../kma-backend`: confirm Docker and the current stack state (`make ps`, `make logs`), then
   `make up` and `make seed-docker` (or `make seed`) for ordinary fixtures. The web comes up at
   `http://localhost:3000` as the backend's `frontend` service, with mock Cognito credentials
   `admin`/`admin123`.
2. The `frontend` service bind-mounts `src`, `app`, `public`, and the top-level config files, but not
   `package.json`, `package-lock.json`, `vitest.config.ts`, or `playwright.config.ts`. A dependency
   change needs `docker compose build frontend` from `../kma-backend`; a bind-mounted source change
   does not.
3. For a browser check, use Chrome DevTools MCP against `http://localhost:3000`, logged in as
   `admin`. For `npm run test:e2e`, `E2E_BASE_URL` defaults to `http://localhost:3000`; the suite
   writes data and does not run in CI.
4. A read-only request uses inspection only: do not start, seed, or run a journey against the stack.
   Report a prerequisite that is missing (Docker, the sibling checkout, seeded fixtures) instead of
   working around it.
