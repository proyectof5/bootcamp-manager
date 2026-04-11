const API_URL = window.APP_CONFIG?.API_URL || window.API_URL || window.location.origin;

let promotionModal;
let currentPromotionId = null;
let currentUser = {};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    promotionModal = new bootstrap.Modal(document.getElementById('promotionModal'));
    loadTeacherInfo();

    // Resolve local DB UUID for users who logged in before the /api/me fix.
    // If currentUser.id looks like an email, fetch /api/me to get the real local UUID.
    const _token = localStorage.getItem('token');
    if (_token && currentUser && currentUser.id && currentUser.id.includes('@')) {
        try {
            const meRes = await fetch(`${API_URL}/api/me`, { headers: { 'Authorization': `Bearer ${_token}` } });
            if (meRes.ok) {
                const meData = await meRes.json();
                currentUser.id = meData.id;
                if (meData.userRole) currentUser.userRole = meData.userRole;
                localStorage.setItem('user', JSON.stringify(currentUser));
            }
        } catch (meErr) {
            console.warn('[dashboard] Could not resolve local teacher id:', meErr.message);
        }
    }

    loadPromotions();
    loadBootcampTemplates();
    setupNavigation();
    setupPromotionForm();
});

function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token || (typeof isTokenExpired === 'function' && isTokenExpired(token))) {
        if (typeof clearSession === 'function') clearSession();
        window.location.href = 'login.html';
        return;
    }
}

function loadTeacherInfo() {
    try {
        const userJson = localStorage.getItem('user');
        currentUser = userJson ? JSON.parse(userJson) : {};
    } catch (e) {
        console.error('Error parsing user data', e);
    }
    if (currentUser && currentUser.name) {
        document.getElementById('teacher-name').textContent = currentUser.name;
    }
    // Show admin panel button only for superadmin
    const role = localStorage.getItem('role') || currentUser.role;
    if (role === 'superadmin') {
        document.getElementById('admin-panel-divider')?.classList.remove('d-none');
        document.getElementById('admin-panel-item')?.classList.remove('d-none');
    }
}

async function loadPromotions() {
    const token = localStorage.getItem('token');
    const userId = currentUser.id;
    try {
        const response = await fetch(`${API_URL}/api/my-promotions-all`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            if (response.status === 401) {
                if (typeof clearSession === 'function') clearSession();
                window.location.href = 'login.html';
            }
            return;
        }

        const promotions = await response.json();
        displayPromotions(promotions, userId);
        updateDashboardStats(promotions);
    } catch (error) {
        console.error('Error loading promotions:', error);
    }
}

function displayPromotions(promotions, userId) {
    const list = document.getElementById('promotions-list');
    list.innerHTML = '';

    if (promotions.length === 0) {
        list.innerHTML = '<div class="col-12"><p class="text-muted text-center">No promotions yet. Create one to get started!</p></div>';
        return;
    }

    promotions.forEach(promotion => {
        const card = document.createElement('div');
        card.className = 'col-md-6 col-lg-4';
        const isOwner = promotion.teacherId === userId;
        const ownerBadge = !isOwner ? '<span class="badge bg-info">Collaborator</span>' : '';

        card.innerHTML = `
            <div class="card promotion-card" onclick="window.location.href = 'promotion-detail?id=${promotion.id}'">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h5 class="promotion-card-title">${escapeHtml(promotion.name)}</h5>
                        ${ownerBadge}
                    </div>
                    <p class="promotion-card-meta">${promotion.description || 'No description'}</p>
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <span class="badge-weeks">${promotion.weeks} weeks</span>
                    </div>
                </div>
            </div>
        `;
        list.appendChild(card);
    });
}

function updateDashboardStats(promotions) {
    const countEl = document.getElementById('promotions-count');
    const modulesEl = document.getElementById('modules-count');
    if (countEl) countEl.textContent = promotions.length;

    let totalModules = 0;
    promotions.forEach(p => {
        totalModules += (p.modules || []).length;
    });
    if (modulesEl) modulesEl.textContent = totalModules;
}

function setupNavigation() {
    const navLinks = document.querySelectorAll('.sidebar .nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const href = link.getAttribute('href');

            // Remove active class
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Hide all sections
            document.querySelectorAll('.section-content').forEach(section => {
                section.classList.add('hidden');
            });

            // Show promotions section (only section we keep)
            if (href === '#promotions') {
                document.getElementById('promotions-section').classList.remove('hidden');
            }
        });
    });
}

function openNewPromotionModal() {
    currentPromotionId = null;
    document.getElementById('promotion-form').reset();
    document.getElementById('promotion-modal-title').textContent = 'New Promotion';
    promotionModal.show();
}

// Templates data (loaded from server)
let bootcampTemplates = {};

// Load templates from server
async function loadBootcampTemplates() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/bootcamp-templates`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const templates = await response.json();
            bootcampTemplates = {};

            // Build templates object for easy lookup
            templates.forEach(template => {
                bootcampTemplates[template.id] = template;
            });

            // Populate the select dropdown
            populateTemplateSelect(templates);
        }
    } catch (error) {
        console.error('Error loading templates:', error);
    }
}

// Populate template select dropdown
function populateTemplateSelect(templates) {
    const select = document.getElementById('promotion-template');

    // Keep the first default option
    select.innerHTML = '<option value="">-- Select a template to start --</option>';

    // Add system templates first
    templates.filter(t => !t.isCustom).forEach(template => {
        const option = document.createElement('option');
        option.value = template.id;
        const wLabel = template.weeks ? `${template.weeks}w` : '?w';
        const hLabel = template.hours ? `${template.hours}h` : (template.weeks ? `${template.weeks * 35}h` : '?h');
        option.textContent = `${template.name} (${wLabel}, ${hLabel})`;
        select.appendChild(option);
    });

    // Add divider for custom templates
    if (templates.some(t => t.isCustom)) {
        const divider = document.createElement('optgroup');
        divider.label = 'Custom Templates';

        templates.filter(t => t.isCustom).forEach(template => {
            const option = document.createElement('option');
            option.value = template.id;
            const wLabel = template.weeks ? `${template.weeks}w` : '?w';
            const hLabel = template.hours ? `${template.hours}h` : (template.weeks ? `${template.weeks * 35}h` : '?h');
            option.textContent = `${template.name} (${wLabel}, ${hLabel})`;
            divider.appendChild(option);
        });

        select.appendChild(divider);
    }
}

window.applyTemplate = function () {
    const templateId = document.getElementById('promotion-template').value;

    if (!templateId) return;

    const template = bootcampTemplates[templateId];
    if (template) {
        if (template.weeks) document.getElementById('promotion-weeks').value = template.weeks;
        document.getElementById('promotion-name').value = template.name;
        document.getElementById('promotion-desc').value = template.description || '';
        const hoursEl = document.getElementById('promotion-hours');
        if (hoursEl) {
            const hoursVal = template.hours || template.totalHours || '';
            if (hoursVal) hoursEl.value = hoursVal;
        }
    }
}


function setupPromotionForm() {
    document.getElementById('promotion-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('promotion-name').value.trim();
        const description = document.getElementById('promotion-desc').value;
        const weeksRaw = parseInt(document.getElementById('promotion-weeks').value);
        const weeks = isNaN(weeksRaw) ? undefined : weeksRaw;
        const totalHours = parseInt(document.getElementById('promotion-hours')?.value) || undefined;
        const startDate = document.getElementById('promotion-start').value;
        const endDate = document.getElementById('promotion-end').value;

        if (!name) { alert('El nombre de la promoción es obligatorio.'); return; }
        if (!weeks) { alert('El número de semanas es obligatorio. Si usaste una plantilla sin semanas definidas, introdúcelo manualmente.'); return; }
        // Only pass templateId on creation (not when editing an existing promotion)
        const templateId = !currentPromotionId
            ? (document.getElementById('promotion-template').value || null)
            : null;

        const token = localStorage.getItem('token');
        const method = currentPromotionId ? 'PUT' : 'POST';
        const url = currentPromotionId
            ? `${API_URL}/api/promotions/${currentPromotionId}`
            : `${API_URL}/api/promotions`;

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, description, weeks, totalHours, startDate, endDate, templateId })
            });

            if (response.ok) {
                const saved = await response.json();
                if (!currentPromotionId) {
                    // New promotion created → redirect to detail page and auto-open Acta de Inicio
                    // Use the custom UUID `id` field (NOT `_id` which is the MongoDB ObjectId)
                    const newId = saved.id;
                    window.location.href = `promotion-detail?id=${newId}&openActa=1`;
                } else {
                    // Editing existing → stay on dashboard
                    promotionModal.hide();
                    loadPromotions();
                }
            } else {
                const errData = await response.json().catch(() => ({}));
                alert(errData.error || 'Error al guardar la promoción');
            }
        } catch (error) {
            console.error('Error saving promotion:', error);
            alert('Error de conexión. Por favor, inténtalo de nuevo.');
        }
    });
}

async function deletePromotion(promotionId, event) {
    event.stopPropagation();

    if (!confirm('Are you sure you want to delete this promotion?')) {
        return;
    }

    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            loadPromotions();
        } else {
            alert('Error deleting promotion');
        }
    } catch (error) {
        console.error('Error deleting promotion:', error);
    }
}

function logout() {
    if (typeof clearSession === 'function') clearSession();
    else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('role');
    }
    window.location.href = 'login.html';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== PROFILE MANAGEMENT ====================

let profileModal;

function initProfileModal() {
    profileModal = new bootstrap.Modal(document.getElementById('profileModal'));
}

window.openProfileModal = async function () {
    if (!profileModal) {
        initProfileModal();
    }

    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const profile = await response.json();

            // Populate form
            document.getElementById('profile-name').value = profile.name || '';
            document.getElementById('profile-lastName').value = profile.lastName || '';
            document.getElementById('profile-email').value = profile.email;
            document.getElementById('profile-location').value = profile.location || '';

            // Pre-fill reset email with the user's email
            const resetEmailEl = document.getElementById('reset-email');
            if (resetEmailEl) resetEmailEl.value = profile.email || '';

            // Clear old password fields if still present
            ['current-password', 'new-password', 'confirm-password'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });

            // Update save button handler — only active on Profile tab
            const saveBtn = document.getElementById('profile-save-btn');
            saveBtn.style.display = '';  // ensure visible on open (profile tab is default)
            saveBtn.onclick = function () { saveProfileInfo(); };

            // Update button label when switching tabs
            document.querySelectorAll('#profileTabs .nav-link').forEach(tab => {
                tab.addEventListener('shown.bs.tab', function () {
                    const isPasswordTab = this.id === 'password-tab';
                    saveBtn.style.display = isPasswordTab ? 'none' : '';
                });
            });

            profileModal.show();
        } else {
            alert('Error loading profile');
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        alert('Error loading profile');
    }
};

window.saveProfileInfo = async function () {
    const token = localStorage.getItem('token');
    const name = document.getElementById('profile-name').value;
    const lastName = document.getElementById('profile-lastName').value;
    const location = document.getElementById('profile-location').value;

    try {
        const response = await fetch(`${API_URL}/api/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, lastName, location })
        });

        const alertEl = document.getElementById('profile-alert');

        if (response.ok) {
            const data = await response.json();

            // Update localStorage
            const user = JSON.parse(localStorage.getItem('user'));
            user.name = data.profile.name;
            localStorage.setItem('user', JSON.stringify(user));
            document.getElementById('teacher-name').textContent = user.name;

            alertEl.className = 'alert alert-success';
            alertEl.textContent = 'Profile updated successfully!';
            alertEl.classList.remove('hidden');

            setTimeout(() => {
                alertEl.classList.add('hidden');
            }, 3000);
        } else {
            const data = await response.json();
            alertEl.className = 'alert alert-danger';
            alertEl.textContent = data.error || 'Error updating profile';
            alertEl.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        const alertEl = document.getElementById('profile-alert');
        alertEl.className = 'alert alert-danger';
        alertEl.textContent = 'Error updating profile';
        alertEl.classList.remove('hidden');
    }
};

window.changePassword = async function () {
    const alertEl = document.getElementById('password-alert');

    const emailEl = document.getElementById('reset-email');
    const email = emailEl ? emailEl.value.trim() : '';

    if (!email) {
        alertEl.className = 'alert alert-warning';
        alertEl.textContent = 'Por favor, introduce tu correo electrónico.';
        alertEl.classList.remove('hidden');
        return;
    }

    try {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === 'localhost';
        const resetUrl = isLocal
            ? 'http://localhost:8000/reset-password/api-request-reset'
            : 'https://users.coderf5.es/reset-password/api-request-reset';

        const response = await fetch(resetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        // Many reset-password endpoints return 200/204 with no body, or a JSON message
        let data = {};
        const text = await response.text();
        try { data = JSON.parse(text); } catch { /* no JSON body */ }

        if (response.ok) {
            alertEl.className = 'alert alert-success';
            alertEl.textContent = data.message || 'En breves recibirás un correo con el enlace para cambiar tu contraseña.';
            alertEl.classList.remove('hidden');
            // Do NOT close the modal — let the user read the confirmation
        } else {
            alertEl.className = 'alert alert-danger';
            alertEl.textContent = data.message || data.error || 'Error al enviar el correo. Inténtalo de nuevo.';
            alertEl.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error sending reset password email:', error);
        alertEl.className = 'alert alert-danger';
        alertEl.textContent = 'Error de conexión. Inténtalo de nuevo.';
        alertEl.classList.remove('hidden');
    }
};

// Initialize profile modal on page load
document.addEventListener('DOMContentLoaded', () => {
    initProfileModal();
});

// Toggle password visibility
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const button = event.currentTarget;
    const icon = button.querySelector('i');

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('bi-eye');
        icon.classList.add('bi-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('bi-eye-slash');
        icon.classList.add('bi-eye');
    }
}
