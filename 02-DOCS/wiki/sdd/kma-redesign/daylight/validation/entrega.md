# KMA Daylight Section — entrega

> **Actualización 2026-10-08.** Esta entrega describe el estado del 7 de octubre. Desde entonces el acento dorado es el rojo del logo ([brand-red-logo.md](../brand-red-logo.md)) y el editor de flujos tiene la estructura de producción, no el índice de 300 px que se describe abajo ([main-parity.md](../main-parity.md)). Las capturas de esta carpeta no reflejan esos dos cambios.

El frontend completo adopta Daylight Section y los ajustes posteriores pedidos por Pablo: papel y tinta Kinpaku con acento dorado (hoy rojo del logo), con Alumni Sans para títulos y Albert Sans para lectura y una estructura de trabajo coherente. La implementación está en el worktree `install-rsc-harness`; conserva RSC, contratos, roles y funciones existentes. No se modificó Pymes ni se publicó o desplegó.

Vista local: http://localhost:3001. [Galería comparativa](gallery.html), [índice de las capturas](capturas.md), [sistema visual extraído](../DESIGN.md) y [dictámenes independientes](review.md).

## Resultado

Se contrastaron fuentes, colores y SVG del sitio oficial de Impeccable, y la respuesta de las instalaciones de Neo Mirai al cursor. Los tokens Kinpaku se comparten mediante alias de KMA; las fuentes se sirven localmente con sus licencias. La barra lateral, marca, cajón móvil, cola de revisión e índice de pasos permanecen claros en Light y oscuros en Dark. Reports y Audits usan la misma cabecera que Projects: el subtítulo queda encima de la línea. [Pedidos y procedencia](../user-feedback.md).


Navegación clara u oscura según el tema, con contexto, menú móvil y apariencia persistente. Login con una ilustración arquitectónica original. Dashboard centrado en las colas reales y actividad visible; métricas secundarias separadas. Projects, Facilities y Users comparten formularios, listados y acciones accesibles dentro del ancho móvil. Detalle de proyecto distingue instalaciones, auditorías e informe consolidado.

Audits y Reports conservan búsqueda, filtros, ordenación y contexto de URL. La página guardada recupera el cursor necesario; un error conserva resultados parciales y requiere reintento explícito. Estados de trabajo de campo, eliminados y desconocidos no entran en la cola de revisión. Eliminar un informe actualiza el listado inmediatamente.

Revisión reúne respuesta, observación y adjunto existente; comentarios laterales o desplegables y acciones persistentes. Mantiene permisos, protección de cambios y guardado secuencial de hallazgos. El informe conserva papel blanco y formato original en ambos temas. Flows usaba aquí un índice de pasos de 300 px y un inspector (hoy: tabla de pasos e inspector de 340–480 px, como producción), panel de pasos en tamaños inferiores y título de ancho cómodo; conserva borradores, imágenes, validación y exportación.

## Comprobaciones

- `npm run verify`: lint sin errores, comprobación de tipos, 3.377 tests en 235 archivos y compilación de producción. Cobertura: 95,87 % de líneas/instrucciones, 92,89 % de ramas y 94,09 % de funciones. [Registro nativo](verify.log).
- 46 pruebas de Chromium aprobadas: login y persistencia; gestión de proyectos, instalaciones y usuarios; filtros y pestañas en URL; menú y foco; temas y movimiento reducido; superficies claras/oscuras también en navegación y paneles; respuesta al cursor y presión; cursor y reintento; ordenación móvil; eliminación de reportes; borradores, carga de imágenes, guardado y exportación de flujos; revisión, comentarios, guardado, aprobación, descarga y eliminación del informe. [Registro de navegador](browser.log).
- Ajuste final de cabeceras: 63 pruebas existentes aprobadas, comprobación de tipos y compilación estable posterior al cambio. [Pruebas](headers.log) y [compilación](build.log). El control de contraste de acciones de revisión comprueba ahora la relación real mínima de 4,5:1 en ambos temas, sustituyendo la expectativa de color de la paleta anterior. [Comprobación](review-action-contrast.log).
- Respuesta de controles grabada durante la prueba aprobada: cursor, presión y navegación con movimiento reducido. [Video](interaction.webm), disponible también en la galería.
- 66 capturas de las once pantallas a 390, 768 y 1440 px, en ambos temas. Fuentes e imágenes estabilizadas antes de capturar; sin desbordamiento de documento, errores de consola ni respuestas de servidor fallidas en la matriz. Revisión manual en Chrome y seis hojas de contacto. [Capturas](capturas.md).
- Pruebas adicionales de título y panel de pasos a 320, 390, 768 y 1280 px; reflujo de las diez pantallas autenticadas a 320 y 720 px, este último equivalente al ancho CSS de una ventana de 1440 px con zoom al 200 %.
- Axe: 33 escenarios por tema, cero infracciones detectadas con etiquetas WCAG 2/2.1/2.2 A y AA. [Claro](accessibility-light.json), [oscuro](accessibility-dark.json).
- Recorrido de revisión con backend local: adjunto servido por su URL real, hallazgo inicial de cantidad 2 × $1.250 = $2.500, comentario persistido, edición de cantidad a 3, guardado, recarga, aprobación y PDF descargado. [PDF resultante](reviewed-project.pdf): tres páginas, carta apaisada, 792 × 612 pt; el texto extraído confirma cantidad 3 y total $3.750. Se comprobó su asociación al proyecto y posteriormente la eliminación del reporte.
- Revisión visual independiente equivalente del artefacto actual: **disposition: ship**, seis hojas de contacto de 66 capturas válidas y ocho originales ampliados, sin ajustes materiales pendientes. El movimiento se contrastó con fuente y pruebas; la observación directa en Chrome corresponde al coordinador. [Dictamen final](user-feedback-review.md). Historial: un hallazgo móvil y tres regresiones funcionales corregidos y comprobados. [Detalle](review.md).

## Comparación y procedencia

La versión con navegación oscura permanente, Chakra Petch y la paleta aproximada se conserva en `before-impeccable-feedback`. Fue reemplazada según los pedidos explícitos de Pablo; la documentación vigente refleja los tokens y fuentes reales nuevos.


Las imágenes anteriores se preservan en `premium/validation/pre-close`; las finales están en `daylight/validation/after`. Comparten rutas, registros base, resoluciones, apariencias y estado de pantalla. Las pruebas de gestión crean entidades aisladas, por lo que nombres recientes y cantidades pueden cambiar entre rondas; la comparación visual no se presenta como equivalencia pixel a pixel de datos inmutables. La corrección móvil también conserva su antes específico en `before-mobile-fix`.

La ilustración de login es una imagen original generada para la identidad de KMA, optimizada a WebP de unos 154 KB. Su prompt y procedencia se conservaron junto al activo y en [login-illustration-prompt.txt](../login-illustration-prompt.txt). No sustituye evidencias de auditoría: esas imágenes provienen de los adjuntos servidos por el backend, incluidos los datos sintéticos de prueba local. Las fuentes se sirven desde la aplicación, con sus licencias.

## Límites observados

La comprobación corresponde a una compilación estable local y backend de pruebas. No se probaron Safari, Firefox, dispositivos físicos ni entornos desplegados. El reflujo a 720 px es una comprobación del ancho CSS equivalente, no una prueba automatizada del control de zoom nativo del navegador. Cero infracciones de Axe no certifica WCAG AA ni sustituye una auditoría con tecnologías de asistencia.

El lint conserva 50 advertencias existentes y la compilación avisa de las mismas clases de advertencias; no hubo errores de lint o tipos. Las métricas son agregados entregados por el backend: por ejemplo, los proyectos incluyen activos y archivados y se etiquetan `Workspace total`. No se cambiaron endpoints ni criterios de negocio.

El rol nativo de revisión y el de documentación de Impeccable no estaban disponibles en este harness; se usaron agentes con contexto fresco y sus mandatos equivalentes. El dictamen visual final cubre las superficies actuales inspeccionadas; no amplía la verificación funcional ni certifica accesibilidad. La aceptación subjetiva del diseño corresponde a Pablo. El estado técnico, capturas y límites quedan disponibles para comprobar la entrega.
