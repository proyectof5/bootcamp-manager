# Asistencia y festivos

## Contexto

La Lista de Asistencia (`AttendancePanel.tsx`) muestra un calendario mensual
por estudiante. Fines de semana y festivos se pintan en gris y no son
marcables. El profesor define los festivos directamente ahí (clic derecho
en un día).

## Decisiones confirmadas

- **`promotion.holidays`** (array de strings `"YYYY-MM-DD"`, columna real
  en el modelo `Promotion`) es la ÚNICA lista de festivos de la promoción —
  no hay una lista separada por feature. El Gantt (zoom "Día", ver
  [roadmap-por-fechas.md](roadmap-por-fechas.md)) reutiliza esta misma
  lista para pintar festivos en gris — un festivo marcado aquí se ve gris
  en los dos sitios.
- Persistencia: `GET`/`PUT /api/promotions/:id/holidays` (server.js,
  `{holidays: [...]}`) — endpoint dedicado, aunque `holidays` también viaja
  dentro del objeto `Promotion` completo (`GET /api/promotions/:id`).

## Estado

Funcionalidad de festivos: completa y en uso (ya existía antes de esta
sesión). Reutilización desde el Gantt: hecha, PR #64 (bootcamp-manager).

## Pendiente / Próximos pasos

- **Inconsistencia detectada, no arreglada todavía**: `renderAttendanceTable`
  (promotion-detail.js) calcula fin de semana con
  `dayOfWeek === 0 || dayOfWeek === 6` (domingo/sábado) **fijo, sin mirar
  `promotion.workingDays`** — mientras que el Gantt (PR #64) SÍ usa
  `promotion.workingDays` para decidir qué días de la semana son no
  lectivos. Si una promoción define unos días lectivos distintos de
  Lun-Vie (p.ej. Lun-Sáb), Asistencia seguiría bloqueando el sábado como
  "fin de semana" aunque sí sea lectivo para esa promoción, mientras que el
  Gantt lo pintaría como día normal. No reportado como bug por el usuario
  todavía — dejar así hasta que se pida explícitamente, dado que cambiar
  el comportamiento de Asistencia sin que lo pidan podría sorprender a
  alguien que cuenta con el Sáb/Dom siempre bloqueados ahí.

## Archivos clave

- `public/js/promotion-detail.js` — `renderAttendanceTable()` (pinta el
  calendario, detecta festivo/fin de semana), `showDateContextMenu` (marcar/
  desmarcar festivo), variable `promotionHolidays` (`Set<string>`, se carga
  una vez por sesión de página).
- `app/promotion/_components/AttendancePanel.tsx` — contenedor React (no
  explorado en profundidad; el render de la tabla lo sigue haciendo JS
  legacy vía portal, según el patrón spec 0014 del resto del repo).
- `roadmap-manager-service/server.js` — `GET`/`PUT
  /api/promotions/:promotionId/holidays`.
- `roadmap-manager-service/backend/models/sql/Promotion.js` — columna
  `holidays`.
