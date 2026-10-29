---
author: Pablo
branch: fix/frontend-startup-warnings
status: verified
---
# Actualizar RSC Web a 3.6.0

Pablo autorizó actualizar también la web el 2026-10-29. Se sincronizó RSC 3.6.0
para Codex y Claude, preservando las instrucciones propias, permisos y código.
`node scripts/rsc-compat.mjs` restablece el descubrimiento nativo de skills y
los campos compatibles de hooks Codex. La versión revisada queda fijada en AGENTS.

`doctor` confirma `healthy: true` en ambos asistentes, sin skills faltantes;
36 skills declaradas y disponibles. Se conservaron los agentes personalizados.
Las seis rutas modificadas respecto del respaldo corresponden exclusivamente
a RSC y su adaptador. Respaldo indicado en `/tmp/kma-web-rsc36-current`.
No se comprobó la activación en una sesión nueva del cliente.
