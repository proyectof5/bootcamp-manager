# Deuda Técnica — Bootcamp Manager (frontend)

---
**TD-1**: `module.topics` se conserva en el modelo pero no tiene ningún punto de acceso en la UI
- **Problema**: `module.topics[]` (una agrupación de cursos/proyectos/lecciones en "temas", distinta y sin relación con el Gantt) se editaba desde el planificador combinado del modal de módulo, que se eliminó en la Fase 7 (TASK-30) del roadmap del Gantt DHTMLX. El dato en sí **no se toca ni se pierde** — sigue viajando intacto en cada `PUT /api/promotions/:id` porque el guardado del modal de módulo ahora solo sobrescribe `name`/`duration` (spread del resto del objeto). Pero ya no hay ningún botón, modal ni pantalla desde la que crear/editar/eliminar un tema.
- **Ubicación**: `bootcamp-manager/app/promotion/page.tsx` (el `moduleModal` ya no tiene `#topics-container`), `bootcamp-manager/public/js/promotion-detail.js` (variables `currentEditingTopics`, `currentEditingModuleProjects`, función `generateTopicId()` — vivas en memoria pero nunca pobladas ni leídas por ningún flujo alcanzable)
- **Impacto**: Medio — nadie puede gestionar temas desde la UI, pero los datos existentes de promociones que ya usaban temas no se pierden ni se corrompen.
- **Esfuerzo**: Medio — requiere diseñar dónde encaja esta función ahora que no existe el modal combinado (¿modal propio? ¿integrado en el modal de módulo?).
- **Riesgo de tocar**: Bajo — es una función aislada, no interfiere con el Gantt ni con cursos/proyectos/lecciones.
- **Síntoma visible**: ninguno hasta que alguien necesite editar temas — el dato sigue ahí, solo inaccesible desde la interfaz.
- **Detectada en**: Fase 7 del Gantt del docente (`docs/tasks/dhtmlx-gantt-roadmap.md`), TASK-30 (decisión explícita del usuario: "los temas los dejamos de lado, pero es importante que si queremos integrarlos más adelante que sea posible")
- **Estado**: Pendiente

---
**TD-2**: Código muerto del planificador combinado (reemplazado por los modales enfocados de la Fase 7)
- **Problema**: Al sustituir el modal de módulo con planificador por los modales enfocados por tipo (TASK-30/31/32/33), las siguientes funciones de `public/js/promotion-detail.js` quedaron **sin ningún caller alcanzable** (verificado con `grep` — sus únicas referencias son entre sí, dentro de una cadena de plantillas HTML que ya nadie renderiza, ya que `#planner-container`/`#topics-container` no existen en `page.tsx`):
  - `addPlannerItem(type)`, `deletePlannerItem(id)`, `updatePlannerItem(id, field, value)`, `updatePlannerItemWeeks(id, startWeekRaw, endWeekRaw)`
  - `renderPlannerEditor()`, `renderPlannerItemFields(item, index)`, `initPlannerSortable()`, `PLANNER_TYPE_CONFIG`
  - `togglePlannerUrlEdit(id, btn)`, `confirmPlannerUrlEdit(id, input)`
  - `_syncPlannerFromDom()`
  - `addCoursField(...)`, `addProjectField(...)` (constructores de filas del modal de módulo legacy, ya sin `#courses-container`/`#projects-container` en el DOM)
  - `renderTopicsEditor()` (ligada a TD-1)
- **Importante — NO son código muerto** (reutilizadas activamente por los modales nuevos, TASK-31/32/33): `_currentEditingModuleStartWeeks()`, `_itemDisplayStartWeeks(item)`, `renderPlannerProjectCompetences(item)`, `openPlannerCompetencePicker`/`savePlannerCompetencePicker`/`_closePlannerCompPicker`, `renderPlannerItemLinks(item)`/`addPlannerLink`/`deletePlannerLink`/`updatePlannerLink`/`plannerLinkIcon`, `buildInitialPlannerFromLegacy(module)`, `generatePlannerId()`/`generatePlannerLinkId()`, y la variable `currentPlannerItems` (repropósito: ahora contiene un único item en edición, no la lista completa del planificador).
- **Ubicación**: `bootcamp-manager/public/js/promotion-detail.js`, funciones listadas arriba (buscar por nombre)
- **Impacto**: Bajo — no afecta a ningún flujo funcional, es peso muerto en el bundle y ruido para quien lea el archivo.
- **Esfuerzo**: Bajo — son funciones autocontenidas, eliminarlas no debería afectar a nada más (ya verificado que no tienen callers).
- **Riesgo de tocar**: Bajo, pero requiere volver a `grep` cada nombre antes de borrar por si algo cambió entre esta auditoría y el momento de limpiar.
- **Síntoma visible**: ninguno — es limpieza, no un bug.
- **Detectada en**: Fase 7 del Gantt del docente (`docs/tasks/dhtmlx-gantt-roadmap.md`), TASK-34
- **Estado**: Pendiente

---
**TD-3**: `img/` está duplicada en la raíz y en `public/img/` porque el CSS legacy usa rutas relativas
- **Problema**: `css/dashboard.css` y `css/promotion-detail.css` (raíz, importados en build-time por `app/globals.css`) referencian imágenes con ruta relativa — `url("../img/Fondo-factoria-f5-color.png")` — que webpack resuelve contra `img/` de la raíz. La misma imagen (y el resto de `img/`) también vive en `public/img/`, servida en runtime como `/img/...` para todo lo que sí usa rutas absolutas (`app/`, `<img src>`, etc.). Como consecuencia hay dos copias idénticas (2.4 MB) que hay que mantener sincronizadas a mano — se descubrió al intentar borrar `img/` (raíz) por parecer un duplicado sin uso: el build falló con `Cannot find module '../img/Fondo-factoria-f5-color.png'`.
- **Ubicación**: `bootcamp-manager/css/dashboard.css:93,229`, `bootcamp-manager/css/promotion-detail.css:25,994` (las `url("../img/...")`), vs. `bootcamp-manager/img/` y `bootcamp-manager/public/img/` (carpetas duplicadas)
- **Impacto**: Bajo — no rompe nada mientras ambas copias se mantengan sincronizadas, pero es fácil que alguien actualice una imagen en una copia y se le olvide la otra.
- **Esfuerzo**: Bajo — cambiar esas 4 `url("../img/...")` a `url("/img/...")` (ruta absoluta, resuelta en runtime contra `public/img/`) y borrar `img/` (raíz) una vez confirmado que ningún otro archivo CSS de la raíz usa rutas relativas a `img/`.
- **Riesgo de tocar**: Bajo — cambio mecánico y fácil de verificar con un `npm run build` + revisión visual de las páginas que usan ese fondo.
- **Síntoma visible**: ninguno mientras ambas copias sigan sincronizadas; si alguien actualiza solo una copia, la imagen se verá distinta según si se carga vía el CSS legacy o vía una ruta `/img/...` directa.
- **Detectada en**: limpieza de archivos huérfanos (`docs/tasks/limpieza-archivos-huerfanos.md`), TASK-3
- **Estado**: Pendiente
