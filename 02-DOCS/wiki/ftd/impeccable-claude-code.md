---
author: Pablo
branch: chore/install-rsc-harness
status: in-progress
---
# Impeccable para Claude Code en KMA

## Intención

Habilitar la herramienta de diseño que Pablo autorizó para Claude Code, incluida su extensión de VS Code, en el worktree actual de KMA. Codex ya dispone de Impeccable a nivel de usuario.

## Alcance

Instalación local al proyecto desde el instalador oficial de `pbakaus/impeccable`: skill, agentes específicos y hooks de diseño. Se conservan RSC, sus ajustes y las instrucciones anteriores. Esta instalación no cambia el frontend ni aplica todavía la dirección visual Daylight Section elegida por Pablo.

## Comprobaciones

- [x] Instalar sólo el proveedor Claude, con alcance de proyecto: salida del instalador sin errores.
- [x] Comprobar skill y ejecutable: Impeccable 4.5.0 y motor 0.1.11 para Linux x64.
- [x] Comprobar los hooks de diseño: estado habilitado y ejecución del comando nativo de `SessionStart` con salida 0.
- [x] Conservar todos los ajustes y hooks locales previos: comparación de objetos JSON antes y después.
- [x] Conservar RSC y las instrucciones: comparación binaria sin diferencias para `.rsc.json`, `.codex/hooks.json`, `.claude/settings.json`, `AGENTS.md` y `CLAUDE.md`.
- [x] Excluir del control de versiones el ejecutable específico de la máquina y las cachés del hook.

## Evidencia

El instalador oficial se ejecutó desde `/home/pablocristo/Proyectos/alphacoding/kma_web/.worktrees/install-rsc-harness` con `install --providers=claude --scope=project --yes`, usando el launcher de la skill de Codex ya instalada. Informó instalación de la skill, del motor, de cuatro agentes propios y de los hooks en `.claude`.

La skill está en `.claude/skills/impeccable/SKILL.md`. Los nuevos hooks se añadieron a `.claude/settings.local.json` en `PostToolUse`, `SessionStart` y `Stop`. Todos los ajustes y entradas anteriores se conservaron. `hooks status` devolvió `state: enabled`, sin excepciones de reglas. La prueba del comando real de `SessionStart`, con el directorio del worktree y un evento de inicio, terminó con código 0 y sin stderr.

No se ejecutó una sesión interactiva de la extensión de Claude Code en VS Code; la comprobación cubre archivos, configuración y arranque nativo del hook. La nueva skill se descubre al iniciar una sesión en esta carpeta.

Fuente: [repositorio oficial](https://github.com/pbakaus/impeccable) y [guía oficial de instalación](https://impeccable.style/#downloads).

## Siguiente

Reabrir Claude Code en el worktree de KMA y usar `/impeccable` para abrir su menú de diseño. Después, continuar el rediseño con Daylight Section, conservando las funciones de KMA.
