# EmprendeSmart explicado con metodología RUP

Objetivo: documentar el proyecto bajo el Proceso Unificado de Rational (RUP), integrándolo al documento técnico existente (misma portada, Arial 12 negro, tabla de contenido "Contenido").

## Qué se agrega

Una nueva sección principal "Metodología de desarrollo: RUP", ubicada antes de la sección de arquitectura, con:

1. **Justificación de RUP** para EmprendeSmart: proyecto iterativo, guiado por casos de uso, centrado en la arquitectura y con gestión de riesgos.
2. **Las 4 fases** aplicadas al proyecto real:
   - Inicio: alcance, problema del emprendedor, actores, casos de uso críticos, riesgos.
   - Elaboración: modelo entidad-relación, arquitectura React + TanStack Start + PostgreSQL/Supabase, prototipo de landing y dashboard.
   - Construcción: iteraciones de autenticación, emprendimientos, actividades, indicadores, alertas y seguimiento.
   - Transición: despliegue, repositorio en GitHub, video demostrativo, pruebas y ajustes finales.
3. **Tabla de iteraciones**: fase, iteración, objetivo, entregable, evidencia (captura ya incluida en el documento).
4. **Disciplinas RUP** (modelado de negocio, requisitos, análisis y diseño, implementación, pruebas, despliegue, gestión de configuración) con lo hecho en cada una.
5. **Modelo de casos de uso**: actores (Emprendedor, Administrador) y casos de uso principales, en lista y tabla; descripción extendida de 2 casos clave (Registrar actividad, Consultar indicadores/alertas).
6. **Artefactos RUP producidos**, mapeados a los archivos y capturas reales del proyecto.
7. **Diagrama textual del ciclo RUP** (fases vs. disciplinas) en formato de tabla, sin imágenes nuevas.

Se actualizan la tabla de contenido y la numeración de las secciones siguientes. Se añaden 2 referencias APA sobre RUP (Kruchten; Jacobson, Booch y Rumbaugh) a la sección de referencias.

## Detalle técnico

- Se edita `/tmp/docgen/build.js` (generador con la librería `docx`): nueva función que construye la sección RUP con los helpers `h1`/`h2`/`p`/tablas ya existentes, respetando Arial 12 negro.
- Se renumeran las secciones posteriores y sus entradas en "Contenido" (tab stop derecho con líder de puntos).
- Salida: `EmprendeSmart_Documento_Tecnico_v10.docx` en la carpeta de documentos, verificada renderizando las páginas a imagen.
- No se modifica código de la aplicación web.
