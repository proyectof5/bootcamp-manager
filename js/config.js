(function () {
    // Centralized configuration for the frontend.
    //
    // ── How API_URL is resolved ────────────────────────────────────────────────
    // 1. PRODUCTION (GitHub Pages / any external host):
    //    GitHub Actions replaces __BACKEND_URL_PLACEHOLDER__ with the secret
    //    BACKEND_URL before deploying. Set that secret to your backend URL,
    //    e.g. https://roadmap-manager-latest.onrender.com
    //
    // 2. LOCAL DEVELOPMENT:
    //    When running the frontend on localhost (any port: 3000, 5000, 5500…)
    //    the API is assumed to be at http://localhost:3000 (Express server).
    //    Change DEV_API_URL below if your backend runs on a different port.
    // ──────────────────────────────────────────────────────────────────────────

    const DEV_API_URL  = 'http://localhost:3000';           // backend in development
    const PROD_API_URL = '__BACKEND_URL_PLACEHOLDER__';     // replaced by GitHub Actions

    let API_URL;

    if (PROD_API_URL && !PROD_API_URL.startsWith('__')) {
        // Injected by CI — we are in a real deployment
        API_URL = PROD_API_URL;
    } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // Local development (frontend served on any port: 5000, 5500, 3000…)
        API_URL = DEV_API_URL;
    } else {
        // Fallback: same origin (monorepo mode — backend serves the frontend)
        API_URL = window.location.origin;
    }

    // Bootstrap with sensible defaults, then override from server
    let EXTERNAL_AUTH_URL = 'https://users.coderf5.es';
    window.APP_CONFIG = { API_URL, EXTERNAL_AUTH_URL };

    // Global shortcut — all JS files use:  window.APP_CONFIG?.API_URL || window.API_URL || window.location.origin
    // This guarantees a correct fallback even if APP_CONFIG isn't read in time.
    window.API_URL = API_URL;

    // Fetch runtime config from the server (non-blocking)
    // This replaces EXTERNAL_AUTH_URL with whatever NODE_ENV says in .env
    fetch(`${API_URL}/api/config`)
        .then(r => r.json())
        .then(cfg => {
            window.APP_CONFIG.EXTERNAL_AUTH_URL = cfg.externalAuthUrl || EXTERNAL_AUTH_URL;
            window.APP_CONFIG.env = cfg.env || 'production';
            //console.log('[config] Runtime config loaded:', window.APP_CONFIG);
        })
        .catch(err => {
            console.warn('[config] Could not load /api/config, using defaults:', err.message);
        });

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = window.APP_CONFIG;
    }
})();
