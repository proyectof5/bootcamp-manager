# Roadmap Manager — Frontend

Frontend Next.js 15 (App Router, `output: 'export'`) para Bootcamp Manager. Se despliega como sitio estático en GitHub Pages.

Algunas páginas (p. ej. `/promotion`) siguen un patrón híbrido: React renderiza el markup y monta portales sobre `#id`s concretos, pero parte de la lógica de interacción vive en scripts planos cargados en runtime desde `public/js/` (`config.js`, `shared.js`, `gantt-adapter.js`, `promotion-detail.js`). Es una migración progresiva desde un frontend HTML/JS anterior — no se debe reintroducir HTML suelto ni scripts en la raíz del repo; cualquier script legacy que haga falta va en `public/js/`.

---

## 🚀 CI/CD — Deploy a GitHub Pages

El workflow `.github/workflows/deploy-frontend.yml` se ejecuta automáticamente en cada push a `main` (sin filtro de rutas — cualquier cambio en el repo dispara el deploy) y también se puede lanzar manualmente (`workflow_dispatch`).

### Secrets necesarios

Configura estos secrets en el repositorio:
**GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret | Descripción | Ejemplo |
|--------|-------------|---------|
| `BACKEND_URL` | URL pública del backend desplegado — se inyecta como `NEXT_PUBLIC_API_URL` en build-time | `https://roadmap-manager-latest.onrender.com` |
| `BASE_PATH` | Solo si el sitio se sirve desde una sub-ruta (`usuario.github.io/repo`) — se inyecta como `NEXT_PUBLIC_BASE_PATH`. Déjalo vacío si usas un dominio propio en la raíz | `/bootcamp-manager` |

### Activar GitHub Pages

1. Ve a **Settings → Pages** en tu repositorio de GitHub.
2. En **Source**, selecciona **GitHub Actions**.
3. Haz push a `main` — el workflow compilará (`next build`) y publicará el contenido de `out/`.

---

## 💻 Desarrollo local

```bash
npm install
npm run dev
# Sirve el frontend en http://localhost:5500 (next dev)
```

Para probar el export estático tal cual se despliega:

```bash
npm run build   # genera out/
npm start       # sirve out/ con `serve`, también en el puerto 5500
```

### Cómo se resuelve la URL del backend (`API_URL`)

- En build-time, `NEXT_PUBLIC_API_URL` (variable de entorno) se usa directamente en las páginas React puras.
- En `/promotion`, que además carga `public/js/config.js` (script legacy), ese script **respeta** `window.APP_CONFIG.API_URL` si ya viene fijado por la página — solo aplica su propia lógica de fallback (detectar `localhost` → `http://localhost:3000`, o el origen actual) si nadie lo fijó antes.
- Sin `NEXT_PUBLIC_API_URL` definido, el valor por defecto en desarrollo es `http://localhost:3000` (el backend Express corriendo en local).

### Tests E2E

```bash
npm run test:e2e      # Playwright, headless
npm run test:e2e:ui   # Playwright, modo interactivo
```
