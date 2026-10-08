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
