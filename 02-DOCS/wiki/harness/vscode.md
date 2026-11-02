# RSC en VS Code

RSC 3.0.10 está instalado en el checkout original de KMA Web.
Abrir esta raíz en VS Code, o el [espacio de trabajo](../../../kma-rsc.code-workspace).
La instalación anterior del worktree se conserva, pero ya no es necesaria para usar RSC aquí.

## Comprobaciones actuales

- 34 habilidades RSC y tres propias de KMA Web reconocidas por la API nativa de Codex.
- Diez hooks de proyecto reconocidos, habilitados y con confianza ligada a su contenido exacto.
- Codex CLI 0.163.0 ejecutó el cierre de una sesión vacía y guardó memoria en este repositorio.
- Los hooks globales antiguos del worktree no se modificaron; su adaptador rechaza este checkout.
- Claude tiene sus hooks locales y pasa el diagnóstico de RSC; no se ejecutaron turnos de modelo
  ni una conversación desde la extensión gráfica durante esta instalación.
- Se conservaron las instrucciones propias y las reglas aprobadas v1.0.0.

## Mantenimiento

Actualizar los archivos de la misma versión con:

```sh
npx @ericrisco/rsc@3.0.10 sync --target claude,codex
node scripts/rsc-compat.mjs
```

El segundo comando expone las skills en `.agents/skills`, elimina el campo `tools` incompatible
con los asistentes Codex y retira tres límites de contexto que el cliente no admite.
Si cambia una definición de hook, Codex pedirá revisar su nueva huella de confianza.
Las actualizaciones de versión y la publicación automática están desactivadas.

Abrir una conversación nueva en este repositorio carga la instalación actual.
El [registro de instalación](../ftd/install-rsc-original-checkouts.md) contiene la evidencia.
