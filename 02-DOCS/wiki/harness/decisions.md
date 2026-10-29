# Harness decisions

- Accepted plan `8b515c0cf43f160ce2002ed2c627d60d30f3d9e9768a01dbb128d731a327993c`.
- Project kind: software.
- SDD: selected.

## 2026-10-07 — Reglas iniciales de KMA Web

- Decisión: Pablo aprobó explícitamente el borrador mostrado; versión `v1.0.0`.
- Opciones consideradas: aprobar las reglas propuestas, revisarlas o mantener el borrador pendiente.
- Motivo: completar la instalación con principios basados en las instrucciones y configuración existentes.
- Documento: [reglas del proyecto](../sdd/constitution.md).

## 2026-10-07 — Ambos asistentes en VS Code

- Autorización: Pablo pidió preparar Codex y Claude Code en VS Code, dentro del worktree.
- Se sincronizó el conjunto existente de 31 habilidades para ambos; no se adoptó otra versión de RSC.
- Se dejó desactivada la publicación automática de documentación; la memoria sigue siendo local.
- Se conectaron siete automatismos de memoria de Codex desde su configuración de usuario,
  limitados a este worktree, porque el cliente no cargó las definiciones locales.
- Se verificó la confianza mediante la API nativa, sin omitirla ni cambiar modelos o permisos.
- Se corrigió una propiedad incompatible en dos asistentes de React generados para Codex.
- Guía y límites de validación: [RSC en VS Code](vscode.md).


## 2026-10-23 — Instalación en el checkout original

- Pablo pidió instalar RSC en ambos repositorios originales de KMA, independientes de MEDM.
- Se conserva RSC 3.0.10 y los asistentes Codex y Claude; el backend usa Go y la web Next.js/React.
- Se conserva el flujo actual de ramas y PRs y los permisos existentes. No se publican cambios.
- Se incorpora testing-go en backend; testing-web, e2e-testing y accessibility en frontend.
- Se desactiva la publicación automática de documentación y la sustitución automática de RSC;
  las actualizaciones de versión requieren una decisión explícita para KMA.
- Se conserva el perfil ya elegido en KMA Web (lenguaje simple) y se usa para KMA Backend.
- La constitución del backend sigue en borrador; la instalación no ratifica reglas nuevas.
- Adaptación de Codex reproducible: `node scripts/rsc-compat.mjs` después de sincronizar.

## 2026-10-29 — Actualización autorizada a RSC 3.6.0

Pablo pidió actualizar también la web. Se conservaron las reglas de KMA, permisos,
opt-outs y agentes personalizados. [Evidencia](../ftd/update-rsc-3-6-0.md).
