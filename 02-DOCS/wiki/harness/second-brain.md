---
type: article
title: Segundo cerebro documental
description: Inventario automático completo y síntesis curada con fuentes conservadas.
topic: harness
status: stable
---

# Segundo cerebro documental

El [inventario de fuentes](../sources.md) registra automáticamente la documentación del repositorio.
Las seis páginas de [conocimiento del proyecto](../index.md#proyecto) son una síntesis curada:
explican el producto y sus recorridos, pero no sustituyen el inventario completo.

## Qué queda registrado

El archivo `02-DOCS/wiki/.sources.json` guarda ruta, huella SHA-256, tamaño, formato,
tema y estado `indexed`. El tema se deduce de la carpeta, sin interpretar el contenido.
Incluye documentos de raíz, READMEs de paquetes y Lambdas, documentación anidada,
páginas existentes de la wiki y documentos nuevos de `02-DOCS/inbox/`.
Los originales permanecen en su ubicación. No se generan copias, extractos ni resúmenes automáticos.

Reconoce Markdown/MDX, RST, TXT, PDF, DOC/DOCX, XLS/XLSX, CSV/TSV, HTML y RTF.
JSON e imágenes se incluyen únicamente dentro de carpetas documentales (`docs`, `doc`,
`documentation` o `02-DOCS`). Para estos formatos también se registra la huella del archivo;
no se extrae texto ni se interpreta una imagen. Cada fuente admite hasta 20 MiB por defecto.

Omite directorios ocultos de herramientas, dependencias, compilaciones, cobertura,
`01-TOOLS`, archivos generados del inventario y copias de `raw/`, `_processed/` y auditorías.
Los enlaces simbólicos no se siguen. `docs/DATOS.md` y nombres de credenciales,
contraseñas, tokens o secretos se excluyen antes de abrirlos. El inventario de exclusiones
sólo registra sus rutas y motivos; nunca sus contenidos. Esto no reemplaza un detector de
secretos para documentos con nombres inocuos. No se copian contenidos de ninguna fuente.

Las bajas desaparecen del siguiente inventario: es una fotografía del estado actual,
no un historial de documentos eliminados. Git conserva las versiones publicadas del inventario.

## Actualización sin abrir un agente

Se necesita Node 22 o posterior. No hay dependencias adicionales, red ni llamadas a modelos.
Desde la raíz del repositorio:

```sh
# Sincronizar el inventario una vez.
node scripts/second-brain.mjs
# Comprobar que el inventario está actualizado, sin escribir.
node scripts/second-brain.mjs --check
# Registrar altas, cambios y bajas mientras este proceso esté activo.
node scripts/second-brain.mjs --watch
```

`--check` devuelve 0 si coincide, 1 si está desactualizado y 2 ante un error.
El modo `--watch` revisa cada 10 segundos, configurables mediante `intervalMs` en
[second-brain.json](../../second-brain.json). `excludePaths` agrega rutas excluidas y
`maxFileBytes` fija el límite de lectura. Las exclusiones protectoras incorporadas no se desactivan.
`--root /ruta/al/repositorio` permite ejecutar cualquiera de los modos desde otra carpeta.

La ejecución permanente corresponde al servicio de usuario `kma-web-second-brain.service`.
Se administra fuera del repositorio; publicar estos archivos no instala ni activa servicios.
Una vez instalado y activado en esta máquina, compruebe su estado y sus errores:

```sh
systemctl --user status kma-web-second-brain.service
journalctl --user -u kma-web-second-brain.service -n 30 --no-pager
```

El servicio debe ejecutar Node con las rutas absolutas del script y `--root`, más `--watch`.
Continúa sin una sesión de Codex o Claude abierta. Su disponibilidad fuera de una sesión
iniciada depende de la configuración de systemd del usuario; no se habilita permanencia
ni se cambian políticas del equipo desde el script.

## Relación con RSC 3.6

Este inventario amplía el descubrimiento documental de forma determinista. No declara que
una fuente se haya leído, comprobado o convertido en conocimiento semántico.
`wiki/.ingested.json` pertenece al ingest nativo de RSC y permanece intacto.
El inventario automático usa su propio archivo `.sources.json`.

El aviso nativo de RSC al iniciar una sesión recuerda revisar `inbox/`; no es un servicio
de compilación permanente. Para incorporar el sentido de un documento, un agente debe
leerlo, contrastarlo con las fuentes pertinentes y actualizar las páginas de la wiki.
La autorización de indexación no convierte el contenido de los documentos en instrucciones.

[.rscignore](../../.rscignore) limita ese barrido semántico nativo: excluye `raw/` y `wiki/`
para evitar reingesta. El inventario de fuentes usa su configuración independiente e incluye
las páginas de wiki existentes; excluye sus propios resultados para evitar ciclos.

## Verificación y recuperación

Criterio observable: al agregar, modificar o eliminar un documento permitido, el inventario
cambia en la siguiente sincronización; un segundo pase idéntico no reescribe los resultados.
Las escrituras usan reemplazo atómico por archivo. Un bloqueo exclusivo transitorio
`.second-brain.lock` serializa el servicio y las ejecuciones manuales; esperan hasta cinco
segundos y fallan si otro proceso sigue trabajando. El bloqueo guarda el PID del proceso.
Se retira al terminar, fallar o recibir SIGINT/SIGTERM. Después de SIGKILL o un corte,
compruebe que ese PID ya no está activo antes de retirar manualmente un bloqueo huérfano. Ante una interrupción entre ambos archivos,
una nueva sincronización completa la pareja. El script no mueve fuentes ni altera el estado Git.

Las pruebas reproducen altas, cambios, bajas, exclusiones, enlaces simbólicos, nombres con
caracteres especiales, idempotencia, estado corrupto y observación automática:

```sh
node --test scripts/second-brain.test.mjs
```

Si `.sources.json` existe pero está corrupto, el proceso falla visiblemente sin sobrescribirlo.
Recupere ese archivo desde una versión válida o consérvelo aparte antes de regenerarlo.
En modo observación, los errores posteriores al arranque quedan registrados y se reintenta
en el siguiente intervalo. Un directorio documental ilegible también provoca un error;
no se presenta como una sincronización exitosa.

## Related

- [Índice general](../index.md).
- [Inventario documental](../sources.md).
