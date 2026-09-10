# Gantt: preservar vista y nodos abiertos al actualizar un elemento

## Contexto

Al editar un elemento del roadmap (guardar el modal `itemEditModal`), el
Gantt se reconstruye entero (`generateGanttChart` → `gantt.clearAll()` +
`gantt.parse()`). El usuario reportó dos molestias con esa reconstrucción:

1. **El nodo "Lecciones" se recolapsaba** cada vez que se guardaba una
   lección. Debería quedarse abierto igual que el módulo se queda abierto al
   editar un curso o un proyecto.
2. **La vista "saltaba"**: el scroll (horizontal y vertical) volvía a otra
   posición tras guardar. Debería actualizarse sin mover la vista.

Ya existía un intento previo — PR
[#63](https://github.com/proyectof5/bootcamp-manager/pull/63), descrito en
[roadmap-por-fechas.md](roadmap-por-fechas.md) — que capturaba `task.$open` +
`gantt.getScrollState()` antes del `clearAll()` y los restauraba después. Era
frágil: el "Lecciones" seguía recolapsándose y el scroll horizontal saltaba
cuando el rango del timeline cambiaba (el mismo píxel cae en otra fecha).

## Decisiones confirmadas

- **No se reescribe el render para editar solo la fila tocada.** El dataset
  se recalcula entero en `buildGanttDataset` (las fechas de módulos y del
  grupo "Lecciones" dependen de sus hijos). El objetivo es que el
  `clearAll()`+`parse()` **parezca** que no recarga —preservando scroll y
  plegado de forma fiable—, no eliminar la reconstrucción.
- **"Lecciones" pasa a nacer ABIERTO por defecto** (`open: true`, como el
  nodo del módulo). El módulo "no se cierra" al editar curso/proyecto
  precisamente porque nace abierto; "Lecciones" nacía `open: false` y por eso
  se veía la asimetría. El plegado que el docente elige a mano se recuerda
  aparte.
- **El plegado a mano se recuerda por promoción en `sessionStorage`**
  (`ganttCollapsed_<promotionId>` → array de ids de nodos colapsados). Solo
  se guarda lo COLAPSADO; sin entrada = el nodo respeta su `open` del
  dataset. Vale para el nodo "Módulo" y el nodo "Lecciones" (los dos únicos
  desplegables). Elegido sobre insistir en preservar `$open` de DHTMLX, que
  dependía del timing del render.
- **El scroll se restaura por FECHA, no por píxel**: se recuerda la fecha del
  borde izquierdo visible (`gantt.dateFromPos`) y tras el parse se vuelve a
  ella con `gantt.posFromDate` → `gantt.scrollTo`. Así, si el rango del
  timeline cambió (p.ej. se alargó la última tarea), el contenido visible no
  se desplaza.
- **Invariantes intactas**: la barra del Gantt sigue continua sobre fines de
  semana/festivos y el marcador "Hoy" (`#gantt-today-marker`) sigue
  dibujándose en cada `onGanttRender` — mismas reglas que
  [roadmap-por-fechas.md](roadmap-por-fechas.md).

## Estado

**Implementado** en `feat/gantt-preservar-vista` (frontend), sin PR todavía.

| Pieza | Archivo | Qué |
|---|---|---|
| "Lecciones" nace abierto | `gantt-adapter.js` — `buildGanttDataset`, nodo `leccion-group` | `open: false` → `open: true` |
| Estado de plegado por promoción | `promotion-detail.js` — `_ganttCollapsedStorageKey` / `_getGanttCollapsedIds` / `_setGanttNodeCollapsed` (nuevos, antes de `generateGanttChart`) | set de ids colapsados en `sessionStorage` |
| Persistencia al togglear | `promotion-detail.js` — `initGanttInstance` | `gantt.attachEvent('onTaskClosed'/'onTaskOpened', …)` con guard `_ganttRestoringState` |
| Re-aplicar plegado + scroll por fecha | `promotion-detail.js` — `generateGanttChart` | se quita la captura de `$open`; lee el set antes del parse, re-cierra esos ids después (guard activo), restaura scroll con `posFromDate(fechaBordeIzquierdo)` + `y` |

El arreglo #63 (`_ganttOpenTaskIds` + `_ganttSavedScroll`) queda reemplazado.

### Verificación (hecha, en vivo — promo "IA School Bootcamp - P7")

- Tras `loadModules()` (el mismo path que el guardado de un item):
  "Lecciones" sigue `$open: true`, la fecha del borde izquierdo y el scroll
  vertical se mantienen. ✅
- Alargando la última tarea 90 días (el rango del timeline crece): la fecha
  del borde izquierdo sigue fija (el píxel se recalcula solo). ✅
- Colapsar "Lecciones" a mano → `sessionStorage` guarda el id → sobrevive a
  la siguiente recarga (`$open: false`). Volver a abrirlo limpia la entrada. ✅
- `node --check` OK en ambos archivos; `npm run build` OK.

## Pendiente / Próximos pasos

- **Abrir el PR** (`feat/gantt-preservar-vista` → `main`).
- **Repaso manual en el navegador del docente** de los casos de la lista de
  verificación anterior, además de: editar un curso y un proyecto (sin
  regresión — el módulo sigue abierto), y probar zoom "Día" además de
  "Semana".
- **Comportamiento nuevo, avisar**: colapsar un nodo "Módulo" a mano también
  se recuerda ahora (antes se reabría en cada recarga). Es consistente con lo
  pedido para "Lecciones"; si no se quiere para módulos, filtrar por
  `itemType === 'leccion-group'` en los listeners.

Sin preguntas abiertas de diseño.

## Archivos clave

- `roadmap-manager-frontend/public/js/promotion-detail.js`
  - `generateGanttChart` — captura la fecha del borde izquierdo + `y`,
    reconstruye, re-aplica el plegado guardado y restaura el scroll por
    fecha. Núcleo del arreglo.
  - `_ganttCollapsedStorageKey` / `_getGanttCollapsedIds` /
    `_setGanttNodeCollapsed` (nuevos, justo antes de `generateGanttChart`) —
    lectura/escritura del set de nodos colapsados en `sessionStorage`.
  - `initGanttInstance` — `attachEvent('onTaskClosed'/'onTaskOpened')` +
    `_renderTodayMarker`; guard `_ganttRestoringState` (nueva variable de
    módulo junto a `_ganttInitialized`).
  - submit de `#item-edit-form` (~7150) — guardado de curso/proyecto/lección;
    termina en `loadModules()`. No se tocó: el arreglo vive aguas abajo.
  - `loadModules` — refetch de la promoción + `displayModules` +
    `generateGanttChart`.
- `roadmap-manager-frontend/public/js/gantt-adapter.js`
  - `buildGanttDataset` — nodo módulo `open: true`, nodo grupo "Lecciones"
    ahora también `open: true`.
- [roadmap-por-fechas.md](roadmap-por-fechas.md) — contexto del arreglo #63 y
  las invariantes del Gantt (barra continua, marcador "Hoy").
