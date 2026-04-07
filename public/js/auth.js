const API_URL = window.APP_CONFIG?.API_URL || window.location.origin;

let isLoginForm = true;

function toggleForm() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const authTitle = document.getElementById('auth-title');
    const toggleText = document.getElementById('toggle-text');

    if (isLoginForm) {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        authTitle.textContent = 'Create Account';
        toggleText.innerHTML = 'Already have an account? <a onclick="toggleForm()">Login</a>';
        isLoginForm = false;
    } else {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        authTitle.textContent = 'Login';
        toggleText.innerHTML = 'Don\'t have an account? <a onclick="toggleForm()">Register</a>';
        isLoginForm = true;
    }

    // Clear forms and alerts
    loginForm.reset();
    registerForm.reset();
    hideAlerts();
}

function showAlert(message, type = 'danger') {
    const alert = document.getElementById(`${type}-alert`);
    alert.textContent = message;
    alert.classList.remove('hidden');

    if (type === 'success') {
        setTimeout(() => alert.classList.add('hidden'), 3000);
    }
}

function hideAlerts() {
    document.getElementById('error-alert').classList.add('hidden');
    document.getElementById('success-alert').classList.add('hidden');
}

function setLoading(isLoading, isRegister = false) {
    const formId = isRegister ? 'register-form' : 'login-form';
    const textSpan = isRegister ? '.register-text' : '.login-text';
    const spinners = document.querySelectorAll(`#${formId} .spinner-loading`);
    const buttons = document.querySelectorAll(`#${formId} button`);

    if (isLoading) {
        spinners.forEach(s => s.style.display = 'inline-block');
        buttons.forEach(b => b.disabled = true);
    } else {
        spinners.forEach(s => s.style.display = 'none');
        buttons.forEach(b => b.disabled = false);
    }
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlerts();
    setLoading(true, false);

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('role', data.user.role);
            if (data.user.userRole) localStorage.setItem('userRole', data.user.userRole);
            showAlert('Login successful! Redirecting...', 'success');
            if (data.user.role === 'admin') {
                setTimeout(() => window.location.href = 'admin.html', 1500);
            } else {
                setTimeout(() => window.location.href = 'dashboard.html', 1500);
            }
        } else {
            showAlert(data.error || 'Login failed', 'danger');
        }
    } catch (error) {
        showAlert('Connection error. Please try again.', 'danger');
    } finally {
        setLoading(false, false);
    }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlerts();
    setLoading(true, true);

    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm').value;

    if (password !== confirmPassword) {
        showAlert('Passwords do not match', 'danger');
        setLoading(false, true);
        return;
    }

    if (password.length < 6) {
        showAlert('Password must be at least 6 characters', 'danger');
        setLoading(false, true);
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('role', 'teacher');
            if (data.user.userRole) localStorage.setItem('userRole', data.user.userRole);
            showAlert('Account created successfully! Redirecting...', 'success');
            setTimeout(() => window.location.href = 'dashboard.html', 1500);
        } else {
            showAlert(data.error || 'Registration failed', 'danger');
        }
    } catch (error) {
        showAlert('Connection error. Please try again.', 'danger');
    } finally {
        setLoading(false, true);
    }
});
