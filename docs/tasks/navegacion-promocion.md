# Navegación de la promoción por secciones

## Contexto

La vista de promoción tenía tres niveles de navegación y 20 destinos para el
profesorado: barra lateral (Dashboard / Área de administración / Contenido del
Programa / Collaboradores) → grupos (`PROGRAM_DETAILS_TAB_GROUPS`: planning,
content, resources, team) → 11 pestañas, más las 5 subpestañas del Área de
administración. Una misma tarea vivía repartida: un proyecto se define en
Roadmap, se activa en Contenido › Equipo › Aula Virtual y se evalúa en Área de
administración › Evaluación. Además la pestaña activa no estaba en la dirección
(se guardaba en `sessionStorage` y `switchTab('students')` redirigía a otra
sección), así que no se podía compartir un enlace ni usar el botón atrás.

Auditoría completa, mapa de navegación, flujos y lista de accesibilidad:
[documento de rediseño](https://claude.ai/code/artifact/112682f5-22e6-4c31-9197-2f0d768d5910).
Prototipo clicable de las pantallas nuevas:
[prototipo](https://claude.ai/artifact/ShpiipQwuQhsozQcr5voEe).

## Decisiones confirmadas

- **Siete secciones** en la barra lateral, con pestañas dentro: Inicio,
  Planificación, Proyectos, Estudiantes, Portal del estudiante, Equipo y, al
  pie, Ajustes de la promoción.
- **Dos niveles como máximo** y cada cosa en un solo sitio.
- **Los tres roles comparten navegación**: docente, coordinación y project
  manager ven lo mismo; lo que cambia es qué avisos salen en el Inicio.
- **El destino vive en la dirección** (`#/planificacion/roadmap`), para poder
  compartir enlaces y que el botón atrás funcione.
- **No se reescriben los paneles**: cada destino llama a las funciones legacy
  (`switchTab`, `switchProgramDetailsTab`, `switchTeacherAreaSubTab`). Así el
  contenido se sigue pintando igual y el cambio es reversible.
- **Contraste**: el fondo del botón principal pasa de `#ff4700` (3,41:1 con
  texto blanco) a `#d63900` (4,72:1). El naranja de marca se queda para bordes,
  subrayados y la pestaña activa, donde el mínimo es 3:1.

## Estado

Fases 1 a 8 en la rama `feat/navegacion-por-secciones` (frontend), [PR #84](https://github.com/proyectof5/bootcamp-manager/pull/84).

| Fase | Qué | Estado |
|---|---|---|
| 1 | Marco: barra lateral por secciones, cabecera de página (migas + título + acciones + pestañas), destino en el hash, enlace "Saltar al contenido", foco visible, contraste del botón principal | ✅ verificado en la P8 |
| 2 | Inicio "Pendiente de ti": avisos accionables (pasar lista de hoy, proyectos sin evaluar, horas que faltan, festivos a mano sin nombre) + 4 cifras enlazadas, encima del Inicio de siempre | ✅ verificado en la P8 |
| 3 | Estudiantes › Lista: tabla en React con cinco columnas por defecto y cuatro más en el selector, vistas (activos / en riesgo / bajas), orden por columna, cabecera fija y buscador | ✅ verificado en la P1 de Barcelona |
| 4 | Ajustes › Datos de la promoción como página: campos agrupados, obligatorios marcados, error debajo del campo, aviso `aria-live` al guardar y Eliminar promoción al pie | 🟡 verificado el prefill y la validación; falta probar un guardado real |
| 8 | Panel de admin rediseñado: marco oscuro, cuentas y plantillas en tablas, buscador y filtro por rol | ✅ verificado con 15 cuentas y 9 plantillas |
| 7 | "Mis promociones" rediseñada: buscador, filtros por estado, agrupación (en marcha / próximas / terminadas) y tarjetas con fechas, semanas, módulos, progreso y campana | ✅ verificado con 8 promociones |
| 6 | Marco oscuro del prototipo: barra superior y menú en gris muy oscuro, contenido sobre gris claro y el naranja de marca reservado a acentos (botón principal, pestaña activa, icono de la sección, tarjetas de promoción) | ✅ verificado |
| 5 | Campana de avisos en la tarjeta de cada promoción (el detalle vive en el Inicio de esa promoción) y buscador Ctrl+K en la promoción (páginas, estudiantes, módulos, proyectos y acciones) | ✅ verificado con 8 promociones |

## Mapa de destinos (Fase 1)

| Sección › pestaña | A qué llama |
|---|---|
| Inicio | `switchTab('overview')` |
| Planificación › Roadmap / Calendario / Horario / Horas lectivas / Píldoras | `switchTab('info')` + `switchProgramDetailsTab('roadmap'/'calendar'/'schedule'/'hours'/'pildoras')` |
| Proyectos › Proyectos | `switchTab('teacher-area')` + `switchTeacherAreaSubTab('evaluation')` |
| Proyectos › Aula Virtual | `switchProgramDetailsTab('virtual-classroom')` |
| Proyectos › Competencias y criterios | `switchProgramDetailsTab('evaluation')` |
| Estudiantes › Lista / Asistencia | `switchTeacherAreaSubTab('students'/'attendance')` |
| Portal › Acceso | `switchTeacherAreaSubTab('accesos')` |
| Portal › Recursos / Enlaces rápidos / Secciones | `switchProgramDetailsTab('resources'/'quicklinks'/'sections')` |
| Equipo › Equipo formativo | `switchProgramDetailsTab('team')` |
| Equipo › Colaboradores | `switchTab('collaborators')` |
| Ajustes › Datos de la promoción | `switchTab('ajustes')` → `PromotionSettingsPanel.tsx` (la ventana "Modificar promoción" sigue existiendo para otros accesos) |

## Pendiente / Próximos pasos

- La Fase 2 saca los avisos de datos ya existentes; si un día hay que añadir
  "estudiantes sin acceso al portal" hará falta un dato por estudiante que hoy
  no existe (la contraseña de acceso es de la promoción, no de cada persona).
- El bloque "Mi semana" encima de la rejilla se descartó tras probarlo: competía con
  las tarjetas. En su lugar, cada tarjeta lleva una campana con el número de avisos.
- Las ocho fases están hechas. Queda decidir si se borra el markup legacy que hoy
  solo se oculta por CSS y si "Mi semana" debe mostrar también promociones que
  aún no han empezado.
- Probar un guardado real desde Ajustes (escribe en la base de datos de producción).
- Ajustes › Integraciones todavía no existe: Planificador, Asana, Zoom y el ID de
  Google Calendar siguen en Portal del estudiante › Acceso.
- "En riesgo" usa hoy < 80 % de asistencia del mes en curso: confirmar el umbral
  con el equipo docente.
- Las columnas elegidas se guardan en `localStorage` (comodidad por navegador),
  no son vistas compartidas entre personas.
- Revisar los avisos que quedan del markup legacy: `#teacher-area-header`,
  `#program-details-group-nav`, `#program-details-tabs` y `#teacher-area-subtabs`
  se ocultan por CSS; cuando las fases 2-5 estén hechas conviene borrarlos.
- `docs/design-system.md` tiene una sección "Navegación de Contenido del
  Programa" que describe el modelo antiguo: actualizarla al cerrar la Fase 1.

## Archivos clave

- `public/js/promotion-nav.js` — mapa de secciones y `goToPromotionDestination`.
- `app/promotion/_components/PromotionNav.tsx` — barra lateral (`SectionNavItems`)
  y cabecera de página (`PromotionPageHeadHost`).
- `app/promotion/page.tsx` — carga de `promotion-nav.js` y montaje.
- `app/promotion/body.ts` — `#promotion-page-head` y `#program-details-actions`.
- `css/promotion-detail.css` — estilos de la cabecera y ocultado del markup viejo.
- `css/design-system.css` — contraste del botón principal y "Saltar al contenido".
- `app/promotion/_components/CommandPalette.tsx` — buscador Ctrl+K (Fase 5).
- `app/dashboard/_components/PromotionsBoard.tsx` — vista "Mis promociones" (Fase 7).
- `app/admin/page.tsx` — panel de admin: cuentas y plantillas en tabla (Fase 8).
- `app/dashboard/_components/PendingBell.tsx` — cuenta de avisos por promoción y
  campana en la tarjeta (Fase 5).
- `app/promotion/_components/PromotionSettingsPanel.tsx` — Ajustes como página (Fase 4),
  montado en `#ajustes-tab` de `body.ts`.
- `app/promotion/_components/StudentsTable.tsx` — tabla de estudiantes (Fase 3);
  `displayStudents` le pasa la lista por el evento `students-updated`.
- `app/promotion/_components/PendingPanel.tsx` — avisos y cifras del Inicio (Fase 2);
  se monta al principio de `OverviewPanel.tsx`, sin quitar nada de lo que ya había.
