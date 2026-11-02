---
title: Logo rojo de KMA y acento de marca
status: implementado en new-ui, sin push
---

# Logo rojo de KMA y acento de marca

Pablo mostró el logo oficial (círculo rojo con «KMA» blanco) y pidió reconstruirlo, usarlo y pasar a ese rojo todo lo que era dorado.

## Alcance

- Logo en SVG reconstruido a mano sobre el original de 96×89 px: círculo `#E2231A` (medido) y letras trazadas, sin depender de fuente.
- Uso: `BrandMark` (cabecera y acceso), `app/icon.svg` y `app/favicon.ico`; copia suelta en `public/brand/kma-logo.svg`.
- Acento: `--kma-accent` pasa de Kinpaku a `--ks-brand-red` con texto blanco. En Dark, texto y foco usan `--ks-brand-red-pale`.
- Fuera de alcance: papel, tinta, fuentes, PDF del informe y la ilustración del acceso.

## Decisiones

- Blanco sobre `#E2231A`: 4,68:1 (pasa AA). El rojo sobre el fondo oscuro da 3,0–3,6:1, válido para rellenos y filetes pero no para texto; por eso el texto en Dark usa el rojo pálido (6,8–9,8:1).
- El foco en Light sigue siendo el azul petróleo: un anillo rojo sería invisible sobre el botón rojo.
- El rojo de marca convive con el de error (`#b4233e`): el destructivo mantiene fondo suave, borde y etiqueta, nunca relleno sólido.

## Checklist

- [x] SVG del logo y comparación visual con el original.
- [x] `BrandMark` con un `clipPath` por instancia (un SVG oculto no resuelve el de otro) y tres pruebas nuevas.
- [x] Favicon (`icon.svg`, `favicon.ico` transparente 16/32/48).
- [x] Tokens y botones: ningún `kinpaku` ni `on-gold` queda en `app/` ni `src/`.
- [x] `DESIGN.md` actualizado.
- [x] `tsc` sin errores; 3.380 pruebas aprobadas; lint con 0 errores (50 advertencias previas); capturas del acceso en Light y Dark.
- [ ] Recorrido autenticado, las 66 capturas y Axe sobre el rojo nuevo (necesitan el backend local).
- [ ] Revisión de Pablo del trazo de las letras (reconstruido desde una imagen pequeña) y push, que redeploya el preview de Amplify.
