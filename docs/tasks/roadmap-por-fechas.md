# Roadmap por fechas

## Contexto

Antes, el roadmap guardaba cuándo empieza/dura cada módulo, curso/proyecto/
lección y bloque de "tiempo flexible" como un **offset en semanas** relativo
a `promotion.startDate`. Al arrastrar/redimensionar una barra en el Gantt,
DHTMLX entregaba la nueva posición en días exactos, pero se convertía a
semanas dividiendo entre 7 — generando offsets fraccionarios y un bug de
precisión confirmado en producción (fechas que se desplazaban al exportar a
Excel). Se rediseñó el modelo para guardar `startDate`/`endDate` literales
("YYYY-MM-DD") en vez de offsets — el Gantt simplemente dibuja esas fechas,
sin conversión con pérdida de precisión por el medio.

Repos implicados: `roadmap-manager-frontend` (Next.js + JS legacy en
`public/js/`) y `roadmap-manager-service` (Express/Sequelize, backend).

## Decisiones confirmadas

- **Las plantillas (`BootcampTemplate`) NO migran** — se quedan a propósito
  en semanas/duración, porque su propósito es ser reutilizables con una
  fecha de inicio distinta cada vez. Solo las promociones reales migran.
- **UI mixta**: editar un elemento ya existente pide fecha real
  (`<input type="date">`); crear uno nuevo sigue pidiendo solo "duración"
  (el inicio ya lo marca el clic en el Gantt) — el dato guardado por debajo
  sí es literal en ambos casos.
- **`promotion.workingDays`** (array de nº de día de semana lectivos,
  `0`=domingo…`6`=sábado, default `[1,2,3,4,5]` Lun-Vie): por promoción, no
  global — instituciones distintas tienen semanas lectivas distintas. Se
  usa para la conversión inversa fecha→semanas al crear una plantilla desde
  una promoción (no hace falta para nada más: el roadmap de una promoción
  migrada ya trabaja en fechas puras).
- **Compatibilidad hacia atrás por diseño**: todo helper de fecha
  (`getModuleDateRange`/`getItemDateRange`/`getFlexibleBlockDateRange` en
  `gantt-adapter.js`) prefiere `startDate`/`endDate` literales si existen,
  y si no cae al cálculo legacy en semanas — nunca se tocó esa rama, así
  que una promoción sin migrar se veía siempre igual.
- **La línea "Hoy" del Gantt (`#gantt-today-marker`) es intocable** —
  verificar que sigue ahí tras cualquier cambio en el Gantt (el build
  "edge" de DHTMLX no trae la extensión Markers, se dibuja a mano).
- **Festivos**: se reutiliza `promotion.holidays`, la MISMA lista que ya se
  define en la Lista de Asistencia (clic derecho en un día) — no hay una
  lista de festivos separada para el roadmap.

## Estado — completo

| Fase | Qué | Repo | PR |
|---|---|---|---|
| 1 | Adaptador (`gantt-adapter.js`): helpers de fecha + `applyGanttTaskChange` reescrito, compatible hacia atrás | frontend | [#60](https://github.com/proyectof5/bootcamp-manager/pull/60) |
| 2 | Modales (`itemEditModal`/`flexibleBlockEditModal`/`moduleModal`) piden fecha en vez de semana; checkbox "Días lectivos" en editar promoción | frontend | [#61](https://github.com/proyectof5/bootcamp-manager/pull/61) |
| 3 | Script `scripts/migrate-roadmap-dates.mjs` — backfill de las 11 promociones existentes a fechas literales; columna `workingDays` en el modelo Promotion (bug encontrado: el checkbox de la Fase 2 no se guardaba, faltaba la columna y el allowlist del PUT) | backend | [#18](https://github.com/proyectof5/bootcamp-manager-server/pull/18) |
| 4 | Limpieza del "Planificador de Módulo" legacy muerto (561 líneas, dos clústeres de funciones sin ya ningún punto de entrada) | frontend | [#62](https://github.com/proyectof5/bootcamp-manager/pull/62) |
| — | `POST /api/admin/templates-from-promotion`: conversión fecha→semanas lectivas al crear plantilla desde una promoción (llevaba roto en silencio desde la Fase 3) | backend | [#19](https://github.com/proyectof5/bootcamp-manager-server/pull/19) |
| — | Bug: el Gantt perdía el scroll y colapsaba "Lecciones" en cada actualización (arrastrar, guardar un modal...) — `generateGanttChart` ahora preserva scroll + nodos abiertos | frontend | [#63](https://github.com/proyectof5/bootcamp-manager/pull/63) |
| — | Fines de semana y festivos en gris en el Gantt, zoom "Día" (`scale_cell_class`/`task_cell_class` + `.gantt-nonworking-cell`) | frontend | [#64](https://github.com/proyectof5/bootcamp-manager/pull/64) |

Todos los PR listados están mergeados a `main` en su repo.

## Pendiente / Próximos pasos

**Pregunta abierta al usuario, sin resolver todavía** (surgió al pedir que
los días no lectivos "no cuenten para contabilizar el tiempo" de un
elemento): ¿DÓNDE debe mostrarse un conteo de "días lectivos" de un
elemento del roadmap? Hoy no existe ningún sitio en la app que muestre un
número de duración para un elemento — se encontró un candidato
(`buildRoadmapExportRows` en `gantt-adapter.js`, columna "Duración (días)")
pero es código muerto, nada lo llama. Opciones sobre la mesa, sin decidir:
- Texto junto a "Fecha inicio/Fecha fin" en `itemEditModal`
  (ej. "12 días lectivos").
- Revivir y arreglar esa columna del Excel.
- Un total por módulo o por promoción.

El cálculo en sí (contar días lectivos excluyendo `workingDays` +
`holidays` entre dos fechas) ya tiene precedente hecho dos veces — ver
`countWorkingDaysInclusive`-equivalente en
`roadmap-manager-service/scripts/migrate-roadmap-dates.mjs` y en
`server.js` (helpers junto a `POST /api/admin/templates-from-promotion`) —
reutilizar ese patrón, no reinventarlo.

**Confirmado explícitamente, no cambiar sin volver a preguntar**: la BARRA
del Gantt debe seguir dibujándose CONTINUA sobre fines de semana/festivos
(nunca saltar/cortarse al arrastrar) — el "no contar" es solo para un
conteo derivado, no para cómo se ve o guarda la fecha.

## Archivos clave

- `roadmap-manager-frontend/public/js/gantt-adapter.js` — toda la lógica
  pura de fechas (parse/format, rangos módulo/item/bloque, dataset del
  Gantt, `applyGanttTaskChange`). Sin dependencias de DOM/HTTP.
- `roadmap-manager-frontend/public/js/promotion-detail.js` — orquestador:
  abre/guarda modales, `generateGanttChart`/`initGanttInstance` (incluye
  los templates de días no lectivos y la preservación de scroll/nodos
  abiertos), `setupForms`.
- `roadmap-manager-frontend/app/promotion/page.tsx` — JSX de los modales
  (`moduleModal`/`itemEditModal`/`flexibleBlockEditModal`/
  `editPromotionModal` con el checkbox de días lectivos).
- `roadmap-manager-frontend/css/promotion-detail.css` — estilos del Gantt,
  incluida `.gantt-nonworking-cell`.
- `roadmap-manager-service/backend/models/sql/Promotion.js` — columna
  `workingDays` (TEXT/JSON, default `[1,2,3,4,5]`).
- `roadmap-manager-service/server.js` — `PUT /api/promotions/:id`
  (allowlist de campos), `POST /api/admin/templates-from-promotion`
  (conversión fecha→semanas lectivas).
- `roadmap-manager-service/scripts/migrate-roadmap-dates.mjs` — script de
  backfill, reutilizable como referencia para cualquier migración similar
  (patrón dry-run → una promoción → todas, ya probado en producción).
