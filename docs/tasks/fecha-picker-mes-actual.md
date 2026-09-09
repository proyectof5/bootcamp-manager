# Selector de fecha: que abra en el mes del valor actual

## Contexto

Pedido del usuario: "Cuando voy a modificar un elemento el calendario no
identifica la fecha en la que está ya ese elemento y hay mejor user
experience si lo hiciera para no tener que buscar el mes" — al editar un
curso/proyecto/lección/módulo/bloque de tiempo flexible existente
(`itemEditModal`/`moduleModal`/`flexibleBlockEditModal`, roadmap por
fechas, ver [roadmap-por-fechas.md](roadmap-por-fechas.md)), quiere que al
abrir el selector de fecha no tenga que navegar mes a mes hasta encontrar
la fecha actual del elemento.

## Decisiones confirmadas

- Se refiere al selector de "Fecha inicio"/"Fecha fin" del modal de editar
  (no al tab "Calendario" de Contenido del Programa, que es solo
  configuración de sincronización con Google Calendar y no tiene relación
  con esto — descartado explícitamente al preguntar).

## Estado — sin empezar, investigación inicial hecha

Los campos ya son `<input type="date">` nativos (HTML), precargados con el
valor correcto — confirmado en vivo: al abrir `itemEditModal` sobre
"CRUD con Python" (P7), `#item-edit-start` tiene `value: "2026-05-11"`
correctamente, antes de cualquier interacción. Por especificación del
propio `<input type="date">`, el selector nativo del navegador (el widget
que abre el propio Chrome/Firefox/Safari al hacer clic) debería abrir YA
en el mes de ese valor — es comportamiento nativo, no algo que el código
de la app controle. No se pudo confirmar visualmente el popup nativo del
selector en el entorno de pruebas automatizado de esta sesión (limitación
conocida: el picker de `<input type="date">` lo pinta el navegador fuera
del DOM de la página, la herramienta de screenshot no lo capturó al hacer
clic).

## Pendiente / Próximos pasos

**Pregunta sin resolver, no asumir una respuesta**: ¿el problema real es
1. el selector nativo del navegador NO abre en el mes correcto pese al
   `value` precargado (sería un bug de verdad, pero contradice el
   comportamiento estándar de `<input type="date">` — habría que
   reproducirlo primero, quizás es específico de un navegador/SO
   concreto), o
2. lo que se quiere es un selector de fecha MÁS VISUAL/rico dentro del
   propio modal (un calendario embebido, no el input nativo desnudo) que
   muestre de un vistazo en qué semana/mes cae la fecha — sería una
   feature nueva, no un bug, y un cambio bastante más grande (sustituir
   `<input type="date">` por un componente de calendario, en los 3
   modales).

Antes de tocar código: reproducir el problema en el navegador real del
usuario (qué navegador/SO, captura de pantalla del selector al abrirlo) o
confirmar directamente cuál de las dos lecturas de arriba es la correcta.

## Archivos clave

- `app/promotion/page.tsx` — JSX de `item-edit-start`/`item-edit-end`
  (itemEditModal), `module-edit-start`/`module-edit-end` (moduleModal, solo
  en modo editar), `flexible-edit-start`/`flexible-edit-end`
  (flexibleBlockEditModal) — los 6 campos de fecha que existen hoy, todos
  `<input type="date">` sin librería de calendario.
- `public/js/promotion-detail.js` — `openItemEditModal`, `editModule`,
  `openFlexibleBlockEditModal` (precargan el `.value` de cada input).
