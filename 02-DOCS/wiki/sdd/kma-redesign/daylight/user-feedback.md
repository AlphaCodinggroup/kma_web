# Ajustes pedidos por Pablo — Impeccable

Pablo pidió usar iconos, fuentes, colores y estilos de Impeccable, mostró que Light conservaba una barra lateral oscura y solicitó detalles de interacción como los de Neo Mirai. Estos pedidos sustituyen los tokens y la navegación oscura permanente del contrato anterior; se conserva la composición operativa de Daylight Section y todo su comportamiento.

## Fuentes y color comprobados

El sitio oficial usa Albert Sans para lectura y Alumni Sans para títulos. Se descargaron las familias variables y sus licencias SIL OFL desde Google Fonts y se sirven localmente. Source Sans 3 continúa exclusivamente en el documento del informe para preservar su formato. Se extrajeron los tokens públicos Kinpaku en OKLCH: papel neutro, tinta, dorado y superficies instrumentales; los mismos primitivos se aplican mediante alias semánticos de KMA.

Fuente: https://impeccable.style/ y su hoja `kinpaku-tokens.Czfxn__5.css`, inspeccionada en Chrome. Los iconos del sitio usan SVG de trazo fino, principalmente 1,5 px para piezas de 20 px; KMA conserva la geometría consistente de Lucide y adopta ese trazo. No se presenta el raster Daylight como un paquete de componentes descargables.

## Apariencia completa

La navegación, marca, cajón móvil, franja de revisión e índice de pasos responden ahora al tema. Light usa papel claro también en esas áreas; Dark emplea las superficies oscuras de la familia instrumental. El login también usa los tokens del tema. La ilustración y el PDF siguen siendo contenido con sus propios colores.

## Intención del movimiento

Referencia de interacción: https://impeccable.style/neo-mirai/#installations. En Chrome se observaron desplazamiento de imágenes al pasar el cursor, cambios de profundidad y marcas de navegación; se adaptan a acciones de trabajo, sin animaciones de entrada de listas ni desplazamiento automático.

- Momento principal: la cola de revisión responde al foco o cursor; su icono avanza hacia el destino, indicando que abre una etapa concreta del trabajo.
- Continuidad: iconos de navegación se desplazan 2 px y los paneles superpuestos llegan con una transición corta de claridad, sin alterar geometría ni foco.
- Respuesta: botones elevan 1 px al pasar el cursor y se comprimen ligeramente al presionar; el estado pendiente y los mensajes de guardado siguen dependiendo de operaciones reales.
- Presupuesto: CSS de 120–200 ms, sin dependencias adicionales, sin bucles nuevos ni movimiento de tablas. La preferencia de movimiento reducido elimina desplazamientos, compresión y entrada de paneles; conserva color, foco y mensajes.

Pruebas específicas comprueban fondos claros/oscuros en los paneles de escritorio y móvil, respuesta de presión y movimiento reducido con navegación y devolución de foco. La evidencia anterior queda preservada en `validation/before-impeccable-feedback`.

## Cabeceras coherentes

Pablo señaló que Reports mostraba el subtítulo debajo de la línea, mientras Projects lo ubicaba correctamente arriba. Reports y Audits pasan el subtítulo al componente PageHeader compartido: título, descripción y acción forman un bloque único; la línea siempre cierra ese bloque. Se revisaron Dashboard, Projects/Facilities, Users, Flows y ambos editores, que ya consumían ese patrón.
