---
type: delivery
status: in-progress
branch: fix/feedback-permissions-states
---
# Permisos y reapertura en la consola

## Alcance y aceptación

Tareas 1/2/7: auditor propietario abre/edita durante revisión; aprobación y reapertura de Completed solo admin. Flows oculto y ruta protegida para no-admin. No cambiar móvil ni edición de campos/flows de Oski. El backend valida identidad y propiedad; la pantalla solo presenta capacidades.

## Plan

- [x] Reproducir bloqueo de edición propia.
- [x] Propagar createdBy del detalle; separar editar/aprobar; proteger consola Flows.
- [x] Integrar prop editable de preguntas tras checkpoint del agente UNSURE.
- [ ] Reabrir Completed vía estado existente; descartar cache de PDF anterior y regenerar.
- [ ] Pruebas afectadas, lint, tipos y build; evidencia registrada.

## Evidencia

Base fa8721b. UNSURE d99839e2 integrado mediante cherry-pick 00aa9ff antes de propagar editable. Reproducción: propietario bloqueado en editor/tabla; corregido con 323 pruebas focalizadas verdes y typecheck verde. Logs /tmp/kma-permissions-web-repro-valid.log y /tmp/kma-permissions-web-final.log. Dependencias instaladas con npm ci --ignore-scripts, sin cambiar lockfile. Catálogos compartidos quedan reservados al agente de integración.

## Siguiente

Comprobar permisos y luego reapertura.
