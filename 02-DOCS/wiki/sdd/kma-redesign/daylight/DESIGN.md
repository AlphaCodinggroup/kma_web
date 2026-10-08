---
name: KMA Daylight Section
description: Papel Kinpaku, Alumni Sans y Albert Sans con respuesta operativa inspirada en Neo Mirai.
colors:
  kinpaku: oklch(84% .19 80.46)
  kinpaku-pale: oklch(86% .07 84)
  on-gold: oklch(14% .018 95)
  paper: oklch(97.8% 0 0)
  paper-raised: oklch(99.5% 0 0)
  paper-deep: oklch(95% 0 0)
  gray: oklch(92% 0 0)
  gray-2: oklch(88% 0 0)
  ink: oklch(13% 0 0)
  text: oklch(22% 0 0)
  text-muted: oklch(46% 0 0)
  edge: oklch(13% 0 0 / .45)
  instrument: oklch(24% 0 0)
  instrument-deep: oklch(17% 0 0)
  instrument-raised: oklch(31% 0 0)
  instrument-text: oklch(93% 0 0)
  instrument-muted: oklch(68% 0 0)
  instrument-rule: oklch(100% 0 0 / .12)
  focus-ring: oklch(45% .1 190)
  danger: '#b4233e'
  danger-bg: '#fff1f3'
  danger-border: '#f1c3cd'
  warning: '#865b08'
  warning-bg: '#fff7e7'
  warning-border: '#eed9a9'
  success: '#217453'
  success-bg: '#edf8f2'
  success-border: '#bddfcd'
  info: '#186590'
  info-bg: '#eaf5fb'
  info-border: '#bbdced'
  dark-danger: '#ff9aab'
  dark-danger-bg: '#361f2c'
  dark-danger-border: '#653144'
  dark-warning: '#edc578'
  dark-warning-bg: '#312b1f'
  dark-warning-border: '#5d4d31'
  dark-success: '#83d6b0'
  dark-success-bg: '#17382e'
  dark-success-border: '#2e5948'
  dark-info: '#8bc8ed'
  dark-info-bg: '#183344'
  dark-info-border: '#2c536b'
typography:
  display:
    fontFamily: Alumni Sans, Albert Sans, ui-sans-serif, sans-serif
    fontSize: clamp(38px, 3.6vw, 52px)
    fontWeight: 400
    lineHeight: 1.04
    letterSpacing: '0'
  login-display:
    fontFamily: Alumni Sans, Albert Sans, ui-sans-serif, sans-serif
    fontSize: 50px
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: '0'
  login-display-xl:
    fontFamily: Alumni Sans, Albert Sans, ui-sans-serif, sans-serif
    fontSize: 60px
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: '0'
  wordmark:
    fontFamily: Alumni Sans, Albert Sans, ui-sans-serif, sans-serif
    fontSize: 32px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.18em
  title:
    fontFamily: Albert Sans, ui-sans-serif, system-ui, sans-serif
    fontSize: 20px
    fontWeight: 600
    lineHeight: 28px
  body:
    fontFamily: Albert Sans, ui-sans-serif, system-ui, sans-serif
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.4667
  control:
    fontFamily: Albert Sans, ui-sans-serif, system-ui, sans-serif
    fontSize: 14px
    fontWeight: 600
    lineHeight: 20px
  field:
    fontFamily: Albert Sans, ui-sans-serif, system-ui, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
  field-touch:
    fontFamily: Albert Sans, ui-sans-serif, system-ui, sans-serif
    fontSize: 16px
    fontWeight: 400
  label:
    fontFamily: Albert Sans, ui-sans-serif, system-ui, sans-serif
    fontSize: 12px
    fontWeight: 500
    lineHeight: 20px
  auxiliary:
    fontFamily: Albert Sans, ui-sans-serif, system-ui, sans-serif
    fontSize: 13px
    fontWeight: 500
  navigation-group:
    fontFamily: Albert Sans, ui-sans-serif, system-ui, sans-serif
    fontSize: 11px
    fontWeight: 600
    letterSpacing: 0.12em
  counter:
    fontFamily: Albert Sans, ui-sans-serif, system-ui, sans-serif
    fontSize: 32px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: -0.04em
  counter-md:
    fontFamily: Albert Sans, ui-sans-serif, system-ui, sans-serif
    fontSize: 40px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: -0.04em
rounded:
  control: 4px
  panel: 8px
spacing:
  tight: 8px
  field: 12px
  group: 16px
  panel: 20px
  section: 24px
  modal-wide: 28px
  desktop: 32px
components:
  button-primary:
    backgroundColor: '{colors.kinpaku}'
    textColor: '{colors.on-gold}'
    typography: '{typography.control}'
    rounded: '{rounded.control}'
    padding: 8px 16px
  button-primary-hover:
    backgroundColor: color-mix(in srgb, var(--kma-accent) 88%, var(--kma-surface))
  button-secondary:
    backgroundColor: '{colors.paper-raised}'
    textColor: '{colors.text}'
    typography: '{typography.control}'
    rounded: '{rounded.control}'
    padding: 8px 16px
  button-secondary-hover:
    backgroundColor: '{colors.paper-deep}'
  button-ghost:
    backgroundColor: transparent
    textColor: '{colors.text}'
    typography: '{typography.control}'
    rounded: '{rounded.control}'
    padding: 8px 16px
  button-ghost-hover:
    backgroundColor: '{colors.paper-deep}'
  button-destructive:
    backgroundColor: '{colors.danger-bg}'
    textColor: '{colors.danger}'
    typography: '{typography.control}'
    rounded: '{rounded.control}'
    padding: 8px 16px
  input:
    backgroundColor: '{colors.paper-raised}'
    textColor: '{colors.text}'
    typography: '{typography.field}'
    rounded: '{rounded.control}'
    padding: 8px 12px
  panel:
    backgroundColor: '{colors.paper-raised}'
    textColor: '{colors.text}'
    rounded: '{rounded.panel}'
  navigation:
    backgroundColor: '{colors.paper-raised}'
    textColor: '{colors.text-muted}'
    rounded: '{rounded.control}'
    padding: 10px 12px
  navigation-selected:
    backgroundColor: '{colors.gray}'
    textColor: '{colors.ink}'
    rounded: '{rounded.control}'
  badge-warning:
    backgroundColor: '{colors.warning-bg}'
    textColor: '{colors.warning}'
    typography: '{typography.label}'
    padding: 2px 10px
  navigation-dark:
    backgroundColor: '{colors.instrument-deep}'
    textColor: '{colors.instrument-muted}'
    rounded: '{rounded.control}'
    padding: 10px 12px
  navigation-selected-dark:
    backgroundColor: '{colors.instrument-raised}'
    textColor: '{colors.kinpaku-pale}'
    rounded: '{rounded.control}'
---

# Design System: KMA Daylight Section

## Overview

**Creative North Star: "Daylight Section"**

Una mesa de revisión con precisión arquitectónica: papel neutro, tinta y luz dorada Kinpaku. Alumni Sans da identidad condensada a página y marca; Albert Sans mantiene la lectura de datos, formularios y secciones. Las reglas finas y los controles familiares permiten trabajar con calma.

La composición conecta tareas, datos y evidencias reales. La apariencia cubre todo el espacio operativo: la navegación, la marca, la franja de revisión y el índice de pasos son claros en Light y oscuros en Dark. La respuesta de botones e iconos adapta los detalles de Neo Mirai a acciones de trabajo; el contenido permanece estable durante la lectura.

Los [ajustes explícitos de Pablo](user-feedback.md) sustituyen fuentes, paleta y navegación oscura permanente de la primera adaptación. La [dirección elegida](implementation.md) conserva su composición y [PRODUCT.md](../../../../../PRODUCT.md) las restricciones del producto. El [diseño petróleo](../premium/DESIGN.md) y la [adaptación previa](validation/before-impeccable-feedback/DESIGN.md) quedan como historia. Los valores se extraen del [estilo global](../../../../../app/globals.css), las [fuentes locales](../../../../../app/layout.tsx), los [controles](../../../../../src/shared/ui/controls.tsx) y los componentes citados abajo; este documento no acredita los nuevos resultados de navegador o compilación, todavía en curso al escribirlo.

**Key Characteristics:**

- Primitivos Kinpaku oficiales en OKLCH y alias semánticos de KMA.
- Alumni Sans para página y marca; Albert Sans para secciones, cifras y lectura.
- Light y Dark completos, incluida la navegación y los paneles de marca.
- SVG Lucide de trazo fino y movimiento breve ligado a acciones reales.
- Evidencias reales junto a respuestas; informe blanco con Source Sans 3 separado del tema.

## Colors

La paleta mantiene los valores OKLCH de los primitivos Kinpaku y conserva los tonos semánticos existentes de KMA; no convierte los alias de uso en una segunda paleta.

### Primary

- **Oro Kinpaku** (`kinpaku`): fondo del botón principal y pequeño detalle de marca; lleva **tinta sobre oro** (`on-gold`). El dorado es el mismo en los dos temas.
- **Tinta de acción** (`ink`): enlaces, selección y anillos de controles en Light. En Dark estas funciones usan **Kinpaku pálido** (`kinpaku-pale`).
- **Foco general** (`focus-ring`): contorno visible de enlaces y superficies en Light; en Dark se resuelve a `kinpaku-pale`. Los controles compartidos conservan su anillo de color primario.

### Secondary

- **Éxito**, **advertencia**, **error** e **información**: cada tono tiene texto, fondo suave y borde propios. Las variantes `dark-*` conservan el significado en oscuro; las etiquetas visibles expresan el estado además del color.

### Neutral

- **Papel** (`paper`), **papel elevado** (`paper-raised`) y **papel profundo** (`paper-deep`): fondo, superficie y cambios suaves de estado.
- **Gris seleccionado** (`gray`) y **regla gris** (`gray-2`): selección y bordes de Light.
- **Texto** (`text`), **tinta** (`ink`) y **texto secundario** (`text-muted`): datos, marca y contexto.
- **Borde de campo específico** (`edge`): tinta translúcida usada por los selectores de los diálogos de proyecto; no reemplaza el borde compartido de todos los campos.
- **Superficies instrumentales** (`instrument-deep`, `instrument`, `instrument-raised`): fondo, superficie y selección de Dark; llevan `instrument-text`, `instrument-muted` e `instrument-rule`.

Dark es una derivación operativa de la familia instrumental del mismo sitio, aplicada por KMA; no se presenta como un tema de aplicación descargado de Impeccable. La procedencia de los primitivos y la inspección del sitio están registradas en [fuentes comprobadas](user-feedback.md#fuentes-y-color-comprobados).

| Alias semántico | Light | Dark |
| --- | --- | --- |
| Fondo | `paper` | `instrument-deep` |
| Superficie | `paper-raised` | `instrument` |
| Tono sutil | `paper-deep` | `instrument-raised` |
| Texto / secundario | `text` / `text-muted` | `instrument-text` / `instrument-muted` |
| Borde / selección | `gray-2` / `gray` | `instrument-rule` / `instrument-raised` |
| Enlace y anillo de control | `ink` | `kinpaku-pale` |
| Fondo de marca y navegación | `paper-raised` | `instrument-deep` |
| Texto de marca | `ink` | `instrument-text` |
| Botón principal | `kinpaku` / `on-gold` | `kinpaku` / `on-gold` |

**The Gold and Ink Rule.** El dorado ilumina superficies y señales; el texto de acción usa tinta en Light y Kinpaku pálido en Dark, mientras el botón dorado conserva su tinta propia.

**The Whole Theme Rule.** La navegación y los paneles de marca responden a Light y Dark junto al contenido; la ilustración y el informe conservan sus colores de documento.

## Typography

**Display Font:** Alumni Sans local, con Albert Sans y sans-serif como respaldo.

**Body Font:** Albert Sans local, con ui-sans-serif, system-ui y sans-serif como respaldo; sirve también secciones y recuentos. Las dos familias variables cubren pesos (100–900) y se sirven con intercambio de fuente. Sus [licencias Albert Sans](../../../../../public/fonts/albert-sans-OFL.txt) y [Alumni Sans](../../../../../public/fonts/alumni-sans-OFL.txt) acompañan a los archivos locales.

**Report Font:** Source Sans 3 se conserva exclusivamente dentro del informe blanco, con su formato y escala anteriores.

**Character:** Alumni Sans ofrece títulos condensados y verticales, en estilo normal; Albert Sans permite leer el trabajo frecuente sin cambiar de familia entre dato y contexto. Se adoptan las familias oficiales y se ajustan sus tamaños al modo Operate: una aplicación donde importa completar la tarea, con objetivos táctiles y recuentos legibles.

### Hierarchy

- **Display:** título de página fluido (38–52 px, peso 400, interlínea 1.04, espaciado 0), en mayúsculas y sin inclinación; su definición normativa es `display`.
- **Login display:** el título de la ilustración de acceso crece de (50 px) a (60 px) desde `xl`, con interlínea (1.05); es una variante localizada de `display`.
- **Wordmark:** marca condensada (32 px, peso 500, interlínea 1, espaciado 0.18 em), con un pequeño cuadrado dorado.
- **Title:** secciones Albert Sans (20/28 px, peso 600). Los títulos de diálogo usan el mismo tamaño con peso firme (700).
- **Body:** lectura (15 px, interlínea 1.4667, aproximadamente 22 px). Los subtítulos de página tienen ancho máximo (65 ch).
- **Control:** botones y navegación (14/20 px); el botón usa peso (600) y la navegación combina pesos (500/600). Las etiquetas compartidas de formulario usan (14 px, peso 500).
- **Field:** campos (14/20 px) en escritorio; pasan a (16 px) bajo (1024 px) o con puntero táctil. Los botones conservan su tamaño de texto.
- **Label:** badges y ayuda breve (12 px); el badge usa interlínea (20 px). Metadatos de usuario y salida usan (13 px); agrupaciones funcionales de navegación y referencias compactas usan (11 px).
- **Counter:** recuentos de revisión Albert Sans (32 px), ampliados a (40 px) desde `md`, con peso (500), cifras tabulares e interlínea (1).

**The Two Reading Speeds Rule.** Alumni Sans identifica página y marca; Albert Sans conserva una lectura continua en secciones, campos, respuestas y datos.

## Layout

El [espacio de trabajo](../../../../../src/widgets/shell/AppShell.tsx) tiene cabecera de (64 px), navegación lateral de (248 px) desde (1024 px) y contenido con ancho máximo de (1440 px). La zona de contenido tiene desplazamiento propio y ancho mínimo cero; sus márgenes interiores son (16 px), (24 px) desde `md` y (32 px) desde `lg`, con separación vertical de (24/32 px).

La cabecera de página permite que título y acción cambien de línea; una regla inferior y el espacio de sección los separan del contenido. Listados y respuestas comparten contenedores continuos, con bordes entre filas. Los módulos adaptan tabla, detalles y acciones al espacio disponible, sin una cuadrícula fija universal.

Por debajo de (1024 px), la navegación lateral se abre en diálogo desde la cabecera; su ancho es el menor entre (320 px) y el ancho de pantalla menos (40 px). Los controles tienen altura mínima de (40 px) en escritorio y de (44 px) por debajo de (1024 px) o con puntero táctil; la navegación y los botones de icono ya usan objetivos de (44 px).

Los puntos de cambio observados son `sm` (640 px), `md` (768 px), `lg` (1024 px) y `xl` (1280 px). El dashboard coloca actividad y portfolio en columnas desde `xl`, con una columna de portfolio de (260 px). El editor de flujos muestra pasos en una columna de (300 px) desde `xl` y ofrece un diálogo de pasos por debajo. Las respuestas con fotografías usan dos columnas desde `md`; en poco espacio la evidencia queda debajo de la respuesta.

El acceso usa una composición de dos columnas desde `lg` (1.15:1), con ilustración original a la izquierda y formulario de ancho máximo (380 px) a la derecha. Por debajo, la ilustración se oculta y quedan marca, apariencia y formulario. Estas son composiciones de sus superficies, no requisitos para todas las páginas.

## Elevation & Depth

El espacio operativo permanece plano: fondo, superficie, borde y estado separan los contenidos. La profundidad acompaña la interacción del botón principal y las capas superpuestas; no añade una sombra permanente a cada panel.

### Shadow Vocabulary

- **Botón principal bajo el puntero:** sombra mínima (`0 3px 8px color-mix(in srgb, var(--kma-accent) 20%, transparent)`), sólo con puntero preciso y capacidad de hover.
- **Diálogo:** sombra difusa (`0 16px 48px rgb(19 23 24 / 18%)`) y velo (`rgb(19 23 24 / 60%)`); el diálogo compartido añade desenfoque de fondo (2 px).
- **Navegación móvil:** sombra del panel superpuesto (`0 25px 50px -12px rgb(0 0 0 / 25%)`).

**The Paper Plane Rule.** Paneles y filas se separan por tono y regla; el botón principal responde con una sombra mínima al hover y las capas superpuestas usan profundidad difusa.

El movimiento comparte la curva `cubic-bezier(.2, .8, .2, 1)`: color, borde y transformación rápida usan (120 ms), y sombra e iconos (200 ms). Los botones suben (1 px) al hover con puntero preciso; al presionar bajan (1 px) y se comprimen a (0.98). Los iconos de navegación avanzan (2 px), y los de revisión (2 px a la derecha, 2 px hacia arriba), con foco o hover. El diálogo llega por claridad durante (180 ms), de opacidad (0.9) y desenfoque (0.8 px) a opacidad plena y sin desenfoque; no desplaza su geometría.

Con movimiento reducido, se anulan desplazamientos, compresión y animación de llegada del diálogo; las demás animaciones y transiciones pasan a (0.01 ms), con una sola vuelta y desplazamiento de página inmediato. Los cambios de color, el foco y los mensajes siguen dando respuesta a la acción.

## Shapes

Controles de esquinas discretas (4 px), paneles y contenedores de datos de esquinas suaves (8 px), y reglas de (1 px). Los badges de estado son plenamente redondeados; esta forma compacta identifica una etiqueta y no altera la forma de las filas de navegación.

La marca combina letras condensadas con un cuadrado dorado de (6 px), separado por (6 px). Los indicadores cuadrados de revisión y los encuadres de evidencia mantienen la relación con un plano arquitectónico.

Los iconos conservan la geometría SVG de Lucide y adoptan el trazo fino (1.5 px) observado en Impeccable, con tamaños operativos habituales de (16–20 px). Mantienen etiquetas de acción accesibles y quedan decorativos cuando acompañan texto. Los SVG del informe conservan el trazo original (2 px).

## Components

### Buttons

Acciones firmes y reconocibles, sin sombra de base. El [botón compartido](../../../../../src/shared/ui/controls.tsx) ofrece principal, secundario, discreto y destructivo; comparten esquinas, separación entre icono y texto (8 px), relleno (8 × 16 px) y altura mínima operativa.

El principal usa Kinpaku y tinta sobre oro; el secundario usa superficie con borde; el discreto tiene fondo transparente; el destructivo usa el fondo suave, borde y texto de error. Al pasar el puntero, el principal mezcla dorado (88 %) con superficie, los secundarios usan tono sutil y el destructivo mezcla su fondo (85 %) con el tono de error. El foco del control compartido usa un anillo de color primario (2 px). La elevación mínima al hover y la presión están descritas en Elevation & Depth; no se activan desplazamientos con movimiento reducido. Pendiente y deshabilitado conservan la etiqueta y reducen opacidad; el ancho completo es el valor por defecto, con acciones de cabecera ajustadas a su contenido.

### Chips

Etiquetas de estado compactas y legibles. El [badge compartido](../../../../../src/shared/ui/badge.tsx) ofrece variantes suave, sólida y de contorno; el estado habitual usa fondo suave, texto semántico y borde interior (1 px). Su tamaño pequeño tiene relleno (2 × 10 px) y el mediano (4 × 12 px). El texto expresa el estado aunque el color no se perciba.

### Cards / Containers

Una hoja de trabajo continua. Los paneles usan superficie, borde fino y radio de panel; las filas se separan dentro del mismo contenedor. El relleno se adapta al contenido con los pasos compartidos de (16/20/24/32 px), sin convertir cada bloque de información en una tarjeta independiente.

### Inputs / Fields

Campos rectos sobre papel, con etiqueta visible. Campo y textarea usan superficie, texto principal, borde y relleno (8 × 12 px). El foco del control compartido añade anillo (2 px); el campo de estilo base usa borde primario y anillo suave (3 px). El error cambia borde y foco al tono de error; el texto de ayuda y el mensaje quedan junto al campo. Deshabilitado reduce opacidad (0.6). El control de contraseña conserva un objetivo de (44 px).

### Navigation

Papel claro en Light y superficie instrumental profunda en Dark. La [navegación](../../../../../src/widgets/shell/SidebarNav.tsx) usa filas con esquinas de control, iconos de trazo y altura mínima (44 px); la selección combina fondo gris, texto primario del tema y peso firme. El puntero introduce el fondo seleccionado; el estado pendiente muestra indicador de carga. El icono avanza (2 px) con foco o hover, sin mover la etiqueta. El diálogo móvil sigue el tema y devuelve el foco al cerrarse; el panel de marca y el índice de pasos también conservan esta relación entre fondo y texto.

La [apariencia](../../../../../src/shared/ui/theme-toggle.tsx) es un selector compacto con icono, borde y superficie. Ofrece claro, oscuro y sistema, se conserva en el acceso y se guarda mediante el proveedor de tema; el cambio de tema evita animar la transición global.

### Review pipeline

Una [franja de tres tramos conectados](../../../../../src/widgets/dashboard/ReviewPipeline.tsx), con un único borde y radio exterior. Cada tramo enlaza a su cola filtrada y muestra su recuento real. La revisión pendiente usa el panel de marca del tema y su cifra primaria; los otros tramos usan superficie. Sus iconos apuntan al destino con desplazamiento (2 px, −2 px) al foco o hover. Mantiene tres columnas, alturas mínimas de (120 px) y (140 px) desde `md`, y cifras (32/40 px); en poco espacio se ocultan iconos y enlaces auxiliares visuales, conservando etiquetas y destinos accesibles.

### Evidence and report

Las fotografías proceden de adjuntos de auditoría, cerca de su respuesta y con estados de ausencia o error; la ilustración de acceso no representa evidencia. El archivo original [Daylight Section](../../../../../public/images/daylight-section.webp) pesa (157 410 bytes) y conserva su [prompt exacto y fecha](../../../../../public/images/daylight-section.webp.json).

La [vista previa de informe](../../../../../src/features/audits/ui/ReportPreview.tsx) es una isla documental: papel blanco, Source Sans 3, formato y paleta originales, independientemente del tema. Sus estilos y su trazo de iconos original (2 px) pertenecen al informe y no sustituyen los tokens operativos de la aplicación.

## Do's and Don'ts

### Do:

- **Do** usar los primitivos Kinpaku mediante los alias semánticos y conservar navegación clara en Light y oscura en Dark.
- **Do** usar Alumni Sans para página y marca, y Albert Sans para lectura, secciones, controles y cifras.
- **Do** mantener alturas mínimas de control, SVG de trazo fino, foco visible y estados expresados con texto.
- **Do** ligar el movimiento breve a botones, iconos y diálogos; respetar movimiento reducido sin perder mensajes ni foco.
- **Do** separar filas con reglas, mostrar evidencias reales junto a respuestas y conservar el informe blanco con Source Sans 3.
- **Do** mantener la procedencia del raster original de acceso junto a su archivo.

### Don't:

- **Don't** forzar paneles oscuros en Light ni presentar la derivación instrumental Dark como un tema descargado.
- **Don't** usar el dorado como texto pequeño sobre papel; los textos de acción usan el primario del tema.
- **Don't** convertir la tipografía condensada de los títulos en la fuente de campos y datos.
- **Don't** extender la sombra de interacción del botón a las filas y paneles del espacio operativo.
- **Don't** teñir el informe con el tema ni convertir la ilustración de marca en evidencia de auditoría.
