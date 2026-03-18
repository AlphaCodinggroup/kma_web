# CLAUDE.md - Reglas para Claude Code

## 🔴 ANTES DE PROPONER CUALQUIER CAMBIO
- OBLIGATORIO: Rastrear TODOS los paths que tocan la funcionalidad afectada (BE, FE, App) ANTES de proponer una solución.
- OBLIGATORIO: Verificar todas las implementaciones existentes que consumen o producen el dato que se va a modificar.
- PROHIBIDO: Decir "se puede simplificar" o "es seguro" sin haber verificado cada consumidor y productor del dato en todo el sistema (backend, frontend web, app mobile, scripts, imports).
- Si no verificaste todo, decilo explícitamente: "No verifiqué todos los paths, puede haber casos que no contemplé."
- Una afirmación incorrecta puede llevar a decisiones que rompan producción. Verificar primero, opinar después.

## 🚨 REGLAS CRÍTICAS
- NUNCA usar valores hardcodeados a menos que se autorice explícitamente.
- NUNCA cambiar nada que no sea quirúrgicamente lo que se pide.
- Siempre usar parámetros dinámicos y configurables.
- Siempre comenzar con TLDR.
- Siempre antes de implementar esperar que el usuario acepte lo propuesto.

## Idioma
- Comentarios en español
- Código en inglés

## Repos del proyecto
- Backend: /home/pablo/Projects/AlphaCoding/kma-backend
- Frontend web: /home/pablo/Projects/AlphaCoding/kma_web
- App mobile: /home/pablo/Projects/AlphaCoding/KMA_app
