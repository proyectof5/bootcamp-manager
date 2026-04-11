# Roadmap Manager — Frontend

Static frontend (HTML / CSS / JS) for Bootcamp Manager.

---

## 🚀 CI/CD — Deploy to GitHub Pages

El workflow `.github/workflows/deploy-frontend.yml` se ejecuta automáticamente en cada push a `main` que toque archivos dentro de `roadmap-manager-frontend/`.

### Secrets necesarios

Configura este secret en tu repositorio:  
**GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret | Descripción | Ejemplo |
|--------|-------------|---------|
| `RENDER_BACKEND_URL` | URL pública del backend desplegado | `https://roadmap-manager-latest.onrender.com` |

### Activar GitHub Pages

1. Ve a **Settings → Pages** en tu repositorio de GitHub.
2. En **Source**, selecciona **GitHub Actions**.
3. Haz push a `main` — el workflow se ejecutará y publicará el frontend.

---

## 💻 Desarrollo local

```bash
npm start
# Sirve el frontend en http://localhost:5000
```

El archivo `js/config.js` detecta automáticamente `localhost` y apunta la API a `http://localhost:3000`.
