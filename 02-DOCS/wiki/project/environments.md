# Ambientes de KMA: web y backend

Estado registrado el **2026-10-29**, después del despliegue de Dev. Pablo
confirmó que **BE Dev corresponde a `us-east-1` y BE Prod a `us-east-2`**.
La región donde se aloja una web no identifica el backend al que está conectada.

## Tabla de ambientes

| Ambiente | Componente | Rama | Región de alojamiento | Backend consumido | Estado registrado |
| --- | --- | --- | --- | --- | --- |
| Prod | BE | `main` | `us-east-2` | — | Actualizado el 29/10/2026 |
| Prod | FE | `main` | `us-east-2` | **BE Dev, `us-east-1`** | No se redesplegó durante esta sesión |
| Dev | BE | `main` | `us-east-1` | — | Actualizado el 29/10/2026; 15 Lambdas verificadas |
| Dev | FE | `new-ui` | `us-east-2` | **BE Dev, `us-east-1`** | Actualizado y conectado al BE Dev actualizado |

**Pendiente:** la web principal (`main`) está marcada PRODUCTION en Amplify,
pero también consume el BE Dev. Es una configuración observada que queda por
revisar, no una regla deseada. No se cambió esa conexión durante esta entrega.

## Alojamiento, conexión y versiones

- Cuenta AWS: `897729125858`; aplicación Amplify `kma_web`, ID
  `d3mbp3kh3ub3q9`, alojada en `us-east-2`.
- [Web Dev](https://new-ui.d3mbp3kh3ub3q9.amplifyapp.com/dashboard): rama
  `new-ui`, etapa DEVELOPMENT. Commit publicado
  `318dfa5a8999566e7fc0033bd77116105f8f2464`, trabajo `12`, `SUCCEED`.
  Incluye [Upload XLSX como primera sección](../ftd/catalog-upload-first.md).
- [Web principal](https://main.d3mbp3kh3ub3q9.amplifyapp.com/dashboard): rama
  `main`, etapa PRODUCTION. No se redesplegó durante esta sesión.
- Ambas ramas heredan actualmente
  `NEXT_PUBLIC_API_BASE_URL=https://0s46o3anuj.execute-api.us-east-1.amazonaws.com/api`
  y Cognito de Dev desde la configuración global de Amplify; no hay una
  sobrescritura de esa URL por rama. El despliegue de `new-ui` conservó esas
  variables.
- BE Dev actualizado: `main`, commit
  `efa2064d627cc455be5f925a587155c72652ba3f`; 15 funciones verificadas en
  `us-east-1`, incluidas catálogo y su worker. API de Prod: `369uf95fgb`,
  ubicada en `us-east-2`.

## Evidencia y mantenimiento

Se consultaron aplicación, ramas y trabajos en Amplify, funciones y rutas en
AWS, y se comprobó HTTPS. `/dashboard` redirige a login al visitante sin sesión;
HTML y estilos responden 200. Esto no acredita un recorrido autenticado completo
con un usuario real. El
[registro del backend](../../../../kma-backend/02-DOCS/wiki/ftd/deploy-dev-us-east-1-2026-10-29.md)
documenta las verificaciones de despliegue y las lecturas administrativas.

Los ajustes locales de infraestructura y documentación quedaron sin commit ni
push al cerrar la sesión. Consultar `git status` para conocer su estado posterior.
Reverificar la configuración efectiva de AWS antes de otro despliegue; no inferir
conexiones por nombres de ramas, etiquetas o regiones de alojamiento.

Actualización posterior del BE Dev: enrichment, reports-worker, catalog y su
worker quedaron en `9f9e4ccc`; las otras once funciones conservan la entrega
anterior. [Catálogo activo y cierre de entrega](../ftd/catalog-active-default.md).
