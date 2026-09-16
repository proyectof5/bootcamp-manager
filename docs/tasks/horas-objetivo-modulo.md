# Horas objetivo por módulo (el roadmap se recoloca al cambiar festivos o tiempo flexible)

## Contexto

Pedido del usuario: en la "P8 IA School Madrid" (jornada 7,5 h/día, objetivo de
la titulación 1250 h) los módulos estaban planificados para sumar unas horas
concretas:

| Módulo | Días lectivos | Horas |
|---|---|---|
| M1: Bases del desarrollo web | 33 | 247,5 h |
| M2: Machine Learning | 36 | 270 h |
| M3: Deep Learning | 65 | 487,5 h |
| M4: Proyectos Finales | 21 | 157,5 h |
| Total | 155 | 1162,5 h (faltan 87,5 h) |

Al añadir 5 festivos más (2 nov, 7 dic, 25 y 26 ene, 3 may), las fechas del
roadmap no se movieron, así que el cómputo de horas bajó a 31/34/64/21 días
(1125 h, faltan 125 h). El usuario quiere poder fijar las horas de cada módulo
y que, al añadir o quitar festivos o tiempo flexible, se recalculen las fechas
para mantenerlas.

Solo frontend (`bootcamp-manager`): `module.targetHours` viaja dentro del JSON
de `promotion.modules`, que el backend guarda tal cual con
`PUT /api/promotions/:id` — no hay cambios en `bootcamp-manager-server`.

## Decisiones confirmadas

- **Dónde se definen**: columna editable "Horas objetivo" en la pestaña Horas
  lectivas (`HoursPanel.tsx`), junto a lo ya calculado. Vacía = sin objetivo.
- **Cuándo se recalcula**: **automático**, sin vista previa, cada vez que se
  añade/quita un festivo (Gantt clic derecho, Asistencia, popover "Festivos"
  del Roadmap: cargar, restaurar o quitar desde el panel lateral) o se
  crea/edita/arrastra/borra un bloque de tiempo flexible. También al guardar
  unas horas objetivo.
- **Módulos siguientes**: se desplazan **en cadena** (cada módulo empieza tras
  el fin del anterior, conservando el hueco en días lectivos que hubiera).
- **Contenido del módulo**: cursos, proyectos, lecciones y píldoras se
  **recolocan por días lectivos**: conservan su posición (días lectivos desde
  el inicio del módulo) y su duración en días lectivos, medidas con el
  calendario ANTERIOR al cambio. Los que llegaban al final del módulo se
  estiran/encogen con él.
- Duración de un módulo con objetivo = `ceil(targetHours / hoursPerDay)` días
  lectivos. Módulos sin objetivo conservan sus días lectivos (pero también se
  desplazan en cadena si hay algún objetivo en la promoción).
- Sin ningún `targetHours` en la promoción no se mueve nada: el roadmap se
  comporta exactamente igual que antes.
- Festivos y bloques de tiempo flexible nunca se mueven. La barra del Gantt
  sigue dibujándose continua (ver [roadmap-por-fechas.md](roadmap-por-fechas.md)).

## Estado

Implementado en la rama `feat/horas-objetivo-modulo` (frontend), sin PR.

- `gantt-adapter.js`: `targetLectiveDays`, `buildLectiveCalendar`,
  `reflowModulesToTargetHours(promotion, previousCalendar)` (pura, muta
  `promotion.modules`) y `targetHours`/`targetDays` en `buildHoursBreakdown().byModule`.
- `promotion-detail.js`: `_roadmapCalendarOf` (foto del calendario antes del
  cambio), `reflowRoadmapToTargetHours` y `window.saveModuleTargetHours`, en
  una cola (`_enqueueRoadmapReflow`) para que cambios seguidos no se pisen;
  enganchado en `_ganttToggleHoliday`, `toggleHoliday`,
  `__applyPromotionHolidays`, `createFlexibleBlockAt`, edición de
  `flexibleBlockEditModal`, `deleteFlexibleBlock` y `persistGanttTaskChange`
  (solo bloques flexibles).
- `HoursPanel.tsx`: columna "Horas objetivo" + total de objetivos + nota.
- Verificado con harness Node sobre una copia de los datos de la P8 (sin
  escribir en BD): con objetivos 247,5/270/487,5/157,5 → 33/36/65/21 días y
  1162,5 h; recalcular sin cambios no mueve nada; añadir y quitar un festivo o
  un bloque flexible vuelve exactamente a las mismas fechas.

## Pendiente / Próximos pasos

- Verificar en la app con sesión iniciada (fijar objetivos en una promoción
  de prueba, marcar/desmarcar un festivo, mover un bloque flexible).
- Cambiar `workingDays` u `hoursPerDay` en "Modificar promoción" NO dispara el
  recálculo todavía (no se pidió); valorar si debería.
- `promotion.endDate` no se actualiza aunque el último módulo se desplace.
- El Excel de horas (`_exportHoursXlsx`) no incluye la columna de objetivo.

## Archivos clave

- `public/js/gantt-adapter.js` — `reflowModulesToTargetHours` y helpers de
  calendario lectivo, junto a `buildHoursBreakdown`.
- `public/js/promotion-detail.js` — orquestación (bloque "Horas objetivo por
  módulo", antes de `window.__applyPromotionHolidays`).
- `app/promotion/_components/HoursPanel.tsx` — `TargetHoursInput`.
- [horas-lectivas.md](horas-lectivas.md) — cómo se calculan las horas.
