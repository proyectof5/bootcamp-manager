# Índice de áreas funcionales — Bootcamp Manager

Mapa de las áreas funcionales de la app (frontend `roadmap-manager-frontend`
+ backend `roadmap-manager-service`), con si tienen spec en `docs/tasks/` o
no. Usar `/spec-new <nombre>` para crear el que falte cuando se trabaje en
esa área — no hace falta escribirlos todos de una vez ni por adelantado.

Leyenda: ✅ spec completo · 🟡 spec con pendientes · ⬜ sin spec todavía.

## Promoción — Planificación

| Área | Spec | Componentes/archivos principales |
|---|---|---|
| Roadmap y Gantt (fechas, módulos, cursos/proyectos/lecciones, tiempo flexible) | 🟡 [roadmap-por-fechas.md](roadmap-por-fechas.md) | `RoadmapPanel.tsx`, `public/js/gantt-adapter.js`, `public/js/promotion-detail.js` |
| Evaluación de competencias / rúbricas | 🟡 [evaluacion-competencias.md](evaluacion-competencias.md) | `EvaluationGridPanel.tsx`, `EvaluationCriteria.tsx`, `ProgramCompetences.tsx`, `_lib/reports.ts` |
| Asistencia y festivos | ✅ [asistencia-festivos.md](asistencia-festivos.md) | `AttendancePanel.tsx`, `renderAttendanceTable` (promotion-detail.js) |
| Plantillas de bootcamp | ⬜ | `BootcampTemplate` (backend), `templates-from-promotion` (server.js) |
| Píldoras | ⬜ | `PildorasPanel.tsx` |
| Calendario / horario / Google Calendar sync | ⬜ | `CalendarSettings.tsx`, `ScheduleSettings.tsx`, `buildRoadmapCalendarEvents` |

## Promoción — Contenido / Equipo / Recursos

| Área | Spec | Componentes/archivos principales |
|---|---|---|
| Seguimiento de estudiantes | ⬜ | `StudentsPanel.tsx`, `StudentTracking.tsx` |
| Equipo y colaboradores | ⬜ | `TeamManager.tsx`, `CollaboratorsPanel.tsx` |
| Recursos y enlaces rápidos | ⬜ | `ResourcesManager.tsx`, `PromoResourcesManager.tsx`, `QuickLinksManager.tsx` |
| Notas y secciones | ⬜ | `NotesPanel.tsx`, `SectionsManager.tsx` |
| Aula virtual | ⬜ | `VirtualClassroomPanel.tsx` |
| Acceso público / configuración de acceso | ⬜ | `AccessSettingsPanel.tsx`, `app/public-promotion/` |

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
