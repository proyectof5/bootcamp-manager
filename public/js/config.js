(function () {
    // Centralized configuration for the frontend.
    // URLs are loaded from the server (/api/config) so they never need to be
    // hardcoded here — just change NODE_ENV in .env and restart the server.

    // Determine the backend API_URL (our Node/Express server)
    let API_URL = window.location.origin;
    const productionUrl = '__BACKEND_URL_PLACEHOLDER__'; // replaced by GitHub Actions
    if (productionUrl && !productionUrl.startsWith('__')) {
        API_URL = productionUrl;
    } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // Local development: point to the server port
        API_URL = 'http://localhost:3000';
    }

    // Bootstrap with sensible defaults, then override from server
    let EXTERNAL_AUTH_URL = 'https://users.coderf5.es';
    window.APP_CONFIG = { API_URL, EXTERNAL_AUTH_URL };

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
