# Design system — Bootcamp Manager

Referencia rápida de los tokens y patrones visuales de la app, para que
estandarizar una vista nueva (o revisar una existente) sea cuestión de mirar
aquí en vez de adivinar valores del CSS. Es un documento vivo — cuando cambie
un patrón real en el código, actualiza esta página en el mismo PR.

**Fuente de la verdad de los tokens**: [`css/design-system.css`](../css/design-system.css).
Este documento describe cómo se usan; los valores exactos viven ahí (variables
`--app-*`). Nunca copies un valor aquí sin comprobar que sigue siendo el del
CSS — si difieren, el CSS gana y este documento está desactualizado.

---

## Tokens

### Color

| Token | Valor | Uso |
|---|---|---|
| `--app-color-brand-50` | `#fff1ea` | Fondo suave de marca (chips, pills activos suaves) |
| `--app-color-brand-100` | `#ffd9c4` | Borde de elementos "brand-soft" |
| `--app-color-brand-300` | `#ff8a5c` | Naranja claro — también `--app-color-gantt-project` |
| `--app-color-brand-500` | `#ff4700` | **Color de marca canónico** — botón primario, sidebar/header, activo |
| `--app-color-brand-700` | `#d63900` | Hover de marca, texto sobre `brand-50` |
| `--app-color-brand-900` | `#8a2400` | Uso puntual, muy oscuro |
| `--app-color-neutral-0` … `-900` | `#ffffff` → `#111827` | Escala de grises: `50` fondo de página, `100` bordes/hairlines, `500` texto secundario, `700` texto de icono/label, `900` texto principal |
| `--app-color-success-500` | `#198754` | Estados positivos (evaluado, guardado, completado) |
| `--app-color-warning-500` | `#f59e0b` | Alertas suaves, "pendiente". **Distinto del naranja de marca** — no confundir |
| `--app-color-danger-500` | `#dc3545` | Errores, eliminar |
| `--app-color-info-500` | `#0dcaf0` | Informativo (Bootstrap `#0d6efd` azul también aparece en badges heredados — ver nota abajo) |
| `--app-color-gantt-module/course/project/leccion/flexible` | ver CSS | Un color fijo por tipo de elemento del roadmap — mismo color en el Gantt, la leyenda, el export a Excel y los eventos de Google Calendar (§ Gantt más abajo) |

**Nota sobre azules heredados**: algunas vistas más antiguas (p. ej. los
niveles de indicador del evaluador — Nv.1 ámbar / Nv.2 azul `#0d6efd` / Nv.3
verde) usan el azul por defecto de Bootstrap en vez de `--app-color-info-500`.
No se ha migrado todavía; al tocar esa vista, usa el azul que ya está ahí
(consistencia local) en vez de forzar el token nuevo a medias.

Semántico (lo que consume el código de los componentes, no los uses en hex
suelto): `--app-color-primary` (= brand-500), `--app-color-primary-hover`,
`--app-color-primary-soft`, `--app-color-bg-page`, `--app-color-bg-surface`,
`--app-color-text`, `--app-color-text-muted`, `--app-color-border`.

### Tipografía

- Fuente: **Poppins** (`--app-font-sans`), pesos 400/500/600/700. `Pacifico`
  (`--app-font-decorative`) SOLO para el logo/títulos de bienvenida — nunca en
  UI funcional.
- Escala: `xs` 12px · `sm` 14px · `md` 16px (base) · `lg` 18px · `xl` 20px
  (h3/título de card) · `2xl` 24px (h2/título de sección) · `3xl` 30px
  (h1/título de página). Hay variantes `fluid-*` con `clamp()` para
  títulos/stats que deban encogerse en móvil sin saltos bruscos.

### Espaciado, radios, sombras

- Espaciado: escala `--app-space-1` (4px) a `--app-space-7` (48px), más
  `--app-space-page-x/-y` fluidos para el padding del contenedor principal.
- Radios: `sm` 4px (badges/pills pequeños, checkboxes) · `md` 8px (botones,
  inputs, chips) · `lg` 12px (cards) · `pill` 9999px (pills/badges de estado,
  toggles segmentados, avatares).
- Sombras: `sm` para cards en reposo, `md` para hover/dropdowns/popovers,
  `lg` para modales, `brand` (sombra tintada de marca) para CTAs primarios
  destacados.

---

## Componentes base

### Cards

```css
background: var(--app-color-bg-surface);   /* #fff */
border: 1px solid var(--app-color-border); /* n-100, NO border-0 + shadow suelto */
border-radius: var(--app-radius-lg);       /* 12px */
box-shadow: var(--app-shadow-sm);
```

Cabecera de card (cuando la lleva): fondo `--app-color-neutral-50`,
`border-bottom: 1px solid var(--app-color-border)` — nunca `bg-light` +
`border-0` de Bootstrap suelto, que no lleva borde de verdad. Ver
`#overview-tab .card` / `.card-header` en `css/promotion-detail.css` como
referencia real ya migrada.

### Botones

- **Primario** (`.btn-primary`): relleno `--app-color-primary`, texto blanco.
  Una sola acción primaria por bloque — no dos botones `.btn-primary` compitiendo
  en la misma barra.
- **Outline** (`.btn-outline-primary` / `.btn-outline-secondary`): fondo
  blanco, borde y texto del color, se rellena en hover.
- **Brand-soft** (`.btn-brand-soft`, en `promotion-detail.css`): fondo
  `brand-50`, texto `brand-700`, borde `brand-100` — para una acción
  secundaria que SÍ debe leerse como "de marca" pero no competir con el CTA
  primario (ejemplo real: "Sesiones Empleabilidad" en el Roadmap).
- Icono + texto casi siempre (Bootstrap Icons `bi-*`, nunca emoji en UI real).

### Badges / pills de estado

Patrón: fondo "soft" del color semántico + texto en el tono fuerte del mismo
color, `border-radius: var(--app-radius-pill)`, `font-size` 11–12.5px,
`font-weight: 600`.

| Estado | Fondo | Texto |
|---|---|---|
| Éxito / evaluado / completado | `--app-color-success-500` al 100% (texto blanco) o `#d1e7dd` (texto `#198754`) según contraste necesario | — |
| Pendiente / sin datos | `--app-color-neutral-50` + borde `neutral-100` | `--app-color-neutral-500` |
| Aviso | `#fff3cd`/`#fff8e6` | `--app-color-warning-500` o su variante oscura `#916800` para texto sobre fondo claro |
| Informativo | `#cfe2ff` / `#e6f9fd` | azul Bootstrap `#0d6efd` o `--app-color-info-500` según la vista |
| Tono de marca | `--app-color-brand-50` | `--app-color-brand-700` |

### Chips de icono circulares

Introducidos en el rediseño del Dashboard (`.quick-action-icon`,
`.aviso-icon-*` en `promotion-detail.css`): círculo de 48px (36px en avisos),
fondo pastel derivado del color del icono vía
`color-mix(in srgb, currentColor 14%, white)` (con fallback sólido a
`neutral-50` para navegadores sin soporte), icono centrado del mismo color al
100%. Úsalo para la acción/aviso principal de una tarjeta, no para todo icono
suelto de la interfaz.

### Toggle segmentado (pill)

Track `background: var(--app-color-neutral-100)`, `border-radius:
var(--app-radius-md)`, `padding: 3px`; cada opción sin borde propio, activa =
fondo blanco + `box-shadow: var(--app-shadow-sm)` + texto oscuro. Ejemplos
reales: zoom del Gantt (Día/Semana/Mes, `.gantt-zoom-group` en
`promotion-detail.css`), tipo de proyecto (Individual/Grupal) en las tarjetas
de evaluación (ver mockup enlazado más abajo).

### Barra lateral y cabecera

Fondo `--app-color-brand-500` con la textura de marca en mosaico
(`img/Fondo-factoria-f5-color.png`, `background-size: 150px 150px;
background-repeat: repeat`) — mismo patrón en el sidebar (280px de ancho) y en
el header (80px de alto). Items de navegación: fondo blanco translúcido
(`rgba(255,255,255,.63)`), activo = blanco sólido + texto `brand-500` +
`border-left: 3px solid var(--app-color-brand-500)`.

---

## Navegación de Contenido del Programa

*(Sección referenciada desde `body.ts`, `promotion-detail.css` y
`promotion-detail.js` — no renombrar este encabezado sin actualizar esos
comentarios.)*

Las antiguas 10 pestañas sueltas de "Detalles del Programa" (Roadmap,
Calendario, Horario, Equipo, Recursos, Píldoras, Criterios, Aula Virtual,
Quick Links, Secciones) se agrupan en **2 niveles**:

1. **Nivel 1 — grupos** (`#program-details-group-nav`, 4 pills): Planificación
   (Roadmap · Calendario · Horario) · Contenido (Píldoras · Criterios ·
   Secciones) · Recursos (Recursos · Quick Links) · Equipo (Equipo · Aula
   Virtual).
2. **Nivel 2 — pestañas del grupo activo** (`#program-details-tabs`, mismos 10
   `<button>` e ids de siempre, solo con `data-group` añadido y filtradas por
   `display` según el grupo activo).

Implementación: `switchProgramDetailsTab()` (la función existente, sin
cambios en su lógica interna) sigue siendo la única fuente de verdad de qué
pestaña se ve; el nivel de grupo es puramente visual y se sincroniza solo vía
`_syncProgramDetailsGroupNav()`, enganchada al final de esa misma función.
`switchProgramDetailsGroup(groupKey)` cambia de grupo recordando la última
pestaña visitada de ese grupo (o la primera, la primera vez).

Al añadir una pestaña nueva a "Contenido del Programa": decide a qué grupo
pertenece por *tema*, no por dónde quepa; añade el botón en
`#program-details-tabs` con su `data-group` y, si aplica, en el mapa
`PROGRAM_DETAILS_TAB_GROUPS` de `promotion-detail.js`.

---

## Gantt — colores y leyenda

Un color fijo por tipo de elemento, el MISMO en cuatro sitios (nunca hardcodees
el hex directamente — usa los tokens `--app-color-gantt-*` o, en JS,
`GANTT_ITEM_TYPE_HEX` en `gantt-adapter.js`):

| Tipo | Color | Token |
|---|---|---|
| Módulo | `#667eea` | `--app-color-gantt-module` |
| Curso | `#6bbf9c` | `--app-color-gantt-course` |
| Proyecto | `#ff8a5c` (= brand-300) | `--app-color-gantt-project` |
| Lección / grupo "Lecciones" | `#8e7cc3` | `--app-color-gantt-leccion` |
| Tiempo flexible | `#6f42c1` | `--app-color-gantt-flexible` |

Los cuatro consumidores de esta paleta: `.gantt_task_line.gantt-task-*` (barras
del Gantt en pantalla), la leyenda de colores sobre el Gantt
(`.gantt-legend` en `RoadmapPanel.tsx`), el export a Excel "pintado como el
Gantt" (`GANTT_ITEM_TYPE_HEX` en `_exportRoadmapXlsx`), y los eventos
sincronizados a Google Calendar (`GANTT_ITEM_TYPE_COLOR_ID`, el color de la
paleta fija de Calendar más parecido a cada uno).

**La línea "Hoy" del Gantt (`#gantt-today-marker`) es intocable** — instrucción
explícita del producto, no una preferencia de diseño. Cualquier cambio en el
Gantt debe verificar en vivo que sigue ahí, visible y en la posición correcta.

Zoom del Gantt (Día/Semana/Mes): toggle segmentado (ver arriba). El export a
Excel respeta la granularidad activa — exportar en zoom Día saca columnas por
día, no siempre por semana.

---

## Patrones en exploración (mockups, no implementados aún)

Estos dos canvases de Claude Design proponen una limpieza del flujo de
Evaluación de Proyectos (Área de Administración), reutilizando exactamente los
tokens de arriba. Son **mockups estáticos, pendientes de aprobación y de
aplicar al código real** — no los trates como ya implementados si estás
buscando dónde vive un componente.

- **[Evaluación de Proyectos](https://claude.ai/code/artifact/95d106af-4c58-4d98-85fd-2f6d1fc89cf3)**
  — la pantalla de listado (antes de entrar a evaluar un proyecto): acordeón de
  módulos + tarjetas de proyecto con badges y toggle Individual/Grupal
  consistentes con el resto de la app.
- **[Evaluador de Proyecto](https://claude.ai/code/artifact/8e0ceed3-428c-4073-8abc-eda5965565f1)**
  — la vista dividida de evaluación individual: competencias colapsables
  (accordion) para acortar el scroll larguísimo que tiene hoy, barra de
  acciones con una sola acción primaria ("Guardar") y las acciones de salida
  (preview/enviar) agrupadas en un menú.

Si se aplican al código, actualiza esta sección: mueve la referencia de aquí a
donde corresponda documentar el patrón ya implementado, y borra el enlace al
mockup una vez esté obsoleto.
