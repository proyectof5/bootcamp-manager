# Métricas con gráficos

## Contexto

La sección "Métricas" (spec `promotion-metrics`) nació como quince tarjetas con
un número cada una y cuatro tablas de recuentos. Dos problemas:

1. **Todo pesaba lo mismo.** Quince cifras del mismo tamaño y el mismo color no
   tienen jerarquía: hay que leerlas una a una para encontrar la que importa.
2. **Una tabla de ceros no dice "todavía no hay datos", parece un error.** En la
   P6 de IA School —21 estudiantes, 18 sin seguimiento— las cuatro tablas salían
   enteras a cero y el panel parecía roto en vez de vacío.

## Decisiones confirmadas

- **Solo se dibuja lo que es una proporción.** Una cifra suelta (cuántos
  empleados, cuántos meses de media) se queda como número. Convertirlo todo en
  gráfico añade tinta sin añadir información.

  | Forma | Para qué | Dónde |
  |---|---|---|
  | Anillo (`.mtr-ring`) | UN porcentaje sobre un total | Abandono · Salidas positivas |
  | Barra apilada (`.mtr-stack`) | Reparto de un total en 2-3 partes | Matrícula · Género |
  | Barras ordenadas (`.mtr-bars`) | Comparar categorías | Situación · Vía de acceso · Sector · Empresas |

- **Sin librería de gráficos.** Son SVG y CSS de una docena de líneas cada uno.
  Chart.js o Recharts son 60-200 KB que van al cliente en un export estático, y
  el proyecto no mete dependencias sin motivo. Si algún día hace falta una serie
  temporal o un eje de verdad, ahí sí toca reabrir la decisión.

- **El color nunca es el único portador.** Cada segmento y cada barra llevan su
  etiqueta y su cifra escritas al lado; cada gráfico tiene `role="img"` con un
  `aria-label` que resume el dato. Es el criterio `color-not-only` / `data-table`
  del checklist de accesibilidad.

- **Sin datos no se pinta un cero, se explica.** Cada bloque vacío dice *por qué*
  lo está y qué falta: «Sin fecha de fin de la promoción no hay ventana que
  medir», «Todavía no hay ningún seguimiento registrado». Un anillo al 0 % o
  cinco barras a cero mienten sobre el estado real.

- **Las categorías a cero se quedan en la lista.** Que una vía de acceso al
  empleo no se use es información; se muestra la fila sin barra y con el número
  apagado. Solo desaparece el gráfico entero cuando *todas* están a cero.

- **"Sin especificar" va en neutral, no en un color de serie.** En género, los 19
  de 21 sin registrar no son una tercera categoría: son un hueco, y se tienen que
  leer como hueco. Debajo va una nota diciendo a cuántos cubre realmente el
  reparto que se ve.

- **El orden de "Por situación" no se reordena por cantidad** (`sort={false}`).
  Sus etiquetas van de mejor a peor salida y ordenarlas por número perdería esa
  lectura. Las otras tres sí se ordenan de mayor a menor.

- **Colores de serie nuevos**, `--app-color-data-1/2/3` en `design-system.css`.
  No se reutilizan los `--app-color-gantt-*`: aquellos codifican tipo de elemento
  del roadmap y reusarlos haría creer que significan lo mismo.

## Estado

Hecho: las tres formas, los ocho gráficos, los estados vacíos y los tokens.
Verificado con los datos reales de la P6 (todo a cero → seis estados vacíos) y
con datos de ejemplo inyectados en la respuesta del endpoint, sin escribir nada.

## Pendiente / Próximos pasos

- Los gráficos no tienen `tooltip` ni foco de teclado por elemento. Con el valor
  escrito al lado de cada marca no hace falta, pero si algún día se añaden series
  con muchas categorías habrá que revisarlo (`tooltip-keyboard`, `focusable-elements`).
- No hay exportación de los datos del panel (`export-option`). Se puede plantear
  si alguien los acaba copiando a mano a una memoria de subvención.

## Archivos clave

- `app/promotion/_components/MetricsPanel.tsx` — los componentes `Ring`, `Stack`,
  `BarList`, `Figure` y `Empty`, y el orden de las secciones.
- `css/promotion-detail.css` — bloque «Métricas: las cifras que son una
  proporción se dibujan» (clases `.mtr-*`).
- `css/design-system.css` — tokens `--app-color-data-1/2/3`.
