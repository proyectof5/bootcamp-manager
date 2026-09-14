# Festivos por ciudad (nacionales, autonómicos y locales)

## Contexto

En el roadmap el docente quiere cargar automáticamente los festivos de toda
la duración del bootcamp según la ciudad donde se imparte, en vez de marcarlos
uno a uno con clic derecho. Los festivos se pintan en gris en el Gantt (zoom
"Día") igual que los fines de semana y no cuentan en el Cómputo de horas.
Ciudades pedidas: Madrid, Barcelona, Oviedo (Asturias), Valencia, Málaga y
Sevilla, con posibilidad de elegir varias.

## Decisiones confirmadas

- **Se elige por ciudad, no por comunidad**, en un dropdown de selección
  múltiple (botón "Festivos" de la barra del Roadmap). Cada ciudad carga los
  festivos nacionales + los de su comunidad + sus 2 locales. Málaga y Sevilla
  comparten comunidad (Andalucía); Oviedo representa Asturias.
- **Fuentes**: nacionales y autonómicos desde Nager.Date
  (`https://date.nager.at`, sin API key, caché de 24 h en el backend). Los
  **locales no existen en ninguna API gratuita fiable** → tabla mantenida a
  mano en `backend/data/localHolidays.js` (con la fuente de cada año). Si falta
  un año, la API lo devuelve en `missingLocalData` y la UI lo avisa — nunca se
  inventan fechas.
- **Solo se cargan festivos que caen en días lectivos** de la promoción
  (`promotion.workingDays`): un festivo en sábado/domingo no se guarda porque
  no quita horas.
- `promotion.holidays` sigue siendo la **única lista canónica** de días no
  lectivos (ver [asistencia-festivos.md](asistencia-festivos.md)). Los
  cargados automáticamente se fusionan ahí; los marcados a mano se conservan
  al recargar.
- **Quitar festivos**: desde la lista (✕) o con clic derecho en Gantt/Asistencia.
  Si el festivo era automático, se guarda en `excludedHolidays` y "Cargar
  festivos" no lo vuelve a añadir. "Restaurar" (`resetExclusions: true`) vacía
  la lista de excluidos. Volver a marcarlo a mano lo saca de excluidos.
- **Lista de festivos cargados en panel lateral derecho**, reutilizando
  `.roadmap-drawer` (mismo panel que el detalle de elementos del Gantt), no
  dentro del popover.
- **Tooltip al pasar el ratón** por un festivo del Gantt: nombre + nacional /
  autonómico (comunidad) / local (ciudad, "provisional" si aplica) / marcado a
  mano. Solo en zoom "Día" (en Semana/Mes cada columna agrupa varios días).
- **No tocar `gantt.$container`** (ni atributos ni listeners): DHTMLX pierde el
  scroll con rueda/trackpad. Los listeners del tooltip van en `gantt.$root`
  (`#gantt-container`), igual que `setupGanttWheelZoom`.

## Estado

Implementado en la rama `feat/festivos-por-ciudad` de ambos repos
(bootcamp-manager y bootcamp-manager-server), PR abierto en cada uno.

## Pendiente / Próximos pasos

- **Mantener `localHolidays.js` cada año**: añadir el año siguiente cuando
  cada ayuntamiento lo publique. A fecha de septiembre de 2026 faltan
  **Madrid 2027** (sin aprobar) y confirmar **Sevilla 2027** (14/04 y 27/05,
  aprobados en pleno pero pendientes de BOJA, marcados `provisional`).
- Si se cambian los días lectivos o las fechas de la promoción, los festivos ya
  cargados **no se re-filtran solos**: hay que volver a pulsar "Cargar festivos".
- El panel lateral de festivos y el de detalle de elementos del Gantt ocupan el
  mismo sitio: si ambos están abiertos se superponen. Pendiente decidir si abrir
  uno debe cerrar el otro.
- Asistencia sigue calculando fin de semana fijo (Sáb/Dom) — ver pendiente en
  [asistencia-festivos.md](asistencia-festivos.md).

## Archivos clave

- `app/promotion/_components/RoadmapPanel.tsx` — `HolidaysPopover`: dropdown de
  ciudades, "Cargar festivos", aviso de datos locales que faltan, "Restaurar" y
  el panel lateral con la lista y el botón de quitar.
- `public/js/promotion-detail.js` — `window.__applyPromotionHolidays` (refresca
  Gantt, Asistencia y Cómputo de horas), `setupGanttHolidayTooltip` (tooltip
  por hover), evento `promotion-holidays-changed` tras clic derecho en
  Gantt/Asistencia.
- `css/promotion-detail.css` — `.holidays-summary-*`, `.holidays-drawer-*`,
  `.gantt-holiday-tooltip`.
- Backend `server.js` — `PUT /api/promotions/:id/holiday-regions` (carga por
  ciudades) y `PUT /api/promotions/:id/holidays` (ahora mantiene
  `regionalHolidays`/`excludedHolidays` al quitar festivos).
- Backend `backend/data/localHolidays.js` — festivos locales por ciudad y año.
- Backend `backend/models/sql/Promotion.js` — columnas `holidayCities`,
  `holidayRegions`, `regionalHolidays`, `excludedHolidays`.
