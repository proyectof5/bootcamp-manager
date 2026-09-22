# El roadmap con la barra y las vistas de un calendario

**Estado:** 🟡 hecho; pendientes al final.

## Por qué

La barra del roadmap tenía **doce controles al mismo nivel**, repartidos en tres
filas en cuanto la pantalla no era muy ancha: una etiqueta fija «Roadmap», tres
botones de zoom, Hoy, Módulo, Empleabilidad, Leyenda, Festivos, Google Calendar,
Exportar y Asana. Nada decía cuál era la acción importante ni qué se estaba
mirando.

Y Día/Semana/Mes solo cambiaban el **zoom del eje**: siempre se veía el bootcamp
entero y había que buscar con scroll horizontal. En un calendario esas mismas
palabras significan otra cosa: cada vista enseña *ese* día, *esa* semana o *ese*
mes, y las flechas saltan al periodo anterior o siguiente.

## La barra

```
[Hoy] [‹] [›]  24 – 30 de noviembre de 2025        [🎨] [📅] [+ Módulo] [Semana ▾] [⋯]
```

- **Izquierda: dónde estás y cómo moverte.** El título del periodo sustituye a
  la etiqueta fija «Roadmap», que no decía nada. Es una región viva
  (`aria-live`), así que un lector de pantalla canta el periodo al cambiarlo sin
  que el foco salga de las flechas.
- **Leyenda y Festivos** son herramientas de consulta: solo icono, con su
  `aria-label` y su `title`, igual que la lupa o los ajustes de un calendario.
- **`+ Módulo`** es la única acción principal de la pantalla.
- **El selector de vista es un desplegable**, no tres botones sueltos: Día,
  Semana, Mes y —separado— Todo el bootcamp.
- **`⋯`** guarda lo que se usa de vez en cuando, agrupado por lo que hace:
  *Contenido* (sesiones de empleabilidad), *Llevarlo a otra herramienta* (Google
  Calendar, Asana) y *Descargar* (PNG, PDF, Excel, .ics).
- Dentro de *Llevarlo a otra herramienta* vive también la **conexión de la
  cuenta de Asana de cada docente**, que antes estaba en Portal del estudiante ›
  Acceso. Es de la persona, no de la promoción, y lo único para lo que sirve
  —exportar el roadmap— está justo encima. El estado se lee siempre («Mi cuenta
  de Asana: …») y debajo aparece Conectar o Desconectar según toque; si el
  servidor no tiene la integración activada se dice y no se ofrece nada.
  El hook vive en `AsanaAccount.tsx` y se monta en el panel, no en el menú: el
  menú se cierra al elegir y se llevaría por delante la espera del popup.

De doce controles a cinco, en una sola fila.

## Las vistas

| Vista | Qué enseña | Escala |
|---|---|---|
| Día | Solo ese día | Una columna |
| Semana | Lunes a domingo | Siete columnas, «LUN 24 / MAR 25 …» |
| Mes | El mes entero | Banda de semanas + número de día |
| Todo el bootcamp | De la primera a la última fecha | Meses + semanas (lo de siempre) |

Las tres acotadas pintan **una columna por día**, así que los fines de semana y
los festivos salen en gris y hoy va teñido de naranja: es lo que hace que se lea
como un calendario y no como un diagrama. DHTMLX además solo lista las tareas que
caen dentro del periodo, igual que un calendario solo enseña los eventos de esa
semana.

Un periodo sin nada dejaba el Gantt en blanco y parecía roto: ahora lo dice con
palabras y ofrece la salida («Ver todo el bootcamp»).

La vista elegida se recuerda en `sessionStorage` (`roadmapGanttView`). Por
defecto es **Todo el bootcamp**, o sea el comportamiento de siempre: las vistas
de calendario son algo que se elige, no un cambio impuesto.

## Detalles de implementación

- Todo vive en `public/js/promotion-detail.js`, en el bloque «Vistas del
  roadmap»: `setGanttView`, `ganttStepPeriod`, `ganttGoToToday`,
  `_ganttPeriodRange`, `_ganttPeriodLabel` y `emitGanttPeriod`.
- La barra (React) se entera por el evento `gantt-period-changed`, que lleva
  `{ view, label, canStep, isEmpty }`. `window.emitGanttPeriod()` permite pedir
  el estado cuando la barra monta después del Gantt.
- **Cuidado con el orden en `generateGanttChart`:** el rango se fija al del
  periodo activo *antes* del `clearAll()`. Dejar el rango completo con la escala
  de la vista Día pedía 250 columnas de 320 px y DHTMLX se caía al renderizar
  (`Cannot read properties of null (reading 'classList')`).
- Los formatos de cabecera usan `toLocaleDateString('es-ES')` en vez de los
  `%F`/`%l` de DHTMLX. Además se activa `gantt.i18n.setLocale('es')`: el build
  sí trae el idioma, solo que no estaba puesto, y por eso los meses salían en
  inglés («November», «December 2025»).
- `setGanttZoomLevel` se mantiene como alias de `setGanttView` porque el zoom
  con Ctrl/⌘ + rueda sigue llamándolo.

## Pendientes

- La vista Día es una sola columna. Para un roadmap de módulos es lo honesto
  («qué está en marcha hoy»), pero si algún día las tareas tuvieran hora, ahí
  encajaría una rejilla horaria como la de Google.
- Los menús desplegables de Radix no se abren bajo el navegador de pruebas
  automatizado (abren con `pointerdown` y el clic sintético los cierra). Se
  comprobó su contenido disparando el `pointerdown` a mano; conviene repasarlos
  a mano en un navegador normal.
