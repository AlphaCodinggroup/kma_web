# Desarrollo, tests y despliegue

Comandos autoritativos: tabla de [`AGENTS.md`](../../../AGENTS.md#development-and-verification). Guía de
validación local: [kma-web-local-validation](../../../.agents/skills/kma-web-local-validation/SKILL.md).
CI y despliegue: [contexto](../../../docs/agents/project-context.md#ci-and-deploy).

## Scripts npm ([`package.json`](../../../package.json), CONFIRMADO)

| Script | Comando |
| --- | --- |
| `dev` | `next dev --turbopack` |
| `build` / `start` | `next build` / `next start` |
| `lint` | `eslint --max-warnings 0` |
| `typecheck` | `tsc --noEmit` |
| `test` / `test:run` / `test:coverage` | `vitest` (watch) / `vitest run` / `vitest run --coverage` |
| `test:e2e` / `test:e2e:ui` | `playwright test` / `playwright test --ui` |
| `verify` | lint, typecheck, test:coverage y build, en ese orden |

## Vitest ([`vitest.config.mts`](../../../vitest.config.mts))

- Entorno `happy-dom`, `globals`, setup en [`vitest.setup.ts`](../../../vitest.setup.ts); incluye
  `src/**` y `app/**` (`*.test|spec.ts(x)`), excluye `e2e/`.
- Cobertura v8 sobre `src/**` y `app/**` (excluye `__tests__`, `layout.tsx`, `loading.tsx`, `error.tsx`,
  `global-error.tsx`). Umbrales de lines, statements, functions y branches: **90** cada uno;
  `COVERAGE_MIN` fuerza un mínimo único (la regla del repo es no bajarlos).
- Alias iguales a `tsconfig.json`. 249 archivos de test en `src/` y `app/` al escanear (no ejecutados).

## Playwright ([`playwright.config.ts`](../../../playwright.config.ts), [`e2e/`](../../../e2e))

- Contra la plataforma local completa (no mocks): `baseURL` `E2E_BASE_URL` o `http://localhost:3000`; un
  worker, sin paralelismo, timeout 120 s, Chromium de escritorio, traza/captura/vídeo en fallo.
- Credenciales por `E2E_USERNAME`/`E2E_PASSWORD` con valores de demo en
  [`e2e/fixtures.ts`](../../../e2e/fixtures.ts) (`login`, `collectErrors`, `APP_ROUTES`).
- Specs: `audit-navigation`, `auth`, `catalog` (sin commitear, incluye axe), `crud`, `flow-editor`,
  `interactions`, `premium` (incluye axe), `redesign`, `report-flow`, `routes`. Escriben datos; no corren en CI.

## Lint y TypeScript

[`eslint.config.mjs`](../../../eslint.config.mjs) (flat config, sin `eslint-config-next`; declara los plugins
next, react, react-hooks y jsx-a11y). Reglas: `no-console` salvo warn/error, `no-explicit-any` en warn
(fuera de tests), `@typescript-eslint/no-unused-vars` en error. TypeScript estricto con
`exactOptionalPropertyTypes` y `verbatimModuleSyntax`.

## CI ([`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml))

- Dispara en push a `main`, `develop`, `fix-**` y PR a `main`/`develop`.
- Job `quality` (Node 22, `npm ci`): lint, typecheck, `test:run`, `test:coverage` (con `COVERAGE_MIN` de la
  variable de repositorio) y subida de `coverage/` 7 días.
- Job `build`: `npm run build` con variables de compilación de ejemplo (`https://api.example.com/api`,
  `COOKIE_SECURE=true`, `COOKIE_SAMESITE=Lax`, etc.).
- CONFIRMADO: Playwright no corre en CI. Nota: la rama actual `fix/frontend-startup-warnings` no encaja con
  `fix-**` (guion, no barra), así que solo un PR a `main`/`develop` la dispara (INFERIDO del patrón de ramas).

## Amplify ([`amplify.yml`](../../../amplify.yml))

`npm ci`, luego `env >> .env` y `npm run build`; publica `.next` con caché de `node_modules`. Un push a
`main` o `develop` despliega (regla de [`AGENTS.md`](../../../AGENTS.md)). Riesgo conocido: `env >> .env`
escribe todas las variables de compilación, incluidos posibles secretos, en un archivo del build.
La configuración efectiva de ramas, regiones y backend consumido se comprobó en AWS el 2026-10-29:
ver la [tabla de ambientes y conexiones](environments.md).

## Docker y plataforma local

- [`Dockerfile`](../../../Dockerfile): etapas `deps`, `builder` (`DOCKER_BUILD=1`, activa
  `output: "standalone"`) y `runner` (Node 22 alpine, usuario `nextjs`, puerto 3000, `node server.js`).
- La plataforma local la levanta el Docker Compose del repositorio del backend (servicio `frontend`, que usa
  la etapa `deps` y ejecuta `npm run dev` en el puerto 3000, con Cognito simulado y las variables de
  `env.ts` definidas allí). Esta web no contiene ese Compose; los pasos (`make up`, `make seed`) están en
  [`AGENTS.md`](../../../AGENTS.md). Los bind mounts cubren `src`, `app`, `public` y configuraciones
  de nivel superior, pero no `package.json` ni `vitest.config.mts`: un cambio ahí exige reconstruir la imagen.

## Otras comprobaciones

- Sin `drift.lock` en este repo; `drift` está instalado, pero no hay documentos enlazados.
- `scripts/rsc-compat.mjs` adapta la instalación RSC 3.0.10 (ver [instalación RSC](../ftd/install-rsc-original-checkouts.md)).
