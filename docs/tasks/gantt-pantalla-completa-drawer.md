# Gantt a pantalla completa + panel lateral (estilo Asana)

## Contexto

El Gantt del roadmap vivía en una caja de `height: 500px; overflow: auto`
dentro de una página que también scrollea → hasta **3 barras de scroll**
(página + caja + las internas de DHTMLX) y el diagrama siempre apretado. Y al
editar un elemento se abría un modal centrado (`itemEditModal`) que tapaba el
propio diagrama.

Pedido del usuario (referencia visual: Asana): que el Gantt ocupe todo el
alto que queda bajo las pestañas, sin caja, con **una sola barra vertical**
(filas) y **una sola horizontal** (línea de tiempo); y que al hacer clic en un
elemento se abra **un panel lateral** por la derecha con su ficha, editable en
el sitio, sin modal.

Solo frontend (`roadmap-manager-frontend`). Mockup previo publicado como
design canvas ("Gantt a pantalla completa").

## Decisiones confirmadas

- **El scroll es 100% interno de DHTMLX.** No se añade `overflow` al
  contenedor: se le da un alto en píxeles (medido) y DHTMLX dibuja sus
  `.gantt_ver_scroll` / `.gantt_hor_scroll`. Verificado: exactamente una de
  cada.
- **El alto se mide con JS**, no con CSS puro: `RoadmapPanel` calcula
  `window.innerHeight - wrap.top - colchón` y lo pasa como `--roadmap-h`; en
  cada `resize` y al abrir la pestaña llama a `gantt.setSizes()`. El chrome
  encima (h2 "Detalles del Programa" + 2 filas de nav) es variable, así que
  un `calc()` fijo no vale.
- **`<main>` y `#info-tab` arrastran `min-height: calc(100vh - 80px)` y
  `padding-bottom: 2rem`** que hacían scrollear la página ~36px aunque el
  roadmap cupiera. Se neutralizan con un override `:has()` acotado a cuando
  la pestaña Roadmap está activa (`#program-details-roadmap.show/.active`) —
  no se toca el resto de pestañas.
- **Barra compacta de una fila** en vez de la cabecera "Roadmap & Módulos" +
  subtítulo "Diagrama Gantt" + fila de leyenda: zoom, Hoy, Módulo,
  Empleabilidad, leyenda (popover), Google Calendar, Exportar. `#modules-list`
  (su render de tarjetas está comentado en el legacy → casi siempre vacío) se
  queda **oculto** en el DOM para no romper los `getElementById('modules-list')`
  de `displayModules`.
- **El panel lateral NO oscurece el fondo ni es modal** (`position: fixed`,
  sin backdrop, `z-index: 1040` — por debajo del modal 1050). Se monta por
  **portal en `<body>`** para no quedar atrapado por el `transform` del
  `.tab-pane` (animación `fadeIn`).
- **El panel edita solo lo básico** (nombre/título, fechas, URL, tipo de
  lección). Competencias y enlaces siguen editándose en el `itemEditModal`
  completo, accesible desde un enlace del panel — no se reimplementan sus
  pickers.
- **`persistRoadmapItemEdit` es una función nueva, no un refactor del submit
  de `#item-edit-form`.** Hace el mismo `fetch → mutar item → PUT promoción
  completa → loadModules`, pero con campos explícitos y conservando
  `competenceIds`/`links`. Se decidió no tocar el handler del modal para no
  arriesgar una regresión ahí; la duplicación (~40 líneas) es consciente.
- **Clic simple abre el panel; doble clic sigue abriendo el modal completo.**
  `onTaskClick` no roba el clic del triángulo de plegar ni del asa de
  arrastre (`e.target.closest('.gantt_tree_icon, .gantt-drag-handle, …')`).
- **Días/horas lectivas en el panel se calculan inline** (workingDays +
  holidays de `window.currentPromotion`; jornada `hoursPerDay` o 7 aprox.) —
  sin depender de los helpers de la rama `feat/horas-lectivas`, que aún no
  está mergeada.

## Estado

**Implementado** en `feat/gantt-fullscreen-redesign` (2 commits), sin PR aún.

| Parte | Commit | Qué |
|---|---|---|
| A — layout a pantalla completa | `feat(roadmap): Gantt a pantalla completa…` | `RoadmapPanel.tsx` (barra compacta + medición de alto), `promotion-detail.css` (`.roadmap-fullbleed`, `#gantt-container` sin borde/overflow, override `:has()`), `promotion-detail.js` (`ganttScrollToToday`, hook en `switchProgramDetailsTab`) |
| B — panel lateral | `feat(roadmap): panel lateral de detalle…` | `RoadmapDetailDrawer.tsx` (nuevo), `page.tsx` (host), `promotion-detail.js` (`persistRoadmapItemEdit`, `onTaskClick`), `promotion-detail.css` (`.roadmap-drawer`) |
| C — zoom con rueda | `feat(roadmap): zoom del Gantt con Ctrl/⌘ + rueda` | `promotion-detail.js` (`setupGanttWheelZoom`, `_GANTT_ZOOM_ORDER`): Ctrl/⌘ + rueda recorre mes↔semana↔día y re-centra en la fecha bajo el cursor. La rueda a secas sigue haciendo scroll. Listener en `gantt.$container` (el root interno de DHTMLX, no `#gantt-container`), con guard `dataset.wheelZoom`. |
| — | merge de `feat/horas-lectivas` | Esta rama incluye ahora la pestaña "Cómputo de horas" (PR #69) para que conviva con el rediseño en el mismo preview/PR. |

### Verificado en vivo (promo "IA School Bootcamp - P7", 1440×900)

- Página sin barra de scroll (`scrollHeight == clientHeight`); el Gantt llega
  al borde inferior con ~6px de colchón y ocupa de lado a lado (rompe el
  padding de `<main>`).
- Exactamente **un** `.gantt_ver_scroll` y **un** `.gantt_hor_scroll`.
- Cambiar a Calendario/Horario y volver → `min-height`/`padding` de `<main>`
  se restauran y se re-restan bien; el alto del Gantt se re-mide.
- Zoom Día/Semana, botón "Hoy" (marcador dibujado), OK.
- Panel: clic real en una barra lo abre; ficha correcta para curso, proyecto,
  lección (tipo + enlaces) y módulo (solo lectura + "Editar módulo"); Escape /
  Cancelar / X cierran; "Editar competencias y enlaces en detalle →" abre el
  `itemEditModal` y cierra el panel.
- **Guardar end-to-end**: editar la fecha de fin de un proyecto desde el
  panel → PUT correcto (verificado contra la API), `loadModules()`, panel
  cerrado, toast. (Se restauró el dato de prueba.)
- `npm run build` + `tsc --noEmit` OK.

## Pendiente / Próximos pasos

- **Abrir el PR** (`feat/gantt-fullscreen-redesign` → `main`).
- **Repaso manual** en un navegador real (viewport ≥ 900px de alto — el panel
  de preview de esta sesión es corto y fuerza el suelo de 360px): comprobar
  el aspecto de la barra compacta cuando envuelve, el panel en móvil
  (`max-width: 575.98px` → ancho completo), y que arrastrar/redimensionar una
  barra no dispara el panel de forma molesta.
- **Nice-to-have, no pedido**: que al abrir el panel el Gantt haga scroll
  para que el elemento seleccionado no quede debajo del panel; y un botón
  "Marcar completada" real (hoy el mockup lo mostraba, no está).
- **Cuando entre `feat/horas-lectivas`**: sustituir el cálculo inline de días
  lectivos del panel por `window.countWorkingDaysInclusive` /
  `computeLectiveHours` y mostrar las horas sin el "aprox.".
- **Colisión esperada** con `feat/gantt-preservar-vista` (toca
  `generateGanttChart` / eventos del Gantt) — resolver al mergear.

## Archivos clave

- `app/promotion/_components/RoadmapPanel.tsx` — barra compacta + `useEffect`
  que mide `--roadmap-h` y llama a `gantt.setSizes()`; `LegendPopover`.
- `app/promotion/_components/RoadmapDetailDrawer.tsx` — el panel lateral
  (nuevo). `window.__openRoadmapDrawer(task)` lo abre.
- `public/js/promotion-detail.js` — `persistRoadmapItemEdit` (junto a
  `openItemEditModal`), `onTaskClick` en `bindGanttEditingEvents`,
  `ganttScrollToToday`, hook `__fitRoadmapGantt` en `switchProgramDetailsTab`.
- `css/promotion-detail.css` — `.roadmap-fullbleed` + override `:has()` sobre
  `#main-content`/`#info-tab`; `#gantt-container` sin borde/overflow;
  `.roadmap-drawer`.
- `app/promotion/page.tsx` — monta `<RoadmapDetailDrawerHost />`.
- [roadmap-por-fechas.md](roadmap-por-fechas.md) — modelo de fechas y eventos
  del Gantt; invariantes (barra continua, marcador "Hoy").
