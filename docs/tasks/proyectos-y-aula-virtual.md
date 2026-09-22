# Proyectos y Aula Virtual en una sola vista

**Estado:** 🟡 hecho, con pendientes anotados al final.

## Por qué

Publicar un proyecto en el Aula Virtual obligaba a ir a otra pestaña con su
propia lista de proyectos: se decidía en un sitio y se evaluaba en otro, con dos
listas que había que mantener en la cabeza a la vez. Además la dirección base del
repositorio se pedía una vez por proyecto, cuando en la práctica es la misma
organización de GitHub para toda la promoción: doce campos para un solo dato.

Y los proyectos se pintaban como tarjetas en una rejilla de tres columnas, así
que el nombre se cortaba, los botones quedaban apretados y en pantallas anchas
sobraba espacio a los lados que no se usaba para nada.

## Qué hay ahora

Una sola pestaña, **Proyectos**, con:

- **La dirección de entrega arriba, una vez.** `#proj-repo-base` en la cabecera.
  Al cambiarla se copia a todos los proyectos y se guarda.
- **Un proyecto por fila, a todo el ancho.** Arriba, quién es (nombre) y cómo va
  (tipo, grupos, entregas, evaluados); a la derecha, lo que se puede hacer con él
  (tipo, grupos, competencias, rúbrica, evaluar). Debajo, separada por una línea,
  su publicación: interruptor, fecha de entrega y enlace al briefing.
- **La franja izquierda de la fila** se pone naranja cuando el proyecto se ve en
  el Aula Virtual, y la cabecera del módulo dice cuántos de los suyos están
  publicados.

La pestaña «Aula Virtual» ya no existe.

## Cómo se guarda

No cambia nada en el backend. `extendedInfo.virtualClassrooms` sigue siendo un
array con una entrada por `moduleId + projectName`
(`isActive`, `projectType`, `repoBaseUrl`, `briefingUrl`, `dueDate`), que es lo
que lee `GET /api/promotions/:id/virtual-classroom` para el portal público.

`repoBaseUrl` se sigue escribiendo **repetido en cada entrada** aunque en la
interfaz sea un solo campo: así el portal público no necesita cambios. Al cargar,
`initVirtualClassroomPanel` toma la primera que encuentre como valor del campo
único.

Cualquiera de los tres controles de una fila guarda con
`window._projSaveAula(el)`; el campo de arriba, con `window._projSaveRepoBase(el)`.
Ambos acaban en `_persistVirtualClassrooms()`, que ya existía.

## Archivos

| Qué | Dónde |
|---|---|
| Pintar la pestaña | `public/js/promotion-detail.js` → `renderEvaluationTab()` |
| Estado del Aula Virtual | `public/js/promotion-detail.js` → `initVirtualClassroomPanel()` |
| Guardado | `public/js/promotion-detail.js` → `_projSaveAula` / `_projSaveRepoBase` / `_projPersistAula` |
| Estilos | `css/promotion-detail.css` → bloque «Proyectos — filas a todo el ancho» |
| Secciones de la promoción | `public/js/promotion-nav.js` (Proyectos ya no tiene la pestaña «aula») |
| Contenedor | `app/promotion/_components/EvaluationGridPanel.tsx` (`#evaluation-content`) |

## Pendientes

- Un proyecto se puede publicar sin competencias definidas: la fila avisa, pero
  el portal enseñará la rúbrica vacía. Decidir si eso debe bloquearse.
- `repoBaseUrl` sigue duplicado en cada entrada. Si algún día se toca el backend,
  merece un campo propio en `extendedInfo`.
- El Gantt no se dibuja al entrar directamente por `#/planificacion/roadmap` en
  la primera carga (DHTMLX avisa de «container has a small height»). Es anterior
  a este cambio y está sin arreglar.
