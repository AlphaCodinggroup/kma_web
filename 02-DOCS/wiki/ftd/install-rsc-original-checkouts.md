---
author: Pablo
branch: fix/frontend-startup-warnings
status: verified
---
# Instalar RSC en el checkout original de kma_web

## Intención

Instalar y comprobar RSC localmente por pedido de Pablo del 2026-10-23.
KMA es independiente de MEDM; no se copian sus políticas ni configuración.

## Alcance

RSC 3.0.10 para Codex y Claude, con habilidades del stack de este repositorio.
Conservar rama, código, instrucciones específicas, habilidades propias y cambios locales.
No publicar, fusionar, desplegar ni modificar la aplicación.
Respaldo previo: `/tmp/kma-rsc-install-20261023/kma_web`.

## Archivos afectados

Archivos nuevos o modificados por esta instalación, comparados contra el respaldo inicial:

- `.gitignore`.
- `.rsc.json`.
- `02-DOCS/wiki/ftd/install-rsc-original-checkouts.md`.
- `02-DOCS/wiki/harness/decisions.md`.
- `02-DOCS/wiki/harness/vscode.md`.
- `02-DOCS/wiki/index.md`.
- `AGENTS.md`.
- `CLAUDE.md`.
- `scripts/rsc-compat.mjs`.

También se generaron archivos locales ignorados por Git: `.rsc/` (runtime, habilidades,
registro, memoria y marcas de opt-out), `.codex/hooks.json`, `.codex/agents/`,
`.codex/rsc/`, enlaces `.agents/skills/<id>`, `.claude/skills/`, `.claude/agents/`,
`.claude/settings.local.json` y `02-DOCS/wiki/harness/user-profile.md`.
Codex guardó veinte huellas de confianza de KMA (diez por repositorio) mediante su API nativa
con control de versión; se comprobó que ninguna otra opción de usuario cambió.
No se cambiaron hooks, políticas, código ni archivos de MEDM.

## Checklist

- [x] Instalar los archivos declarados y las habilidades pertinentes.
- [x] Verificar RSC con doctor y arranque para ambos asistentes.
- [x] Comprobar preservación del código y las instrucciones anteriores.
- [x] Comprobar enlaces y sintaxis de los scripts generados.

## Evidencia

- Versión instalada: RSC `3.0.10`, clientes `claude` y `codex`; 34 habilidades RSC.
- `npx --yes @ericrisco/rsc@3.0.10 doctor --target codex --json` y
  `--target claude --json`: `healthy: true`; sin habilidades, asistentes ni comandos faltantes.
- `npx --yes @ericrisco/rsc@3.0.10 registry refresh`: registro regenerado.
- Codex CLI `0.163.0`, API `skills/list`: 34 habilidades RSC y 3 propias detectadas.
- API `hooks/list`: diez hooks de proyecto habilitados y `trusted`, sin warnings ni errores.
- API `thread/start` creó la sesión efímera `01a16973-794c-7580-828b-a995b5a00407`, sin turnos de modelo;
  al cerrar el app-server propio se comprobó su ancla de memoria local de `SessionEnd`.
  Los dos procesos de validación finalizaron con código 0.
- Claude: cuatro comandos configurados de inicio/cierre ejecutados directamente, código 0,
  con su ancla de memoria local. Esto no acredita una conversación en la extensión gráfica.
- Sintaxis: `node --check` sobre 21 scripts por repositorio y
  `bash -n` sobre 1 plantilla shell: PASS. JSON y TOML de asistentes válidos.
- Preservación: comparación SHA-256 de 1202 archivos existentes
  ajenos al alcance: PASS; cuerpo original de instrucciones y habilidades propias conservados.
  Se mantuvieron ambas ramas y todo el trabajo de Catalog/mitigaciones.
- `drift check`: 107 documentos OK en este repositorio.
- `git diff --check`: PASS.
- Comprobación de configuración de usuario mediante TOML: sólo veinte entradas nuevas de confianza
  vinculadas a rutas KMA; el resto permaneció idéntico al respaldo privado.
- La publicación de documentación y las actualizaciones automáticas están desactivadas mediante
  opt-outs persistidos. No se conectó Context7 ni se configuró ningún servicio externo.

### Ajustes de compatibilidad observados

El diagnóstico estructural de RSC por sí solo no detectó que Codex inicialmente sólo veía
las habilidades propias. Se expusieron las habilidades mediante enlaces en `.agents/skills`.
Se retiró el arreglo `tools` de los asistentes generados de Go/React y el límite
`additionalContextLimit` de PreCompact, SessionEnd y Stop, que el cliente rechazaba o advertía.
El matcher shell de PostToolUse contempla `exec_command` y `write_stdin`, además de `Bash`,
para corresponder a los nombres de herramientas nativas de Codex.
`node scripts/rsc-compat.mjs` permite repetir estos ajustes después de resincronizar 3.0.10.
No modifica el código de la aplicación ni depende de MEDM.

### Revisión independiente

La revisión con contexto limpio detectó que `ship` y `review` incluyen un nombre personal
del autor del paquete (Eric) como condición de autoría. Se añadió una regla explícita en
`AGENTS.md`: prevalecen las instrucciones de KMA y se conserva la identidad Git configurada;
los nombres personales del paquete no autorizan reemplazarla ni rechazarla. No se modificó
la identidad Git ni ningún commit. El revisor comprobó la corrección en ambos repositorios
y cerró el hallazgo sin nuevos defectos confirmados. La repetición del script de compatibilidad mantuvo
las definiciones de hooks idénticas (idempotencia).

### Límites y controles omitidos

No se repitieron suites Go, lint/tipos/build de la aplicación ni E2E: el alcance sólo cambia
la instalación de agentes, instrucciones y documentación. No se ejecutaron turnos de modelo
ni conversaciones en las extensiones de VS Code. Tampoco se acreditó la invocación de
asistentes o el disparo automático de PostToolUse durante un turno de modelo. Claude se verificó por diagnóstico y ejecución
directa de sus comandos configurados, sin atribuirles una prueba automática de la extensión.
El worktree anterior de RSC en la web permanece intacto.

## Siguiente

Abrir una conversación nueva dentro del checkout original para cargar estas habilidades.
La instalación está verificada localmente; no se publicaron ni fusionaron cambios.

La web conserva su constitución v1.0.0 aprobada y `doctor` informa `onboarding: ready`.
