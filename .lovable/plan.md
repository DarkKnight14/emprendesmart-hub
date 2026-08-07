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
3. **Paso a paso del desarrollo**: narrativa ordenada de cómo se construyó el proyecto, iteración por iteración, indicando qué se hizo, qué artefacto se produjo y qué evidencia (captura) lo respalda.
4. **Cronogramas**:
   - Cronograma general por fases: fase, semanas, hitos, entregable.
   - Cronograma detallado por iteraciones: iteración, actividades, duración, responsable, estado.
   - Diagrama de Gantt en formato de tabla (semanas 1..N como columnas, celdas sombreadas para marcar duración de cada actividad), en Arial 12 negro.
   - Distribución del esfuerzo por disciplina a lo largo de las 4 fases (tabla de porcentajes, equivalente a la "joroba" clásica de RUP).
5. **Disciplinas RUP** (modelado de negocio, requisitos, análisis y diseño, implementación, pruebas, despliegue, gestión de configuración) con lo hecho en cada una.
6. **Modelo de casos de uso**: actores (Emprendedor, Administrador) y casos de uso principales, en lista y tabla; descripción extendida de 2 casos clave (Registrar actividad, Consultar indicadores/alertas).
7. **Artefactos RUP producidos**, mapeados a los archivos y capturas reales del proyecto.
8. **Gestión de riesgos** por fase: riesgo, impacto, mitigación aplicada.

Se actualizan la tabla de contenido y la numeración de las secciones siguientes. Se añaden 2 referencias APA sobre RUP (Kruchten; Jacobson, Booch y Rumbaugh) a la sección de referencias.


## Detalle técnico

- Se edita `/tmp/docgen/build.js` (generador con la librería `docx`): nueva función que construye la sección RUP con los helpers `h1`/`h2`/`p`/tablas ya existentes, respetando Arial 12 negro.
- Las tablas de cronograma y el Gantt usan anchos en DXA que suman el ancho de contenido, con sombreado `ShadingType.CLEAR`; el Gantt se orienta en una sección apaisada si no cabe en vertical.
- Se renumeran las secciones posteriores y sus entradas en "Contenido" (tab stop derecho con líder de puntos).
- Salida: `EmprendeSmart_Documento_Tecnico_v10.docx` en la carpeta de documentos, verificada renderizando las páginas a imagen.
- No se modifica código de la aplicación web.
