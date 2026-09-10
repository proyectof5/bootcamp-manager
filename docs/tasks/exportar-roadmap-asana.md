# Exportar un roadmap a Asana como subtareas

## Contexto

El equipo quiere volcar un roadmap entero a Asana: una **tarea contenedora**
(que ya existe en Asana, el docente pega su URL) con el roadmap colgando de
ella como subtareas — un nivel por módulo y, dentro de cada módulo, una
sub-subtarea por curso / proyecto / lección. Con fechas (`start_on`/`due_on`)
en cada tarea.

Hoy la "integración" con Asana es solo un **campo de texto** con la URL del
espacio de trabajo (`promotion.asanaWorkspaceUrl` / `extendedInfo.asanaContentUrl`,
ver `server.js` §"ASANA WORKSPACE ACCESS"). No hay API, ni OAuth, ni tokens.
Esto es todo nuevo.

Repos implicados: **`roadmap-manager-service`** (OAuth, tokens, llamadas a la
API de Asana, endpoint de exportación — la parte gruesa) y
**`roadmap-manager-frontend`** ("Conectar con Asana", botón "Exportar a
Asana", estado de conexión).

## Decisiones confirmadas (con la usuaria)

- **Auth = OAuth 2.0 por docente**, NO un token pegado a mano ni una cuenta
  bot. Cada docente conecta su cuenta de Asana **una vez** y la app guarda su
  `refresh_token` cifrado, ligado a su usuario de Bootcamp Manager (no a la
  promoción). El que exporta usa SU token. Motivo: "no siempre seré yo, depende
  del bootcamp".
- **Estructura = 2 niveles**: tarea padre → subtarea por módulo → sub-subtarea
  por curso/proyecto/lección. (Asana admite el anidamiento.)
- **Tarea padre = URL pegada de una tarea existente**. El docente crea la
  tarea contenedora en Asana donde quiera y pega su URL en el modal de
  exportación. La app NO crea proyectos ni tareas contenedoras.
- **Re-exportar ACTUALIZA lo que ya existe**, no duplica. La app guarda un
  mapeo `elemento-del-roadmap → tarea-de-Asana` por promoción; al re-exportar,
  actualiza nombre/fechas de las tareas mapeadas que sigan existiendo y crea
  solo las nuevas. Los elementos borrados del roadmap desde la última
  exportación **no se borran en Asana** — se listan en el resultado como
  huérfanas para que el docente limpie a mano (borrar es destructivo).
- **Qué se exporta**: módulos, cursos, proyectos y **lecciones** (los links
  de la lección van en la descripción / `notes` de la tarea) + **fechas**
  (`start_on`/`due_on`) en cada tarea. **NO** se exportan los bloques de
  "Tiempo flexible".
- **Fechas del módulo = envolvente de su contenido** (mismo criterio que el
  Gantt y el panel "Cómputo de horas", ver
  [horas-lectivas.md](horas-lectivas.md)): del inicio más temprano al fin más
  tardío entre sus cursos/proyectos/lecciones. Las de cada curso/proyecto/
  lección salen de sus `startDate`/`endDate` literales (roadmap por fechas,
  ver [roadmap-por-fechas.md](roadmap-por-fechas.md)).

## Diseño

### OAuth 2.0 con Asana (`roadmap-manager-service`)

- Registrar una app OAuth en `app.asana.com/0/my-apps` → `client_id`,
  `client_secret`, `redirect_uri` (debe coincidir EXACTO con la del backend
  desplegado; añadir también la de `localhost` para dev). Scope: `default`
  (acceso completo; los scopes granulares de Asana siguen en beta).
- `GET /api/integrations/asana/authorize` (verifyToken) → devuelve
  `{ url }` = URL de autorización de Asana con un `state` firmado (HMAC sobre
  `{ userId, nonce, exp }`, con `JWT_SECRET` o un `ASANA_STATE_SECRET`) para
  no necesitar sesión/almacén en el callback.
- `GET /api/integrations/asana/callback?code&state` (público, lo llama
  Asana) → verifica `state`, `POST https://app.asana.com/-/oauth_token`
  (`grant_type=authorization_code`) → `{ access_token, expires_in (3600),
  refresh_token, data:{gid,name,email} }` → upsert de `AsanaConnection` →
  redirige al front (`${FRONTEND_BASE_URL}/promotion?...&asana=connected`, o
  una página mínima "ya puedes cerrar esta ventana" si se abre en popup).
- Helper de refresco: `POST .../oauth_token` (`grant_type=refresh_token`)
  cuando el `access_token` esté por caducar.
- `GET /api/integrations/asana/status` (verifyToken) → `{ connected,
  asanaName, asanaEmail }`.
- `DELETE /api/integrations/asana` (verifyToken) → `POST
  https://app.asana.com/-/oauth_revoke` + borra la fila.

### Modelo `AsanaConnection` (Sequelize, MySQL — `backend/models/sql/`)

| campo | tipo | notas |
|---|---|---|
| `id` | STRING PK | uuid |
| `userId` | STRING, **UNIQUE** | usuario de Bootcamp Manager — una conexión por docente, reutilizable en todas sus promociones |
| `asanaUserGid` `asanaName` `asanaEmail` | STRING | para mostrar "Conectado como…" |
| `refreshTokenEnc` | TEXT | AES-256-GCM (`iv:tag:data` base64), clave de `ASANA_TOKEN_KEY` |
| `accessToken` | TEXT nullable | caché |
| `accessTokenExp` | DATE nullable | caché |
| `scope` | STRING | |
| `createdAt` `updatedAt` | DATE | |

Helper de cifrado nuevo (`backend/lib/crypto.js` o similar): `encrypt`/
`decrypt` con `crypto.createCipheriv('aes-256-gcm', key, iv)`. `ASANA_TOKEN_KEY`
= 32 bytes en base64. Fallar en el arranque si falta (y la feature está
activada). `db.sync({ alter })` añade la tabla, igual que `hoursPerDay`.

### Modelo del mapeo de exportación

Tabla nueva `AsanaRoadmapExport` (indexada por `promotionId`, más limpio que
meterlo en el JSON de `ExtendedInfo`):

| campo | tipo | notas |
|---|---|---|
| `id` | STRING PK | |
| `promotionId` | STRING, **UNIQUE** | un destino de exportación por promoción |
| `parentTaskGid` `parentTaskUrl` | STRING | la tarea contenedora en Asana |
| `mapping` | TEXT (JSON) | `{ "module:<moduleId>": "<gid>", "item:<plannerItemId>": "<gid>" }` |
| `lastExportedBy` | STRING | userId |
| `lastExportedAt` | DATE | |

`elementKey`: `module:<module.id>` / `item:<plannerItem.id>` (uuids estables).
Para que TODO elemento tenga id estable, el endpoint siembra `plannerItems`
desde los arrays legacy (`buildInitialPlannerFromLegacy`, ya se hace en los
modales de crear/editar) y guarda la promoción antes de exportar.

### `POST /api/promotions/:promotionId/export-asana` (verifyToken + canEditPromotion)

Body: `{ parentTaskUrl }`.

1. Parsear el gid de tarea de la URL (varias formas:
   `app.asana.com/0/<x>/<taskGid>`, `.../1/<ws>/project/<p>/task/<taskGid>`,
   `.../0/<taskGid>/<taskGid>`…) → validar con `GET /tasks/<gid>?opt_fields=gid`.
2. `access_token` fresco para `req.user.id` (refrescar si hace falta). Sin
   conexión → `409 { error: 'asana_not_connected' }`.
3. Cargar promoción; asegurar `plannerItems` en cada módulo (sembrar + PUT si
   falta).
4. Construir el árbol deseado (módulo = envolvente; item = fechas literales).
5. Cargar el mapeo existente de `AsanaRoadmapExport`.
6. Por cada módulo y luego cada item:
   - mapeado y `GET /tasks/<gid>` = 200 → `PUT /tasks/<gid>` con
     `{ name, start_on, due_on }` (+ `notes` con los links en lecciones).
   - si no → `POST /tasks` `{ parent: <padre o gid del módulo>, name,
     start_on, due_on, notes }`; guardar el gid nuevo en el mapeo.
   - Throttle ~5 req/s; en `429` respetar `Retry-After` (Asana free: 150
     req/min).
7. Persistir `mapping` + `parentTaskGid` + `lastExportedBy/At`.
8. Respuesta: `{ parentTaskUrl, created, updated, skipped, orphans: [...],
   errors: [...] }`.

### Frontend

- **Conectar (global por docente)**: ampliar la tarjeta "Asana" que ya existe
  en `AccessSettingsPanel` (Área del Docente › Accesos). Debajo de la URL del
  workspace: botón "Conectar mi cuenta de Asana" → `GET /authorize` →
  `window.open(url, 'asana', 'popup')` → poll de `/status` cada ~1,5 s (o
  `postMessage` desde la página de callback) hasta `connected`. Mostrar
  "Conectado como <name> · Desconectar".
- **Exportar**: botón "Exportar a Asana" en la barra del roadmap
  (`RoadmapPanel.tsx`, junto a "Exportar"). Si no está conectado → aviso +
  enlace a conectar. Si sí → modal pequeño: input "Pega la URL de la tarea de
  Asana donde colgar el roadmap" (prefijado con `parentTaskUrl` del último
  export si hay) + nota "al re-exportar se actualizan las tareas ya creadas".
  Enviar → `POST /export-asana` → spinner → resultado: "Creadas N,
  actualizadas M. Ver en Asana →" + lista de huérfanas/errores si hay.

### Config (una vez)

- Asana: crear la app OAuth; redirect URI = la del backend desplegado (+ dev).
- Backend env: `ASANA_CLIENT_ID`, `ASANA_CLIENT_SECRET`, `ASANA_TOKEN_KEY`
  (32B base64), `ASANA_OAUTH_REDIRECT_URI`, `FRONTEND_BASE_URL`,
  (`ASANA_STATE_SECRET` o reutilizar `JWT_SECRET`).
- Frontend: nada (la URL de autorización la construye el backend).

## Estado

Sin empezar — solo spec.

## Pendiente / Próximos pasos

Fases (cada una su rama/PR):

1. **OAuth + conexión** (backend + frontend): modelo `AsanaConnection`, helper
   de cifrado, `/authorize` `/callback` `/status` `DELETE`, helper de refresco,
   tarjeta de conexión en `AccessSettingsPanel`. Entregable: el docente conecta
   / desconecta y ve el estado.
2. **Exportación "solo crear"** (backend + frontend): `/export-asana` que
   SIEMPRE crea (sin mapeo todavía), parseo de la URL padre, árbol de 2
   niveles, fechas, `notes` de lecciones, throttling. Botón + modal +
   resultado. Entregable: la exportación de un tirón funciona.
3. **Re-exportación idempotente**: tabla `AsanaRoadmapExport`, lógica de diff
   (crear / actualizar / saltar), reporte de huérfanas, prefijar la URL padre
   del último export. Entregable: re-exportar actualiza en vez de duplicar.
4. **Robustez**: backoff de rate-limit, reanudar tras fallo parcial, tests.
   Si el roadmap es enorme (>150 elementos ≈ límite/min), evaluar job en
   background.

## Preguntas abiertas

- **Dónde vive "Conectar con Asana"**: propuesto ampliar la tarjeta "Asana"
  existente en Accesos. Alternativa: sección "Integraciones" propia. Confirmar.
- **Callback OAuth**: popup + `postMessage` (propuesto) vs. redirección de
  página completa. Confirmar.
- **Formato de los links en `notes`** de una lección: lista de URLs en texto
  plano (propuesto).
- **Elementos huérfanos** (borrados del roadmap tras exportar): se listan y no
  se tocan (propuesto). ¿Ofrecer un "borrar huérfanas en Asana" opcional más
  adelante?
- **Tarea padre en otro workspace** al que el token del docente no llega →
  Asana devuelve 403; hay que mostrarlo claro.
- **Roadmaps muy grandes**: ¿cuántos elementos como máximo en la práctica?
  determina si hace falta job en background (fase 4).

## Archivos clave

- `roadmap-manager-service/server.js` — §"ASANA" actual (solo URL); aquí van
  los endpoints nuevos `/api/integrations/asana/*` y
  `/api/promotions/:id/export-asana`. `PUT /api/promotions/:id` allowlist
  (patrón ya usado para `workingDays`/`hoursPerDay`).
- `roadmap-manager-service/backend/models/sql/` — `AsanaConnection.js`,
  `AsanaRoadmapExport.js` nuevos; `db.sync({ alter })` en el arranque
  (`server.js:96`).
- `roadmap-manager-service/backend/lib/` — helper de cifrado AES-GCM nuevo.
- `roadmap-manager-service/server.js` (~L5040-5220) — `parseISODateAdmin`,
  `countWorkingDaysInclusive`, `durationWeeksFromDates` ya existen; la lógica
  de rango de módulo/item (preferir `startDate`/`endDate` literales) se porta
  o adapta aquí.
- `roadmap-manager-frontend/app/promotion/_components/AccessSettingsPanel.tsx`
  — tarjeta "Asana"; añadir "Conectar mi cuenta".
- `roadmap-manager-frontend/app/promotion/_components/RoadmapPanel.tsx` — barra
  de herramientas; botón "Exportar a Asana" + modal.
- `roadmap-manager-frontend/public/js/promotion-detail.js` — helpers de
  llamada (`updateAsanaWorkspace` y compañía ya viven aquí); `buildInitialPlannerFromLegacy`.
- [horas-lectivas.md](horas-lectivas.md) — criterio "módulo = envolvente".
- [roadmap-por-fechas.md](roadmap-por-fechas.md) — `startDate`/`endDate`
  literales por elemento.
