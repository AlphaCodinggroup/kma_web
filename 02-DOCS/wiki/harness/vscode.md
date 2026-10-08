# RSC en VS Code

La instalación está en `.worktrees/install-rsc-harness`, sobre la rama
`chore/install-rsc-harness`. Abrir el archivo
[espacio de trabajo](../../../kma-rsc.code-workspace) en VS Code: apunta a esta carpeta
para que Codex y Claude Code encuentren las mismas reglas y documentación.

## Configuración comprobada

- RSC `3.0.10`: 31 habilidades y seis asistentes para ambos clientes.
- Codex reconoce las 31 habilidades de RSC y las tres propias de KMA Web.
- Extensiones instaladas: Codex `26.1002.51308` y Claude Code `2.1.292`.
- Las reglas del proyecto están aprobadas como `v1.0.0`.
- Memoria local: no publica documentación ni sincroniza una rama remota.

## Memoria de Codex

El cliente instalado no enumeró los automatismos de `.codex/hooks.json`, aunque
sí leyó la configuración y las habilidades del proyecto. Se registraron siete
automatismos en la configuración de usuario de Codex mediante su API nativa,
con confianza en sus definiciones exactas y sin omitir la revisión de confianza.

Todos llaman a [un adaptador local](../../../01-TOOLS/rsc-codex-hook.mjs) que
comprueba que la carpeta pertenece a este worktree antes de guardar memoria.
Fuera de él no escribe nada; si se elimina el adaptador, los comandos no hacen nada.
No se cambiaron el modelo ni los permisos de usuario.

Se comprobó su ejecución automática al cerrar una sesión nativa sin turnos de
modelo, también usando el ejecutable incluido en la extensión de VS Code.
Las pruebas del adaptador comprobaron guardado, cierre y rechazo de otras carpetas.

## Memoria de Claude Code

Los automatismos están en `.claude/settings.json` y `.claude/settings.local.json`.
Se aceptó la confianza del proyecto mediante el diálogo nativo de Claude Code;
una sesión de CLI creó automáticamente el registro inicial de memoria.
La extensión utiliza la misma configuración, según la documentación oficial.

No se ejecutaron tareas de modelo ni se comprobó una conversación completa desde
la interfaz gráfica de las extensiones. Iniciar una conversación nueva en este
espacio de trabajo carga la instalación; las conversaciones existentes pueden
seguir usando su contexto anterior.

## Mantenimiento

La conexión de memoria de Codex depende de la ruta actual de este worktree.
Si se traslada, hay que actualizar esos siete comandos de usuario.
Una resincronización de RSC puede regenerar dos asistentes de React con una
propiedad `tools` incompatible con Codex: se eliminó esa propiedad de los archivos
locales `react-build-resolver.toml` y `react-reviewer.toml`, conservando sus instrucciones.

## Fuentes

- [Configuración compartida de Codex CLI y extensión](https://learn.chatgpt.com/docs/config-file/config-basic).
- [Automatismos y confianza de Codex](https://learn.chatgpt.com/docs/hooks).
- [Claude Code en VS Code y configuración compartida](https://code.claude.com/docs/en/vs-code).
