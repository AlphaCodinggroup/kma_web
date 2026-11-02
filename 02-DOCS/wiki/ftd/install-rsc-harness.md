---
author: Pablo
branch: chore/install-rsc-harness
status: complete
---

# Instalar RSC Harness en KMA Web

## Intención y alcance

Dejar RSC `3.0.10` preparado para Codex y Claude Code en VS Code,
en el worktree `.worktrees/install-rsc-harness`, con palabras simples.
Pablo aceptó el plan inicial y pidió posteriormente incluir ambos asistentes.
La instalación no modifica la aplicación ni publica o despliega cambios.

## Lista de tareas

- [x] Aplicar el plan aceptado y preparar las 31 habilidades para ambos clientes.
- [x] Conservar las instrucciones anteriores y las tres habilidades propias de KMA Web.
- [x] Crear `02-DOCS`, su índice y las reglas aprobadas por Pablo como `v1.0.0`.
- [x] Preparar el archivo de espacio de trabajo y recomendar ambas extensiones instaladas.
- [x] Conectar la memoria local y comprobar su ejecución nativa para ambos asistentes.
- [x] Verificar la confianza de los siete automatismos de memoria de Codex.
- [x] Comprobar que la conexión de Codex no guarda memoria fuera de este worktree.
- [x] Mantener desactivada la sincronización automática que publica documentación.
- [x] Documentar los ajustes y el alcance de las comprobaciones.

## Evidencia

- Plan inicial aceptado: `8b515c0cf43f160ce2002ed2c627d60d30f3d9e9768a01dbb128d731a327993c`.
- `rsc doctor --target codex --json` y `--target claude --json`: `healthy: true`,
  preparación `ready`, sin habilidades ni asistentes faltantes.
- La API nativa de Codex reconoce 34 habilidades del proyecto.
- La API nativa enumera siete automatismos adicionales de memoria, habilitados y
  con estado `trusted`; solo tienen efecto dentro de este worktree.
- Se observó ejecución automática de `SessionEnd` en una sesión de Codex sin turnos,
  tanto con CLI `0.160.0` como con el ejecutable `0.162.0-alpha.2` de VS Code.
- Claude Code CLI `2.1.281` aceptó la confianza del proyecto y creó el registro de
  `SessionStart` automáticamente; ambas extensiones ya estaban instaladas.
- Pruebas del adaptador: otras carpetas y cargas sin carpeta no escriben;
  inicio, edición, guardado y cierre dentro del worktree producen memoria válida.
- Se corrigió `tools` en dos asistentes de React: Codex rechazaba su tipo generado.
- La etiqueta genérica `hook-trust-required` de RSC no consulta la confianza nativa;
  el estado real de los siete automatismos se comprobó con Codex.
- No se ejecutaron conversaciones completas desde la interfaz gráfica de VS Code
  ni pruebas de la aplicación, cuyo código y dependencias no cambiaron.

## Siguiente

Abrir el [espacio de trabajo](../../../kma-rsc.code-workspace) e iniciar una
conversación nueva en la extensión elegida.
Los detalles de configuración y mantenimiento están en la
[guía de VS Code](../harness/vscode.md).
