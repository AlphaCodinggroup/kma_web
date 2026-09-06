# KMA Web - Plataforma de Gestión de Auditorías

## Desarrollo local con Docker

Con este repositorio junto a `kma-backend`, ejecutar `make up` desde `../kma-backend` y abrir **http://localhost:3000**; la cuenta ficticia inicial es **admin@example.test** / **LocalAdmin123!**.

El Compose del backend ejecuta las funciones Go reales, almacenamiento, colas, Cognito local y esta web con recarga de código; ver la [guía local](../kma-backend/docs/DESARROLLO-LOCAL.md) y el [análisis técnico](../kma-backend/docs/ANALISIS-TECNICO-Y-MEJORAS.md).

Este documento describe la funcionalidad y el objetivo de negocio de los distintos módulos de la aplicación. La plataforma está diseñada para facilitar la planificación, ejecución y reporte de auditorías en diferentes instalaciones, permitiendo flujos dinámicos y revisiones exhaustivas.

---

## 🏗️ Módulos Principales (Perspectiva de Negocio)

### 1. 📊 Dashboard (Tablero Principal)
Es el centro de control del usuario al ingresar a la plataforma. 
- **Objetivo:** Brindar una vista panorámica del estado operativo.
- **¿Qué puede hacer el usuario?** Visualizar métricas clave como la cantidad de auditorías en curso, revisión o completadas, acceder rápidamente a la actividad reciente o retomar una evaluación que quedó a la mitad.

### 2. 📂 Projects (Proyectos)
Actúa como el agrupador organizativo de más alto nivel dentro de la empresa o consultora.
- **Objetivo:** Organizar las auditorías y clientes de forma estructurada.
- **¿Qué puede hacer el usuario?** Crear y gestionar proyectos (ej. "Adecuación ADA 2026 - Cliente X"). Permite mantener un orden lógico, agrupando dentro de cada proyecto las diferentes instalaciones que serán evaluadas y centralizando sus datos.

### 3. 🏢 Facilities (Instalaciones / Sitios)
Representa el espacio físico o lógico que será auditado.
- **Objetivo:** Mantener un inventario detallado de los lugares a inspeccionar.
- **¿Qué puede hacer el usuario?** Dar de alta, editar y gestionar sucursales, edificios o locaciones específicas. A cada "Facility" se le vinculan directamente sus auditorías correspondientes, permitiendo un seguimiento geográfico e individualizado del estado de cada locación.

### 4. 🔀 Flows (Flujos de Trabajo / Motor de Formularios)
Es el motor dinámico que dicta **qué** y **cómo** se audita. 
- **Objetivo:** Permitir flexibilidad total sin requerir desarrollo de software cuando cambia la normativa.
- **¿Qué puede hacer el usuario administrador?** Diseñar plantillas de preguntas personalizadas. El usuario puede crear pasos con lógica condicional (ej. "Si la respuesta es NO, pedir forzosamente que se suba una foto y se tome la medida de la rampa"). Administra preguntas de opción múltiple, sí/no, textos y requerimientos de recolección de evidencia.

### 5. 📋 Audits (Auditorías y Revisión)
Es el módulo operativo "de campo" y de control de calidad.
- **Objetivo:** Ejecutar la inspección de la instalación y revisar el aseguramiento de calidad.
- **¿Qué puede hacer el usuario?** 
  - **Ejecución:** Seleccionar una instalación (`Facility`), elegir un flujo de inspección (`Flow`) y responder paso a paso, subiendo evidencia fotográfica y anotando observaciones.
  - **Revisión y Edición:** Una vez completada, los supervisores (o los mismos auditores) pueden auditar los hallazgos. Se pueden editar preguntas marcadas temporalmente como *"Unsure"* (Inseguro) para decidir finalmente un "Sí o No" antes de generar el reporte final.
  - **Findings (Hallazgos):** Gestionar puntualmente las áreas que no cumplen con la normativa.

### 6. 📄 Reports (Informes Finales)
El módulo de salida de información y entrega de valor al cliente.
- **Objetivo:** Transformar los datos crudos de la auditoría en documentos consumibles y accionables.
- **¿Qué puede hacer el usuario?** Visualizar el resumen de los fallos encontrados, filtrar resultados, generar informes consolidados y exportar el estado de cumplimiento de una instalación para presentarlo ante accionistas, clientes o entidades reguladoras.

### 7. 👥 Users & Auth (Usuarios y Roles)
Manejo de acceso al sistema y seguridad.
- **Objetivo:** Proteger la información de las auditorías y segmentar los permisos.
- **¿Qué puede hacer el usuario administrador?** Crear cuentas para nuevos auditores o personal interno, asignar roles (quién puede auditar, quién puede crear flujos, quién puede revisar) y gestionar las credenciales de ingreso a la plataforma de forma centralizada.

---

## 🚀 Flujo de Operación Típico
1. El **Administrador** crea un **Flow** (Plantilla de preguntas) y un **Project**.
2. Se dan de alta las **Facilities** correspondientes al Proyecto.
3. El **Auditor** va a la instalación, abre el módulo de **Audits** y completa el Flow. En caso de duda en una pregunta grave, la marca como *"Unsure"*.
4. Un experto revisa la web desde la base, entra a la Auditoría y edita la pregunta *"Unsure"* marcándola como *"No"*, pidiendo rellenar de inmediato las notas y cantidades que exige el sistema.
5. Se genera finalmente un **Report** con todos los datos corregidos para enviarle al cliente.
