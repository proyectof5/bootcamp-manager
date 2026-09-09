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

Sin empezar — solo spec, sin código todavía.

## Pendiente / Próximos pasos

Plan de implementación a alto nivel (fases, cada una en su rama/PR, patrón
ya usado en [roadmap-por-fechas.md](roadmap-por-fechas.md)):

1. **Backend**: columna `hoursPerDay` en `Promotion` (TEXT/DECIMAL, default
   razonable ej. `7`) + añadir al allowlist de `PUT /api/promotions/:id`
   (mismo bug-shape que tuvo `workingDays` en su momento — no olvidar el
   allowlist esta vez).
2. **Adaptador**: en `gantt-adapter.js`, función compartida
   `countWorkingDaysInclusive(startDate, endDate, workingDaysSet, holidaysSet)`
   (portada desde el backend/script, sin duplicar) + función de horas
   `computeLectiveHours(startDate, endDate, workingDaysSet, holidaysSet, hoursPerDay)`.
3. **UI**: checkbox/input de "Horas por día" junto a donde ya se edita
   `workingDays`/`holidays` de la promoción.
4. **Panel nuevo**: pestaña "Horas" (nombre a confirmar) dentro de
   "Contenido del Programa" — total de formación, desglose por
   módulo/proyecto, comparación contra `extendedInfo.totalHours` con el
   déficit si aplica. Seguir el patrón de sub-tab React vía portal (spec
   0014) usado por el resto de pestañas de esa sección.
5. Verificación: comprobar con una promoción real que el total de horas
   calculado tiene sentido (contar a mano un módulo de ejemplo que cruce
   un fin de semana/festivo) y que el déficit contra `totalHours` es
   correcto en ambos sentidos (por encima y por debajo del objetivo).

Sin preguntas abiertas pendientes — las tres decisiones de diseño
(dónde vive `hoursPerDay`, dónde se muestra el panel, qué significa
"si faltan") ya están confirmadas arriba.

## Archivos clave

- `roadmap-manager-service/backend/models/sql/Promotion.js` — columnas
  `workingDays`/`holidays` ya existen ahí, `hoursPerDay` va al lado.
- `roadmap-manager-service/server.js` — `PUT /api/promotions/:id`
  (allowlist), helpers de conteo de días lectivos junto a
  `POST /api/admin/templates-from-promotion`.
- `roadmap-manager-frontend/public/js/gantt-adapter.js` — lógica pura de
  fechas, candidato natural para el helper de horas compartido.
- `roadmap-manager-frontend/public/js/promotion-detail.js` — línea
  ~2337-2495 y ~8234-8317, manejo de `extendedInfoData.totalHours` (acta).
- `roadmap-manager-frontend/app/promotion/page.tsx` — estructura de
  sub-tabs de "Contenido del Programa" (spec 0014), sitio donde añadir la
  pestaña nueva.
- [roadmap-por-fechas.md](roadmap-por-fechas.md) — modelo de fechas,
  `workingDays`, festivos; precedente directo de este spec.
