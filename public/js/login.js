// Login goes through OUR server proxy (/api/auth/external-login) to avoid CORS issues.
// The browser MUST NOT call the external auth server directly — Symfony redirects produce
// ERR_FAILED (net::ERR_FAILED 200 OK) because the redirect target has no CORS headers.
function getLoginUrl() {
    const base = window.APP_CONFIG?.API_URL || window.location.origin;
    return `${base}/api/auth/external-login`;
}

function showAlert(message, type) {
    if (type === undefined) type = 'danger';
    // Map 'error' to 'danger' since there is no error-alert element
    var resolvedType = (type === 'error') ? 'danger' : type;
    var alertEl = document.getElementById(resolvedType + '-alert');
    if (!alertEl) { console.warn('Alert element not found:', resolvedType + '-alert'); return; }
    alertEl.textContent = message;
    alertEl.classList.remove('hidden');
    if (resolvedType === 'success') {
        setTimeout(function() { alertEl.classList.add('hidden'); }, 4000);
    }
}

function hideAlerts() {
    var danger = document.getElementById('danger-alert');
    if (danger) danger.classList.add('hidden');
    var success = document.getElementById('success-alert');
    if (success) success.classList.add('hidden');
    var error = document.getElementById('error-alert');
    if (error) error.classList.add('hidden');
}

function setLoading(isLoading) {
    var spinner = document.querySelector('.spinner-sm');
    var button = document.querySelector('.btn-login');
    if (isLoading) {
        if (spinner) spinner.style.display = 'inline-block';
        if (button) button.disabled = true;
    } else {
        if (spinner) spinner.style.display = 'none';
        if (button) button.disabled = false;
    }
}

// Expose to window for direct onclick access
window.handleLogin = async function () {
    //console.log('handleLogin called');

    var email = document.getElementById('email').value;
    var password = document.getElementById('password').value;

    if (!email || !password) {
        showAlert('Please enter both email and password', 'danger');
        return;
    }

    hideAlerts();
    setLoading(true);
    //console.log('Attempting login for:', email);

    try {
        var response = await fetch(getLoginUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: password })
        });

        var data = await response.json();
        //console.log('Login response status:', response.status);
        //console.log('Login response data:', JSON.stringify(data));

        // Support multiple response shapes:
        // Shape A (external API): { success: true, data: { token, userId, roles, name, email } }
        // Shape B (flat): { token, userId, roles, name, email }
        var payload = data.data || data;
        var token = payload.token;
        var loginOk = (data.success !== false) && !!token;

        if (loginOk && token) {
            var roles = Array.isArray(payload.roles) ? payload.roles : [];
            //console.log('roles:', roles);

            // Role mapping from external API:
            // ROLE_USER + ROLE_ADMIN together = superadmin (full platform admin)
            // ROLE_ADMIN alone = teacher/coordinator
            // ROLE_SUPER_ADMIN = superadmin
            var role = 'teacher';
            if (roles.includes('ROLE_SUPER_ADMIN') || roles.includes('ROLE_SUPERADMIN')) {
                role = 'superadmin';
            } else if (roles.includes('ROLE_USER') && roles.includes('ROLE_ADMIN')) {
                role = 'superadmin';
            } else if (roles.includes('ROLE_ADMIN')) {
                role = 'teacher';
            }
            //console.log('Mapped role:', role);

            // The JWT uses 'username' (email) as identifier — server sets req.user.id = email (from decoded.username)
            // We store email as id so promotions filter (teacherId === req.user.id) works correctly
            // userId (numeric, e.g. 19) is stored separately for reference
            var user = {
                id: payload.email || payload.userId || '',
                userId: payload.userId || payload.id || '',
                name: payload.name || payload.email || '',
                email: payload.email || '',
                role: role
            };

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('role', role);

            // Resolve local DB UUID so that teacherId comparisons work correctly.
            // The JWT payload only has the external userId/email; the local Teacher record
            // has a different UUID which is stored as teacherId on promotions.
            try {
                var meRes = await fetch((window.APP_CONFIG?.API_URL || window.location.origin) + '/api/me', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                if (meRes.ok) {
                    var meData = await meRes.json();
                    user.id = meData.id; // local UUID
                    if (meData.userRole) user.userRole = meData.userRole;
                    localStorage.setItem('user', JSON.stringify(user));
                }
            } catch (meErr) {
                console.warn('[login] Could not resolve local teacher id:', meErr.message);
            }

            showAlert('Login successful! Redirecting...', 'success');
            setTimeout(function() {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            var errMsg = data.message || data.error || payload.message || payload.error || 'Login failed. Check credentials.';
            console.warn('Login failed:', errMsg, 'HTTP status:', response.status);
            showAlert(errMsg, 'danger');
        }
    } catch (err) {
        console.error('Login error:', err);
        showAlert('Connection error. Please try again.', 'danger');
    } finally {
        setLoading(false);
    }
};

document.addEventListener('DOMContentLoaded', function() {
    var form = document.getElementById('login-form');
    if (form) {
        // Prevent native form submit (page reload)
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            handleLogin();
        });
        form.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleLogin();
            }
        });
    }
});
