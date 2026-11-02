# KMA — Daylight Section

Estado: implementación completa y validada, incluidos los ajustes posteriores pedidos por Pablo. **Actualización 2026-10-08:** el acento dorado pasó al rojo del logo de KMA ([brand-red-logo.md](brand-red-logo.md)) y el editor de flujos recuperó la estructura de producción ([main-parity.md](main-parity.md)); donde este documento habla de dorado o de un índice de pasos de 300 px, rige lo posterior. Pablo eligió la referencia Daylight Section y pidió continuar hasta terminar todo el frontend. Sustituye la dirección petróleo anterior; conserva su trabajo funcional.

## Dirección aprobada

Referencia: https://impeccable.style/worlds/cards/architecture-inhabitable-space-daylight-section-hero.webp. Aplicación de trabajo: jerarquía operativa y controles reconocibles, con la precisión de un plano arquitectónico. Papel neutro, tinta y dorado Kinpaku; Alumni Sans para títulos y Albert Sans para lectura, bordes finos y superficies que responden al tema, incluida la navegación. La firma visual es la franja de revisión conectada y el encuadre de evidencias, sin disfrazar el producto de una landing.

El comando `concept-seed --scope direction --mode operate` se ejecutó antes de los cambios. La selección explícita de Pablo prevalece sobre la asignación del catálogo, como establece Impeccable. No se abre otra ronda de elección.

## Direction contract

THESIS: una mesa de revisión que combina precisión arquitectónica y lectura operativa; la evidencia y la cola de trabajo ocupan el primer plano, con respuesta inmediata de sus controles.

OWN-WORLD: papel y tinta de los tokens Kinpaku oficiales con el rojo del logo como acento (antes, luz dorada); reglas finas, radios 4/8 px, Alumni Sans en títulos, Albert Sans en datos y lectura. La navegación es clara en Light y oscura en Dark, como pidió Pablo; desplazamientos de 1–2 px y presión de controles inspirados en Neo Mirai.

STORY: reconocer qué espera revisión, abrir su contexto, contrastar respuestas y fotos reales, guardar cambios y entregar un informe verificable.

FIRST VIEWPORT: navegación lateral de 248 px y cabecera de 64 px; título y acción a continuación; en dashboard, franja conectada con recuentos reales antes de actividad y portfolio. En login, composición de arquitectura original a la izquierda y formulario accesible a la derecha.

FORM: adaptación operativa de Daylight Section elegida explícitamente por Pablo; `concept-seed` ejecutado, clave `f3d02a94`, asignación de catálogo reemplazada por la elección fijada del usuario. Ejecución en código sobre funciones existentes; la imagen del catálogo es referencia artística, no un mock de KMA ni una composición de aplicación aprobada.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Contrato compartido

Los pedidos posteriores de Pablo sustituyen la navegación oscura permanente, las fuentes y la paleta aproximadas. [Ajustes y procedencia](user-feedback.md).


- Tokens oficiales Kinpaku de Impeccable: papel `oklch(97.8% 0 0)`, superficie `oklch(99.5% 0 0)`, texto `oklch(22% 0 0)`, tinta `oklch(13% 0 0)`; el dorado `oklch(84% .19 80.46)` fue sustituido por el rojo `#E2231A` del logo. Alias semánticos de KMA para evitar colores dispersos.
- Oscuro derivado de las superficies instrumentales del mismo sitio: fondo `oklch(17% 0 0)`, superficie `oklch(24% 0 0)`, texto `oklch(93% 0 0)`. Todos los paneles responden al tema; no se fuerza una isla oscura en Light.
- Alumni Sans local para marca y títulos; Albert Sans local para lectura, secciones, controles y datos. Source Sans 3 se conserva exclusivamente en el documento del informe.
- SVG Lucide con trazo de 1,5 px, consistente con los SVG de Impeccable; geometría intacta y texto accesible para cada acción.
- Controles 40 px escritorio y 44 px móvil/tablet; radios 4 px en controles y 8 px en paneles; foco visible y estados semánticos legibles.
- Movimiento de 120–200 ms: presión, elevación mínima, continuidad de iconos y apertura de paneles. Movimiento reducido elimina desplazamientos y mantiene feedback de color y estado.
- Fotos de auditorías desde los adjuntos existentes, con estados de ausencia/error. La ilustración original de arquitectura permanece como identidad del acceso.
- Se conservan navegación, permisos, contratos, filtros en URL, cursor, borradores, subidas, exportación, protección de cambios y guardado secuencial. PDF blanco y formato original.

## Reparto independiente

Coordinador: tokens y componentes compartidos, fuentes, identidad, navegación, login, dashboard, ilustración, integración, navegador y documentación. Gestión: Projects, Facilities, Users y detalle de proyecto. Auditorías: Audits, Reports y revisión, sin tocar el formato del PDF. Flujos: lista, editor y sus diálogos. Los módulos sólo consumen el contrato compartido; nadie modifica archivos compartidos ajenos ni ejecuta pruebas que escriban en el backend salvo el coordinador.

## Entregas y prueba

- [x] Identidad, composición y componentes comunes.
- [x] Navegación, login y dashboard.
- [x] Gestión y detalle de proyecto.
- [x] Auditorías, informes y revisión con evidencias.
- [x] Flujos y editor responsive.
- [x] Verificación nativa completa y recorridos de navegador.
- [x] Comparativas finales de las once pantallas en ambos temas y tres anchos, con accesibilidad y límites documentados.

## Cierre

Compilación estable desde el worktree, puerto 3001 y backend local existente. Evidencia anterior preservada antes de las capturas finales a 390, 768 y 1440 px, más comprobaciones a 320 y 1280 px y reflujo equivalente al ancho CSS de zoom 200 %. La entrega incluye capturas, video de controles, logs y acceso local. No incluye publicación ni despliegue.

## Evidencia de cierre

[Entrega, comprobaciones y límites](validation/entrega.md), [comparación antes/después](validation/gallery.html), [66 capturas finales](validation/capturas.md), [revisiones independientes](validation/review.md) y [sistema visual documentado](DESIGN.md). La validación final cerró con 3.377 tests en 235 archivos, 46 recorridos de navegador aprobados y 66 escenarios Axe sin infracciones detectadas. Tras el ajuste de cabeceras también pasaron 63 pruebas existentes, tipos y nueva compilación estable. Los cambios de apariencia y movimiento incluyen dos pruebas de comportamiento adicionales y una grabación de la aplicación. Dictamen independiente equivalente **disposition: ship** sobre el artefacto actual, con 66 capturas válidas y ocho ampliaciones; [revisión final](validation/user-feedback-review.md). El movimiento fue revisado mediante fuente y pruebas por el revisor, y comprobado en Chrome por el coordinador. Historial anterior conservado.
