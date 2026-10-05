# Bootcamp Manager — Frontend

Interfaz de la plataforma de gestión de bootcamps de **Factoría F5**: promociones, seguimiento de estudiantes, evaluación por competencias, asistencia y portal público de la promoción.

Next.js 15 con App Router, exportado como sitio estático y servido desde GitHub Pages.

> **Este repositorio es solo la interfaz.** La API vive en
> [`proyectof5/bootcamp-manager-server`](https://github.com/proyectof5/bootcamp-manager-server).
> Sin ella puedes arrancar el proyecto, pero no pasarás del login.

---

## Índice

1. [Primeros pasos](#primeros-pasos)
2. [Cómo se conecta con el backend](#cómo-se-conecta-con-el-backend)
3. [Estructura del proyecto](#estructura-del-proyecto)
4. [El patrón híbrido de `/promotion`](#el-patrón-híbrido-de-promotion)
5. [Estilos](#estilos)
6. [Tests](#tests)
7. [Despliegue](#despliegue)
8. [Errores frecuentes](#errores-frecuentes)

---

## Primeros pasos

```bash
git clone https://github.com/proyectof5/bootcamp-manager.git
cd bootcamp-manager
npm install

cp .env.example .env.local    # y edítalo: ver la sección siguiente
npm run dev                   # → http://localhost:5500
```

Necesitas **Node.js 20+**.

Para iniciar sesión hace falta que la API esté respondiendo. Tienes dos opciones:

**A — levantar el backend en local** (lo normal si vas a tocar la API):

```bash
# terminal 1
cd ../bootcamp-manager-server && npm run dev     # http://localhost:3000

# terminal 2
cd ../bootcamp-manager && npm run dev            # http://localhost:5500
```

En `.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:3000`

**B — usar el backend ya desplegado** (si solo tocas la interfaz):

En `.env.local`: `NEXT_PUBLIC_API_URL=https://bootcamp-manager-latest.onrender.com`

Así no necesitas base de datos ni levantar nada más. Pero son **datos reales de producción**: puedes mirar y probar la interfaz, aunque lo que guardes se guarda de verdad.

`http://localhost:5500` ya está en la lista de orígenes permitidos por CORS del backend, en los dos casos.

### Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente, puerto 5500 |
| `npm run build` | Genera el export estático en `out/` — lo mismo que hace el deploy |
| `npm start` | Sirve `out/` tal cual se publica. Úsalo para reproducir fallos que solo salen en producción |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright, sin interfaz |
| `npm run test:e2e:ui` | Playwright en modo interactivo |

---

## Cómo se conecta con el backend

Todo pasa por **`NEXT_PUBLIC_API_URL`**, que se resuelve **en tiempo de compilación**, no en ejecución. Cambiarla exige reiniciar `npm run dev` o reconstruir.

| Dónde | Cómo se fija |
|---|---|
| Local | `.env.local`, o delante del comando: `NEXT_PUBLIC_API_URL=… npm run dev` |
| Producción | Secret `BACKEND_URL` del repositorio, que el workflow inyecta al compilar |
| Si no hay nada | `http://localhost:3000` cuando el host es `localhost`; si no, cadena vacía |

En las páginas React se usa a través de `lib/api.ts`:

```ts
import { apiFetch } from '@/lib/api';

const res = await apiFetch('/api/promotions');   // añade la URL base y el token
```

`apiFetch` resuelve la ruta contra la URL base, adjunta el JWT guardado como `Authorization: Bearer …` y pone `Content-Type: application/json` salvo que pases `{ raw: true }`.

La página `/promotion` además carga `public/js/config.js`, que expone `window.APP_CONFIG.API_URL` para el código heredado. Ese script **respeta** el valor que ya haya fijado la página React y solo aplica su propio recurso si nadie lo puso antes. No lo toques sin leer el comentario de arriba del fichero: ya rompió producción una vez.

---

## Estructura del proyecto

```
bootcamp-manager/
├── app/                      # App Router: una carpeta por ruta
│   ├── login/  dashboard/  admin/
│   ├── promotion/            # La pantalla principal del formador, y la más compleja
│   │   ├── page.tsx
│   │   ├── body.ts           # El markup de la página, con los ids que usa el heredado
│   │   ├── _components/      # ~35 paneles React, uno por sección
│   │   └── _lib/             # Informes, PDFs, cálculos. Aquí están los tests
│   ├── public-promotion/     # Portal público de la promoción, sin login
│   ├── student-dashboard/    # Vista del estudiante
│   └── privacidad/
│
├── components/ui/            # Primitivas compartidas (shadcn/ui sobre Radix)
├── hooks/useAuth.ts          # Sesión: token, usuario, redirecciones
├── lib/
│   ├── api.ts                # apiFetch — todas las llamadas pasan por aquí
│   ├── auth.ts               # Guardar y leer el token
│   └── toast.ts
│
├── public/js/                # JavaScript heredado, cargado en runtime
│   ├── config.js             # window.APP_CONFIG.API_URL para el código heredado
│   ├── promotion-detail.js   # ~17 000 líneas: el orquestador de /promotion
│   ├── gantt-adapter.js  promotion-nav.js  shared.js
│
├── css/                      # Hojas globales, incluida compatibilidad con Bootstrap
├── e2e/                      # Playwright
└── .github/workflows/deploy-frontend.yml
```

---

## El patrón híbrido de `/promotion`

Es lo que más desconcierta al llegar, así que conviene entenderlo antes de tocar esa pantalla.

`/promotion` viene de un frontend anterior en HTML y JavaScript plano que se está migrando a React poco a poco. Hoy conviven dos cosas:

- **React** pinta el markup y monta componentes por portal sobre `#id`s concretos.
- **`public/js/promotion-detail.js`** —el orquestador heredado— rellena y muestra u oculta trozos **buscándolos por su id** y escribiendo `innerHTML`.

Por eso hay reglas que parecen arbitrarias y no lo son:

**Los ids son contrato.** Si renombras o quitas un `id` de `body.ts` o de un componente, el orquestador deja de encontrarlo. No falla con un error: simplemente esa parte se queda vacía.

**Para ocultar se usa `legacy-hidden`, no `hidden`.** El orquestador comprueba y conmuta esa clase. Además, algunos ids tienen su propia regla CSS con `display:flex`, que gana en especificidad a una clase de utilidad sin `!important`: con `hidden` de Tailwind el elemento nunca llega a ocultarse.

**Los componentes montados por portal no deben tener estado** si el heredado escribe dentro de ellos. Un re-render borraría el `innerHTML` que acaba de poner.

**Nada de HTML suelto ni scripts en la raíz del repositorio.** El JavaScript heredado que haga falta va en `public/js/`.

La dirección del proyecto es sacar lógica del orquestador hacia componentes React. Si tocas una sección, es buen momento para migrarla; si no puedes, deja al menos los ids intactos.

---

## Estilos

Tres capas, por orden de preferencia al escribir código nuevo:

1. **Tailwind** y los componentes de `components/ui/` — lo que debes usar.
2. **`css/design-system.css`** — los tokens de la marca. Los colores salen de aquí, como variables CSS (`--app-color-brand-500` para la acción, `--app-color-accent-500` para el verde de confirmación). No escribas hexadecimales a mano.
3. **`css/bootstrap-compat.css`** y `promotion-detail.css` — sostienen el markup heredado, que usa clases de Bootstrap 5. No construyas nada nuevo sobre esto.

Los iconos del código heredado son **bootstrap-icons 1.7.2**. Es una versión antigua: comprueba que el icono existe en ella antes de usarlo, porque uno que no existe no da error, simplemente no se ve.

---

## Tests

```bash
npm run test:e2e        # Playwright
npm run test:e2e:ui     # con interfaz, para depurar
```

Hay además tests unitarios de la lógica extraída (por ejemplo `app/promotion/_lib/stack.test.ts`).

---

## Despliegue

```
push a main  →  GitHub Actions  →  next build  →  GitHub Pages
```

`.github/workflows/deploy-frontend.yml` se dispara en cada push a `main` —sin filtro de rutas: cualquier cambio despliega— y también a mano con **Run workflow**.

Publica en `proyectof5.github.io/bootcamp-manager`.

### Secrets del repositorio

**Settings → Secrets and variables → Actions**

| Secret | Para qué |
|---|---|
| `BACKEND_URL` | URL del backend. Se inyecta como `NEXT_PUBLIC_API_URL` al compilar. Hoy: `https://bootcamp-manager-latest.onrender.com` |
| `BASE_PATH` | Solo si el sitio se sirve bajo una sub-ruta. Se inyecta como `NEXT_PUBLIC_BASE_PATH`. Hoy: `/bootcamp-manager`. Vacío si algún día se usa un dominio propio en la raíz |

### Activar Pages en un fork

**Settings → Pages → Source → GitHub Actions**, y un push a `main`.

---

## Errores frecuentes

### «Error de conexión» al iniciar sesión

El frontend está llamando a una API donde no hay nadie escuchando. Mira la pestaña de red del navegador: te dirá a qué host va la petición. Causas habituales:

- No has levantado el backend.
- `NEXT_PUBLIC_API_URL` no está puesta, o la cambiaste sin reiniciar `npm run dev`. Se resuelve al compilar, no en caliente.
- Arrancaste con una variable delante del comando en otra terminal y en esta no está.

### Las llamadas a la API van al dominio del propio sitio

Síntoma: en producción las peticiones salen hacia `proyectof5.github.io` en vez de hacia el backend. Significa que `BACKEND_URL` no llegó al build y el código heredado cayó a su recurso de último término, `window.location.origin`. Revisa el secret.

### Una sección de `/promotion` aparece vacía

Casi siempre es un `id` que cambió de nombre o desapareció. El orquestador lo busca, no lo encuentra y no se queja. Busca el id en `public/js/promotion-detail.js`.

### Algo que debería estar oculto se ve, o se apila debajo

Se está usando `hidden` donde el orquestador espera `legacy-hidden`. Ver [el patrón híbrido](#el-patrón-híbrido-de-promotion).

### Un icono no se ve y no hay ningún error

El nombre no existe en **bootstrap-icons 1.7.2**. No falla: no pinta nada. Comprueba el icono contra esa versión.

### Errores de TypeScript que no se corresponden con el código

Tipos cacheados de una compilación anterior:

```bash
rm -rf .next/types
```

---

## Licencia

ISC — Factoría F5
