# Documentación de KMA Web

## RSC Harness

- [Perfil personal](harness/user-profile.md).
- [Plan aceptado](harness/installation-plan.md).
- [Decisiones](harness/decisions.md).
- [Reglas del proyecto](sdd/constitution.md): versión `v1.0.0`, aprobada por Pablo.
- [Usar Codex y Claude Code en VS Code](harness/vscode.md).
- [Instalación y comprobaciones](ftd/install-rsc-harness.md).

## Rediseño de KMA Web

- [Especificación aprobada](sdd/kma-redesign/spec.md).
- [Plan](sdd/kma-redesign/plan.md) y [lista de comprobación](sdd/kma-redesign/tasks.md).
- [Entrega y verificación](sdd/kma-redesign/delivery.md).
- [Capturas](sdd/kma-redesign/screenshots.md).

## Documentación existente

- [Contexto del proyecto](../../docs/agents/project-context.md).
- [Instrucciones](../../AGENTS.md).
- [Guía general](../../README.md).

La instalación conserva la documentación existente en su ubicación.

- [Frontend sin advertencias](ftd/frontend-startup-warnings.md).
- [Inspector de flows más ancho](ftd/flow-inspector-width.md).

- Catalog completo: [especificación](sdd/specs/catalog-management.md), [plan](sdd/plans/catalog-management.md), [progreso](sdd/progress/catalog-management.md).

- [Verificación de Catalog completo](sdd/verifications/catalog-management-2026-10-23.md).

- [Verificación del CRUD y export de mitigaciones](sdd/verifications/mitigation-crud-export-2026-10-23.md).

- [QA final del administrador de mitigaciones](sdd/verifications/mitigation-qa-2026-10-23.md).

- [RSC en el checkout original](ftd/install-rsc-original-checkouts.md).

## Proyecto

Conocimiento verificado de la web, escaneado en la rama `fix/frontend-startup-warnings`.

- [Visión general](project/overview.md): producto, stack, mapa de directorios, capas y lo no cubierto.
- [Rutas y BFF](project/routes-and-bff.md): páginas, rutas `app/api/**`, `backend-proxy.ts` y `env.ts`.
- [Features](project/features.md): responsabilidades, hooks, contratos y tests por feature.
- [Sistema de diseño y UI](project/design-system-and-ui.md): Daylight, tokens, temas, responsive y accesibilidad.
- [Autenticación y sesión](project/auth-and-session.md): Cognito, cookies, verificación, roles y CSRF.
- [Desarrollo, tests y despliegue](project/dev-test-and-deploy.md): scripts, Vitest, Playwright, CI, Amplify y Docker.

### Mapa de la documentación del repositorio

| Área | Documentos |
| --- | --- |
| Agentes | [`AGENTS.md`](../../AGENTS.md), [`CLAUDE.md`](../../CLAUDE.md), [contexto del proyecto](../../docs/agents/project-context.md) |
| Arquitectura | [Autenticación y sesión](../../docs/architecture/auth.md) |
| Producto y diseño | [`README.md`](../../README.md), [`PRODUCT.md`](../../PRODUCT.md), [`DESIGN.md`](../../DESIGN.md) |
| Skills propias | [contratos BFF](../../.agents/skills/kma-web-contract-change/SKILL.md), [informe QC](../../.agents/skills/kma-web-qc-report/SKILL.md), [validación local](../../.agents/skills/kma-web-local-validation/SKILL.md) |
| Rediseño | [especificación](sdd/kma-redesign/spec.md), [plan](sdd/kma-redesign/plan.md), [tareas](sdd/kma-redesign/tasks.md), [progreso](sdd/kma-redesign/progress.md), [verificación](sdd/kma-redesign/verification.md), [entrega](sdd/kma-redesign/delivery.md), [capturas](sdd/kma-redesign/screenshots.md) |
| Daylight | [DESIGN](sdd/kma-redesign/daylight/DESIGN.md), [implementación](sdd/kma-redesign/daylight/implementation.md), [paridad con main](sdd/kma-redesign/daylight/main-parity.md), [feedback de Pablo](sdd/kma-redesign/daylight/user-feedback.md) |
| Catalog | [especificación](sdd/specs/catalog-management.md), [plan](sdd/plans/catalog-management.md), [progreso](sdd/progress/catalog-management.md), [verificación 22/10](sdd/verifications/catalog-management-2026-10-22.md), [verificación 23/10](sdd/verifications/catalog-management-2026-10-23.md), [CRUD y export](sdd/verifications/mitigation-crud-export-2026-10-23.md), [QA](sdd/verifications/mitigation-qa-2026-10-23.md), [prompt de implementación](ftd/catalog-implementation-prompt.md) |
| Marca y despliegue | [logo rojo](sdd/kma-redesign/daylight/brand-red-logo.md), [despliegue](sdd/kma-redesign/daylight/deployment.md) |
| FTD | [arranque sin advertencias](ftd/frontend-startup-warnings.md), [scroll de UI](ftd/ui-scroll-fixes.md), [Impeccable en Claude Code](ftd/impeccable-claude-code.md), [instalación RSC](ftd/install-rsc-harness.md) |
| Harness | [perfil](harness/user-profile.md), [plan](harness/installation-plan.md), [decisiones](harness/decisions.md), [VS Code](harness/vscode.md), [reglas SDD](sdd/constitution.md) |

- [Recuperación del catálogo y menú en ventanas bajas](ftd/catalog-recovery-and-sidebar.md).

## Fuentes y mantenimiento automático

- [Catálogo completo de documentación](sources.md).
- [Mantenimiento automático del second brain](harness/second-brain.md).

- [Actualización de RSC a 3.6.0](ftd/update-rsc-3-6-0.md).
