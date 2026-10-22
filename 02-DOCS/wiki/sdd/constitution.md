---
type: constitution
title: KMA Web — Reglas del proyecto
description: Reglas aprobadas por Pablo a partir de las instrucciones y configuración existentes.
tags: [sdd, constitution]
timestamp: 2026-10-07T20:55:26Z
topic: sdd
version: v1.0.0
ratified: 2026-10-07
last_amended: 2026-10-07
---

# KMA Web — Reglas del proyecto

Estas son las reglas de la casa que seguirán los trabajos posteriores.
**Aprobado explícitamente por Pablo el 2026-10-07.**
Versión: `v1.0.0`; las instrucciones existentes del repositorio siguen vigentes.

## Propósito y fuentes

Desarrollar y mantener la consola de administración y revisión de auditorías de KMA,
conservando sus contratos con el backend y sus comprobaciones de calidad.
Clasificación aceptada: software complejo; cambios mediante ramas y solicitudes de revisión.
Fuentes: [AGENTS.md](../../../AGENTS.md), [package.json](../../../package.json),
[tsconfig.json](../../../tsconfig.json), [vitest.config.ts](../../../vitest.config.ts)
y [CI](../../../.github/workflows/ci.yml).
No había artículos en `wiki/stack/` para reconciliar; no se verificó el backend durante esta instalación.

## Principios

1. Mantener TypeScript estricto, Next.js App Router y React conforme a `package.json` y `tsconfig.json`; usar npm, su archivo de versiones y Node 22 para las comprobaciones, como en CI.
2. Ejecutar lint, comprobación de tipos y pruebas afectadas para implementación; `npm run verify` para cambios transversales; comprobar enlaces y comandos para documentación, según `AGENTS.md`.
3. Conservar el mínimo del 90% en las cuatro métricas de `vitest.config.ts`; `COVERAGE_MIN` solo puede aumentarlo.
4. Respetar las capas y la separación de cada funcionalidad descritas en [el contexto](../../../docs/agents/project-context.md#architecture-boundaries); preservar cambios ajenos y evitar refactorizaciones fuera del alcance.
5. Mantener la interfaz y las instrucciones para agentes en inglés, los comentarios de código y la documentación escrita durante esta tarea en español; comprobarlo contra `AGENTS.md` y las preferencias de Pablo.
6. Obtener configuración del entorno únicamente de `src/shared/config/env.ts`; no introducir dependencias `file:`, `link:` ni Git, conforme a `AGENTS.md`.
7. Verificar productores y consumidores antes de cambiar contratos; tomar los DTO Go como fuente y tolerar campos ausentes sin inventarlos, siguiendo [la guía de contratos](../../../.agents/skills/kma-web-contract-change/SKILL.md).
8. Usar `backend-proxy.ts` como única salida de las rutas al backend; conservar validación previa, parámetros permitidos, límite de listas de 200 y codificación de segmentos, conforme a `AGENTS.md`.
9. Conservar los controles existentes de autenticación, roles, redirecciones y subidas; no reemplazar autorización por controles visuales. Consultar [el contexto de autenticación](../../../docs/agents/project-context.md#auth-and-session).
10. Mantener la máquina de estados en el backend y el informe consolidado por proyecto; comprobar el generador PDF al modificar la vista previa, siguiendo [la guía de informes](../../../.agents/skills/kma-web-qc-report/SKILL.md).
11. No guardar secretos en Git; usar los mecanismos existentes de configuración y [.gitignore](../../../.gitignore).
12. Trabajar mediante ramas y solicitudes de revisión, según [el plan aceptado](../harness/installation-plan.md); publicar, desplegar u operar destructivamente requiere autorización que lo cubra. Subir a `main` o `develop` implica despliegue, según `AGENTS.md`.
13. Mantener la autoría humana de commits y solicitudes de revisión, sin firmas de IA; principio heredado de [constitution](../../../.rsc/skills/constitution/SKILL.md).
14. Registrar decisiones significativas con fecha, opciones y motivo en [decisions.md](../harness/decisions.md); declarar lo que no se verificó y distinguir hechos, inferencias y dudas, según `AGENTS.md`.

No se propone un nuevo objetivo numérico de rendimiento o accesibilidad en esta instalación.
Los cambios de interfaz conservarán los controles y pruebas pertinentes del proyecto.

## Comprobaciones para terminar un trabajo

- [ ] Alcance respetado y cambios ajenos preservados.
- [ ] Comprobaciones correspondientes al cambio aprobadas, conforme a los principios 2 y 3.
- [ ] Contratos y controles afectados verificados; limitaciones registradas.
- [ ] Sin secretos ni dependencias prohibidas.
- [ ] Decisiones significativas documentadas y enlaces válidos.
- [ ] Cambios preparados en una rama; publicación o despliegue cubiertos por autorización.

## Registro de cambios

| Fecha | Versión | Cambio | Motivo |
| --- | --- | --- | --- |
| 2026-10-07 | draft | Borrador inicial generado por RSC. | Preparar las reglas para trabajos complejos. |
| 2026-10-07 | draft | Completar 14 principios y corregir el nombre a KMA Web. | Reflejar las instrucciones existentes; pendiente de aprobación. |
| 2026-10-07 | v1.0.0 | Pablo aprobó explícitamente los 14 principios mostrados. | Completar las reglas iniciales del harness conservando las instrucciones existentes. |
