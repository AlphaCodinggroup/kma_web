# Validación del rediseño premium

Estado: cierre en curso. Worktree `install-rsc-harness`, rama `chore/install-rsc-harness`; base Git `03e3d1d9671e3f8bb8c86ee2822f7823798bd049`. Se conservan cambios previos y RSC. KMA ejecutado por separado en el puerto 3001, con el backend local existente.

## Evidencia inicial

Las 66 capturas de `../before/` conservan las once vistas, tres anchos y ambos temas. La primera comprobación de navegador de esta entrega está en `initial-browser-check.log`: 34 recorridos pasaron y cinco fallaron. Tres fallos eran expectativas antiguas —botón inválido, título del editor, nombre de la acción conforme—; dos revelaron contraste del login y un filtro desbordado a 320 px. Se corrigieron las causas y se mantiene una prueba que puede fallar ante ellas.

## Funciones comprobadas antes del cierre

Editor móvil y panel de pasos, protección y recuperación del borrador, subida de imagen a través de los endpoints existentes, exportación JSON y recorrido real de revisión, comentario, guardado, aprobación y descarga del PDF. La prueba de paginación conserva filtros y resultados cuando falla la siguiente página. La eliminación del reporte invalida y actualiza el listado visible.

## Fotografías

El detalle general devuelve algunas fotografías como referencias S3, mientras revisión devuelve enlaces HTTP firmados. La adaptación de presentación reutiliza únicamente enlaces ya autorizados para el mismo bucket y clave completa, sin llamadas nuevas. No se compara por nombre de archivo ni posición. Un adjunto que no tiene enlace de lectura conserva un estado explícito de indisponibilidad; no se inventa una imagen ni se modifica el documento PDF.

## Límites de la comprobación

El backend de prueba local utiliza el mock de Cognito y datos sembrados; no representa una comprobación del proveedor de identidad de producción. El análisis automatizado de accesibilidad se complementa con teclado, foco y revisión visual; no es una certificación. La comprobación de reflujo de 200 % usa el ancho CSS de 720 px que corresponde a una pantalla de 1440 px con ese zoom, además de la comprobación a 320 px; no automatiza el control de zoom del navegador.

Las rutas y registros semilla se mantienen entre capturas. Los totales pueden cambiar por los recursos efímeros de las pruebas de gestión y por la corrección de estados; las imágenes iniciales no se alteran para simular iguales cantidades.
