---
name: KMA Workspace
description: Sistema visual empresarial para proyectos, revisión de auditorías e informes.
colors:
  primary: "#0b7078"
  primary-dark: "#67d2cd"
  background: "#f4f7f9"
  surface: "#ffffff"
  foreground: "#172f3b"
  muted: "#5b6d79"
  border: "#d9e3e9"
  selected: "#e8f3f2"
  background-dark: "#0b151d"
  surface-dark: "#12232d"
  foreground-dark: "#e9f1f5"
  muted-dark: "#a0b4bf"
  border-dark: "#29404e"
  selected-dark: "#19393f"
typography:
  headline:
    fontFamily: "Manrope, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Source Sans 3, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Source Sans 3, sans-serif"
    fontSize: "14px"
    fontWeight: 600
rounded:
  control: "8px"
  panel: "12px"
spacing:
  tight: "8px"
  group: "16px"
  section: "24px"
  desktop: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "40px; 44px táctil"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
---

## Overview
Un espacio de trabajo continuo, preciso y tranquilo. Las tareas, estados y datos reales organizan cada pantalla; el acento petróleo señala acciones y selección. La referencia es la calidad de aplicaciones empresariales como Catalyst y Untitled UI, con composición propia para auditorías.

## Colors
`app/globals.css` es la fuente normativa de los colores `--kma-*`. Superficies neutras y contraste de texto consistente en ambos temas. Los tonos de éxito, advertencia, información y error conservan significado; los componentes usan tokens, sin paletas locales.

## Typography
Manrope local para títulos; Source Sans 3 local para lectura, controles y tablas. Escala de 12/16, 14/20, 15/22, 20/28 y 28/34 px. Campos de 16 px en móvil y tablet. Peso firme para identidad y títulos, metadatos discretos y cifras tabulares. El documento impreso conserva Source Sans 3 y sus colores blancos originales mediante `.report-paper`.

## Layout
Navegación de 248 px desde 1024 px y cabecera de 64 px; la superficie principal se adapta a móvil. Listados continuos con búsqueda, filtros, tabla y paginación relacionados. Dashboard prioriza revisión pendiente; métricas de cartera acompañan la tarea. En móvil y tablet, navegación en diálogo accesible. El editor ofrece pasos laterales desde 1280 px y un panel desplegable por debajo; el título conserva todo el ancho disponible.

## Elevation & Depth
Separación por tonos y bordes. Reservar sombras para diálogos y elementos que se superponen; evitar sombra bajo cada panel.

## Shapes
Controles con esquinas de 8 px y paneles de 12 px. Badges pequeños con texto legible. Sin grandes píldoras para filas de navegación.

## Components
Conservar las interfaces compartidas y los comportamientos de foco, cargas, errores y operaciones pendientes. Formularios con etiquetas visibles y mensajes cercanos. Acciones críticas con confirmación. Listados móviles y tablet con nombre, estado y acciones visibles; detalles secundarios desplegables. Tablas de escritorio dentro de su contenedor. Tema persistente también en login.

## Do's and Don'ts
Usar datos reales, estados comprensibles y controles consistentes. Evitar gráficos de tendencias sin datos, etiquetas decorativas sobre títulos, tarjetas dentro de tarjetas y fondos totalmente teñidos de azul. Conservar el formato real del PDF y las funciones existentes.
