# Horas lectivas (cómputo por fechas)

## Contexto

Pedido del usuario: poder ver cuántas horas lectivas suma la formación en
total, por módulo y por proyecto — a partir de una jornada de horas/día que
se define por promoción (7h, 7h30, etc.). El cómputo debe basarse en días
lectivos reales: si un elemento del roadmap cruza un fin de semana o un
festivo, esos días no cuentan horas (mismo criterio de `workingDays` +
`holidays` que ya usa el Gantt, ver [roadmap-por-fechas.md](roadmap-por-fechas.md)).
Además, si la promoción tiene definido un total de horas objetivo (ej.
1250h, ya existe como `extendedInfo.totalHours`), el panel debe mostrar
cuántas horas faltan/sobran respecto a ese objetivo — no ausencias de
estudiantes, sino el hueco entre lo planificado en el roadmap y el objetivo
de horas de la titulación.

Repos implicados: `roadmap-manager-frontend` (el cómputo y su panel) y
`roadmap-manager-service` (nuevo campo `hoursPerDay` en `Promotion`).

## Decisiones confirmadas

- **`promotion.hoursPerDay`** (número, ej. `7` o `7.5`): nuevo campo, **por
  promoción** — no global, cada bootcamp puede tener jornada distinta.
  Sigue el mismo patrón que `workingDays`/`holidays` (columna en
  `Promotion`, editable en el mismo sitio que esos dos).
- **Dónde se muestra**: una **pestaña nueva** dentro de "Contenido del
  Programa" (mismo nivel que Roadmap, Calendario, Horario, etc. — sub-tabs
  ya descritas en spec 0014, ver `app/promotion/page.tsx`), no texto suelto
  en el Gantt. Contenido del panel: horas totales de la formación, desglose
  por módulo y por proyecto.
- **"Si faltan horas"**: comparar el total calculado (suma de horas
  lectivas de todos los módulos según fechas) contra
  `extendedInfo.totalHours` (el campo YA existente, ver "acta" en
  `promotion-detail.js` ~2337-2495 y `Syllabus`/`ExtendedInfo` — es el
  mismo dato que ya se usa para el PDF del syllabus y el reporte). Si el
  total calculado no llega al objetivo, mostrar el déficit en el panel. No
  tiene relación con ausencias de estudiantes/Asistencia — se descartó esa
  interpretación explícitamente con el usuario.
- **Cálculo de horas lectivas de un rango de fechas** = (días lectivos
  entre `startDate` y `endDate`, excluyendo `workingDays` no marcados y
  `holidays`, mismo criterio que el Gantt) × `promotion.hoursPerDay`. Ya
  hay precedente del conteo de días lectivos hecho dos veces — reutilizar
  el patrón de `countWorkingDaysInclusive` de
  `roadmap-manager-service/scripts/migrate-roadmap-dates.mjs` y de
  `server.js` (helpers junto a `POST /api/admin/templates-from-promotion`)
  — trasladarlo a `gantt-adapter.js` como función compartida en vez de
  reinventarlo o duplicarlo una tercera vez.
- **Confirmado, no cambiar sin volver a preguntar**: la barra del Gantt
  sigue dibujándose continua sobre fines de semana/festivos (ver
  [roadmap-por-fechas.md](roadmap-por-fechas.md)) — este cómputo de horas
  es puramente derivado para el panel nuevo, no cambia cómo se ve o guarda
  el roadmap.

## Estado

Fases 1-4 hechas (código, sin PR). Falta cerrar la Fase 5 (verificación con
promoción real end-to-end, requiere reiniciar el backend de dev).

| Fase | Qué | Repo | Rama | Estado |
|---|---|---|---|---|
| 1 | Columna `hoursPerDay` en `Promotion` (TEXT, default `'7'`, getter numérico con fallback 7) + `hoursPerDay` en el allowlist de `PUT /api/promotions/:id`. Sin migración manual: `db.sync({ alter })` en el arranque añade la columna; las filas previas leen el default. | service | `feat/templates-from-promotion-workingdays` | ✅ código, sin PR |
| 2 | `gantt-adapter.js`: `countWorkingDaysInclusive(start, end, workingDaysSet, holidaysSet)` (portado del backend + exclusión de festivos) y `computeLectiveHours(...)`. Exportadas como `window.*`. Verificadas con harness Node (10 casos). | frontend | `feat/horas-lectivas` | ✅ código, sin PR |
| 3 | Input "Horas lectivas por día" (`number`, `step 0.5`) en `editPromotionModal` (`app/promotion/page.tsx`), bajo "Días lectivos". Prefill desde `promotion.hoursPerDay` (fallback 7) en `openEditPromotionModal`; se envía en el `payload` del `PUT` en `saveEditPromotion` solo si es `> 0`. | frontend | `feat/horas-lectivas` | ✅ código, sin PR |
| 4 | `gantt-adapter.js`: `buildHoursBreakdown(promotion, extendedInfo)` puro → `{ hoursPerDay, total, byModule[], byProject[], target, diff }` (horas de módulo = días lectivos de su `getModuleDateRange` × jornada; `total` = suma de módulos; `byProject` sub-desglose informativo; `diff` = `total − extendedInfo.totalHours`). Panel React `_components/HoursPanel.tsx` (portal a `#program-details-hours`, refresco vía `window.__refreshHoursPanel`). Pestaña **"Cómputo de horas"** en grupo `planning`: `<button>`/`<div>` en `body.ts`, entrada en `tabNameMap` y en `PROGRAM_DETAILS_TAB_GROUPS`, `__refreshHoursPanel()` disparado desde `loadPromotion`/`loadModules`/`loadExtendedInfo` y al abrir la pestaña. Verificado: `buildHoursBreakdown` con harness Node (20 casos) + `next build` OK + panel renderizado en vivo contra la promo "IA School Bootcamp - P6" (4 módulos, total 1246 h, camino "Faltan 254 h" con objetivo simulado). | frontend | `feat/horas-lectivas` | ✅ código, sin PR |

## Pendiente / Próximos pasos

- **Fase 5 (cerrar verificación)**: el backend de dev seguía con el código
  anterior al probar, así que las promos devolvían `hoursPerDay` sin la
  columna (el panel usó el fallback 7). Al reiniciar el backend, `db.sync`
  añade la columna; entonces: editar `hoursPerDay` de una promo real (p.ej.
  `7.5`), recargar, y confirmar que el panel recalcula y que el `diff`
  contra un `totalHours` real cuadra por encima y por debajo. Contar a mano
  un módulo que cruce un festivo real de esa promo.
- **PRs**: 1 PR en `service` (columna + allowlist) y 1 en `frontend` (Fases
  2-4). El de `frontend` depende del de `service` solo para que
  `hoursPerDay` persista; el panel funciona con el fallback mientras tanto.
- **Opcional**: exportar el desglose de horas junto al resto del roadmap
  (`buildRoadmapExportRows` / Excel) — no pedido, solo anotado.

Sin preguntas abiertas de diseño.

## Archivos clave

- `roadmap-manager-service/backend/models/sql/Promotion.js` — columnas
  `workingDays`/`holidays` ya existen ahí, `hoursPerDay` va al lado.
- `roadmap-manager-service/server.js` — `PUT /api/promotions/:id`
  (allowlist), helpers de conteo de días lectivos junto a
  `POST /api/admin/templates-from-promotion`.
- `roadmap-manager-frontend/public/js/gantt-adapter.js` — lógica pura de
  fechas; ya tiene `countWorkingDaysInclusive`/`computeLectiveHours` (Fase 2)
  y `buildHoursBreakdown` (Fase 4).
- `roadmap-manager-frontend/app/promotion/_components/HoursPanel.tsx` — panel
  React de la pestaña "Cómputo de horas" (Fase 4).
- `roadmap-manager-frontend/app/promotion/body.ts` — markup de la pestaña
  (`#program-details-hours-tab` / `#program-details-hours`).
- `roadmap-manager-frontend/public/js/promotion-detail.js` — línea
  ~2337-2495 y ~8234-8317, manejo de `extendedInfoData.totalHours` (acta).
- `roadmap-manager-frontend/app/promotion/page.tsx` — estructura de
  sub-tabs de "Contenido del Programa" (spec 0014), sitio donde añadir la
  pestaña nueva.
- [roadmap-por-fechas.md](roadmap-por-fechas.md) — modelo de fechas,
  `workingDays`, festivos; precedente directo de este spec.
