# Índice de áreas funcionales — Bootcamp Manager

Mapa de las áreas funcionales de la app (frontend `roadmap-manager-frontend`
+ backend `roadmap-manager-service`), con si tienen spec en `docs/tasks/` o
no. Usar `/spec-new <nombre>` para crear el que falte cuando se trabaje en
esa área — no hace falta escribirlos todos de una vez ni por adelantado.

Leyenda: ✅ spec completo · 🟡 spec con pendientes · ⬜ sin spec todavía.

## Promoción — Navegación

| Área | Spec | Componentes/archivos principales |
|---|---|---|
| Navegación de la promoción (siete secciones, cabecera de página, destino en la URL) | 🟡 [navegacion-promocion.md](navegacion-promocion.md) | `public/js/promotion-nav.js`, `PromotionNav.tsx`, `page.tsx`, `body.ts` |

## Promoción — Planificación

| Área | Spec | Componentes/archivos principales |
|---|---|---|
| Roadmap y Gantt (fechas, módulos, cursos/proyectos/lecciones, tiempo flexible) | 🟡 [roadmap-por-fechas.md](roadmap-por-fechas.md) | `RoadmapPanel.tsx`, `public/js/gantt-adapter.js`, `public/js/promotion-detail.js` |
| Gantt a pantalla completa + panel lateral (estilo Asana) | 🟡 [gantt-pantalla-completa-drawer.md](gantt-pantalla-completa-drawer.md) | `RoadmapPanel.tsx`, `RoadmapDetailDrawer.tsx`, `promotion-detail.js` (`persistRoadmapItemEdit`/`onTaskClick`), `promotion-detail.css` |
| Barra y vistas del roadmap al estilo de un calendario (Hoy/flechas/periodo, Día-Semana-Mes acotados, menú «Más») | 🟡 [roadmap-vistas-calendario.md](roadmap-vistas-calendario.md) | `promotion-detail.js` (`setGanttView`, `ganttStepPeriod`, `emitGanttPeriod`), `RoadmapPanel.tsx`, `promotion-detail.css` |
| Horas lectivas (total formación, por módulo/proyecto, jornada por promoción) | 🟡 [horas-lectivas.md](horas-lectivas.md) | `public/js/gantt-adapter.js`, `app/promotion/page.tsx`, `Promotion.js` (backend) |
| Horas objetivo por módulo (recolocar fechas al cambiar festivos o tiempo flexible) | 🟡 [horas-objetivo-modulo.md](horas-objetivo-modulo.md) | `gantt-adapter.js` (`reflowModulesToTargetHours`), `promotion-detail.js` (`reflowRoadmapToTargetHours`), `HoursPanel.tsx` |
| Selector de fecha al editar (mes actual) | 🟡 [fecha-picker-mes-actual.md](fecha-picker-mes-actual.md) | `app/promotion/page.tsx` (inputs de fecha), `promotion-detail.js` |
| Exportar roadmap a Asana (OAuth por docente + subtareas) | ⬜ [exportar-roadmap-asana.md](exportar-roadmap-asana.md) | `server.js` (`/api/integrations/asana/*`, `/export-asana`), `AsanaConnection.js` / `AsanaRoadmapExport.js` (backend), `AccessSettingsPanel.tsx`, `RoadmapPanel.tsx` |
| Evaluación de competencias / rúbricas | 🟡 [evaluacion-competencias.md](evaluacion-competencias.md) | `EvaluationGridPanel.tsx`, `EvaluationCriteria.tsx`, `ProgramCompetences.tsx`, `_lib/reports.ts` |
| Proyectos y Aula Virtual en una sola vista (filas a todo el ancho, publicar desde la propia fila, dirección de entrega única) | 🟡 [proyectos-y-aula-virtual.md](proyectos-y-aula-virtual.md) | `promotion-detail.js` (`renderEvaluationTab`, `_projSaveAula`), `promotion-detail.css`, `promotion-nav.js`, `EvaluationGridPanel.tsx` |
| Asistencia y festivos | ✅ [asistencia-festivos.md](asistencia-festivos.md) | `AttendancePanel.tsx`, `renderAttendanceTable` (promotion-detail.js) |
| Festivos por ciudad (nacionales, autonómicos y locales; panel lateral; tooltip en el Gantt) | 🟡 [festivos-por-ciudad.md](festivos-por-ciudad.md) | `RoadmapPanel.tsx` (`HolidaysPopover`), `promotion-detail.js` (`setupGanttHolidayTooltip`), `server.js` (`/holiday-regions`) + `backend/data/localHolidays.js` (backend) |
| Plantillas de bootcamp | ⬜ | `BootcampTemplate` (backend), `templates-from-promotion` (server.js) |
| Píldoras | ⬜ | `PildorasPanel.tsx` |
| Calendario / horario / Google Calendar sync | ⬜ | `CalendarSettings.tsx`, `ScheduleSettings.tsx`, `buildRoadmapCalendarEvents` |

## Promoción — Métricas

| Área | Spec | Componentes/archivos principales |
|---|---|---|
| Métricas de la promoción con gráficos (anillo, barra apilada, barras ordenadas; estados vacíos explicados) | 🟡 [metricas-graficos.md](metricas-graficos.md) | `MetricsPanel.tsx`, `promotion-detail.css` (`.mtr-*`), `design-system.css` (`--app-color-data-*`), `server.js` (`/metrics`) |

## Promoción — Contenido / Equipo / Recursos

| Área | Spec | Componentes/archivos principales |
|---|---|---|
| Seguimiento de estudiantes | ⬜ | `StudentsPanel.tsx`, `StudentTracking.tsx` |
| Equipo y colaboradores | ⬜ | `TeamManager.tsx`, `CollaboratorsPanel.tsx` |
| Recursos y enlaces rápidos | ⬜ | `ResourcesManager.tsx`, `PromoResourcesManager.tsx`, `QuickLinksManager.tsx` |
| Notas y secciones | ⬜ | `NotesPanel.tsx`, `SectionsManager.tsx` |
| Aula virtual | ⬜ | `VirtualClassroomPanel.tsx` |
| Acceso público / configuración de acceso | ⬜ | `AccessSettingsPanel.tsx`, `app/public-promotion/` |

## Promoción — Documentación y justificación

| Área | Spec | Componentes/archivos principales |
|---|---|---|
| Documentos para la carpeta de proyecto ISO (seis PDF + lo que no sale de la app) | 🟡 [documentos-carpeta-iso.md](documentos-carpeta-iso.md) | `_lib/doc-pdf.ts`, `_lib/documentos.ts`, `DocumentsPanel.tsx`, `promotion-nav.js` |
| Superación del bootcamp y acceso al diploma (criterios, aprobación, apto/no apto trazable) | 🟡 [documentos-carpeta-iso.md](documentos-carpeta-iso.md) | `completion.service.js`, `completionData.service.js` (backend), `Student.completion` |

## Otras páginas de la app

| Área | Spec | Componentes/archivos principales |
|---|---|---|
| Dashboard (docente) | ⬜ | `app/dashboard/page.tsx`, `OverviewPanel.tsx`, `TeacherOverviewPanel.tsx` |
| Panel de administración | ⬜ | `app/admin/page.tsx` |
| Dashboard de estudiante | ⬜ | `app/student-dashboard/` |
| Login / auth | ⬜ | `app/login/` |

## Backend (`roadmap-manager-service`)

| Área | Spec | Notas |
|---|---|---|
| Modelo de datos (Promotion, ExtendedInfo, BootcampTemplate...) | ⬜ | `backend/models/sql/` — `server.js` es un monolito grande, sin dividir en rutas por archivo todavía |
| Scripts de migración/backfill | ⬜ | `scripts/` — patrón dry-run → una promoción → todas, ya usado dos veces (ver roadmap-por-fechas.md) |

---
Al completar trabajo en un área sin spec, usar `/spec-new <nombre>` y luego
actualizar la fila correspondiente aquí (⬜ → ✅/🟡) a mano.
