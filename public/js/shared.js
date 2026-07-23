/**
 * shared.js — functions available on every page
 */

/**
 * Prefija una ruta absoluta con el basePath del despliegue (GitHub Pages sirve el sitio
 * bajo /bootcamp-manager/, no en la raíz). window.APP_CONFIG.BASE_PATH lo fija page.tsx
 * antes de cargar este script. Sin esto, window.location.href = '/login' (etc.) aterriza
 * en la raíz del dominio en vez de bajo el subpath — 404.
 */
function withBasePath(path) {
    return (window.APP_CONFIG?.BASE_PATH || '') + path;
}
window.withBasePath = withBasePath;

/**
 * Decode a JWT payload without verifying the signature.
 * Returns null if the token is malformed.
 */
function decodeJwtPayload(token) {
    try {
        const base64Url = token.split('.')[1];
        if (!base64Url) return null;
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(base64));
    } catch (e) {
        return null;
    }
}

/**
 * Returns true if the token is missing, malformed, or its exp claim is in the past.
 */
function isTokenExpired(token) {
    if (!token) return true;
    const payload = decodeJwtPayload(token);
    if (!payload) return true;
    if (!payload.exp) return false; // No expiry claim — treat as valid
    return Date.now() >= payload.exp * 1000;
}
window.isTokenExpired = isTokenExpired;

/**
 * Remove all session data from localStorage.
 */
function clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    localStorage.removeItem('userRole');
}
window.clearSession = clearSession;

/**
 * Clear session data and redirect to login page.
 * Called from navbar "Logout" links across all pages.
 */
function logout() {
    clearSession();
    window.location.href = withBasePath('/login');
}
window.logout = logout;

// ---------------------------------------------------------------------------
// API error helpers — TASK-FE-01
// ---------------------------------------------------------------------------

/**
 * Extrae el mensaje de error de la respuesta del backend.
 * Soporta el formato nuevo  { error, code, details }
 * y los formatos legacy      { message } / string plano.
 *
 * @param {Response|null} response  - objeto fetch Response (puede ser null)
 * @param {object|null}   json      - cuerpo ya parseado (puede ser null)
 * @param {string}        fallback  - mensaje por defecto si nada más funciona
 * @returns {string}
 */
function apiErrorMessage(response, json, fallback = 'Ha ocurrido un error inesperado') {
    if (json && (json.error || json.message)) {
        return json.error || json.message;
    }
    if (response && !response.ok) {
        // Usar el texto del status HTTP como último recurso antes del fallback
        return response.statusText || fallback;
    }
    return fallback;
}
window.apiErrorMessage = apiErrorMessage;

/**
 * Muestra un toast Bootstrap 5 con el mensaje y tipo indicados.
 * Crea el contenedor de toasts si no existe en el DOM.
 *
 * @param {string} message  - Texto a mostrar
 * @param {'success'|'danger'|'warning'|'info'} type - Color del toast
 * @param {number} delay    - Duración en ms (por defecto 4000)
 */
function showApiToast(message, type = 'danger', delay = 4000) {
    // Crear el contenedor fijo si todavía no existe
    let container = document.getElementById('api-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'api-toast-container';
        container.style.cssText =
            'position:fixed;bottom:1.25rem;right:1.25rem;z-index:9999;display:flex;flex-direction:column;gap:0.5rem;';
        document.body.appendChild(container);
    }

    // Icono según el tipo
    const icons = {
        success: 'bi-check-circle-fill',
        danger:  'bi-exclamation-triangle-fill',
        warning: 'bi-exclamation-circle-fill',
        info:    'bi-info-circle-fill',
    };
    const icon = icons[type] || icons.info;

    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-bg-${type} border-0`;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body d-flex align-items-center gap-2">
                <i class="bi ${icon}"></i>
                <span>${message}</span>
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto"
                    data-bs-dismiss="toast" aria-label="Cerrar"></button>
        </div>`;

    container.appendChild(toastEl);

    // Inicializar y mostrar con la API de Bootstrap 5
    if (window.bootstrap && window.bootstrap.Toast) {
        const bsToast = new window.bootstrap.Toast(toastEl, { delay });
        bsToast.show();
        // Limpiar el elemento del DOM tras ocultarse
        toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
    } else {
        // Fallback si Bootstrap JS no está cargado aún
        toastEl.style.cssText =
            `display:block;padding:0.75rem 1rem;border-radius:0.375rem;
             background:var(--bs-${type}-bg-subtle,#f8d7da);color:#000;
             max-width:320px;box-shadow:0 2px 8px rgba(0,0,0,.15);`;
        setTimeout(() => toastEl.remove(), delay);
    }
}
window.showApiToast = showApiToast;

// ── spec 0014 (Fase A): shim de Bootstrap collapse/dropdown sin bundle.js ──
// INERTE mientras bootstrap.bundle.js esté cargado (Bootstrap lo maneja; evita
// el doble-toggle). Cuando se quite bundle.js, replica el toggle de `.show`
// reusando el CSS de Bootstrap (que de momento sigue cargado). Cubre todas las vistas.
(function _bootstrapJsShim() {
  document.addEventListener('click', (e) => {
    if (window.bootstrap) return; // Bootstrap JS presente → no interferir.

    // ── collapse / accordion ──
    const cTrigger = e.target.closest('[data-bs-toggle="collapse"]');
    if (cTrigger) {
      e.preventDefault();
      const sel = cTrigger.getAttribute('data-bs-target') || cTrigger.getAttribute('href');
      const target = sel && document.querySelector(sel);
      if (target) {
        const willShow = !target.classList.contains('show');
        const parentSel = target.getAttribute('data-bs-parent'); // accordion: cerrar hermanos
        if (parentSel && willShow) {
          document.querySelectorAll(parentSel + ' .collapse.show').forEach((el) => {
            if (el !== target) {
              el.classList.remove('show');
              document.querySelectorAll('[data-bs-target="#' + el.id + '"],[href="#' + el.id + '"]')
                .forEach((t) => { t.classList.add('collapsed'); t.setAttribute('aria-expanded', 'false'); });
            }
          });
        }
        target.classList.toggle('show', willShow);
        cTrigger.classList.toggle('collapsed', !willShow);
        cTrigger.setAttribute('aria-expanded', String(willShow));
      }
      return;
    }

    // ── tab (nav-tabs / nav-pills) ──
    const tabTrigger = e.target.closest('[data-bs-toggle="tab"], [data-bs-toggle="pill"]');
    if (tabTrigger) {
      e.preventDefault();
      const sel = tabTrigger.getAttribute('data-bs-target') || tabTrigger.getAttribute('href');
      const pane = sel && document.querySelector(sel);
      const tabList = tabTrigger.closest('[role="tablist"], .nav');
      if (tabList) {
        tabList.querySelectorAll('.nav-link.active, [role="tab"].active').forEach((t) => {
          t.classList.remove('active'); t.setAttribute('aria-selected', 'false');
        });
      }
      tabTrigger.classList.add('active');
      tabTrigger.setAttribute('aria-selected', 'true');
      if (pane && pane.parentElement) {
        pane.parentElement.querySelectorAll(':scope > .tab-pane').forEach((p) => p.classList.remove('active', 'show'));
        pane.classList.add('active', 'show');
      }
      return;
    }

    // ── dropdown ──
    const dTrigger = e.target.closest('[data-bs-toggle="dropdown"]');
    // cerrar menús abiertos cuyo trigger no sea el clicado
    document.querySelectorAll('.dropdown-menu.show').forEach((m) => {
      const host = m.closest('.dropdown, .btn-group');
      if (!dTrigger || !host || !host.contains(dTrigger)) m.classList.remove('show');
    });
    if (dTrigger) {
      e.preventDefault();
      const menu = dTrigger.closest('.dropdown, .btn-group')?.querySelector('.dropdown-menu');
      if (menu) menu.classList.toggle('show');
    }
  });
})();
