# Entrega del rediseño de KMA Web

Implementación en el worktree `kma_web/.worktrees/install-rsc-harness`, rama `chore/install-rsc-harness`. Sin despliegue ni cambios en las fuentes del backend; se conserva RSC.

## Resultado

Tema claro, oscuro y del sistema; elección persistente desde login y cabecera, con fuentes alojadas en la aplicación. Manrope para encabezados y Source Sans 3 para lectura. Barra lateral de 248 px, cabecera de 64 px, colores semánticos, controles compartidos y movimiento reducido.

Projects y Facilities tienen accesos separados y conservan sus rutas y pestañas. La franja del dashboard muestra cantidades reales y abre auditorías filtradas. Listados, formularios, confirmaciones, errores y permisos mantienen su función actual; pestañas, búsquedas y filtros se conservan en la URL.

Las auditorías usan el cursor existente y conservan filtros y resultados parciales ante errores. La búsqueda informa que opera sobre las auditorías ya cargadas. Eliminar un reporte actualiza inmediatamente su listado. La revisión mantiene guardado secuencial, protección de cambios, comentarios, aprobación y descarga del informe consolidado; el documento permanece blanco en ambos temas.

El editor de flujos conserva sus pasos, validación, imágenes, exportación JSON y recuperación de borradores. En móvil, los pasos se abren en un diálogo accesible. Todos los textos de interfaz y etiquetas accesibles están en inglés.

## Verificación observada

**`npm run verify`: aprobado**, con lint, TypeScript, **3.289 pruebas en 229 archivos** y compilación de Next.js. Cobertura: **95,02 %** de líneas y sentencias, **95,56 %** de funciones y **93,32 %** de ramas; umbrales originales conservados. Lint terminó sin errores y con 51 advertencias que no bloquean el comando nativo.

Una pasada completa de navegador aprobó **32 pruebas** en la compilación local, incluyendo 66 vistas: login y diez pantallas a 390, 768 y 1440 px en ambos temas. Se comprobaron ausencia de desbordamiento de página y errores de servidor/consola; las tablas amplias desplazan su propio contenedor.

Recorridos reales: login y sesión, proyecto, instalación y restauración, usuario QC, navegación del editor móvil, exportación JSON y recuperación de borradores. La prueba adicional de imagen crea un flujo efímero, selecciona un PNG, pide una URL de subida, realiza el PUT real, guarda, recarga, decodifica la imagen y verifica su referencia en el JSON exportado; luego elimina el flujo temporal y confirma que el seed no cambió. El recorrido de revisión añadió un comentario, guardó cantidad 3, recargó para comprobar persistencia, aprobó y descargó el PDF sin abrir otra pestaña. Después eliminó únicamente ese reporte desde Reports: desaparición inmediata sin recargar, mensaje de éxito, DELETE 204 y consulta posterior 404.

El [PDF descargado](reviewed-project.pdf) contiene tres páginas en Letter horizontal, fotografía, medición de 9,5 %, cantidad 3 y total **$3,750**, verificados con `pdfinfo`, `pdftotext` y apertura visual de su última página.

Las pruebas del cursor y error de página adicional usan respuestas controladas para reproducir más de cien auditorías; los demás recorridos y las capturas utilizan el backend local real. Las reglas de acceso se cubren con pruebas unitarias; la sesión usada para los recorridos reales es Admin.

Lighthouse en Chrome obtuvo **100/100 de accesibilidad** en dashboard y revisión de escritorio, y en usuarios y editor de flujos móvil. Se comprobaron foco, teclado, cierre de diálogos y movimiento reducido mediante pruebas reales.

## Capturas

[Galería completa](screenshots.md): 66 capturas de la matriz, navegación móvil, pasos del editor y revisión del documento.

## Entorno y repetición

Vista local: [KMA Web](http://localhost:3001). Cuenta de pruebas del entorno local: `admin` / `admin123`.

Se usa Node 22, como el repositorio requiere. Los comandos se ejecutan desde este worktree; `.env.local` está excluido de Git y apunta al gateway local en el puerto 8080 y al mock de autenticación en el 9229.

```sh
npm run verify
npm run start -- --port 3001
E2E_BASE_URL=http://localhost:3001 npm run test:e2e
```

Detener desarrollo antes de compilar: ambos escriben `.next`. El backend local debe estar levantado y sembrado. `make seed-docker` terminó correctamente; el helper adicional `make seed-demo` cargó auditorías e imágenes pero falló en su ejemplo de proyecto archivado. Los recorridos CRUD utilizaron recursos efímeros propios y las capturas usan los datos locales disponibles.

## Límites

Sin despliegue ni comprobación de infraestructura remota. La acción Return continúa deshabilitada, con explicación accesible, conforme a la función existente. No se altera ese contrato durante un rediseño.
