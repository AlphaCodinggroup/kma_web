---
author: Pablo
branch: new-ui
status: verified
---
# Carga XLSX como primera sección del catálogo

## Intención y alcance

Mostrar la carga de un catálogo nuevo al entrar en Catalog. Cambio de orden en
`CatalogManager`: Upload XLSX queda inmediatamente después del título, seguido
por los mensajes y la vista previa de validación. Después aparecen el catálogo
activo, la consulta, las operaciones y el historial. Se conservan controles,
confirmaciones, restricciones y contratos.

## Criterios y checklist

- [x] Upload XLSX es la primera sección tanto en escritorio como en móvil.
- [x] El selector de archivo está visible y habilitado en el primer viewport.
- [x] No hay desbordamiento horizontal ni errores de consola en esas vistas.
- [x] Lint, tipos y las pruebas existentes de UI del catálogo pasan.
- [x] Explicar `version=legacy` sin modificar datos ni versiones.
- [x] Publicar y verificar el nuevo trabajo de Amplify en la rama Dev `new-ui`.

## Evidencia

Chrome DevTools, sesión local de administrador, 29/10/2026:

| Vista | Primera sección | Selector de archivo | Desbordamiento |
| --- | --- | --- | --- |
| 1440 × 900 px | Upload XLSX, y=242 px | y=328–368 px, habilitado | No |
| 390 × 844 px | Upload XLSX, y=266 px | y=392–436 px, habilitado | No |

Consola sin errores ni advertencias. No se cargaron ni importaron archivos.
Lint del componente y `npm run typecheck` aprobados con Node 22. Vitest:
45 pruebas en cuatro archivos de UI del catálogo, todas aprobadas. Revisión
independiente: los bloques movidos y el resto del componente conservan su
contenido; detector de layout sin hallazgos.

`version=legacy` identifica el catálogo original, anterior a las versiones
creadas por importaciones. No identifica una versión antigua del frontend ni
del backend. El estado consultado en BE Dev el 29/10 conserva
`active_version=legacy`, `revision=legacy:0`, `enabled=true`. Una importación
completada activa su versión nueva; la URL conserva una versión para navegar
sus registros de forma consistente. Este ajuste visual no modifica ese estado.

## Siguiente

Desplegado en Dev: Amplify `10`, BUILD/DEPLOY/VERIFY en `SUCCEED`, commit
`4ad8f103cf8681f7bcabb5c6f894bbd3f18621ca`. URL pública y CSS responden
200; el visitante sin sesión es redirigido a login. La comprobación autenticada
del orden se hizo en local, sin importaciones ni cambios de datos. Tiempo total
aproximado: 9 minutos, incluidas pruebas y espera de Amplify. Sin pendientes funcionales
en el alcance solicitado. Este registro de cierre se actualizó después del despliegue.
