# e2e — smoke de Playwright

Smoke de la golden path tras la migración a Next/Tailwind/shadcn (spec 0014).

## Instalar (una vez)

```bash
cd bootcamp-manager
npm install                 # trae @playwright/test (devDependency)
npx playwright install chromium
```

## Correr

```bash
# Smoke de login (no necesita backend ni auth). Arranca el front solo.
npm run test:e2e

# UI interactiva
npm run test:e2e:ui
```

El `webServer` de `playwright.config.ts` arranca `npm run dev` (:5500) y reusa el que
ya esté corriendo.

## Smoke autenticado de /promotion (opcional)

El login va contra la API externa (Symfony), así que el test de `/promotion` se
**salta** salvo que le pases un token ya emitido. Para correrlo:

1. Arranca el backend: `cd bootcamp-manager-server && npm start` (escucha en :3000).
2. Exporta las envs y corre:

```bash
# PowerShell
$env:E2E_TOKEN   = "<JWT válido de un formador/admin>"
$env:E2E_PROMO_ID= "<id de una promo de la que ese token sea owner>"
$env:E2E_USER    = '{"id":"<uuid local>","email":"...","role":"teacher"}'   # opcional
npm run test:e2e
```

Variables soportadas:

| Env | Para qué |
|---|---|
| `E2E_BASE_URL` | Override del front (default `http://localhost:5500`) |
| `E2E_TOKEN` | JWT Bearer; sin él, el smoke de /promotion se salta |
| `E2E_PROMO_ID` | id de la promo a abrir |
| `E2E_USER` | JSON del objeto `user` de localStorage (opcional) |

> El token se siembra en `localStorage` con `page.addInitScript` antes de cargar la app
> (mismo patrón que usa la app: `token`/`user`/`role`). No se teclean credenciales.
