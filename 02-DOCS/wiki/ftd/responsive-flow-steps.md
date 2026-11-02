---
author: Pablo
branch: chore/preview-collapsible-navigation
status: verified
---
# Tabla de pasos ajustada al panel

## Intención y alcance

Ver todas las columnas de Flow Steps sin desplazamiento horizontal. El ancho
se adapta al panel al redimensionar la ventana o alternar el menú lateral.
Se compactan espaciado y tipografía de escritorio, con columnas proporcionales
y texto que puede ocupar varias líneas. Se conservan búsqueda, selección,
reordenamiento, acciones, permisos y el listado móvil existente.

## Criterios y checklist

- [x] La tabla no desborda horizontalmente a 1280, 1440 y 1920 px, con menú abierto y oculto.
- [x] IDs, títulos, rutas y barreras largos se ajustan sin esconder su contenido.
- [x] Selección, búsqueda y acciones conservan su comportamiento; el listado móvil funciona.
- [x] Lint, tipos, pruebas de flows y comprobación visual completados.

## Evidencia

La tabla actual fuerza un ancho mínimo de 620 px y usa distribución automática
con mínimos por columna, IDs y destinos sin salto de línea. El resultado puede
superar el panel aun cuando éste tiene más de 620 px. La corrección se limita
al componente FlowStepsTable y a su presentación.

CONFIRMADO el 2026-11-02, en Chrome DevTools, con 29 pasos de prueba recuperados
como borrador local (sin guardar en el backend):

| Ventana | Panel con menú | Panel sin menú |
| --- | --- | --- |
| 1280 px | 561 px | 705 px |
| 1440 px | 654 px | 798 px |
| 1920 px | 941 px | 1189 px |

En los seis casos, `scrollWidth === clientWidth`; ninguna celda desborda y la
página no tiene desbordamiento horizontal. Se incluyeron títulos, IDs, destinos
y barreras largos, incluso sin espacios. La medición detectó el ancho mínimo
anterior al reintroducirlo temporalmente en el navegador: 620 px de contenido
en 561 px disponibles; al retirarlo, ambos valores vuelven a 561 px.

En móvil de 320 px, el listado mide 318 px sin desbordamiento; buscar AR-F03
devuelve un paso, seleccionarlo cierra el panel y abre su inspector. Escape
cierra el panel y devuelve el foco a Browse steps.

- Pruebas afectadas: **259 aprobadas en 17 archivos**, Node 22.23.4.
  Log: `/tmp/kma-flow-fit-tests-final.log`.
- Se conservan los fallos del primer intento en `/tmp/kma-flow-fit-tests.log`:
  22 tests dependían del selector `span.font-bold`. Se conservó el peso original
  de los IDs, sin cambiar los tests ni la lógica del editor.
- Lint y tipos aprobados: `/tmp/kma-flow-fit-lint-final.log` y
  `/tmp/kma-flow-fit-types-final.log`.
- Lint de Design: cero FAIL y tres WARN heredados de separadores sticky e
  indicador de arrastre, sin cambios en este alcance. Registro:
  `/tmp/kma-flow-fit-design-lint.json`.
- Inspector de Design no ejecutado: la comprobación del flujo autenticado se
  hizo con Chrome DevTools MCP, conforme al enrutamiento del repositorio.
- Revisión visual independiente: **ship**, sin defectos materiales. Capturas:
  `/tmp/kma-flow-fit-final-{1280,1440,1920}.png` y
  `/tmp/kma-flow-fit-mobile-320.png`.

No se modifica el modelo de Flow, el backend, los permisos ni el tamaño de
las pantallas ajenas a esta tabla. La continuación se publica en la misma UI
`new-ui` autorizada por Pablo en esta sesión.

## Siguiente

Publicar la actualización y confirmar el trabajo de Amplify.
