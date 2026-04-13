const API_URL = window.APP_CONFIG?.API_URL || window.API_URL || window.location.origin;

/** Capitaliza la primera letra de cada palabra y deja el resto en minúsculas */
function toTitleCase(str) {
    if (!str) return '';
    return str.trim().replace(/\S+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

/** Devuelve el nombre completo de un estudiante en Title Case */
function studentFullName(student) {
    return toTitleCase(`${student.name || ''} ${student.lastname || ''}`).trim();
}


// ==================== GREETING & WELCOME MESSAGES ====================

/**
 * Renderiza el saludo dinámico en la sección Overview
 * Saluda al docente deseándole un buen día, sin mencionar la promo
 */
function renderGreeting() {
    const greetingContainer = document.getElementById('greeting-container');
    if (!greetingContainer) return;

    // Array de saludos amigables para el docente
    const greetings = [
        { text: '¡Que tengas un excelente día!', icon: '👋' },
        { text: '¡Hola! Que tengas una buena jornada', icon: '🚀' },
        { text: '¡Bienvenido! Espero que sea un gran día', icon: '☀️' },
        { text: '¡Hola equipo! ¡A por un buen día!', icon: '💪' }
    ];

    // Seleccionar un saludo aleatorio
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];

    // Construir el HTML del saludo
    const greetingHTML = `
        <div class="greeting-icon">${greeting.icon}</div>
        <div class="greeting-text">
            ${greeting.text}
        </div>
    `;

    greetingContainer.innerHTML = greetingHTML;
}

/**
 * Renderiza el subtítulo "Hoy estás en la promo"
 * @param {string} promotionName - Nombre de la promoción
 */
function renderPromoSubtitle(promotionName) {
    const subtitleEl = document.getElementById('promo-subtitle');
    if (!subtitleEl) return;

    subtitleEl.textContent = `Hoy estás en la promo`;
}


// ==================== PROFILE MANAGEMENT ====================

let profileModal;

function initProfileModal() {
    const el = document.getElementById('profileModal');
    if (el) profileModal = new bootstrap.Modal(el);
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

            // Clear password fields
            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';

            // Update save button handler
            const saveBtn = document.getElementById('profile-save-btn');
            saveBtn.onclick = function () {
                const activeTab = document.querySelector('.nav-link.active');
                if (activeTab.id === 'profile-tab') {
                    saveProfileInfo();
                } else {
                    changePassword();
                }
            };

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

window.logout = function () {
    if (typeof clearSession === 'function') clearSession();
    else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('role');
    }
    window.location.href = 'login.html';
};

// (initProfileModal is called inside the main DOMContentLoaded block)

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




let promotionId = null;
let moduleModal, quickLinkModal, sectionModal, studentModal, studentProgressModal, teamModal, editTeamModal, resourceModal,
    collaboratorModal, projectAssignmentDetailModal;
// Always read role fresh from localStorage so external auth (users.coderf5.es),
// which writes 'role' after the page loads, is picked up correctly.
// 'superadmin' has the same edit rights as 'teacher'.
function getUserRole() { return localStorage.getItem('role') || 'student'; }
function isTeacherOrAdmin() { const r = getUserRole(); return r === 'teacher' || r === 'superadmin'; }
// Keep a module-level alias for the few places that still use `userRole` as a string.
// This is re-evaluated at call time via the getter.
Object.defineProperty(window, 'userRole', { get: getUserRole, configurable: true });
let currentUser = {};
let promotionModules = []; // Store promotion modules
window.promotionModules = promotionModules; // Expose for program-competences.js
let currentModuleIndex = 0; // Track current module for píldoras navigation

let deletePromotionModal;
try {
    const userJson = localStorage.getItem('user');
    currentUser = userJson && userJson !== 'undefined' ? JSON.parse(userJson) : {};
    // Display user name in navbar
    if (currentUser && currentUser.name) {
        const teacherNameEl = document.getElementById('teacher-name');
        if (teacherNameEl) {
            teacherNameEl.textContent = currentUser.name;
        }
    }
    // Show admin panel button only for superadmin
    const role = localStorage.getItem('role') || currentUser.role;
    if (role === 'superadmin') {
        document.getElementById('admin-panel-divider')?.classList.remove('d-none');
        document.getElementById('admin-panel-item')?.classList.remove('d-none');
    }
} catch (e) {
    console.error('Error parsing user data', e);
}
let extendedInfoData = {
    schedule: {},
    team: [],
    resources: [],
    evaluation: '',
    pildoras: [],
    pildorasAssignmentOpen: false
};

// Global calendar ID for use across the application
let currentCalendarId = '';

// Attendance state
let currentAttendanceMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
let attendanceData = []; // Store attendance records for the current month
let studentsForAttendance = []; // Local copy of students for rendering current view
let promotionHolidays = new Set(); // Set of YYYY-MM-DD strings for festivos


// Utility function to escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, function (m) { return map[m]; });
}

// (Immediate CSS injection for student view logic was here)

// Immediate CSS injection for student view (to prevent flicker)
if (userRole === 'student') {
    const style = document.createElement('style');
    style.innerHTML = `
        .teacher-only, 
        .btn-primary:not(#login-button):not(.nav-link), 
        .btn-danger, 
        .btn-outline-danger, 
        .btn-warning,
        #students-tab-nav { display: none !important; }
        
        /* Ensure navigation to students tab is hidden */
        .nav-link[onclick*="students"] { display: none !important; }
        a[href="#students"] { display: none !important; }
    `;
    document.head.appendChild(style);
    document.body.classList.add('student-view');
}

// Initialize Mobile Hamburger Menu
function initMobileMenu() {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('show');
            if (sidebarOverlay) {
                sidebarOverlay.classList.toggle('show');
            }
        });

        // Close sidebar when clicking overlay
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', () => {
                sidebar.classList.remove('show');
                sidebarOverlay.classList.remove('show');
            });
        }

        // Close sidebar when clicking on a nav link
        const navLinks = sidebar.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                sidebar.classList.remove('show');
                if (sidebarOverlay) {
                    sidebarOverlay.classList.remove('show');
                }
            });
        });
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    promotionId = new URLSearchParams(window.location.search).get('id');

    // Alias for search bar compatibility
    window.filterStudents = filterStudentsTable;
    window.exportStudentsCsv = exportAllStudentsExcel; // Map CSV buttons to Excel as requested
    window.exportStudentsExcel = exportAllStudentsExcel;

    if (!promotionId) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Main initialization sequence
    async function init() {
        // Initialize mobile menu
        initMobileMenu();

        // Setup calendar preview
        setupCalendarPreviewHandler();

        // Initialize modals only if elements exist (teacher view)
        const moduleModalEl = document.getElementById('moduleModal');
        if (moduleModalEl) moduleModal = new bootstrap.Modal(moduleModalEl);

        const quickLinkModalEl = document.getElementById('quickLinkModal');
        if (quickLinkModalEl) quickLinkModal = new bootstrap.Modal(quickLinkModalEl);

        const sectionModalEl = document.getElementById('sectionModal');
        if (sectionModalEl) sectionModal = new bootstrap.Modal(sectionModalEl);

        const studentModalEl = document.getElementById('studentModal');
        if (studentModalEl) studentModal = new bootstrap.Modal(studentModalEl);

        const studentProgressModalEl = document.getElementById('studentProgressModal');
        if (studentProgressModalEl) studentProgressModal = new bootstrap.Modal(studentProgressModalEl);

        const projectAssignmentDetailModalEl = document.getElementById('projectAssignmentDetailModal');
        if (projectAssignmentDetailModalEl) projectAssignmentDetailModal = new bootstrap.Modal(projectAssignmentDetailModalEl);

        // New Modals (Teacher)
        const teamModalEl = document.getElementById('teamModal');
        if (teamModalEl) teamModal = new bootstrap.Modal(teamModalEl);

        const resourceModalEl = document.getElementById('resourceModal');
        if (resourceModalEl) resourceModal = new bootstrap.Modal(resourceModalEl);

        const deletePromotionModalEl = document.getElementById('deletePromotionModal');
        if (deletePromotionModalEl) deletePromotionModal = new bootstrap.Modal(deletePromotionModalEl);

        const collaboratorModalEl = document.getElementById('collaboratorModal');
        if (collaboratorModalEl) collaboratorModal = new bootstrap.Modal(collaboratorModalEl);

        const editTeamModalEl = document.getElementById('editTeamModal');
        if (editTeamModalEl) editTeamModal = new bootstrap.Modal(editTeamModalEl);

        // Promo Resources modal
        const promoResourceModalEl = document.getElementById('promoResourceModal');
        if (promoResourceModalEl) {
            window._promoResourceModal = new bootstrap.Modal(promoResourceModalEl);
            document.getElementById('promo-resource-form').addEventListener('submit', submitPromoResource);
        }

        initEmployabilityModal();
        initProfileModal();

        // Wire funder Enter key
        document.getElementById('acta-funder-input')?.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); actaAddFunder(); }
        });

        // 1. Load Promotion basics (Populates modules list for all other components)
        // Always resolve the local DB UUID via /api/me so that teacherId comparisons work correctly,
        // regardless of what was previously stored in localStorage.
        const _token = localStorage.getItem('token');
        if (_token && currentUser) {
            try {
                const meRes = await fetch(`${API_URL}/api/me`, { headers: { 'Authorization': `Bearer ${_token}` } });
                if (meRes.ok) {
                    const meData = await meRes.json();
                    currentUser.id = meData.id;
                    if (meData.userRole) currentUser.userRole = meData.userRole;
                    localStorage.setItem('user', JSON.stringify(currentUser));
                }
            } catch (meErr) {
                console.warn('[init] Could not resolve local teacher id:', meErr.message);
            }
        }
        await loadPromotion();

        if (isTeacherOrAdmin()) {
            // 2. Load Extended info (Acta), Students, and Collaborators in parallel
            _showExtendedInfoLoading(true);
            await Promise.all([
                loadExtendedInfo().finally(() => _showExtendedInfoLoading(false)),
                loadStudents(),
                loadCollaborators(),
                loadAccessPassword()
            ]);

            // Open Acta modal AFTER overlay finishes (if requested)
            if (new URLSearchParams(window.location.search).get('openActa') === '1') {
                setTimeout(() => openActaModal(), 400);
            }
            
            setupForms();
        } else {
            // Student role: Clean up Teacher-only UIs
            const previewBtn = document.querySelector('button[onclick="previewPromotion()"]');
            if (previewBtn) previewBtn.remove();
        }

        // 3. UI logic
        loadQuickLinks();
        loadQuickActions();
        loadSections();
        loadPromoResources();

        // 4. Feature modules
        if (typeof NotesManager !== 'undefined' && typeof NotesUI !== 'undefined') {
            const notesManager = new NotesManager('promotionNotes', promotionId);
            const notesUI = new NotesUI(notesManager, 'notes-container');
            notesUI.init(); // async: loads shared notes from server then renders
            window.notesManager = notesManager;
            window.notesUI = notesUI;
        }

        if (typeof window.StudentTracking !== 'undefined') {
            window.StudentTracking.init(promotionId);
        }

        // 5. Restore last active tab (Safe now because loadPromotion/loadCollaborators finished)
        const validTabs = ['overview', 'info', 'students', 'attendance', 'collaborators', 'access-settings', 'evaluation'];
        let savedTab = sessionStorage.getItem(`activeTab_${promotionId}`) || 'overview';
        if (!validTabs.includes(savedTab)) savedTab = 'overview';
        window.location.hash = savedTab;
        switchTab(savedTab);
    }

    init().catch(err => console.error('[Init] Initialization failed:', err));
});

function setupCalendarPreviewHandler() {
    const calendarPreviewIframe = document.getElementById('calendar-preview-iframe');
    if (calendarPreviewIframe) {
        window.setupCalendarPreview = function () {
            const calendarId = currentCalendarId || '';
            if (calendarId) {
                const embedUrl = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId)}&ctz=Europe/Madrid&mode=AGENDA`;
                calendarPreviewIframe.src = embedUrl;
            } else {
                calendarPreviewIframe.src = '';
            }
        };
    }
}

async function loadExtendedInfo() {
    const token = localStorage.getItem('token');
    try {
        // Ensure Roadmap sub-tab is active on load (wrapped so a Bootstrap error doesn't abort the whole load)
        try {
            const roadmapTab = document.getElementById('program-details-roadmap-tab');
            if (roadmapTab && window.bootstrap) {
                const tab = bootstrap.Tab.getOrCreateInstance(roadmapTab);
                tab.show();
            }
        } catch (tabErr) {
            console.warn('[loadExtendedInfo] Could not activate roadmap tab:', tabErr);
        }

        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/extended-info`); // Public endpoint
        if (response.ok) {
            extendedInfoData = await response.json();
            // Expose competences globally so the project competence picker can access them
            // even before ProgramCompetences.init() runs
            window._extendedInfoCompetences = extendedInfoData.competences || [];

            // Populate Schedule
            const sched = extendedInfoData.schedule || {};
            const _set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
            if (sched.online) {
                _set('sched-online-entry', sched.online.entry);
                _set('sched-online-start', sched.online.start);
                _set('sched-online-break', sched.online.break);
                _set('sched-online-lunch', sched.online.lunch);
                _set('sched-online-finish', sched.online.finish);
            }
            if (sched.presential) {
                _set('sched-presential-entry', sched.presential.entry);
                _set('sched-presential-start', sched.presential.start);
                _set('sched-presential-break', sched.presential.break);
                _set('sched-presential-lunch', sched.presential.lunch);
                _set('sched-presential-finish', sched.presential.finish);
            }
            _set('sched-notes', sched.notes);

            // Populate Additional Lists
            displayTeam();
            displayResources();

            // Load modules and display píldoras (await so promotionModules is populated before ProgramCompetences.init)
            await loadModulesPildoras();

            // Populate Evaluation
            const defaultEvaluation = `Evaluación del Proyecto

Se brindará retroalimentación oral el mismo día de la presentación del proyecto, mientras que la autoevaluación (en proyectos individuales) y evaluación grupal (en proyectos grupales) se realizará al día siguiente y posteriormente, el equipo formativo compartirá las impresiones finales. Todo ello deberá almacenarse en Google Classroom.

Se tendrán en cuenta los siguientes aspectos:

• Análisis de los commits realizados por los coders, valorando tanto la cantidad como la calidad
• Participación individual en la presentación del proyecto
• Capacidad de responder preguntas específicas de manera clara y fundamentada
• Desarrollo y demostración de las competencias adquiridas durante el proyecto

Evaluación de las Píldoras

Las píldoras se asignarán la primera semana, se apuntarán en el calendario y se valorarán los siguientes aspectos:
• Que tenga un poco de inglés (hablado, no solo en la presentación)
• Que tenga parte teórica y parte práctica. Énfasis en la práctica
• Tiempo mínimo 1 hora
• Crear un repositorio en Github y/o publicar un artículo en Medium

Evaluación Global al Final del Bootcamp

• Valoración de los proyectos entregados
• Valoración de los cursos realizados
• Valoración de las píldoras realizadas
• Valoración de competencias transversales`;

            _set('evaluation-text', extendedInfoData.evaluation || defaultEvaluation);

            // Acta de Inicio fields are loaded into extendedInfoData and populated
            // into the modal on demand when openActaModal() is called.

            // Set Píldoras Assignment Toggle
            const assignmentToggle = document.getElementById('pildoras-assignment-toggle');
            if (assignmentToggle) {
                assignmentToggle.checked = !!extendedInfoData.pildorasAssignmentOpen;
            }

            // Set Empleabilidad Visibility Toggle
            const empToggle = document.getElementById('show-employability-toggle');
            if (empToggle) {
                // Default true if not set yet
                empToggle.checked = extendedInfoData.showEmployability !== false;
            }

            // Init Competencias module in view-only mode (only showing those used in projects)
            if (window.ProgramCompetences) {
                const usedCompIds = new Set();
                if (Array.isArray(extendedInfoData.projectCompetences)) {
                    extendedInfoData.projectCompetences.forEach(pc => {
                        (pc.competenceIds || []).forEach(cid => usedCompIds.add(String(cid)));
                    });
                }
                const filteredComps = (extendedInfoData.competences || []).filter(c => usedCompIds.has(String(c.id)));

                if (window.ProgramCompetences.initViewOnly) {
                    window.ProgramCompetences.initViewOnly(filteredComps);
                } else {
                    window.ProgramCompetences.init(filteredComps);
                }
            }

        }
    } catch (error) {
        console.error('Error in loadExtendedInfo:', error);
    }
}

// ── Loading overlay helper ────────────────────────────────────────────────────
function _showExtendedInfoLoading(show) {
    let overlay = document.getElementById('extended-info-loading-overlay');
    if (show) {
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'extended-info-loading-overlay';
            overlay.style.cssText = `
                position: fixed; inset: 0; z-index: 9999;
                background: rgba(255,255,255,0.85);
                display: flex; flex-direction: column;
                align-items: center; justify-content: center;
                gap: 1rem;
            `;
            overlay.innerHTML = `
                <div class="spinner-border" style="width:3rem;height:3rem;color:#FF6B35;" role="status"></div>
                <p class="fw-semibold mb-0" style="font-size:1.1rem;color:#FF6B35;">Cargando información de la promoción…</p>
            `;
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'flex';
    } else {
        if (overlay) {
            overlay.style.transition = 'opacity 0.3s';
            overlay.style.opacity = '0';
            setTimeout(() => overlay && overlay.remove(), 320);
        }
    }
}

function displayTeam() {
    const tbody = document.getElementById('team-list-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    (extendedInfoData.team || []).forEach((member, index) => {
        // Find assigned modules from central state (currentPromotion)
        let moduleIds = [];
        const promo = window.currentPromotion || {};
        const isOwner = promo.teacherId === member.collaboratorId;
        
        if (isOwner) {
            moduleIds = promo.ownerModules || [];
        } else {
            const entry = (promo.collaboratorModules || []).find(m => m.teacherId === member.collaboratorId);
            moduleIds = entry ? (entry.moduleIds || []) : [];
        }

        // Map to names
        const modNames = [];
        (moduleIds || []).forEach(mid => {
            const found = (window.promotionModules || []).find(m => String(m.id) === String(mid));
            if (found) modNames.push(found.name);
        });

        const moduleCell = modNames.length > 0
            ? modNames.map(name => `<span class="badge bg-light text-dark border me-1">${escapeHtml(name)}</span>`).join('')
            : '<span class="text-muted small">—</span>';

        const linkedinCell = member.linkedin
            ? `<a href="${escapeHtml(member.linkedin)}" target="_blank"><i class="bi bi-linkedin"></i></a>`
            : '<span class="text-muted small">—</span>';
            
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(member.name)}</td>
            <td>${escapeHtml(member.role || '')}</td>
            <td>${escapeHtml(member.email || '')}</td>
            <td>${moduleCell}</td>
            <td>${linkedinCell}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="openEditTeamModal(${index})" title="Editar"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteTeamMember(${index})" title="Eliminar"><i class="bi bi-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function displayResources() {
    const tbody = document.getElementById('resources-list-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    (extendedInfoData.resources || []).forEach((res, index) => {
        const tr = document.createElement('tr');

        // Build category/type cell
        const categoryHtml = (res.types && res.types.length)
            ? res.types.map(t => `<span class="badge bg-primary-subtle text-primary border border-primary-subtle me-1">${escapeHtml(t.name)}</span>`).join('')
            : `<span class="badge bg-info text-dark">${escapeHtml(res.category || '')}</span>`;

        // Build area badges
        const areaBadges = (res.areas && res.areas.length)
            ? res.areas.slice(0, 3).map(a => `<span class="badge bg-light text-dark border small me-1">${escapeHtml(a.name)}</span>`).join('')
            : '';

        // Build tool chips
        const toolChips = (res.tools && res.tools.length)
            ? res.tools.slice(0, 4).map(t => `<span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle small me-1">${escapeHtml(t.name)}</span>`).join('')
            : '';

        const extraHtml = (areaBadges || toolChips)
            ? `<div class="mt-1">${areaBadges}${toolChips}</div>`
            : '';

        tr.innerHTML = `
            <td>
                <div class="fw-semibold">${escapeHtml(res.title)}</div>
                ${extraHtml}
            </td>
            <td>${categoryHtml}</td>
            <td><a href="${escapeHtml(res.url)}" target="_blank" class="text-truncate d-inline-block" style="max-width: 180px;">${escapeHtml(res.url)}</a></td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="deleteResource(${index})"><i class="bi bi-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Load modules and píldoras data
async function loadModulesPildoras() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/modules-pildoras`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            promotionModules = data.modules || [];
            window.promotionModules = promotionModules; // Keep window reference in sync

            // Always sync modulesPildoras from this specialized endpoint if it has data
            if (data.modulesPildoras) {
                extendedInfoData.modulesPildoras = data.modulesPildoras;
            }

            // Ensure all modules have entries
            promotionModules.forEach(module => {
                const existingModulePildoras = extendedInfoData.modulesPildoras.find(mp => mp.moduleId === module.id);
                if (!existingModulePildoras) {
                    extendedInfoData.modulesPildoras.push({
                        moduleId: module.id,
                        moduleName: module.name,
                        pildoras: []
                    });
                }
            });

            // Show/hide module navigation based on modules availability
            const moduleNav = document.getElementById('pildoras-module-nav');
            if (moduleNav) {
                if (promotionModules.length > 1) {
                    moduleNav.style.display = 'flex';
                } else {
                    moduleNav.style.display = 'none';
                }
            }

            // Set current module to first module
            currentModuleIndex = 0;
            displayPildoras();
        } else {
            console.error('Error loading modules píldoras:', response.statusText);
            // Fallback to regular píldoras display
            displayPildoras();
        }
    } catch (error) {
        console.error('Error loading modules píldoras:', error);
        // Fallback to regular píldoras display
        displayPildoras();
    }
}

function displayPildoras() {
    const tbody = document.getElementById('pildoras-list-body');
    if (!tbody) return;

    // Get current module píldoras
    const currentModule = promotionModules[currentModuleIndex];
    if (!currentModule) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-muted">No modules found.</td></tr>';
        return;
    }

    // Find píldoras for current module
    const modulesPildoras = extendedInfoData.modulesPildoras || [];
    const currentModulePildoras = modulesPildoras.find(mp => mp.moduleId === currentModule.id);
    const pildoras = currentModulePildoras ? currentModulePildoras.pildoras : [];

    const students = window.currentStudents || [];

    // Update module navigation display
    updateModuleNavigation();

    if (pildoras.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-muted">No píldoras configuradas para ${currentModule.name}.</td></tr>`;
        return;
    }

    tbody.innerHTML = '';

    pildoras.forEach((p, index) => {
        const selectedIds = (p.students || []).map(s => s.id);
        const modeValue = p.mode || 'Virtual';
        const statusValue = p.status || '';

        // Ensure date doesn't default to 1970 or empty if we prefer today
        const todayStr = new Date().toISOString().split('T')[0];
        let dateValue = p.date || '';
        if (!dateValue || dateValue === '1970-01-01') {
            dateValue = todayStr;
        }

        const tr = document.createElement('tr');
        tr.dataset.index = index;
        tr.innerHTML = `
            <td>
                <select class="form-select form-select-sm pildora-mode pildora-mode-${modeValue.toLowerCase().replace(' ', '-')}">
                    <option value="Virtual" ${modeValue === 'Virtual' ? 'selected' : ''}>Virtual</option>
                    <option value="Presencial" ${modeValue === 'Presencial' ? 'selected' : ''}>Presencial</option>
                    <option value="Otro" ${modeValue === 'Otro' ? 'selected' : ''}>Otro</option>
                </select>
            </td>
            <td>
                <input type="date" class="form-control form-control-sm pildora-date" value="${escapeHtml(dateValue)}">
            </td>
            <td>
                <input type="text" class="form-control form-control-sm pildora-title" value="${escapeHtml(p.title || '')}" placeholder="Título de la píldora">
            </td>
            <td>
                <div class="dropdown pildora-students-dropdown">
                    <button class="btn btn-outline-secondary btn-sm dropdown-toggle w-100 text-start" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                        ${selectedIds.length > 0
                ? (selectedIds.length === 1
                    ? students.find(s => s.id === selectedIds[0])?.name + ' ' + (students.find(s => s.id === selectedIds[0])?.lastname || '')
                    : `${selectedIds.length} estudiantes seleccionados`)
                : 'Seleccionar estudiantes'}
                    </button>
                    <ul class="dropdown-menu w-100" style="max-height: 300px; overflow-y: auto;">
                        ${students.length === 0
                ? '<li><span class="dropdown-item-text text-muted">No students available</span></li>'
                : students.map(s => {
                    const value = s.id || '';
                    const label = `${s.name || ''} ${s.lastname || ''}`.trim() || value;
                    const checked = selectedIds.includes(value) ? 'checked' : '';
                    const inputId = `pild-${index}-${escapeHtml(value)}`;
                    return `
                                    <li class="dropdown-item-custom">
                                        <div class="form-check">
                                            <input class="form-check-input pildora-student-checkbox" 
                                                   type="checkbox" 
                                                   value="${escapeHtml(value)}" 
                                                   id="${inputId}" 
                                                   ${checked}
                                                   data-pildora-index="${index}">
                                            <label class="form-check-label" for="${inputId}">${escapeHtml(label)}</label>
                                        </div>
                                    </li>
                                `;
                }).join('')
            }
                    </ul>
                </div>
            </td>
            <td>
                <select class="form-select form-select-sm pildora-status pildora-status-${statusValue.toLowerCase().replace(' ', '-')}">
                    <option value=""></option>
                    <option value="Presentada" ${statusValue === 'Presentada' ? 'selected' : ''}>Presentada</option>
                    <option value="No presentada" ${statusValue === 'No presentada' ? 'selected' : ''}>No presentada</option>
                </select>
            </td>
            <td>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="deletePildoraRow(${index})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Apply color coding to select elements
    applyPildorasColorCoding();

    // Add event listeners for student checkboxes
    document.querySelectorAll('.pildora-student-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            updatePildoraStudentSelection(parseInt(this.dataset.pildoraIndex), this.value, this.checked);
        });
    });

    // Add event listeners for other fields to sync data locally
    document.querySelectorAll('.pildora-mode').forEach(select => {
        select.addEventListener('change', function () {
            const index = parseInt(this.closest('tr').dataset.index);
            updatePildoraField(index, 'mode', this.value);
            applyPildorasColorCoding();
        });
    });

    document.querySelectorAll('.pildora-date').forEach(input => {
        input.addEventListener('change', function () {
            const index = parseInt(this.closest('tr').dataset.index);
            updatePildoraField(index, 'date', this.value);
        });
        // Also sync on blur/input to be safe
        input.addEventListener('blur', function () {
            const index = parseInt(this.closest('tr').dataset.index);
            updatePildoraField(index, 'date', this.value);
        });
    });

    document.querySelectorAll('.pildora-title').forEach(input => {
        input.addEventListener('blur', function () {
            const index = parseInt(this.closest('tr').dataset.index);
            updatePildoraField(index, 'title', this.value);
        });
        input.addEventListener('input', function () {
            const index = parseInt(this.closest('tr').dataset.index);
            updatePildoraField(index, 'title', this.value);
        });
    });

    document.querySelectorAll('.pildora-status').forEach(select => {
        select.addEventListener('change', function () {
            const index = parseInt(this.closest('tr').dataset.index);
            updatePildoraField(index, 'status', this.value);
            applyPildorasColorCoding();
        });
    });
}

// Helper function to update other fields for píldoras
function updatePildoraField(pildoraIndex, field, value) {
    const currentModule = promotionModules[currentModuleIndex];
    if (!currentModule) return;

    const modulePildoras = extendedInfoData.modulesPildoras?.find(mp => mp.moduleId === currentModule.id);
    if (!modulePildoras || !modulePildoras.pildoras || !modulePildoras.pildoras[pildoraIndex]) return;

    modulePildoras.pildoras[pildoraIndex][field] = value;
    //console.log(`Updated píldora ${pildoraIndex} field ${field} to:`, value);
}

function applyPildorasColorCoding() {
    // Apply colors to mode selects
    document.querySelectorAll('.pildora-mode').forEach(select => {
        const value = select.value.toLowerCase();
        select.style.fontWeight = '600';

        if (value === 'presencial') {
            select.style.color = '#198754'; // Green
            select.style.backgroundColor = '#f8fff9';
        } else if (value === 'virtual') {
            select.style.color = '#0d6efd'; // Blue  
            select.style.backgroundColor = '#f8fafe';
        } else {
            select.style.color = '#6c757d'; // Gray
            select.style.backgroundColor = '#f8f9fa';
        }
    });

    // Apply colors to status selects
    document.querySelectorAll('.pildora-status').forEach(select => {
        const value = select.value.toLowerCase();
        select.style.fontWeight = '600';

        if (value === 'presentada') {
            select.style.color = '#198754'; // Green
            select.style.backgroundColor = '#f8fff9';
        } else if (value === 'no presentada') {
            select.style.color = '#dc3545'; // Red
            select.style.backgroundColor = '#fdf8f8';
        } else {
            select.style.color = '#6c757d'; // Gray
            select.style.backgroundColor = '#f8f9fa';
        }
    });
}

function addPildoraRow() {
    const currentModule = promotionModules[currentModuleIndex];
    if (!currentModule) {
        alert('No module selected');
        return;
    }

    // Initialize modulesPildoras if needed
    if (!extendedInfoData.modulesPildoras) {
        extendedInfoData.modulesPildoras = [];
    }

    // Find or create module píldoras entry
    let modulePildoras = extendedInfoData.modulesPildoras.find(mp => mp.moduleId === currentModule.id);
    if (!modulePildoras) {
        modulePildoras = {
            moduleId: currentModule.id,
            moduleName: currentModule.name,
            pildoras: []
        };
        extendedInfoData.modulesPildoras.push(modulePildoras);
    }

    // Add new píldora to current module with today's date as default
    const today = new Date().toISOString().split('T')[0];
    modulePildoras.pildoras.push({
        mode: 'Virtual',
        date: today,
        title: '',
        students: [],
        status: ''
    });

    displayPildoras();
}

function deletePildoraRow(index) {
    const currentModule = promotionModules[currentModuleIndex];
    if (!currentModule) return;

    const modulePildoras = extendedInfoData.modulesPildoras?.find(mp => mp.moduleId === currentModule.id);
    if (!modulePildoras || !modulePildoras.pildoras) return;

    if (index < 0 || index >= modulePildoras.pildoras.length) return;

    if (!confirm('Are you sure you want to delete this píldora?')) return;

    // Remove from local data
    modulePildoras.pildoras.splice(index, 1);

    // Save changes to server
    savePildorasToServer(currentModule);

    // Update display
    displayPildoras();
}

// Save píldoras changes to server
async function savePildorasToServer(module) {
    try {
        const modulePildoras = extendedInfoData.modulesPildoras?.find(mp => mp.moduleId === module.id);
        if (!modulePildoras) return;

        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No auth token found');
            return;
        }

        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/modules/${module.id}/pildoras`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                pildoras: modulePildoras.pildoras
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to save píldoras: ${response.statusText}`);
        }

        //console.log('Píldoras saved successfully');
    } catch (error) {
        console.error('Error saving píldoras:', error);
        alert('Error saving changes to server');
    }
}

// Update module navigation display
function updateModuleNavigation() {
    const moduleNameEl = document.getElementById('current-module-name');
    const prevBtn = document.getElementById('prev-module-btn');
    const nextBtn = document.getElementById('next-module-btn');
    const countEl = document.getElementById('module-pildoras-count');

    if (!moduleNameEl || !prevBtn || !nextBtn || !countEl) return;

    const currentModule = promotionModules[currentModuleIndex];
    if (!currentModule) return;

    // Update module name
    moduleNameEl.textContent = currentModule.name;

    // Update navigation buttons
    prevBtn.disabled = currentModuleIndex === 0;
    nextBtn.disabled = currentModuleIndex === promotionModules.length - 1;

    // Update píldoras count
    const modulePildoras = extendedInfoData.modulesPildoras?.find(mp => mp.moduleId === currentModule.id);
    const count = modulePildoras ? modulePildoras.pildoras.length : 0;
    countEl.textContent = count;
}

// Navigation functions
function navigateToPreviousModule() {
    if (currentModuleIndex > 0) {
        currentModuleIndex--;
        displayPildoras();
    }
}

function navigateToNextModule() {
    if (currentModuleIndex < promotionModules.length - 1) {
        currentModuleIndex++;
        displayPildoras();
    }
}

// Helper function to update student selection for píldoras
function updatePildoraStudentSelection(pildoraIndex, studentId, isChecked) {
    const currentModule = promotionModules[currentModuleIndex];
    if (!currentModule) return;

    const modulePildoras = extendedInfoData.modulesPildoras?.find(mp => mp.moduleId === currentModule.id);
    if (!modulePildoras || !modulePildoras.pildoras || !modulePildoras.pildoras[pildoraIndex]) return;

    const pildora = modulePildoras.pildoras[pildoraIndex];
    const students = window.currentStudents || [];

    if (!pildora.students) {
        pildora.students = [];
    }

    if (isChecked) {
        // Add student if not already present
        const student = students.find(s => s.id === studentId);
        if (student && !pildora.students.some(s => s.id === studentId)) {
            pildora.students.push({
                id: student.id,
                name: student.name,
                lastname: student.lastname
            });
        }
    } else {
        // Remove student
        pildora.students = pildora.students.filter(s => s.id !== studentId);
    }

    // Update dropdown button text
    const checkbox = document.querySelector(`input[data-pildora-index="${pildoraIndex}"][value="${studentId}"]`);
    if (checkbox) {
        const dropdown = checkbox.closest('.dropdown');
        const button = dropdown.querySelector('.dropdown-toggle');
        const selectedStudents = pildora.students || [];

        if (selectedStudents.length === 0) {
            button.textContent = 'Seleccionar estudiantes';
        } else if (selectedStudents.length === 1) {
            const student = selectedStudents[0];
            button.textContent = studentFullName(student);
        } else {
            button.textContent = `${selectedStudents.length} estudiantes seleccionados`;
        }
    }
}

function downloadPildorasExcelTemplate() {
    const headers = [
        'Presentación', 'Fecha', 'Píldora', 'Student', 'Estado'
    ];

    const hints = [
        'Virtual | Presencial',
        'YYYY-MM-DD',
        'Título de la píldora',
        'Nombre Apellido, Nombre2 Apellido2',
        'Pendiente | Completada | Cancelada'
    ];

    const escape = v => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [
        headers.map(escape).join(','),
        hints.map(escape).join(',')
    ];
    const csvContent = rows.join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla_importar_pildoras.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function importPildorasFromExcel(input) {
    const file = input.files && input.files[0];
    if (!file) return;

    const currentModule = promotionModules[currentModuleIndex];
    if (!currentModule) {
        alert('No module selected. Please select a module first.');
        input.value = '';
        return;
    }

    const formData = new FormData();
    formData.append('excelFile', file);

    const token = localStorage.getItem('token');
    if (!token) {
        alert('Authentication token not found. Please login again.');
        return;
    }

    // Show loading indicator
    const importBtn = document.getElementById('pildoras-import-excel-btn');
    const originalText = importBtn ? importBtn.innerHTML : '';
    if (importBtn) {
        importBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Importando...';
        importBtn.disabled = true;
    }

    // Use module-specific endpoint
    fetch(`${API_URL}/api/promotions/${promotionId}/modules/${currentModule.id}/pildoras/upload-excel`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(`Error importing Excel file: ${data.error}`);
            } else {
                alert(`Successfully imported ${data.pildoras.length} píldoras to module "${data.module.name}"`);

                // Update the current module's píldoras in our local data structure
                if (!extendedInfoData.modulesPildoras) {
                    extendedInfoData.modulesPildoras = [];
                }

                let modulePildoras = extendedInfoData.modulesPildoras.find(mp => mp.moduleId === currentModule.id);
                if (!modulePildoras) {
                    modulePildoras = {
                        moduleId: currentModule.id,
                        moduleName: currentModule.name,
                        pildoras: []
                    };
                    extendedInfoData.modulesPildoras.push(modulePildoras);
                }

                // Add imported píldoras to local data structure
                modulePildoras.pildoras.push(...data.pildoras);

                // Refresh the display
                displayPildoras();
            }
            input.value = ''; // Clear input
        })
        .catch(error => {
            console.error('Error importing Excel:', error);
            alert('Error importing Excel file');
            input.value = ''; // Clear input
        })
        .finally(() => {
            // Restore button text
            if (importBtn) {
                importBtn.innerHTML = originalText;
                importBtn.disabled = false;
            }
        });
}

async function openTeamModal() {
    document.getElementById('team-form').reset();
    document.getElementById('team-collab-preview').classList.add('d-none');

    // Populate collaborators dropdown (required — only collaborators can be added)

    const collabSelect = document.getElementById('team-from-collaborator');
    collabSelect.innerHTML = '<option value="">— Select a collaborator —</option>';
    collabSelect._collabData = {};

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/promotions/${promotionId}/collaborators`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const collaborators = await res.json();
            // Filter out collaborators already in the team
            const existingIds = new Set((extendedInfoData.team || []).map(m => m.collaboratorId).filter(Boolean));
            collaborators.forEach(c => {
                collabSelect._collabData[c.id] = c;
                const opt = document.createElement('option');
                opt.value = c.id;
                const role = c.userRole || 'Formador/a';
                opt.textContent = `${c.name} — ${role}`;
                if (existingIds.has(c.id)) {
                    opt.disabled = true;
                    opt.textContent += ' (already added)';
                }
                collabSelect.appendChild(opt);
            });
        }
    } catch (e) { /* silent */ }

    teamModal.show();
}

function fillTeamFromCollaborator() {
    const select = document.getElementById('team-from-collaborator');
    const collab = select._collabData && select._collabData[select.value];
    const preview = document.getElementById('team-collab-preview');

    if (!collab) {
        preview.classList.add('d-none');
        return;
    }

    // Show info preview card
    document.getElementById('team-preview-name').textContent = collab.name || '';
    document.getElementById('team-preview-email').textContent = collab.email || '';
    const roleBadge = document.getElementById('team-preview-role-badge');
    const roleColors = { 'Formador/a': 'bg-primary', 'CoFormador/a': 'bg-success', 'Coordinador/a': 'bg-warning text-dark' };
    const role = collab.userRole || 'Formador/a';
    roleBadge.className = `badge ${roleColors[role] || 'bg-secondary'}`;
    roleBadge.textContent = role;

    // Show assigned modules in preview if any
    const assignedModules = collab.moduleIds || [];
    if (assignedModules.length > 0) {
        const modNames = [];
        assignedModules.forEach(mid => {
            const found = (window.promotionModules || []).find(m => String(m.id) === String(mid));
            if (found) modNames.push(found.name);
        });
        const modulesText = modNames.length > 0 ? `Asignado a: ${modNames.join(', ')}` : '';
        const previewEmail = document.getElementById('team-preview-email');
        if (previewEmail) {
            previewEmail.innerHTML = `${escapeHtml(collab.email || '')}<br><span class="text-primary fw-bold" style="font-size:0.75rem;">${escapeHtml(modulesText)}</span>`;
        }
    }

    preview.classList.remove('d-none');
}

function addTeamMember() {
    const collabSelect = document.getElementById('team-from-collaborator');
    const collab = collabSelect._collabData && collabSelect._collabData[collabSelect.value];

    if (!collab) {
        alert('Please select a collaborator.');
        return;
    }

    // Check if already added
    const alreadyAdded = (extendedInfoData.team || []).some(m => m.collaboratorId === collab.id);
    if (alreadyAdded) {
        alert(`${collab.name} is already in the team.`);
        return;
    }

    const linkedin = document.getElementById('team-linkedin').value;

    const assignedModules = collab.moduleIds || [];
    let finalModuleIds = assignedModules;
    let finalModuleName = '';
    
    if (finalModuleIds.length > 0) {
        const modNames = [];
        finalModuleIds.forEach(mid => {
           const found = (window.promotionModules || []).find(m => String(m.id) === String(mid));
           if (found) modNames.push(found.name);
        });
        if (modNames.length > 0) {
            finalModuleName = modNames.join(', ');
        }
    }

    extendedInfoData.team.push({
        collaboratorId: collab.id,
        name: collab.name,
        role: collab.userRole || 'Formador/a',
        email: collab.email || '',
        linkedin,
        moduleIds: finalModuleIds,
        moduleName: finalModuleName
    });
    displayTeam();
    teamModal.hide();
}

function deleteTeamMember(index) {
    if (confirm('¿Eliminar este miembro del equipo?')) {
        extendedInfoData.team.splice(index, 1);
        displayTeam();
    }
}

function openEditTeamModal(index) {
    const member = (extendedInfoData.team || [])[index];
    if (!member) return;

    document.getElementById('edit-team-index').value = index;
    document.getElementById('edit-team-name').value = member.name || '';
    document.getElementById('edit-team-role').value = member.role || '';
    document.getElementById('edit-team-email').value = member.email || '';
    document.getElementById('edit-team-linkedin').value = member.linkedin || '';

    // Find assigned modules from central state (currentPromotion)
    let moduleIds = [];
    const promo = window.currentPromotion || {};
    const isOwner = promo.teacherId === member.collaboratorId;
    
    if (isOwner) {
        moduleIds = promo.ownerModules || [];
    } else {
        const entry = (promo.collaboratorModules || []).find(m => m.teacherId === member.collaboratorId);
        moduleIds = entry ? (entry.moduleIds || []) : [];
    }

    // Populate read-only list
    const modules = window.promotionModules || [];
    const displayList = document.getElementById('edit-team-module-list');
    displayList.innerHTML = '';
    
    if (moduleIds.length === 0) {
        displayList.innerHTML = '<span class="text-muted small">Sin módulos asignados.</span>';
    } else {
        moduleIds.forEach(mid => {
            const found = modules.find(m => String(m.id) === String(mid));
            if (found) {
                const badge = document.createElement('span');
                badge.className = 'badge bg-light text-dark border me-1';
                badge.textContent = found.name;
                displayList.appendChild(badge);
            }
        });
    }

    editTeamModal.show();
}

function updateTeamMember() {
    const index = parseInt(document.getElementById('edit-team-index').value);
    if (isNaN(index)) return;

    const member = extendedInfoData.team[index];
    if (!member) return;

    // We no longer get modules from here, they are automatic reflections of collaborators tab
    member.linkedin = document.getElementById('edit-team-linkedin').value.trim();

    displayTeam();
    editTeamModal.hide();
}

// ── Resource Catalog (evaluation.coderf5.es/v1/resources — via local proxy) ──

let _resourceCatalogAll = [];   // full list fetched from API
let _resourceCatalogFiltered = [];

async function openResourceModal() {
    resourceModal.show();

    const grid = document.getElementById('resource-catalog-grid');
    const loading = document.getElementById('resource-catalog-loading');
    const emptyEl = document.getElementById('resource-catalog-empty');
    const countEl = document.getElementById('resource-catalog-count');

    // Reset inputs
    document.getElementById('resource-search-input').value = '';
    document.getElementById('resource-area-filter').value = '';
    document.getElementById('resource-type-filter').value = '';

    // If we already have the catalog cached, just re-render
    if (_resourceCatalogAll.length) {
        _buildResourceFilterOptions();
        _resourceCatalogFiltered = [..._resourceCatalogAll];
        _renderResourceCatalog();
        return;
    }

    // Show loading state
    grid.innerHTML = '';
    emptyEl.classList.add('d-none');
    loading.classList.remove('d-none');
    countEl.textContent = '…';

    try {
        const token = localStorage.getItem('token');
        // Use the local backend proxy which forwards the JWT to evaluation.coderf5.es
        const res = await fetch(`${API_URL}/api/resources`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        // Backend returns { count, results } (paginated DRF) or a plain array
        _resourceCatalogAll = Array.isArray(data) ? data : (data.results || []);
    } catch (err) {
        console.error('[ResourceCatalog] Error fetching:', err);
        loading.classList.add('d-none');
        grid.innerHTML = `<div class="alert alert-danger m-3">
            <i class="bi bi-exclamation-triangle me-2"></i>
            No se pudo cargar el catálogo de recursos. Comprueba la conexión e inténtalo de nuevo.
        </div>`;
        countEl.textContent = 'Error';
        return;
    }

    loading.classList.add('d-none');
    _buildResourceFilterOptions();
    _resourceCatalogFiltered = [..._resourceCatalogAll];
    _renderResourceCatalog();
}

/** Populate Area and Type <select> options from the fetched catalog */
function _buildResourceFilterOptions() {
    const areaSelect = document.getElementById('resource-area-filter');
    const typeSelect = document.getElementById('resource-type-filter');

    // Collect unique areas + types
    const areasMap = new Map();
    const typesMap = new Map();

    _resourceCatalogAll.forEach(r => {
        (r.areas || []).forEach(a => { if (!areasMap.has(a.id)) areasMap.set(a.id, a.name); });
        (r.types || []).forEach(t => { if (!typesMap.has(t.id)) typesMap.set(t.id, t.name); });
    });

    const makeOptions = (map) => [...map.entries()]
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([id, name]) => `<option value="${id}">${escapeHtml(name)}</option>`)
        .join('');

    areaSelect.innerHTML = '<option value="">Todas las áreas</option>' + makeOptions(areasMap);
    typeSelect.innerHTML = '<option value="">Todos los tipos</option>' + makeOptions(typesMap);
}

/** Filter the catalog list and re-render */
function filterResourceCatalog() {
    const query = (document.getElementById('resource-search-input').value || '').toLowerCase().trim();
    const areaId = document.getElementById('resource-area-filter').value;
    const typeId = document.getElementById('resource-type-filter').value;

    _resourceCatalogFiltered = _resourceCatalogAll.filter(r => {
        // Area filter
        if (areaId && !(r.areas || []).some(a => String(a.id) === String(areaId))) return false;
        // Type filter
        if (typeId && !(r.types || []).some(t => String(t.id) === String(typeId))) return false;
        // Text search across label, comments, tools, providers
        if (query) {
            const searchable = [
                r.label || '',
                r.comments || '',
                ...(r.tools || []).map(t => t.name),
                ...(r.providers || []).map(p => p.name),
                ...(r.areas || []).map(a => a.name)
            ].join(' ').toLowerCase();
            if (!searchable.includes(query)) return false;
        }
        return true;
    });

    _renderResourceCatalog();
}

/** Render the filtered resource cards inside the grid */
function _renderResourceCatalog() {
    const grid = document.getElementById('resource-catalog-grid');
    const emptyEl = document.getElementById('resource-catalog-empty');
    const countEl = document.getElementById('resource-catalog-count');

    // Check which resources are already added
    const addedIds = new Set((extendedInfoData.resources || []).map(r => r.externalId).filter(Boolean));

    countEl.textContent = `${_resourceCatalogFiltered.length} recurso${_resourceCatalogFiltered.length !== 1 ? 's' : ''}`;

    if (!_resourceCatalogFiltered.length) {
        grid.innerHTML = '';
        emptyEl.classList.remove('d-none');
        return;
    }

    emptyEl.classList.add('d-none');

    grid.innerHTML = `<div class="row g-3">
        ${_resourceCatalogFiltered.map(r => _resourceCardHtml(r, addedIds.has(r.id))).join('')}
    </div>`;
}

/** Build the HTML for a single resource card */
function _resourceCardHtml(r, alreadyAdded) {
    const typeNames = (r.types || []).map(t => `<span class="badge bg-primary-subtle text-primary border border-primary-subtle">${escapeHtml(t.name)}</span>`).join(' ');
    const areaBadges = (r.areas || []).slice(0, 3).map(a =>
        `<span class="badge bg-light text-dark border small">${escapeHtml(a.name)}</span>`).join(' ');
    const toolBadges = (r.tools || []).slice(0, 4).map(t =>
        `<span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle small">${escapeHtml(t.name)}</span>`).join(' ');
    const provider = (r.providers || [])[0];
    const providerHtml = provider
        ? `<span class="text-muted small"><i class="bi bi-building me-1"></i>${escapeHtml(provider.name)}</span>`
        : '';

    // Show first ~100 chars of comments (before the first '|')
    const commentShort = (r.comments || '').split('|')[0].trim();

    const btnHtml = alreadyAdded
        ? `<button class="btn btn-sm btn-outline-danger w-100" onclick="removeResourceFromCatalog(${r.id})">
               <i class="bi bi-dash-circle me-1"></i>Quitar
           </button>`
        : `<button class="btn btn-sm btn-primary w-100" onclick="addResourceFromCatalog(${r.id})">
               <i class="bi bi-plus-circle me-1"></i>Agregar
           </button>`;

    return `
    <div class="col-md-6 col-xl-4" id="resource-card-${r.id}">
        <div class="card h-100 border shadow-sm resource-catalog-card" style="border-radius:.75rem;transition:box-shadow .15s;">
            <div class="card-body d-flex flex-column gap-2 pb-2">
                <div class="d-flex align-items-start justify-content-between gap-2">
                    <h6 class="mb-0 fw-semibold lh-sm" style="font-size:.9rem;">
                        <a href="${escapeHtml(r.url)}" target="_blank" rel="noopener" class="text-decoration-none text-dark stretched-link-sibling">
                            ${escapeHtml(r.label)}
                        </a>
                    </h6>
                    <a href="${escapeHtml(r.url)}" target="_blank" rel="noopener" class="text-muted flex-shrink-0" title="Abrir enlace">
                        <i class="bi bi-box-arrow-up-right"></i>
                    </a>
                </div>
                <div class="d-flex flex-wrap gap-1">${typeNames}</div>
                ${commentShort ? `<p class="text-muted small mb-0 flex-grow-1" style="font-size:.78rem;line-height:1.4;">${escapeHtml(commentShort)}</p>` : ''}
                <div class="d-flex flex-wrap gap-1 mt-1">${areaBadges}</div>
                ${toolBadges ? `<div class="d-flex flex-wrap gap-1">${toolBadges}</div>` : ''}
                ${providerHtml}
            </div>
            <div class="card-footer bg-transparent pt-0 pb-2 px-3">${btnHtml}</div>
        </div>
    </div>`;
}

/** Called when user clicks "Agregar" on a catalog card */
function addResourceFromCatalog(resourceId) {
    const r = _resourceCatalogAll.find(x => x.id === resourceId);
    if (!r) return;

    // Build a resource entry compatible with the existing extendedInfoData.resources shape
    const type = (r.types || [])[0];
    const entry = {
        externalId: r.id,
        title: r.label,
        category: type ? type.name : 'Other',
        url: r.url,
        comments: r.comments || '',
        areas: (r.areas || []).map(a => ({ id: a.id, name: a.name })),
        tools: (r.tools || []).map(t => ({ id: t.id, name: t.name })),
        types: (r.types || []).map(t => ({ id: t.id, name: t.name })),
        providers: (r.providers || []).map(p => ({ id: p.id, name: p.name }))
    };

    extendedInfoData.resources.push(entry);
    displayResources();

    // Update the card button to "Quitar" without re-rendering the whole grid
    const card = document.getElementById(`resource-card-${resourceId}`);
    if (card) {
        const footer = card.querySelector('.card-footer');
        if (footer) {
            footer.innerHTML = `<button class="btn btn-sm btn-outline-danger w-100" onclick="removeResourceFromCatalog(${resourceId})">
                <i class="bi bi-dash-circle me-1"></i>Quitar
            </button>`;
        }
    }
}

/** Called when user clicks "Quitar" on a catalog card */
function removeResourceFromCatalog(resourceId) {
    const rIndex = extendedInfoData.resources.findIndex(res => res.externalId === resourceId);
    if (rIndex === -1) return;

    extendedInfoData.resources.splice(rIndex, 1);
    displayResources();

    // Update the card button back to "Agregar"
    const card = document.getElementById(`resource-card-${resourceId}`);
    if (card) {
        const footer = card.querySelector('.card-footer');
        if (footer) {
            footer.innerHTML = `<button class="btn btn-sm btn-primary w-100" onclick="addResourceFromCatalog(${resourceId})">
                <i class="bi bi-plus-circle me-1"></i>Agregar
            </button>`;
        }
    }
}

// Legacy stub kept so any lingering calls don't crash
function addResource() { /* replaced by addResourceFromCatalog */ }

function deleteResource(index) {
    if (confirm('¿Eliminar este recurso?')) {
        extendedInfoData.resources.splice(index, 1);
        displayResources();
        // Invalidate catalog rendering so that "Ya agregado" state refreshes on next open
        if (_resourceCatalogAll.length) _renderResourceCatalog();
    }
}

let employabilityModal;
let currentEditingEmployabilityIndex = -1;

function initEmployabilityModal() {
    const modalEl = document.getElementById('employabilityModal');
    if (modalEl) {
        employabilityModal = new bootstrap.Modal(modalEl);
    }
}

function openEmployabilityModal() {
    if (!employabilityModal) initEmployabilityModal();
    document.getElementById('employability-form').reset();
    document.getElementById('employabilityModalTitle').textContent = 'Add Employability Session';
    currentEditingEmployabilityIndex = -1;
    employabilityModal.show();
}

function editEmployabilityItem(index) {
    if (!employabilityModal) initEmployabilityModal();

    const promotion = window.currentPromotion;
    if (!promotion || !promotion.employability) {
        console.error('editEmployabilityItem: window.currentPromotion not loaded yet');
        return;
    }
    const item = promotion.employability[index];

    if (!item) {
        alert('Item not found');
        return;
    }

    document.getElementById('employability-name').value = item.name || '';
    document.getElementById('employability-url').value = item.url || '';
    document.getElementById('employability-start-month').value = item.startMonth || 1;
    document.getElementById('employability-duration').value = item.duration || 1;
    document.getElementById('employabilityModalTitle').textContent = 'Edit Employability Session';

    currentEditingEmployabilityIndex = index;
    employabilityModal.show();
}

async function saveEmployabilityItem() {
    const token = localStorage.getItem('token');
    const name = document.getElementById('employability-name').value;
    const url = document.getElementById('employability-url').value;
    const startMonth = parseInt(document.getElementById('employability-start-month').value) || 1;
    const duration = parseInt(document.getElementById('employability-duration').value) || 1;

    if (!name) {
        alert('Item name is required');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            alert('Error loading promotion');
            return;
        }

        const promotion = await response.json();

        if (!promotion.employability) {
            promotion.employability = [];
        }

        const item = { name, url, startMonth, duration };

        if (currentEditingEmployabilityIndex >= 0) {
            // Update existing
            promotion.employability[currentEditingEmployabilityIndex] = item;
        } else {
            // Add new
            promotion.employability.push(item);
        }

        const updateResponse = await fetch(`${API_URL}/api/promotions/${promotionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(promotion)
        });

        if (updateResponse.ok) {
            employabilityModal.hide();
            loadModules();
        } else {
            alert('Error saving employability item');
        }
    } catch (error) {
        console.error('Error saving employability item:', error);
        alert('Error saving employability item');
    }
}

async function deleteEmployabilityItem(index) {
    if (!confirm('Delete this employability item?')) return;

    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            alert('Error loading promotion');
            return;
        }

        const promotion = await response.json();

        if (promotion.employability && promotion.employability[index]) {
            promotion.employability.splice(index, 1);

            const updateResponse = await fetch(`${API_URL}/api/promotions/${promotionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(promotion)
            });

            if (updateResponse.ok) {
                loadModules();
            } else {
                alert('Error deleting employability item');
            }
        }
    } catch (error) {
        console.error('Error deleting employability item:', error);
        alert('Error deleting employability item');
    }
}

async function saveExtendedInfo() {
    const token = localStorage.getItem('token');

    // Gather Schedule Data
    const schedule = {
        online: {
            entry: document.getElementById('sched-online-entry').value,
            start: document.getElementById('sched-online-start').value,
            break: document.getElementById('sched-online-break').value,
            lunch: document.getElementById('sched-online-lunch').value,
            finish: document.getElementById('sched-online-finish').value
        },
        presential: {
            entry: document.getElementById('sched-presential-entry').value,
            start: document.getElementById('sched-presential-start').value,
            break: document.getElementById('sched-presential-break').value,
            lunch: document.getElementById('sched-presential-lunch').value,
            finish: document.getElementById('sched-presential-finish').value
        },
        notes: document.getElementById('sched-notes').value
    };

    const pildorasRows = document.querySelectorAll('#pildoras-list-body tr');

    // Collect current module píldoras from the displayed rows
    const currentModule = promotionModules[currentModuleIndex];
    if (currentModule && pildorasRows.length > 0) {
        const currentModulePildoras = [];
        const students = window.currentStudents || [];

        pildorasRows.forEach(row => {
            const modeEl = row.querySelector('.pildora-mode');
            const dateEl = row.querySelector('.pildora-date');
            const titleEl = row.querySelector('.pildora-title');
            const statusEl = row.querySelector('.pildora-status');
            const dropdown = row.querySelector('.pildora-students-dropdown');

            if (!modeEl || !dateEl || !titleEl || !statusEl || !dropdown) return;

            const mode = modeEl.value || '';
            const date = dateEl.value || '';
            const title = titleEl.value || '';
            const status = statusEl.value || '';

            // Get selected students from checkboxes in dropdown
            const selectedIds = Array.from(dropdown.querySelectorAll('input[type="checkbox"]:checked'))
                .map(input => input.value)
                .filter(Boolean);
            const studentsForPildora = selectedIds.map(id => {
                const s = students.find(st => st.id === id);
                return {
                    id,
                    name: s ? (s.name || '') : '',
                    lastname: s ? (s.lastname || '') : ''
                };
            });

            // Only add if there's actual content
            if (mode || date || title || status || studentsForPildora.length > 0) {
                currentModulePildoras.push({
                    mode,
                    date,
                    title,
                    students: studentsForPildora,
                    status
                });
            }
        });

        // Update the current module's píldoras in the data structure
        let modulePildoras = extendedInfoData.modulesPildoras?.find(mp => mp.moduleId === currentModule.id);
        if (!modulePildoras) {
            if (!extendedInfoData.modulesPildoras) {
                extendedInfoData.modulesPildoras = [];
            }
            modulePildoras = {
                moduleId: currentModule.id,
                moduleName: currentModule.name,
                pildoras: []
            };
            extendedInfoData.modulesPildoras.push(modulePildoras);
        }
        modulePildoras.pildoras = currentModulePildoras;
    }

    // Gather Evaluation
    const evaluation = document.getElementById('evaluation-text').value;

    // Note: Acta de Inicio fields are saved separately via saveActaData() from the modal.
    // extendedInfoData already holds them from the last load or saveActaData() call.

    // Update global object
    extendedInfoData.schedule = schedule;
    extendedInfoData.evaluation = evaluation;

    // Gather Competencias — now aggregated from per-project definitions (in evaluation tab)
    // If there are no project-competences yet, fall back to ProgramCompetences for backward compat
    if (window._evalState && window._evalState.projectCompetences && window._evalState.projectCompetences.length) {
        // Re-aggregate and save (honors any manual edits since last save)
        const catalog = window._evalState.catalog || window._extendedInfoCompetences || [];
        const compMap = new Map();
        window._evalState.projectCompetences.forEach(pc => {
            (pc.competenceIds || []).forEach(cid => {
                const cidStr = String(cid);
                const catalogEntry = catalog.find(c => String(c.id) === cidStr);
                if (!catalogEntry) return;
                if (!compMap.has(cidStr)) compMap.set(cidStr, { ...catalogEntry, selectedTools: new Set() });
                ((pc.competenceTools && pc.competenceTools[cidStr]) || []).forEach(t => compMap.get(cidStr).selectedTools.add(t));
            });
        });
        extendedInfoData.competences = [...compMap.values()].map(c => ({
            id: c.id, name: c.name, area: c.area, description: c.description || '',
            levels: c.levels || [], allTools: c.allTools || [],
            selectedTools: [...c.selectedTools],
            toolsWithIndicators: c.toolsWithIndicators || [],
            competenceIndicators: c.competenceIndicators || { initial: [], medio: [], advance: [] },
            evalModules: []
        }));
    } else if (window.ProgramCompetences) {
        // Legacy fallback: if competences were defined in program tab
        const freshComps = window.ProgramCompetences.getCompetences();
        if (freshComps && freshComps.length > 0) {
            extendedInfoData.competences = freshComps;
        }
    }
    const badge = document.getElementById('competences-unsaved-badge');
    if (badge) badge.classList.add('d-none');

    // Keep legacy pildoras for backward compatibility (flatten all module pildoras)
    const allPildoras = [];
    if (extendedInfoData.modulesPildoras) {
        extendedInfoData.modulesPildoras.forEach(mp => {
            if (mp.pildoras) {
                allPildoras.push(...mp.pildoras);
            }
        });
    }
    extendedInfoData.pildoras = allPildoras;
    
    // ── Sync Virtual Classroom state ──────────────────────────────────────────
    // Ensure we don't overwrite the virtualClassroom with stale data if it was updated in its own tab
    const vcSelectEl = document.getElementById('vc-project-select');
    const vcStatusBadge = document.getElementById('vc-status-badge');
    if (vcSelectEl && vcStatusBadge) {
        const val = vcSelectEl.value;
        const [vMid, vPname] = val ? val.split('__') : ['', ''];
        const vRepo = document.getElementById('vc-repo-base')?.value || '';
        const vBrief = document.getElementById('vc-briefing-url')?.value || '';
        const vActive = vcStatusBadge.classList.contains('bg-success');
        
        // Find project type for the selected project
        const savedEvaluations = window._evalState?.savedEvaluations || [];
        const existingEval = savedEvaluations.find(e => e.moduleId === vMid && e.projectName === vPname);
        const vType = existingEval ? (existingEval.type || 'individual') : 'individual';

        extendedInfoData.virtualClassroom = {
            isActive: vActive,
            moduleId: vMid,
            projectName: vPname,
            projectType: vType,
            repoBaseUrl: vRepo,
            briefingUrl: vBrief
        };
    } else if (window._evalState && window._evalState.virtualClassroom) {
        // Fallback to memory state if DOM is not present 
        extendedInfoData.virtualClassroom = window._evalState.virtualClassroom;
    }

    //console.log('Saving extended info for promotion:', promotionId);
    //console.log('Data to save:', extendedInfoData);

    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/extended-info`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(extendedInfoData)
        });

        //console.log('Save response status:', response.status);

        if (response.ok) {
            const savedData = await response.json();
            //console.log('Data saved successfully:', savedData);

            // ── Auto-sync competences → roadmap module projects ───────────────
            if (window.ProgramCompetences && window.ProgramCompetences.getEvalModulesSyncData) {
                try {
                    await _syncCompetencesToRoadmap();
                } catch (syncErr) {
                    console.error('[saveExtendedInfo] Error syncing competences to roadmap:', syncErr);
                }
            }

            location.reload();
        } else {
            try {
                const errorData = await response.json();
                console.error('Save error:', errorData);
                alert(`Failed to save info: ${response.status} - ${errorData.error || 'Unknown error'}`);
            } catch {
                alert(`Failed to save info: ${response.status} ${response.statusText}`);
            }
        }
    } catch (error) {
        console.error('Error saving info:', error);
        alert(`Error saving info: ${error.message}`);
    }
}

/**
 * Auto-syncs program competences to roadmap module projects.
 * For each competence that has evalModules defined, adds that competence's id
 * to the competenceIds of ALL projects inside those modules.
 * Competences NOT assigned to a module are ignored (not removed from projects they may already have).
 */
async function _syncCompetencesToRoadmap() {
    const token = localStorage.getItem('token');
    const syncData = window.ProgramCompetences.getEvalModulesSyncData(); // [{moduleId, competenceId}]
    if (!syncData.length) return;

    // Fetch current promotion data
    const res = await fetch(`${API_URL}/api/promotions/${promotionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return;
    const promotion = await res.json();
    const modules = promotion.modules || [];

    // Build a map: moduleId → Set of competenceIds to add
    const moduleCompMap = {};
    syncData.forEach(({ moduleId, competenceId }) => {
        if (!moduleCompMap[moduleId]) moduleCompMap[moduleId] = new Set();
        moduleCompMap[moduleId].add(String(competenceId));
    });

    let changed = false;
    modules.forEach(mod => {
        const key = String(mod.id || '');
        const toAdd = moduleCompMap[key];
        if (!toAdd || !toAdd.size) return;
        (mod.projects || []).forEach(proj => {
            if (!proj.competenceIds) proj.competenceIds = [];
            toAdd.forEach(cid => {
                if (!proj.competenceIds.map(String).includes(cid)) {
                    proj.competenceIds.push(cid);
                    changed = true;
                }
            });
        });
    });

    if (!changed) return;

    await fetch(`${API_URL}/api/promotions/${promotionId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ modules })
    });
    //console.log('[Sync] Competencias sincronizadas al roadmap correctamente.');
}

// ── Acta de Inicio modal ─────────────────────────────────────────────────────

const WEEKDAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes'];
// Map each weekday to its checkbox id suffix (avoids issues with accented chars in substring)
const WEEKDAY_IDS = { 'lunes': 'lun', 'martes': 'mar', 'miércoles': 'mie', 'jueves': 'jue', 'viernes': 'vie' };

/** Build a weekday <select> with given id and optional selected value */
function _actaDaySelect(id, selected) {
    const opts = WEEKDAYS.map(d =>
        `<option value="${d}"${d === selected ? ' selected' : ''}>${d.charAt(0).toUpperCase() + d.slice(1)}</option>`
    ).join('');
    return `<select class="form-select form-select-sm" id="${id}" style="min-width:130px;">${opts}</select>`;
}

/** Re-render the KPI textareas per funder */
function actaRenderFunderKpis() {
    const container = document.getElementById('acta-funder-kpis-container');
    const emptyMsg = document.getElementById('acta-funder-kpis-empty');
    const tags = document.querySelectorAll('#acta-funders-tags .acta-tag');
    const funders = Array.from(tags).map(t => t.dataset.value);

    if (!funders.length) {
        container.innerHTML = '';
        if (emptyMsg) emptyMsg.style.display = '';
        return;
    }
    if (emptyMsg) emptyMsg.style.display = 'none';

    // Keep existing text so editing isn't lost
    const existing = {};
    container.querySelectorAll('textarea[data-funder]').forEach(ta => {
        existing[ta.dataset.funder] = ta.value;
    });

    container.innerHTML = funders.map(f => `
        <div class="mb-2">
            <label class="form-label fw-semibold small text-secondary">${f}</label>
            <textarea class="form-control form-control-sm" data-funder="${f}" rows="2"
                placeholder="KPIs para ${f}">${existing[f] || ''}</textarea>
        </div>`).join('');
}

/** Add a funder tag */
function actaAddFunder(value) {
    const input = document.getElementById('acta-funder-input');
    const val = (value || input.value).trim();
    if (!val) return;

    // Check uniqueness
    const existing = Array.from(document.querySelectorAll('#acta-funders-tags .acta-tag'))
        .map(t => t.dataset.value);
    if (existing.includes(val)) { if (!value) { input.value = ''; } return; }

    const tag = document.createElement('span');
    tag.className = 'acta-tag';
    tag.dataset.value = val;
    tag.innerHTML = `${val} <span class="rm" onclick="this.parentElement.remove(); actaRenderFunderKpis()">×</span>`;
    document.getElementById('acta-funders-tags').appendChild(tag);
    if (!value) input.value = '';
    actaRenderFunderKpis();
}

/** Add a day-off row (trainer or cotrainer) */
function actaAddDayOffRow(type, moduleName, dayValue) {
    const container = document.getElementById(`acta-${type}-dayoff-rows`);
    const rowId = `dayoff-${type}-${Date.now()}`;
    const div = document.createElement('div');
    div.className = 'acta-dayoff-row';
    div.innerHTML = `
        <input type="text" class="form-control form-control-sm" placeholder="Buscar persona..." list="acta-users-datalist" value="${moduleName || ''}">
        ${_actaDaySelect(`${rowId}-day`, dayValue || 'lunes')}
        <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.parentElement.remove()">
            <i class="bi bi-trash"></i>
        </button>`;
    container.appendChild(div);
}

/** Serialize day-off rows into a string */
function _actaReadDayOffRows(type) {
    const rows = document.querySelectorAll(`#acta-${type}-dayoff-rows .acta-dayoff-row`);
    return Array.from(rows).map(row => {
        const name = row.querySelector('input[type=text]')?.value.trim() || '';
        const day = row.querySelector('select')?.value || '';
        return name ? `${name} (${day})` : day;
    }).filter(Boolean).join('. ');
}

/** Parse a stored day-off string back into rows */
function _actaPopulateDayOffRows(type, stored) {
    const container = document.getElementById(`acta-${type}-dayoff-rows`);
    container.innerHTML = '';
    if (!stored) return;
    // format: "Módulo 1. Nombre (día). Módulo 2. ..."
    // Split by '. ' but keep content between parens
    const parts = stored.split(/\.\s+(?=[A-ZÁÉÍÓÚÑ])/);
    parts.forEach(part => {
        const m = part.match(/^(.*?)\s*\((\w+)\)\s*\.?$/);
        if (m) {
            actaAddDayOffRow(type, m[1].trim(), m[2].toLowerCase());
        } else if (part.trim()) {
            actaAddDayOffRow(type, part.trim(), 'lunes');
        }
    });
    if (!container.children.length) actaAddDayOffRow(type);
}

/** Get today's date as YYYY-MM-DD for date input min */
function _actaToday() {
    return new Date().toISOString().split('T')[0];
}

function openActaModal() {
    const d = extendedInfoData;

    // Simple fields
    document.getElementById('acta-school').value = d.school || '';
    document.getElementById('acta-project-type').value = d.projectType || 'Bootcamp';
    document.getElementById('acta-total-hours').value = d.totalHours || '';
    document.getElementById('acta-modality').value = d.modality || '';
    document.getElementById('acta-materials').value = d.materials || 'No son necesarios recursos adicionales.';
    document.getElementById('acta-funder-deadlines').value = d.funderDeadlines || '';
    document.getElementById('acta-okr-kpis').value = d.okrKpis ||
        'PIPO3.R1 Satisfacción 4,2/5 de coders sobre la excelencia del equipo formativo de la formación\nISEC2.R1 Jornadas de selección con un 40% de personas participantes con el proceso 100% finalizado.\nISEC3.R2 Resultado 78% salida positiva.\nISECR2 Finalizar cada programa con un máximo de bajas de 10%.';
    document.getElementById('acta-project-meetings').value = d.projectMeetings || 'Ver el calendario de reuniones en Asana.';

    // Date inputs
    const today = _actaToday();
    const startEl = document.getElementById('acta-positive-exit-start');
    const endEl = document.getElementById('acta-positive-exit-end');
    startEl.min = today;
    endEl.min = today;
    // stored as YYYY-MM-DD or human string — if it looks like a date input value use it, else keep blank
    startEl.value = /^\d{4}-\d{2}-\d{2}$/.test(d.positiveExitStart) ? d.positiveExitStart : '';
    endEl.value = /^\d{4}-\d{2}-\d{2}$/.test(d.positiveExitEnd) ? d.positiveExitEnd : '';

    // Presential days checkboxes
    const storedDays = (d.presentialDays || '').toLowerCase();
    WEEKDAYS.forEach(day => {
        const cb = document.getElementById(`pd-${WEEKDAY_IDS[day]}`);
        if (cb) cb.checked = storedDays.includes(day);
    });

    // Presential location — extract from stored string if possible
    const locationSelect = document.getElementById('acta-presential-location');
    const locations = Array.from(locationSelect.options).map(o => o.value).filter(Boolean);
    const matchedLoc = locations.find(l => (d.presentialDays || '').includes(l));
    locationSelect.value = matchedLoc || '';

    // Internships
    const inEl = document.getElementById('acta-internships');
    inEl.value = d.internships === true ? 'true' : d.internships === false ? 'false' : '';

    // Funders tags — clear and re-add
    document.getElementById('acta-funders-tags').innerHTML = '';
    const storedFunders = (d.funders || 'SAGE.\nJP Morgan.\nEn colaboración con Microsoft y Somos F5.');
    storedFunders.split('\n').map(f => f.trim()).filter(Boolean).forEach(f => actaAddFunder(f));

    // Funder KPIs — populate after funders rendered
    const storedKpis = d.funderKpis || '';
    // Parse format: "Financiador: kpi text\n---\n..."
    setTimeout(() => {
        const kpiBlocks = storedKpis.split(/\n---\n/);
        kpiBlocks.forEach(block => {
            const m = block.match(/^([^:]+):\s*([\s\S]*)$/);
            if (m) {
                const ta = document.querySelector(`#acta-funder-kpis-container textarea[data-funder="${m[1].trim()}"]`);
                if (ta) ta.value = m[2].trim();
            }
        });
    }, 50);

    // Populate users datalist from team members
    const datalist = document.getElementById('acta-users-datalist');
    if (datalist) {
        const teamMembers = extendedInfoData.team || [];
        datalist.innerHTML = teamMembers.map(m => {
            const label = m.role ? `${m.name} (${m.role})` : m.name;
            return `<option value="${label}">`;
        }).join('');
    }

    // Day-off rows
    _actaPopulateDayOffRows('trainer', d.trainerDayOff || '');
    _actaPopulateDayOffRows('cotrainer', d.cotrainerDayOff || '');
    if (!document.querySelector('#acta-trainer-dayoff-rows .acta-dayoff-row')) actaAddDayOffRow('trainer');
    if (!document.querySelector('#acta-cotrainer-dayoff-rows .acta-dayoff-row')) actaAddDayOffRow('cotrainer');

    // Team meeting
    const tmParts = (d.teamMeetings || 'Semanal - jueves (14:30-15:00)').match(/(\w+)\s*\((\d{2}:\d{2})-(\d{2}:\d{2})\)/i);
    if (tmParts) {
        const dayEl = document.getElementById('acta-team-meeting-day');
        const day = tmParts[1].toLowerCase();
        if (WEEKDAYS.includes(day)) dayEl.value = day;
        document.getElementById('acta-team-meeting-start').value = tmParts[2];
        document.getElementById('acta-team-meeting-end').value = tmParts[3];
    }

    // Approval fields
    document.getElementById('acta-approval-name').value = d.approvalName || '';
    document.getElementById('acta-approval-role').value = d.approvalRole || '';

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('actaInicioModal'));
    modal.show();
}

// (funder Enter key is wired inside the main DOMContentLoaded block)

async function saveActaData() {
    const token = localStorage.getItem('token');

    // Simple fields
    extendedInfoData.school = document.getElementById('acta-school').value;
    extendedInfoData.projectType = document.getElementById('acta-project-type').value;
    extendedInfoData.materials = document.getElementById('acta-materials').value;
    extendedInfoData.funderDeadlines = document.getElementById('acta-funder-deadlines').value;
    extendedInfoData.okrKpis = document.getElementById('acta-okr-kpis').value;
    extendedInfoData.projectMeetings = document.getElementById('acta-project-meetings').value;
    extendedInfoData.totalHours = document.getElementById('acta-total-hours').value;
    extendedInfoData.modality = document.getElementById('acta-modality').value;

    // Internships
    const inRaw = document.getElementById('acta-internships').value;
    extendedInfoData.internships = inRaw === 'true' ? true : inRaw === 'false' ? false : null;

    // Dates (stored as YYYY-MM-DD)
    extendedInfoData.positiveExitStart = document.getElementById('acta-positive-exit-start').value;
    extendedInfoData.positiveExitEnd = document.getElementById('acta-positive-exit-end').value;

    // Presential days + location
    const checkedDays = WEEKDAYS.filter(day => {
        const cb = document.getElementById(`pd-${WEEKDAY_IDS[day]}`);
        return cb && cb.checked;
    });
    const location = document.getElementById('acta-presential-location').value;
    const dayCount = checkedDays.length;
    extendedInfoData.presentialDays = dayCount
        ? `${dayCount} día${dayCount > 1 ? 's' : ''}, ${checkedDays.join(' y ')}${location ? ', ' + location : ''}`
        : (location || '');

    // Funders (unique tags → newline-separated)
    const funderTags = Array.from(document.querySelectorAll('#acta-funders-tags .acta-tag'))
        .map(t => t.dataset.value);
    extendedInfoData.funders = funderTags.join('\n');

    // Funder KPIs (format: "Funder: kpi\n---\nFunder2: kpi2")
    const kpiBlocks = [];
    document.querySelectorAll('#acta-funder-kpis-container textarea[data-funder]').forEach(ta => {
        if (ta.value.trim()) kpiBlocks.push(`${ta.dataset.funder}: ${ta.value.trim()}`);
    });
    extendedInfoData.funderKpis = kpiBlocks.join('\n---\n');

    // Day-off rows
    extendedInfoData.trainerDayOff = _actaReadDayOffRows('trainer');
    extendedInfoData.cotrainerDayOff = _actaReadDayOffRows('cotrainer');

    // Team meetings
    const tmDay = document.getElementById('acta-team-meeting-day').value;
    const tmStart = document.getElementById('acta-team-meeting-start').value;
    const tmEnd = document.getElementById('acta-team-meeting-end').value;
    extendedInfoData.teamMeetings = `Semanal - ${tmDay} (${tmStart}-${tmEnd})`;

    // Approval fields
    extendedInfoData.approvalName = document.getElementById('acta-approval-name').value.trim();
    extendedInfoData.approvalRole = document.getElementById('acta-approval-role').value.trim();

    try {
        // Build a payload with ONLY the acta fields — do NOT send unrelated fields
        // (competences, team, resources, schedule, pildoras, etc.) to avoid wiping them.
        const actaPayload = {
            school: extendedInfoData.school,
            projectType: extendedInfoData.projectType,
            materials: extendedInfoData.materials,
            funderDeadlines: extendedInfoData.funderDeadlines,
            okrKpis: extendedInfoData.okrKpis,
            projectMeetings: extendedInfoData.projectMeetings,
            totalHours: extendedInfoData.totalHours,
            modality: extendedInfoData.modality,
            internships: extendedInfoData.internships,
            positiveExitStart: extendedInfoData.positiveExitStart,
            positiveExitEnd: extendedInfoData.positiveExitEnd,
            presentialDays: extendedInfoData.presentialDays,
            funders: extendedInfoData.funders,
            funderKpis: extendedInfoData.funderKpis,
            trainerDayOff: extendedInfoData.trainerDayOff,
            cotrainerDayOff: extendedInfoData.cotrainerDayOff,
            teamMeetings: extendedInfoData.teamMeetings,
            approvalName: extendedInfoData.approvalName,
            approvalRole: extendedInfoData.approvalRole,
        };
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/extended-info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(actaPayload)
        });
        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('actaInicioModal'))?.hide();
            location.reload();
        } else {
            const err = await response.json().catch(() => ({}));
            alert(`Error al guardar: ${response.status} - ${err.error || 'Error desconocido'}`);
        }
    } catch (error) {
        console.error('Error saving acta data:', error);
        alert(`Error al guardar: ${error.message}`);
    }
}

async function toggleShowEmployability(show) {
    extendedInfoData.showEmployability = show;
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/extended-info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ showEmployability: show })
        });
        if (!response.ok) {
            alert('Error al actualizar la visibilidad de empleabilidad');
            document.getElementById('show-employability-toggle').checked = !show;
            extendedInfoData.showEmployability = !show;
        }
    } catch (error) {
        console.error('Error toggling employability visibility:', error);
        alert('Error al actualizar la visibilidad de empleabilidad');
        document.getElementById('show-employability-toggle').checked = !show;
        extendedInfoData.showEmployability = !show;
    }
}

async function togglePildorasAssignment(isOpen) {
    //console.log('Toggling píldoras self-assignment:', isOpen);

    const token = localStorage.getItem('token');
    try {
        // Send ONLY the field being toggled — avoids overwriting unrelated data
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/extended-info`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ pildorasAssignmentOpen: isOpen })
        });

        if (!response.ok) {
            alert('Failed to update assignment status');
            // Revert UI
            document.getElementById('pildoras-assignment-toggle').checked = !isOpen;
            extendedInfoData.pildorasAssignmentOpen = !isOpen;
        }
    } catch (error) {
        console.error('Error updating assignment status:', error);
        alert('Error updating assignment status');
        // Revert UI
        document.getElementById('pildoras-assignment-toggle').checked = !isOpen;
        extendedInfoData.pildorasAssignmentOpen = !isOpen;
    }
}

function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token || (typeof isTokenExpired === 'function' && isTokenExpired(token))) {
        if (typeof clearSession === 'function') clearSession();
        window.location.href = 'login.html';
    }
}

/**
 * Update the navbar to display the current promotion name
 * @param {string} promotionName - Name of the promotion to display
 */
function updateNavbarPromotionName(promotionName) {
    const navbarElement = document.getElementById('navbar-promotion-name');
    if (navbarElement && promotionName) {
        navbarElement.textContent = promotionName;
    }
}

function switchTab(tabId) {
    // Persist active tab so page reloads land on the same section
    sessionStorage.setItem(`activeTab_${promotionId}`, tabId);

    document.querySelectorAll('.section-content').forEach(section => {
        section.classList.add('hidden');
    });

    // Redirect these legacy tabs to the unified Teacher Area
    if (tabId === 'students' || tabId === 'attendance' || tabId === 'evaluation') {
        const targetTab = tabId;
        // First switch to teacher-area container
        switchTab('teacher-area');
        // Then switch to the specific sub-tab inside it
        switchTeacherAreaSubTab(targetTab);
        return;
    }

    const activeTab = document.getElementById(`${tabId}-tab`);
    if (activeTab) {
        activeTab.classList.remove('hidden');
    }

    // Refresh data if needed
    if (tabId === 'students') loadStudents();
    if (tabId === 'attendance') loadAttendance();
    if (tabId === 'info') {
        loadExtendedInfo();
        // Default to roadmap sub-tab when entering Contenido del Programa
        switchProgramDetailsTab('roadmap');
    }
    if (tabId === 'collaborators') loadCollaborators();
    if (tabId === 'access-settings') loadAccessPassword();
    if (tabId === 'evaluation') loadEvaluation();
    if (tabId === 'teacher-area') {
        // Load teacher area with default overview tab
        switchTeacherAreaSubTab('overview');
    }



    // Update active state in sidebar
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('onclick') && link.getAttribute('onclick').includes(tabId)) {
            link.classList.add('active');
        }
    });

    // Load calendar data for Overview from backend
    if (tabId === 'overview') {
        loadOverviewCalendarId();
        loadOverviewPildoraAlert();
        loadOverviewAttendanceAlert();

        // Update progress info with current students
        if (window.currentPromotion) {
            const students = window.currentStudents || [];
            updateProgressInfo(window.currentPromotion, students);
        }
    }
}

function switchToVirtualClassroom() {
    switchTab('info');
    setTimeout(() => {
        switchProgramDetailsTab('virtual-classroom');
    }, 100);
}


// ==================== TEACHER AREA SECTION ====================
// Consolidated handler for switching between sub-sections in Área del Docente
function switchTeacherAreaSubTab(tabName) {
    const tabNameMap = {
        'overview': { tabId: 'teacher-area-overview', buttonId: 'teacher-area-overview-tab' },
        'students': { tabId: 'teacher-area-students', buttonId: 'teacher-area-students-tab' },
        'attendance': { tabId: 'teacher-area-attendance', buttonId: 'teacher-area-attendance-tab' },
        'evaluation': { tabId: 'teacher-area-evaluation', buttonId: 'teacher-area-evaluation-tab' },
        'accesos': { tabId: 'teacher-area-accesos', buttonId: 'teacher-area-accesos-tab' }
    };

    const tab = tabNameMap[tabName];
    if (!tab) {
        console.error('Invalid teacher area sub-tab:', tabName);
        return;
    }

    // Update active tab styling for main teacher area tabs
    document.querySelectorAll('#teacher-area-subtabs .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.getElementById(`teacher-area-${tabName}-tab`)?.classList.add('active');

    // Hide all panes
    document.querySelectorAll('#teacher-area-subtabs-content .tab-pane').forEach(pane => {
        pane.classList.remove('show', 'active');
        pane.style.display = 'none'; // Ensure it's hidden
    });

    // Remove active class from all sub-tab buttons
    const allButtons = document.querySelectorAll('#teacher-area-subtabs .nav-link');
    allButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
    });

    // Show selected tab and activate its button
    const selectedTab = document.getElementById(tab.tabId);
    const selectedButton = document.getElementById(tab.buttonId);

    if (selectedTab && selectedButton) {
        selectedTab.style.display = 'block';
        selectedTab.classList.add('show', 'active');
        selectedButton.classList.add('active');
        selectedButton.setAttribute('aria-selected', 'true');

        // Trigger appropriate loader based on tab
        if (tabName === 'overview') {
            loadTeacherAreaOverview();
        } else if (tabName === 'students') {
            loadStudents(); // Ensure loadStudents is called for the students tab
        } else if (tabName === 'attendance') {
            loadAttendance();
        } else if (tabName === 'evaluation') {
            loadEvaluation();
        } else if (tabName === 'accesos') {
            loadAccessSettingsInTeacherArea();
        }
    }
}

/**
 * Load access settings for the Accesos tab in Área del docente
 * Reuses the existing loadAccessPassword, loadTeachingContent, and loadAsanaWorkspace
 * but syncs data to teacher-area specific input fields
 */
async function loadAccessSettingsInTeacherArea() {
    if (!isTeacherOrAdmin()) return;

    const token = localStorage.getItem('token');
    try {
        // Load access password
        const responseAccessPassword = await fetch(`${API_URL}/api/promotions/${promotionId}/access-password`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (responseAccessPassword.ok) {
            const data = await responseAccessPassword.json();
            const passwordInput = document.getElementById('teacher-area-access-password-input');
            const accessLinkInput = document.getElementById('teacher-area-student-access-link');

            if (passwordInput) {
                passwordInput.value = data.accessPassword || '';
            }

            // Update the access link in teacher area
            if (accessLinkInput) {
                accessLinkInput.value = `${window.location.origin}${getPublicPromotionPath()}?id=${promotionId}`;
            }
        }

        // Load teaching content and asana workspace in parallel
        await Promise.all([
            _loadTeachingContentInTeacherArea(),
            _loadAsanaWorkspaceInTeacherArea()
        ]);

    } catch (error) {
        console.error('Error loading access settings in teacher area:', error);
    }
}

/**
 * Load teaching content and display in teacher area accesos tab
 */
async function _loadTeachingContentInTeacherArea() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/teaching-content`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            console.error('[_loadTeachingContentInTeacherArea] API error:', response.status);
            return;
        }

        if (response.ok) {
            const data = await response.json();
            const urlInput = document.getElementById('teacher-area-teaching-content-url');
            const previewBtn = document.getElementById('teacher-area-teaching-content-preview-btn');
            const noContentMsg = document.getElementById('teacher-area-no-content-message');
            const removeBtn = document.getElementById('teacher-area-remove-teaching-btn');

            if (data.teachingContentUrl) {
                if (urlInput) {
                    urlInput.value = data.teachingContentUrl;
                }
                if (previewBtn) {
                    previewBtn.href = data.teachingContentUrl;
                    previewBtn.classList.remove('hidden');
                }
                if (noContentMsg) {
                    noContentMsg.style.display = 'none';
                }
                if (removeBtn) {
                    removeBtn.style.display = 'inline-block';
                }
            } else {
                if (previewBtn) {
                    previewBtn.classList.add('hidden');
                }
                if (noContentMsg) {
                    noContentMsg.style.display = 'inline';
                }
                if (removeBtn) {
                    removeBtn.style.display = 'none';
                }
                if (urlInput) {
                    urlInput.value = '';
                }
            }
        }
    } catch (error) {
        console.error('Error loading teaching content in teacher area:', error);
    }
}

/**
 * Load Asana workspace and display in teacher area accesos tab
 */
async function _loadAsanaWorkspaceInTeacherArea() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/asana-workspace`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            console.error('[_loadAsanaWorkspaceInTeacherArea] API error:', response.status);
            return;
        }

        if (response.ok) {
            const data = await response.json();
            const urlInput = document.getElementById('teacher-area-asana-workspace-url');
            const previewBtn = document.getElementById('teacher-area-asana-workspace-preview-btn');
            const noAsanaMsg = document.getElementById('teacher-area-no-asana-message');
            const removeBtn = document.getElementById('teacher-area-remove-asana-btn');

            if (data.asanaWorkspaceUrl) {
                if (urlInput) {
                    urlInput.value = data.asanaWorkspaceUrl;
                }
                if (previewBtn) {
                    previewBtn.href = data.asanaWorkspaceUrl;
                    previewBtn.classList.remove('hidden');
                }
                if (noAsanaMsg) {
                    noAsanaMsg.style.display = 'none';
                }
                if (removeBtn) {
                    removeBtn.style.display = 'inline-block';
                }
            } else {
                if (previewBtn) {
                    previewBtn.classList.add('hidden');
                }
                if (noAsanaMsg) {
                    noAsanaMsg.style.display = 'inline';
                }
                if (removeBtn) {
                    removeBtn.style.display = 'none';
                }
                if (urlInput) {
                    urlInput.value = '';
                }
            }
        }
    } catch (error) {
        console.error('Error loading Asana workspace in teacher area:', error);
    }
}

// Load teacher quick actions overview
async function loadTeacherAreaOverview() {
    const container = document.getElementById('teacher-area-quick-actions');
    if (!container) return;

    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const promotion = await response.json();
            displayTeacherAreaQuickActions(promotion);
        }
    } catch (error) {
        console.error('Error loading teacher area overview:', error);
    }
}

function displayTeacherAreaQuickActions(promotion) {
    const container = document.getElementById('teacher-area-quick-actions');
    if (!container) return;

    // Same teacher actions from Área Docente in Overview
    const teacherActions = [
        {
            id: 'asana-promo-action',
            icon: 'bi-kanban',
            label: 'Asana Promo',
            color: '#FF6B6B',
            url: promotion.asanaWorkspaceUrl,
            title: 'Abrir Asana (Promo)'
        },
        {
            id: 'content-action',
            icon: 'bi-book',
            label: 'Contenido Docente',
            color: '#0d6efd',
            url: promotion.teachingContentUrl,
            title: 'Abrir contenido docente'
        },
        {
            id: 'dashboard-action',
            icon: 'bi-eye',
            label: 'Preview Roadmap',
            color: '#6f42c1',
            url: '#',
            title: 'Vista previa del roadmap',
            isButton: true,
            onclick: 'previewPromotion()'
        },
        {
            id: 'acta-action',
            icon: 'bi-file-text',
            label: 'Acta de Inicio',
            color: '#198754',
            url: '#',
            title: 'Abrir acta de inicio',
            isButton: true,
            onclick: 'openActaModal()'
        }
    ];

    container.innerHTML = '';

    // Render using CSS Grid (same as quick actions)
    const gridContainer = document.createElement('div');
    gridContainer.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 12px;
    `;

    teacherActions.forEach(action => {
        if (action.isButton) {
            const buttonHTML = `
                <div class="quick-action-card" id="${action.id}">
                    <button type="button"
                            class="quick-action-link"
                            style="background: none; border: none; cursor: pointer; width: 100%; height: 100%; padding: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;"
                            onclick="${action.onclick}"
                            title="${action.title}">
                        <div class="quick-action-icon" style="color: ${action.color};">
                            <i class="bi ${action.icon}"></i>
                        </div>
                        <div class="quick-action-label">${action.label}</div>
                    </button>
                </div>
            `;
            gridContainer.insertAdjacentHTML('beforeend', buttonHTML);
        } else {
            const isDisabled = !action.url;
            const cardHTML = `
                <div class="quick-action-card ${isDisabled ? 'disabled' : ''}" id="${action.id}">
                    <a href="${action.url || '#'}" 
                       target="_blank" 
                       rel="noopener noreferrer"
                       class="quick-action-link ${isDisabled ? 'disabled' : ''}"
                       style="${isDisabled ? 'pointer-events: none; opacity: 0.5;' : ''}"
                       title="${action.title}">
                        <div class="quick-action-icon" style="color: ${action.color};">
                            <i class="bi ${action.icon}"></i>
                        </div>
                        <div class="quick-action-label">${action.label}</div>
                        ${isDisabled ? '<div class="quick-action-status">No configurado</div>' : ''}
                    </a>
                </div>
            `;
            gridContainer.insertAdjacentHTML('beforeend', cardHTML);
        }
    });

    container.appendChild(gridContainer);
}


function renderTeacherAreaEvaluation(container, promo, programCompetences, students) {
    if (!promo.projects || promo.projects.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-5">No hay proyectos para evaluar.</p>';
        return;
    }

    let html = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h5 class="mb-0">Evaluación de Proyectos</h5>
        </div>
        <div class="row g-3" id="eval-projects-grid">
    `;

    promo.projects.forEach((project, idx) => {
        const evaluatedCount = (project.evaluations || []).length;
        const totalStudents = students.length;
        const progress = totalStudents > 0 ? Math.round((evaluatedCount / totalStudents) * 100) : 0;

        html += `
            <div class="col-md-6 col-lg-4">
                <div class="card border-0 shadow-sm h-100 eval-project-card" onclick="openTeacherAreaEvaluationDetail('${project.id}', '${project.name}')">
                    <div class="card-body">
                        <h6 class="card-title mb-2">
                            <i class="bi bi-laptop me-2" style="color: #FF4700;"></i>${project.name}
                        </h6>
                        <p class="text-muted small mb-3">${project.description || 'Sin descripción'}</p>
                        
                        <div class="mb-3">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <small class="text-muted">Evaluaciones</small>
                                <small class="fw-bold">${evaluatedCount}/${totalStudents}</small>
                            </div>
                            <div class="progress" style="height: 8px;">
                                <div class="progress-bar" role="progressbar" 
                                     style="width: ${progress}%; background: #FF4700;" 
                                     aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"></div>
                            </div>
                        </div>
                        
                        <button type="button" class="btn btn-sm btn-outline-primary w-100" 
                                onclick="openTeacherAreaEvaluationDetail('${project.id}', '${project.name}'); return false;">
                            <i class="bi bi-pencil me-1"></i>Evaluar
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}

function openTeacherAreaEvaluationDetail(projectId, projectName) {
    // For now, open the main evaluation modal (can be customized later)
    const project = window.evalPromo.projects.find(p => p.id === projectId);
    if (project) {
        openEvaluationModal(projectId, projectName);
    }
}

async function loadPromotion() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const promotion = await response.json();
            window.currentPromotion = promotion; // Store globally for editing
            promotionModules = promotion.modules || [];
            window.promotionModules = promotionModules;
            const _setTC = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
            _setTC('promotion-title', promotion.name);
            _setTC('promotion-desc', promotion.description || '');
            _setTC('modules-count', (promotion.modules || []).length);

            // Update navbar with promotion name
            updateNavbarPromotionName(promotion.name);

            // Render dynamic greeting (generic, without mentioning promo)
            renderGreeting();

            // Render promo subtitle "Hoy estás en la promo"
            renderPromoSubtitle(promotion.name);

            // Load teaching content button
            if (promotion.teachingContentUrl) {
                const teachingContentBtn = document.getElementById('teaching-content-btn');
                if (teachingContentBtn) {
                    teachingContentBtn.href = promotion.teachingContentUrl;
                    teachingContentBtn.classList.remove('hidden');
                }
            }

            // Update course progress bar
            updateCourseProgressBar(promotion);

            // Update progress info with students if available
            const students = window.currentStudents || [];
            updateProgressInfo(promotion, students);

            // Check if current user is owner (to enable/disable collaborator management)
            if (isTeacherOrAdmin()) {
                const isOwner = promotion.teacherId === currentUser.id;
                const addCollabBtn = document.getElementById('add-collaborator-btn');
                if (addCollabBtn) {
                    addCollabBtn.style.display = isOwner ? 'block' : 'none';
                }
            }
        }
    } catch (error) {
        console.error('Error loading promotion:', error);
    }
}

async function loadModules() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const promotion = await response.json();
            // Keep global state in sync so editEmployabilityItem / collaborator
            // module pickers always read fresh data from the same fetch.
            window.currentPromotion = promotion;
            promotionModules = promotion.modules || [];
            window.promotionModules = promotionModules;
            displayModules(promotion.modules || []);
            generateGanttChart(promotion);
        }
    } catch (error) {
        console.error('Error loading modules:', error);
    }
}

/**
 * Calculate and display course progress based on start/end dates
 * @param {Object} promotion - Promotion object with startDate and endDate
 */
function updateCourseProgressBar(promotion) {
    try {
        if (!promotion.startDate || !promotion.endDate) return;

        // Parse dates
        const startDate = new Date(promotion.startDate);
        const endDate = new Date(promotion.endDate);
        const now = new Date();

        // Calculate progress percentage
        const totalDuration = endDate - startDate;
        const elapsed = now - startDate;
        let progressPercent = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
        progressPercent = Math.round(progressPercent);

        // Calculate remaining days
        const remainingMs = endDate - now;
        const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

        // Calculate current week
        const totalWeeks = Math.ceil(totalDuration / (1000 * 60 * 60 * 24 * 7));
        const elapsedWeeks = Math.floor(elapsed / (1000 * 60 * 60 * 24 * 7)) + 1;
        const currentWeek = Math.min(elapsedWeeks, totalWeeks);

        // Update progress bar
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            progressBar.style.width = progressPercent + '%';
            progressBar.setAttribute('aria-valuenow', progressPercent);
            progressBar.textContent = progressPercent > 10 ? progressPercent + '%' : '';
        }

        // Update progress label with remaining days
        const progressLabel = document.getElementById('progress-label');
        if (progressLabel) {
            if (now < startDate) {
                progressLabel.textContent = 'Próximo a comenzar';
            } else if (now > endDate) {
                progressLabel.textContent = 'Curso finalizado';
            } else {
                // Show remaining days
                const daysText = remainingDays === 1 ? 'día' : 'días';
                progressLabel.textContent = 'finaliza en ' + remainingDays + ' ' + daysText;
            }
        }

        // Update date info (left) - start date
        const startInfo = document.getElementById('progress-start-info');
        if (startInfo) {
            startInfo.textContent = 'Inicio: ' + new Date(promotion.startDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        }

        // Note: progress-week-info (center) is managed by updateProgressInfo() for student counts
        // Update end date info (right)
        const endInfo = document.getElementById('progress-end-info');
        if (endInfo) {
            endInfo.textContent = 'Fin: ' + new Date(promotion.endDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        }
    } catch (error) {
        console.error('Error updating course progress bar:', error);
    }
}

/**
 * Calculate student counts and statuses
 * @param {Array} students - Array of student objects
 * @returns {Object} Object with { active: number, withdrawn: number, total: number }
 */
function calculateStudentCounts(students) {
    if (!Array.isArray(students)) {
        return { active: 0, withdrawn: 0, total: 0 };
    }

    const active = students.filter(s => !s.isWithdrawn).length;
    const withdrawn = students.filter(s => s.isWithdrawn).length;

    return {
        active: active,
        withdrawn: withdrawn,
        total: students.length
    };
}

/**
 * Format date to readable string (e.g., "12 Feb 2026")
 * @param {string|Date} date - ISO date string or Date object
 * @param {string} locale - Locale code (default: 'es-ES')
 * @returns {string} Formatted date string
 */
function formatDateShort(date, locale = 'es-ES') {
    if (!date) return '-';

    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) return '-';

    return dateObj.toLocaleDateString(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

/**
 * Update progress info section with course dates and student counts
 * @param {Object} promotion - Promotion object with startDate, endDate
 * @param {Array} students - Array of student objects
 */
function updateProgressInfo(promotion, students) {
    try {
        if (!promotion) return;

        // Calculate student counts
        const counts = calculateStudentCounts(students);

        // Update start date info (left side)
        const startInfo = document.getElementById('progress-start-info');
        if (startInfo) {
            const startDate = formatDateShort(promotion.startDate);
            startInfo.textContent = 'Inicio: ' + startDate;
        }

        // Update student info (center/left)
        const activeStudentsEl = document.getElementById('active-students-count');
        if (activeStudentsEl) {
            if (counts.active > 0) {
                activeStudentsEl.textContent = counts.active + ' estudiante' + (counts.active === 1 ? '' : 's') + ' en activo';
            } else {
                activeStudentsEl.textContent = '-';
            }
        }

        // Update withdrawn students info
        const withdrawnContainer = document.getElementById('withdrawn-students-container');
        const withdrawnCountEl = document.getElementById('withdrawn-students-count');
        if (withdrawnContainer && withdrawnCountEl) {
            withdrawnCountEl.textContent = counts.withdrawn + ' baja' + (counts.withdrawn === 1 ? '' : 's');
        }

        // Update end date info (right side)
        const endInfo = document.getElementById('progress-end-info');
        if (endInfo) {
            const endDate = formatDateShort(promotion.endDate);
            endInfo.textContent = 'Fin: ' + endDate;
        }
    } catch (error) {
        console.error('Error updating progress info:', error);
    }
}

function displayModules(modules) {
    const list = document.getElementById('modules-list');
    list.innerHTML = '';

    if (modules.length === 0) {
        list.innerHTML = '<div class="col-12"><p class="text-muted">No modules yet</p></div>';
        return;
    }

    modules.forEach((module, index) => {
        const card = document.createElement('div');
        card.className = 'col-md-6 mb-3';
        const coursesText = (module.courses || []).map(c => typeof c === 'string' ? c : (c.name || 'Unnamed Course')).join(', ');
        const projectsText = (module.projects || []).map(p => typeof p === 'string' ? p : (p.name || 'Unnamed Project')).join(', ');
        const pildorasText = (module.pildoras || []).map(p => {
            const title = typeof p === 'string' ? p : (p.title || 'Píldora');
            const type = typeof p === 'object' && p.type === 'couple' ? 'pareja' : 'individual';
            return `${title} (${type})`;
        }).join(', ');

        // card.innerHTML = `
        //     <div class="card">
        //         <div class="card-body">
        //             <h5 class="card-title">Module ${index + 1}: ${escapeHtml(module.name)}</h5>
        //             <p><strong>Duration:</strong> ${module.duration} weeks</p>
        //             ${coursesText ? `<p><strong>Courses:</strong> ${escapeHtml(coursesText)}</p>` : ''}
        //             ${projectsText ? `<p><strong>Projects:</strong> ${escapeHtml(projectsText)}</p>` : ''}
        //             ${pildorasText ? `<p><strong>Píldoras:</strong> ${escapeHtml(pildorasText)}</p>` : ''}
        //         </div>
        //     </div>
        // `;
        // list.appendChild(card);
    });
}

function generateGanttChart(promotion) {
    const table = document.getElementById('gantt-table');
    table.innerHTML = '';

    // Use the module-level helper so superadmin also gets edit buttons.
    const isTeacher = isTeacherOrAdmin();

    const weeks = promotion.weeks || 0;
    const modules = promotion.modules || [];
    const employability = promotion.employability || [];

    if (modules.length === 0) {
        table.innerHTML = '<tbody><tr><td class="text-muted">No modules configured</td></tr></tbody>';
        return;
    }

    // Compact table — override the generous default padding from style.css
    table.className = 'table table-sm table-bordered gantt-table';
    table.style.fontSize = '0.65rem';
    table.style.borderCollapse = 'collapse';
    table.style.tableLayout = 'auto';

    // Inject a scoped style block once to force tight cell sizing
    if (!document.getElementById('gantt-compact-style')) {
        const s = document.createElement('style');
        s.id = 'gantt-compact-style';
        s.textContent = `
            #gantt-table th, #gantt-table td {
                padding: 1px 2px !important;
                font-size: 0.6rem;
                border: 1px solid #dee2e6 !important;
                box-sizing: border-box;
            }
            #gantt-table .gantt-label-cell {
                white-space: nowrap;
                overflow: visible;
                position: sticky;
                left: 0;
                background: white;
                z-index: 2;
            }
            #gantt-table .gantt-week-cell {
                writing-mode: vertical-rl;
                text-orientation: mixed;
                padding: 3px 1px !important;
            }
        `;
        document.head.appendChild(s);
    }

    const tableContainer = table.closest('.table-responsive') || table.parentElement;
    if (tableContainer) {
        tableContainer.style.overflowX = 'auto';
        tableContainer.style.maxWidth = '100%';
    }

    // ── 1. Header: month + week rows go in <thead> ────────────────────────────
    // Group every 4 weeks into one month (Mes 1, Mes 2, ...)
    const thead = document.createElement('thead');

    const monthRow = document.createElement('tr');
    const monthHeaderCell = document.createElement('th');
    monthHeaderCell.innerHTML = '<strong>Meses</strong>';
    monthHeaderCell.className = 'gantt-label-cell';
    monthRow.appendChild(monthHeaderCell);

    // Each group of 4 weeks = 1 month
    let currentMonthKey = null, monthSpan = 0, monthCell = null;
    for (let i = 0; i < weeks; i++) {
        const m = Math.floor(i / 4) + 1;
        const monthKey = `m${m}`;
        if (monthKey !== currentMonthKey) {
            if (monthCell) monthCell.colSpan = monthSpan;
            currentMonthKey = monthKey;
            monthCell = document.createElement('th');
            monthCell.innerHTML = `<strong>Mes ${m}</strong>`;
            monthCell.style.textAlign = 'center';
            monthCell.style.backgroundColor = '#e8f4f8';
            monthCell.style.borderLeft = '2px solid #6c757d';
            monthRow.appendChild(monthCell);
            monthSpan = 1;
        } else { monthSpan++; }
    }
    if (monthCell) monthCell.colSpan = monthSpan;
    thead.appendChild(monthRow);

    const weekRow = document.createElement('tr');
    const weekHeaderCell = document.createElement('th');
    weekHeaderCell.innerHTML = '<strong>Sem.</strong>';
    weekHeaderCell.className = 'gantt-label-cell';
    weekRow.appendChild(weekHeaderCell);
    for (let i = 0; i < weeks; i++) {
        const th = document.createElement('th');
        th.textContent = `${i + 1}`;
        th.title = `Semana ${i + 1}`;
        if (i % 4 === 0) th.style.borderLeft = '2px solid #6c757d';
        th.className = 'gantt-week-cell text-center';
        weekRow.appendChild(th);
    }
    thead.appendChild(weekRow);
    table.appendChild(thead);

    // ── 2. Employability section — one <tbody> for header + sessions ──────────
    const employabilityId = 'employability-section';
    const isEmpExpanded = localStorage.getItem(`gantt-expanded-${employabilityId}`) !== 'false';

    const empTbody = document.createElement('tbody');
    empTbody.id = `tbody-${employabilityId}`;

    // Compute overall span for the header bar
    const empStarts = employability.map(e => (e.startMonth - 1) * 4);
    const empEnds = employability.map(e => (e.startMonth - 1) * 4 + e.duration * 4);
    const empMin = empStarts.length ? Math.min(...empStarts) : -1;
    const empMax = empEnds.length ? Math.min(Math.max(...empEnds), weeks) : -1;

    // Header row (always visible — lives in empTbody)
    const empHeaderRow = document.createElement('tr');
    empHeaderRow.className = 'gantt-employability-header';
    empHeaderRow.style.cursor = 'pointer';
    empHeaderRow.title = 'Click para expandir/colapsar';

    const empLabelCell = document.createElement('td');
    empLabelCell.className = 'gantt-label-cell';
    empLabelCell.colSpan = weeks + 1;
    empLabelCell.style.backgroundColor = '#fff8e1';
    empLabelCell.style.position = 'sticky';
    empLabelCell.style.left = '0';

    // Build inline span bar: a thin colored strip showing the overall range
    let spanBarHtml = '';
    if (empMin >= 0 && empMax > empMin) {
        const leftPct = ((empMin / weeks) * 100).toFixed(1);
        const widthPct = (((empMax - empMin) / weeks) * 100).toFixed(1);
        spanBarHtml = `
            <div style="position:relative;height:4px;background:#f3e5ab;border-radius:2px;margin-top:2px;overflow:hidden;">
                <div style="position:absolute;left:${leftPct}%;width:${widthPct}%;height:100%;background:#f59e0b;border-radius:2px;"></div>
            </div>`;
    }

    empLabelCell.innerHTML = `
        <div class="d-flex align-items-center gap-1">
            <i class="bi ${isEmpExpanded ? 'bi-chevron-down' : 'bi-chevron-right'} gantt-emp-chevron" style="font-size:0.6rem;"></i>
            <strong>Empleabilidad</strong>
            <span class="badge bg-warning text-dark" style="font-size:0.55rem;">${employability.length}</span>
        </div>
        ${spanBarHtml}`;
    empHeaderRow.appendChild(empLabelCell);
    empHeaderRow.addEventListener('click', () => toggleEmployabilityExpansion());
    empTbody.appendChild(empHeaderRow);

    // Session rows — in a separate <tbody> that gets hidden/shown as a unit
    const empContentTbody = document.createElement('tbody');
    empContentTbody.id = `tbody-content-${employabilityId}`;
    empContentTbody.style.display = isEmpExpanded ? '' : 'none';

    employability.forEach((item, index) => {
        const itemRow = document.createElement('tr');

        const itemCell = document.createElement('td');
        itemCell.className = 'gantt-label-cell';
        itemCell.style.backgroundColor = '#fffff8';

        const itemUrl = item.url
            ? `<a href="${escapeHtml(item.url)}" target="_blank" class="text-decoration-none">${escapeHtml(item.name)}</a>`
            : escapeHtml(item.name);
        const editBtn = isTeacher
            ? `<button class="btn btn-xs btn-outline-warning py-0 px-1" style="font-size:0.55rem;" onclick="event.stopPropagation();editEmployabilityItem(${index})"><i class="bi bi-pencil"></i></button>` : '';
        const delBtn = isTeacher
            ? `<button class="btn btn-xs btn-outline-danger py-0 px-1" style="font-size:0.55rem;" onclick="event.stopPropagation();deleteEmployabilityItem(${index})"><i class="bi bi-trash"></i></button>` : '';

        itemCell.innerHTML = `
            <div class="d-flex align-items-center justify-content-between gap-1" style="padding-left:14px;">
                <small style="font-size:0.58rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:110px;">${itemUrl}</small>
                <div class="d-flex gap-1">${editBtn}${delBtn}</div>
            </div>`;
        itemRow.appendChild(itemCell);

        const sw = (item.startMonth - 1) * 4;
        const ew = sw + item.duration * 4;
        for (let i = 0; i < weeks; i++) {
            const cell = document.createElement('td');
            cell.style.height = '18px';
            if (i >= sw && i < ew) cell.style.backgroundColor = '#fff3cd';
            itemRow.appendChild(cell);
        }
        empContentTbody.appendChild(itemRow);
    });

    table.appendChild(empTbody);
    table.appendChild(empContentTbody);

    // ── 3. Module rows — one <tbody> per module (header + sub-rows) ───────────
    let weekCounter = 0;
    modules.forEach((module, index) => {
        const moduleId = `module-${index}`;
        const isExpanded = localStorage.getItem(`gantt-expanded-${moduleId}`) !== 'false';

        // Module header gets its own single-row <tbody>
        const modHeaderTbody = document.createElement('tbody');
        modHeaderTbody.id = `tbody-header-${moduleId}`;

        const moduleRow = document.createElement('tr');
        moduleRow.className = 'gantt-module-header';
        moduleRow.dataset.moduleIndex = index;
        moduleRow.style.cursor = 'pointer';
        moduleRow.title = 'Click para expandir/colapsar';

        const moduleCell = document.createElement('td');
        moduleCell.className = 'gantt-label-cell';

        const editBtn = isTeacher
            ? `<button class="btn btn-xs btn-outline-warning py-0 px-1" style="font-size:0.55rem;" onclick="event.stopPropagation();editModule('${escapeHtml(module.id)}')"><i class="bi bi-pencil"></i></button>` : '';
        const deleteBtn = isTeacher
            ? `<button class="btn btn-xs btn-outline-danger py-0 px-1" style="font-size:0.55rem;" onclick="event.stopPropagation();deleteModule('${escapeHtml(module.id)}')"><i class="bi bi-trash"></i></button>` : '';

        moduleCell.innerHTML = `
            <div class="d-flex align-items-center justify-content-between gap-1">
                <div class="d-flex align-items-center gap-1">
                    <i class="bi ${isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'} gantt-mod-chevron" style="font-size:0.6rem;"></i>
                    <strong>M${index + 1}: ${escapeHtml(module.name)}</strong>
                </div>
                <div class="d-flex gap-1">${editBtn}${deleteBtn}</div>
            </div>`;
        moduleRow.appendChild(moduleCell);

        for (let i = 0; i < weeks; i++) {
            const cell = document.createElement('td');
            cell.style.height = '22px';
            if (i >= weekCounter && i < weekCounter + module.duration) {
                cell.style.backgroundColor = '#667eea';
            }
            moduleRow.appendChild(cell);
        }
        moduleRow.addEventListener('click', () => toggleModuleExpansion(moduleId, index));
        modHeaderTbody.appendChild(moduleRow);
        table.appendChild(modHeaderTbody);

        // Sub-rows (courses + projects) go in a single collapsible <tbody>
        const modContentTbody = document.createElement('tbody');
        modContentTbody.id = `tbody-content-${moduleId}`;
        modContentTbody.style.display = isExpanded ? '' : 'none';

        // Course rows
        (module.courses || []).forEach((courseObj, courseIndex) => {
            const courseName = typeof courseObj === 'string' ? courseObj : (courseObj.name || 'Unnamed');
            const courseUrl = typeof courseObj === 'object' ? (courseObj.url || '') : '';
            const courseDur = typeof courseObj === 'object' ? (Number(courseObj.duration) || 1) : 1;
            const courseOff = typeof courseObj === 'object' ? (Number(courseObj.startOffset) || 0) : 0;

            const courseRow = document.createElement('tr');
            const courseCell = document.createElement('td');
            courseCell.className = 'gantt-label-cell';
            courseCell.style.backgroundColor = '#f8fffc';

            const link = courseUrl
                ? `<a href="${escapeHtml(courseUrl)}" target="_blank" class="text-decoration-none">${escapeHtml(courseName)}</a>`
                : escapeHtml(courseName);
            const delBtn = isTeacher
                ? `<button class="btn btn-xs btn-outline-danger py-0 px-1" style="font-size:0.55rem;" onclick="event.stopPropagation();deleteCourseFromModule('${escapeHtml(module.id)}',${courseIndex})"><i class="bi bi-trash"></i></button>` : '';

            courseCell.innerHTML = `
                <div class="d-flex align-items-center justify-content-between gap-1" style="padding-left:14px;">
                    <small style="font-size:0.58rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:115px;">${link}</small>
                    <div>${delBtn}</div>
                </div>`;
            courseRow.appendChild(courseCell);

            const as = weekCounter + courseOff, ae = as + courseDur;
            for (let i = 0; i < weeks; i++) {
                const cell = document.createElement('td');
                cell.style.height = '18px';
                if (i >= as && i < ae) cell.style.backgroundColor = '#d1e7dd';
                courseRow.appendChild(cell);
            }
            modContentTbody.appendChild(courseRow);
        });

        // Project rows
        (module.projects || []).forEach((projectObj, projectIndex) => {
            const projectName = typeof projectObj === 'string' ? projectObj : (projectObj.name || 'Unnamed');
            const projectUrl = typeof projectObj === 'object' ? (projectObj.url || '') : '';
            const projectDur = typeof projectObj === 'object' ? (Number(projectObj.duration) || 1) : 1;
            const projectOff = typeof projectObj === 'object' ? (Number(projectObj.startOffset) || 0) : 0;

            const projectRow = document.createElement('tr');
            const projectCell = document.createElement('td');
            projectCell.className = 'gantt-label-cell';
            projectCell.style.backgroundColor = '#fff8f8';

            const link = projectUrl
                ? `<a href="${escapeHtml(projectUrl)}" target="_blank" class="text-decoration-none">${escapeHtml(projectName)}</a>`
                : escapeHtml(projectName);
            const delBtn = isTeacher
                ? `<button class="btn btn-xs btn-outline-danger py-0 px-1" style="font-size:0.55rem;" onclick="event.stopPropagation();deleteProjectFromModule('${escapeHtml(module.id)}',${projectIndex})"><i class="bi bi-trash"></i></button>` : '';

            projectCell.innerHTML = `
                <div class="d-flex align-items-center justify-content-between gap-1" style="padding-left:14px;">
                    <small style="font-size:0.58rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:115px;">${link}</small>
                    <div>${delBtn}</div>
                </div>`;
            projectRow.appendChild(projectCell);

            const as = weekCounter + projectOff, ae = as + projectDur;
            for (let i = 0; i < weeks; i++) {
                const cell = document.createElement('td');
                cell.style.height = '18px';
                if (i >= as && i < ae) cell.style.backgroundColor = '#fce4e4';
                projectRow.appendChild(cell);
            }
            modContentTbody.appendChild(projectRow);
        });

        table.appendChild(modContentTbody);
        weekCounter += module.duration;
    });
}

// Toggle module expansion
function toggleModuleExpansion(moduleId, index) {
    const contentTbody = document.getElementById(`tbody-content-${moduleId}`);
    const chevron = document.querySelector(`[data-module-index="${index}"] .gantt-mod-chevron`);
    const isCurrentlyExpanded = contentTbody?.style.display !== 'none';

    if (contentTbody) contentTbody.style.display = isCurrentlyExpanded ? 'none' : '';

    if (chevron) {
        chevron.className = isCurrentlyExpanded
            ? 'bi bi-chevron-right gantt-mod-chevron'
            : 'bi bi-chevron-down gantt-mod-chevron';
    }

    localStorage.setItem(`gantt-expanded-${moduleId}`, !isCurrentlyExpanded);
}

// Toggle employability expansion
function toggleEmployabilityExpansion() {
    const employabilityId = 'employability-section';
    const contentTbody = document.getElementById(`tbody-content-${employabilityId}`);
    const headerRow = document.querySelector('.gantt-employability-header');
    const chevron = headerRow?.querySelector('.gantt-emp-chevron');
    const isCurrentlyExpanded = contentTbody?.style.display !== 'none';

    if (contentTbody) contentTbody.style.display = isCurrentlyExpanded ? 'none' : '';

    if (chevron) {
        chevron.className = isCurrentlyExpanded
            ? 'bi bi-chevron-right gantt-emp-chevron'
            : 'bi bi-chevron-down gantt-emp-chevron';
    }

    localStorage.setItem(`gantt-expanded-${employabilityId}`, !isCurrentlyExpanded);
}

async function editModule(moduleId) {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const promotion = await response.json();
            const module = promotion.modules.find(m => m.id === moduleId);

            if (!module) {
                alert('Module not found');
                return;
            }

            // Populate form with module data
            document.getElementById('module-name').value = module.name;
            document.getElementById('module-duration').value = module.duration;
            document.getElementById('moduleModalTitle').textContent = 'Edit Module';

            // Clear containers
            document.getElementById('courses-container').innerHTML = '';
            document.getElementById('projects-container').innerHTML = '';
            const pildorasContainer = document.getElementById('pildoras-container');
            if (pildorasContainer) pildorasContainer.innerHTML = '';

            // Populate courses
            if (module.courses && module.courses.length > 0) {
                module.courses.forEach(course => {
                    const isObj = course && typeof course === 'object';
                    const courseName = isObj ? (course.name || '') : String(course);
                    const courseUrl = isObj ? (course.url || '') : '';
                    const courseDur = isObj ? (Number(course.duration) || 1) : 1;
                    const courseOff = isObj ? (Number(course.startOffset) || 0) : 0;
                    addCoursField(courseName, courseUrl, courseDur, courseOff);
                });
            }

            // Populate projects
            if (module.projects && module.projects.length > 0) {
                module.projects.forEach(project => {
                    const isObj = project && typeof project === 'object';
                    const projectName = isObj ? (project.name || '') : String(project);
                    const projectUrl = isObj ? (project.url || '') : '';
                    const projectDur = isObj ? (Number(project.duration) || 1) : 1;
                    const projectOff = isObj ? (Number(project.startOffset) || 0) : 0;
                    const projectCompIds = isObj ? (project.competenceIds || []) : [];
                    addProjectField(projectName, projectUrl, projectDur, projectOff, projectCompIds);
                });
            }

            // Populate pildoras
            if (module.pildoras && module.pildoras.length > 0) {
                module.pildoras.forEach(p => {
                    addPildoraField(p.title || '', p.type || 'individual');
                });
            }

            currentEditingModuleId = moduleId;
            moduleModal.show();
        }
    } catch (error) {
        console.error('Error editing module:', error);
        alert('Error loading module data');
    }
}

async function deleteModule(moduleId) {
    if (!confirm('Are you sure you want to delete this module? This action cannot be undone.')) return;

    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const promotion = await response.json();
            const moduleIndex = promotion.modules.findIndex(m => m.id === moduleId);

            if (moduleIndex === -1) {
                alert('Module not found');
                return;
            }

            promotion.modules.splice(moduleIndex, 1);

            const updateResponse = await fetch(`${API_URL}/api/promotions/${promotionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(promotion)
            });

            if (updateResponse.ok) {
                loadModules();
                loadPromotion();
                alert('Module deleted successfully');
            } else {
                alert('Error deleting module');
            }
        }
    } catch (error) {
        console.error('Error deleting module:', error);
        alert('Error deleting module');
    }
}

async function deleteCourseFromModule(moduleId, courseIndex) {
    if (!confirm('Delete this course?')) return;

    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const promotion = await response.json();
            const module = promotion.modules.find(m => m.id === moduleId);

            if (!module) {
                alert('Module not found');
                return;
            }

            if (module.courses && module.courses[courseIndex]) {
                module.courses.splice(courseIndex, 1);

                const updateResponse = await fetch(`${API_URL}/api/promotions/${promotionId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(promotion)
                });

                if (updateResponse.ok) {
                    loadModules();
                    loadPromotion();
                } else {
                    alert('Error deleting course');
                }
            }
        }
    } catch (error) {
        console.error('Error deleting course:', error);
        alert('Error deleting course');
    }
}

async function deleteProjectFromModule(moduleId, projectIndex) {
    if (!confirm('Delete this project?')) return;

    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const promotion = await response.json();
            const module = promotion.modules.find(m => m.id === moduleId);

            if (!module) {
                alert('Module not found');
                return;
            }

            if (module.projects && module.projects[projectIndex]) {
                module.projects.splice(projectIndex, 1);

                const updateResponse = await fetch(`${API_URL}/api/promotions/${promotionId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(promotion)
                });

                if (updateResponse.ok) {
                    loadModules();
                    loadPromotion();
                } else {
                    alert('Error deleting project');
                }
            }
        }
    } catch (error) {
        console.error('Error deleting project:', error);
        alert('Error deleting project');
    }
}

async function loadQuickLinks() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/quick-links`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const links = await response.json();
            displayQuickLinks(links);
            const el = document.getElementById('quicklinks-count');
            if (el) el.textContent = links.length;

            // Cache GitHub quick link URL so Aula Virtual can use it as repo base
            const githubLink = links.find(l =>
                l.platform === 'github' || l.name?.toLowerCase().includes('github')
            );
            window._githubQuickLinkUrl = githubLink ? (githubLink.url || '') : '';
        }
    } catch (error) {
        console.error('Error loading quick links:', error);
    }
}

function displayQuickLinks(links) {
    const list = document.getElementById('quick-links-list');
    list.innerHTML = '';

    if (links.length === 0) {
        list.innerHTML = '<div class="col-12"><p class="text-muted">No quick links yet</p></div>';
        return;
    }

    links.forEach(link => {
        const platform = link.platform || 'custom';
        const platformInfo = platformIcons[platform] || platformIcons['custom'];

        const deleteBtn = isTeacherOrAdmin() ? `
            <button class="btn btn-sm btn-danger" onclick="deleteQuickLink('${link.id}')">
                <i class="bi bi-trash"></i>
            </button>` : '';

        const card = document.createElement('div');
        card.className = 'col-md-6 col-lg-3';
        card.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                        <i class="bi ${platformInfo.icon}" style="font-size: 1.3rem; color: ${platformInfo.color};"></i>
                        <h5 class="card-title" style="margin: 0;">${escapeHtml(link.name)}</h5>
                    </div>
                    <a href="${escapeHtml(link.url)}" target="_blank" class="btn btn-sm btn-primary">
                        <i class="bi bi-box-arrow-up-right me-1"></i>Open Link
                    </a>
                    ${deleteBtn}
                </div>
            </div>
        `;
        list.appendChild(card);
    });
}

// ==================== ACCIONES RÁPIDAS ====================
// Widget para acceso rápido a herramientas: Zoom, Discord, Asana

async function loadQuickActions() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/quick-links`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const links = await response.json();
            displayQuickActionsFiltered(links);
            loadTeacherArea();
        }
    } catch (error) {
        console.error('Error cargando acciones rápidas:', error);
    }
}

function refreshQuickActions() {
    if (typeof promotionId !== 'undefined') {
        loadQuickActions();
    }
}

function openAttendancePanel() {
    switchTab('attendance');
}

// ==================== ÁREA DOCENTE ====================
// Widget para acceso a recursos docentes: Asana, contenido, dashboard, acta

async function loadTeacherArea() {
    if (!isTeacherOrAdmin()) return;

    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const promotion = await response.json();
            displayTeacherArea(promotion);
        }
    } catch (error) {
        console.error('Error loading teacher area:', error);
    }
}

function displayTeacherArea(promotion) {
    const container = document.getElementById('teacher-area-container');
    if (!container) return;

    // Define teacher area buttons/links
    const teacherActions = [
        {
            id: 'asana-promo-action',
            icon: 'bi-kanban',
            label: 'Asana Promo',
            color: '#FF6B6B',
            url: promotion.asanaWorkspaceUrl,
            title: 'Abrir Asana (Promo)'
        },
        {
            id: 'content-action',
            icon: 'bi-book',
            label: 'Contenido Didáctico',
            color: 'var(--principal-1)',
            url: promotion.teachingContentUrl,
            title: 'Abrir contenido docente'
        },
        {
            id: 'dashboard-action',
            icon: 'bi-eye',
            label: 'Preview Roadmap',
            color: '#6f42c1',
            url: '#',
            title: 'Vista previa del roadmap',
            isButton: true,
            onclick: 'previewPromotion()'
        },
        {
            id: 'acta-action',
            icon: 'bi-file-text',
            label: 'Acta de Inicio',
            color: '#198754',
            url: '#',
            title: 'Abrir acta de inicio',
            isButton: true,
            onclick: 'openActaModal()'
        }
    ];

    container.innerHTML = '';

    // Render only teacher area buttons (not shared with Quick Actions)
    teacherActions.forEach(action => {
        const isDisabled = !action.url && !action.isButton;

        if (action.isButton) {
            // Button actions (dashboard preview, acta)
            const buttonHTML = `
                <div class="quick-action-card" id="${action.id}">
                    <button type="button"
                            class="quick-action-link"
                            style="background: none; border: none; cursor: pointer; width: 100%; height: 100%; padding: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;"
                            onclick="${action.onclick}"
                            title="${action.title}">
                        <div class="quick-action-icon" style="color: ${action.color};">
                            <i class="bi ${action.icon}"></i>
                        </div>
                        <div class="quick-action-label">${action.label}</div>
                    </button>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', buttonHTML);
        }
        else {
            // Link actions (Asana, content)
            const cardHTML = `
                <div class="quick-action-card ${isDisabled ? 'disabled' : ''}" id="${action.id}">
                    <a href="${action.url || '#'}" 
                       target="_blank" 
                       rel="noopener noreferrer"
                       title="${action.title}"
                       onclick="${isDisabled ? 'return false;' : 'event.preventDefault(); window.open(this.href, \"_blank\");'}"
                       class="quick-action-link"
                       style="${isDisabled ? 'pointer-events: none; opacity: 0.5;' : ''}">
                        <div class="quick-action-icon" style="color: ${action.color}; ${isDisabled ? 'opacity: 0.5;' : ''}">
                            <i class="bi ${action.icon}"></i>
                        </div>
                        <div class="quick-action-label">${action.label}</div>
                        ${isDisabled ? '<div class="quick-action-status">No configurado</div>' : '<i class="bi bi-box-arrow-up-right quick-action-arrow"></i>'}
                    </a>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', cardHTML);
        }
    });
}

async function loadQuickActionsFiltered() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/quick-links`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const links = await response.json();
            displayQuickActionsFiltered(links);
        }
    } catch (error) {
        console.error('Error loading quick actions:', error);
    }
}

function displayQuickActionsFiltered(quickLinks) {
    const container = document.getElementById('quick-actions-container');
    if (!container) return;

    // Find links by platform (excluding teacher area duplicates)
    const zoomLink = quickLinks.find(link =>
        link.platform === 'zoom' || link.name?.toLowerCase().includes('zoom')
    );
    const discordLink = quickLinks.find(link =>
        link.platform === 'discord' || link.name?.toLowerCase().includes('discord')
    );

    // Define quick actions (student-focused only)
    // Exclude: Asana, Teaching Content, Dashboard, Acta (those go to Área Docente)
    const actions = [
        {
            id: 'zoom-action',
            icon: 'bi-camera-video',
            label: 'Unirme a la clase',
            color: '#2D8CFF',
            url: zoomLink?.url,
            title: 'Abrir reunión de Zoom'
        },
        {
            id: 'discord-action',
            icon: 'bi-discord',
            label: 'Chat Estudiantes',
            color: '#5865F2',
            url: discordLink?.url,
            title: 'Abrir canal de Discord'
        },
        {
            id: 'attendance-action',
            icon: 'bi-clipboard-check',
            label: 'Pasar asistencia',
            color: '#FF4700',
            url: null,
            title: 'Pasar asistencia',
            isButton: true,
            onclick: 'openAttendancePanel()'
        },
        {
            id: 'preview-roadmap-action',
            icon: 'bi-eye',
            label: 'Preview Roadmap',
            color: '#FF4700',
            url: null,
            title: 'Vista previa del roadmap',
            isButton: true,
            onclick: 'previewPromotion()'
        }
    ];

    container.innerHTML = '';

    actions.forEach(action => {
        const isDisabled = !action.url && !action.isButton;

        if (action.isButton) {
            const buttonHTML = `
                <div class="quick-action-card" id="${action.id}">
                    <button type="button"
                            class="quick-action-link"
                            style="background: none; border: none; cursor: pointer; width: 100%; height: 100%; padding: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;"
                            onclick="${action.onclick}"
                            title="${action.title}">
                        <div class="quick-action-icon" style="color: ${action.color};">
                            <i class="bi ${action.icon}"></i>
                        </div>
                        <div class="quick-action-label">${action.label}</div>
                    </button>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', buttonHTML);
        }
        else {
            const cardHTML = `
                <div class="quick-action-card ${isDisabled ? 'disabled' : ''}" id="${action.id}">
                    <a href="${action.url || '#'}" 
                       target="_blank" 
                       rel="noopener noreferrer"
                       title="${action.title}"
                       onclick="${isDisabled ? 'return false;' : 'event.preventDefault(); window.open(this.href, \"_blank\");'}"
                       class="quick-action-link"
                       style="${isDisabled ? 'pointer-events: none; opacity: 0.5;' : ''}">
                        <div class="quick-action-icon" style="color: ${action.color}; ${isDisabled ? 'opacity: 0.5;' : ''}">
                            <i class="bi ${action.icon}"></i>
                        </div>
                        <div class="quick-action-label">${action.label}</div>
                        ${isDisabled ? '<div class="quick-action-status">No configurado</div>' : '<i class="bi bi-box-arrow-up-right quick-action-arrow"></i>'}
                    </a>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', cardHTML);
        }
    });
}

async function loadSections() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/sections`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const sections = await response.json();
            displaySections(sections);
            const el = document.getElementById('sections-count');
            if (el) el.textContent = sections.length;
        }
    } catch (error) {
        console.error('Error loading sections:', error);
    }
}

function displaySections(sections) {
    const list = document.getElementById('sections-list');
    list.innerHTML = '';

    if (sections.length === 0) {
        list.innerHTML = '<p class="text-muted">No hay secciones aún</p>';
        return;
    }

    sections.forEach(section => {
        const actionBtns = isTeacherOrAdmin() ? `
            <div>
                <button class="btn btn-sm btn-warning" onclick="editSection('${section.id}')">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteSection('${section.id}')">
                    <i class="bi bi-trash"></i>
                </button>
            </div>` : '';

        const card = document.createElement('div');
        card.className = 'card mb-3';
        card.innerHTML = `
            <div class="card-header">
                <div class="d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">${escapeHtml(section.title)}</h5>
                    ${actionBtns}
                </div>
            </div>
            <div class="card-body">
                <div style="white-space: pre-wrap;">${escapeHtml(section.content)}</div>
            </div>
        `;
        list.appendChild(card);
    });
}

// ==================== PROMO RESOURCES ====================
// Resources created by teachers for a specific promotion (videos, repos, canva/ppt).
// Stored in ExtendedInfo.promotionResources as a JSON array.

const PROMO_RESOURCE_TYPE_ICONS = {
    video:       { icon: 'bi-play-btn-fill',       color: '#dc3545', label: 'Vídeo' },
    repository:  { icon: 'bi-github',              color: '#333',    label: 'Repositorio' },
    canva:       { icon: 'bi-palette-fill',         color: '#7c3aed', label: 'Canva' },
    powerpoint:  { icon: 'bi-file-earmark-slides-fill', color: '#e55a1c', label: 'PowerPoint' },
    other:       { icon: 'bi-paperclip',            color: '#6c757d', label: 'Otro' }
};

async function loadPromoResources() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        const res = await fetch(`${API_URL}/api/promotions/${promotionId}/promotion-resources/all`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const resources = await res.json();
        renderPromoResources(resources);
    } catch (err) {
        console.error('[loadPromoResources] Error:', err);
    }
}

function renderPromoResources(resources) {
    const container = document.getElementById('promo-resources-list');
    const countEl = document.getElementById('promo-resources-count');
    if (!container) return;
    if (countEl) countEl.textContent = resources.length;

    if (!resources.length) {
        container.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="bi bi-collection-play fs-2 d-block mb-2 opacity-25"></i>
                <span class="small">Sin recursos aún. Crea el primero.</span>
            </div>`;
        return;
    }

    // Group by module
    const grouped = {};
    resources.forEach(r => {
        const key = r.module || '__sin_modulo__';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(r);
    });

    const now = new Date();
    let html = '';

    Object.entries(grouped).forEach(([moduleName, items]) => {
        const groupLabel = moduleName === '__sin_modulo__' ? 'Sin módulo' : escapeHtml(moduleName);
        html += `
        <div class="mb-4">
            <div class="d-flex align-items-center gap-2 mb-2">
                <span class="fw-bold text-primary"><i class="bi bi-folder2-open me-1"></i>${groupLabel}</span>
                <span class="badge bg-light text-dark border">${items.length}</span>
            </div>
            <div class="accordion" id="promo-res-acc-${encodeURIComponent(moduleName)}">`;

        items.forEach((r, idx) => {
            const meta = PROMO_RESOURCE_TYPE_ICONS[r.type] || PROMO_RESOURCE_TYPE_ICONS.other;
            const accId = `promo-res-item-${r.id}`;

            // Status badge
            let statusBadge;
            if (r.status === 'published') {
                statusBadge = `<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Publicado</span>`;
            } else if (r.publishAt && new Date(r.publishAt) <= now) {
                statusBadge = `<span class="badge bg-success"><i class="bi bi-clock-history me-1"></i>Publicado (programado)</span>`;
            } else if (r.publishAt) {
                const dateStr = new Date(r.publishAt).toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
                statusBadge = `<span class="badge bg-warning text-dark"><i class="bi bi-calendar-event me-1"></i>Programado: ${escapeHtml(dateStr)}</span>`;
            } else {
                statusBadge = `<span class="badge bg-secondary"><i class="bi bi-pencil-square me-1"></i>Borrador</span>`;
            }

            html += `
            <div class="accordion-item border rounded mb-2 shadow-sm">
                <h2 class="accordion-header">
                    <button class="accordion-button collapsed py-2 px-3" type="button"
                            data-bs-toggle="collapse" data-bs-target="#${accId}" aria-expanded="false">
                        <div class="d-flex align-items-center gap-2 w-100 flex-wrap">
                            <i class="bi ${meta.icon} fs-5" style="color:${meta.color}; min-width:1.2rem;"></i>
                            <span class="fw-semibold flex-grow-1">${escapeHtml(r.title)}</span>
                            <div class="d-flex gap-1 flex-wrap">
                                <span class="badge bg-light text-dark border" style="font-size:0.7rem;">${meta.label}</span>
                                ${statusBadge}
                            </div>
                        </div>
                    </button>
                </h2>
                <div id="${accId}" class="accordion-collapse collapse">
                    <div class="accordion-body py-2 px-3">
                        ${r.description ? `<p class="text-muted small mb-2">${escapeHtml(r.description)}</p>` : ''}
                        <div class="mb-2">
                            <a href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer"
                               class="btn btn-sm btn-outline-primary">
                                <i class="bi bi-box-arrow-up-right me-1"></i>Abrir recurso
                            </a>
                        </div>
                        <div class="d-flex gap-2 flex-wrap mt-2">
                            <button class="btn btn-sm btn-outline-secondary" onclick="editPromoResource('${r.id}')">
                                <i class="bi bi-pencil me-1"></i>Editar
                            </button>
                            ${r.status !== 'published' ? `
                            <button class="btn btn-sm btn-success" onclick="publishPromoResource('${r.id}')">
                                <i class="bi bi-globe me-1"></i>Publicar
                            </button>` : `
                            <button class="btn btn-sm btn-outline-secondary" onclick="unpublishPromoResource('${r.id}')">
                                <i class="bi bi-eye-slash me-1"></i>Volver a borrador
                            </button>`}
                            <button class="btn btn-sm btn-outline-danger" onclick="deletePromoResource('${r.id}')">
                                <i class="bi bi-trash me-1"></i>Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;
        });

        html += `</div></div>`;
    });

    container.innerHTML = html;
}

function openPromoResourceModal(resourceId = null) {
    const form = document.getElementById('promo-resource-form');
    form.reset();
    document.getElementById('promo-resource-id').value = '';
    document.getElementById('promo-resource-modal-title').innerHTML = '<i class="bi bi-collection-play me-2 text-primary"></i>Nuevo Recurso';
    document.getElementById('promo-resource-publishAt-row').style.display = 'none';
    document.getElementById('promo-resource-draft').checked = true;

    // Populate module dropdown from promotionModules
    const moduleSelect = document.getElementById('promo-resource-module');
    moduleSelect.innerHTML = '<option value="">— Sin módulo —</option>';
    (promotionModules || []).forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.name;
        opt.textContent = m.name;
        moduleSelect.appendChild(opt);
    });

    if (resourceId) {
        // Load existing resource for editing
        const token = localStorage.getItem('token');
        fetch(`${API_URL}/api/promotions/${promotionId}/promotion-resources/all`, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.json()).then(list => {
            const r = list.find(x => x.id === resourceId);
            if (!r) return;
            document.getElementById('promo-resource-id').value = r.id;
            document.getElementById('promo-resource-modal-title').innerHTML = '<i class="bi bi-pencil me-2 text-primary"></i>Editar Recurso';
            document.getElementById('promo-resource-title').value = r.title || '';
            document.getElementById('promo-resource-description').value = r.description || '';
            document.getElementById('promo-resource-type').value = r.type || 'other';
            document.getElementById('promo-resource-url').value = r.url || '';
            if (r.module) moduleSelect.value = r.module;

            // Status radios
            const statusRadio = document.querySelector(`input[name="promo-resource-status"][value="${r.status || 'draft'}"]`);
            if (statusRadio) statusRadio.checked = true;

            // publishAt
            if (r.publishAt) {
                document.getElementById('promo-resource-publishAt-row').style.display = '';
                // Convert ISO to datetime-local format
                const dt = new Date(r.publishAt);
                const local = dt.toISOString().slice(0, 16);
                document.getElementById('promo-resource-publishAt').value = local;
            }
        });
    }

    window._promoResourceModal?.show();
}

function togglePublishAtField(value) {
    const row = document.getElementById('promo-resource-publishAt-row');
    // Show the schedule field only when status is draft (allows scheduling)
    row.style.display = value === 'draft' ? '' : 'none';
    if (value === 'published') {
        document.getElementById('promo-resource-publishAt').value = '';
    }
}

async function submitPromoResource(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const id = document.getElementById('promo-resource-id').value;
    const statusRadio = document.querySelector('input[name="promo-resource-status"]:checked');

    const payload = {
        title: document.getElementById('promo-resource-title').value.trim(),
        description: document.getElementById('promo-resource-description').value.trim(),
        module: document.getElementById('promo-resource-module').value,
        type: document.getElementById('promo-resource-type').value,
        url: document.getElementById('promo-resource-url').value.trim(),
        status: statusRadio?.value || 'draft',
        publishAt: document.getElementById('promo-resource-publishAt').value || null
    };

    if (!payload.title || !payload.url) return;

    const btn = document.getElementById('promo-resource-submit-btn');
    btn.disabled = true;
    try {
        let res;
        if (id) {
            res = await fetch(`${API_URL}/api/promotions/${promotionId}/promotion-resources/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetch(`${API_URL}/api/promotions/${promotionId}/promotion-resources`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
        }
        if (res.ok) {
            window._promoResourceModal?.hide();
            await loadPromoResources();
        } else {
            const err = await res.json();
            alert('Error: ' + (err.error || 'Unknown error'));
        }
    } catch (err) {
        console.error('[submitPromoResource] Error:', err);
    } finally {
        btn.disabled = false;
    }
}

function editPromoResource(resourceId) {
    openPromoResourceModal(resourceId);
}

async function publishPromoResource(resourceId) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/api/promotions/${promotionId}/promotion-resources/${resourceId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ status: 'published', publishAt: null })
        });
        if (res.ok) await loadPromoResources();
    } catch (err) { console.error(err); }
}

async function unpublishPromoResource(resourceId) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/api/promotions/${promotionId}/promotion-resources/${resourceId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ status: 'draft', publishAt: null })
        });
        if (res.ok) await loadPromoResources();
    } catch (err) { console.error(err); }
}

async function deletePromoResource(resourceId) {
    if (!confirm('¿Eliminar este recurso? Esta acción no se puede deshacer.')) return;
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/api/promotions/${promotionId}/promotion-resources/${resourceId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) await loadPromoResources();
    } catch (err) { console.error(err); }
}

// Load calendar ID from backend for Overview preview
async function loadOverviewCalendarId() {
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/calendar`);

        if (response.ok) {
            const calendar = await response.json();
            // Store the calendar ID in the global variable
            currentCalendarId = calendar.googleCalendarId || '';
            //console.log('[loadOverviewCalendarId] Calendar ID loaded from backend:', currentCalendarId);

            // Setup the calendar preview with the new ID
            if (window.setupCalendarPreview) {
                window.setupCalendarPreview();
            }
        } else {
            currentCalendarId = '';
            //console.log('[loadOverviewCalendarId] No calendar found for this promotion');
        }
    } catch (error) {
        console.error('[loadOverviewCalendarId] Error loading calendar:', error);
        currentCalendarId = '';
    }
}

// Load and display next píldora alert in Overview
async function loadOverviewPildoraAlert() {
    try {
        const contentEl = document.getElementById('next-pildora-content');
        if (!contentEl) return;

        // Get current date
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        // Get all píldoras from extendedInfoData
        const modulesPildoras = extendedInfoData.modulesPildoras || [];

        // Flatten all píldoras from all modules
        let allPildoras = [];
        modulesPildoras.forEach(modulePildoras => {
            if (modulePildoras.pildoras && Array.isArray(modulePildoras.pildoras)) {
                allPildoras = allPildoras.concat(modulePildoras.pildoras);
            }
        });

        // Filter píldoras that are in the future and have a date
        const futurePildoras = allPildoras.filter(p => {
            if (!p.date) return false;
            const pildoraDate = p.date.split('T')[0]; // Extract just the date part
            return pildoraDate >= today;
        }).sort((a, b) => {
            const dateA = a.date.split('T')[0];
            const dateB = b.date.split('T')[0];
            return new Date(dateA) - new Date(dateB);
        });

        if (futurePildoras.length === 0) {
            contentEl.innerHTML = `
                <p class="text-muted small mb-0">
                    <i class="bi bi-check-circle me-2 text-success"></i>No hay píldoras pendientes
                </p>
            `;
            return;
        }

        const nextPildora = futurePildoras[0];
        const pildoraDate = new Date(nextPildora.date);
        const formattedDate = pildoraDate.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const daysUntil = Math.ceil((pildoraDate - now) / (1000 * 60 * 60 * 24));
        let daysText = '';
        if (daysUntil === 0) {
            daysText = '¡Hoy!';
        } else if (daysUntil === 1) {
            daysText = 'Mañana';
        } else {
            daysText = `En ${daysUntil} días`;
        }

        // Get students assigned to this píldora
        const studentsAssigned = (nextPildora.students && Array.isArray(nextPildora.students)) ? nextPildora.students : [];
        let studentsText = '';
        if (studentsAssigned.length > 0) {
            // Get current students list
            const allStudents = window.currentStudents || [];
            const assignedStudentNames = studentsAssigned
                .map(studentId => {
                    const student = allStudents.find(s => s.id === studentId || s._id === studentId);
                    return student ? studentFullName(student) : null;
                })
                .filter(Boolean);
            if (assignedStudentNames.length > 0) {
                studentsText = `<small class="text-muted d-block mb-1">${assignedStudentNames.join(', ')}</small>`;
            }
        }

        contentEl.innerHTML = `
            <div>
                <div class="d-flex align-items-start justify-content-between gap-2 mb-2">
                    <div class="flex-grow-1">
                        <h6 class="mb-1 text-dark">
                            <i class="bi bi-star-fill me-1 text-warning"></i>${nextPildora.title || 'Sin título'}
                        </h6>
                        <small class="text-muted d-block">${formattedDate}</small>
                    </div>
                    <span class="badge bg-primary text-white">${daysText}</span>
                </div>
                ${nextPildora.teacher ? `<small class="text-muted d-block mb-1"><strong>Profesor:</strong> ${nextPildora.teacher}</small>` : ''}
                ${studentsText}
                ${nextPildora.description ? `<small class="text-muted d-block">${nextPildora.description}</small>` : ''}
            </div>
        `;
    } catch (error) {
        console.error('[loadOverviewPildoraAlert] Error:', error);
        const contentEl = document.getElementById('next-pildora-content');
        if (contentEl) {
            contentEl.innerHTML = `<p class="text-danger small mb-0"><i class="bi bi-exclamation-triangle me-2"></i>Error cargando píldoras</p>`;
        }
    }
}

// Load and display attendance alert in Overview
async function loadOverviewAttendanceAlert() {
    try {
        const token = localStorage.getItem('token');
        const contentEl = document.getElementById('attendance-alert-content');
        if (!contentEl) return;

        // Get all students
        const studentsRes = await fetch(`${API_URL}/api/promotions/${promotionId}/students`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const students = await studentsRes.json();

        if (students.length === 0) {
            contentEl.innerHTML = `
                <p class="text-muted small mb-0">
                    <i class="bi bi-info-circle me-2"></i>Sin estudiantes registrados
                </p>
            `;
            return;
        }

        // Get only active students
        const activeStudents = students.filter(s => !s.isWithdrawn);

        if (activeStudents.length === 0) {
            contentEl.innerHTML = `
                <p class="text-muted small mb-0">
                    <i class="bi bi-info-circle me-2"></i>Sin estudiantes activos
                </p>
            `;
            return;
        }

        // Get promotion info to determine the date range for absences
        const promotionRes = await fetch(`${API_URL}/api/promotions/${promotionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const promotion = await promotionRes.json();

        // Calculate months to fetch for TOTAL absences (historical)
        const startDate = promotion.startDate ? new Date(promotion.startDate) : new Date();
        const today = new Date();
        const months = [];

        let currentDate = new Date(startDate);
        currentDate.setDate(1);

        while (currentDate <= today) {
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            months.push(`${year}-${month}`);
            currentDate.setMonth(currentDate.getMonth() + 1);
        }

        // Fetch attendance data for all months (for total absences)
        let allAttendanceData = [];
        for (const month of months) {
            try {
                const attendanceRes = await fetch(`${API_URL}/api/promotions/${promotionId}/attendance?month=${month}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (attendanceRes.ok) {
                    const monthData = await attendanceRes.json();
                    allAttendanceData = allAttendanceData.concat(monthData);
                }
            } catch (e) {
                console.warn(`Error fetching attendance for ${month}:`, e);
            }
        }

        // Also get CURRENT MONTH data for attendance rate calculation (matching Attendance tab)
        const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
        let currentMonthData = [];
        try {
            const attendanceRes = await fetch(`${API_URL}/api/promotions/${promotionId}/attendance?month=${currentMonth}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (attendanceRes.ok) {
                currentMonthData = await attendanceRes.json();
            }
        } catch (e) {
            console.warn(`Error fetching current month attendance:`, e);
        }

        // Calculate total absences per student (from all historical data)
        const absencesPerStudent = {};
        activeStudents.forEach(student => {
            // Use student.id (the custom id field) as the key, NOT _id
            absencesPerStudent[student.id] = {
                name: studentFullName(student),
                absences: 0,
                studentId: student.id
            };
        });

        // Count only 'Ausente' records from all months
        allAttendanceData.forEach(record => {
            const studentId = record.studentId;
            if (record.status === 'Ausente' && absencesPerStudent[studentId]) {
                absencesPerStudent[studentId].absences++;
            }
        });

        //console.log('[loadOverviewAttendanceAlert] Absences per student:', absencesPerStudent);
        //console.log('[loadOverviewAttendanceAlert] Total attendance records:', allAttendanceData.length);

        // Sort students by total absences (descending)
        const sortedStudents = Object.values(absencesPerStudent)
            .sort((a, b) => b.absences - a.absences);

        //console.log('[loadOverviewAttendanceAlert] Sorted students:', sortedStudents);

        // Calculate attendance rate using CURRENT MONTH data (matching the Attendance tab)
        let present = 0, absent = 0, late = 0, justified = 0, earlyLeave = 0;
        currentMonthData.forEach(record => {
            if (record.status === 'Presente') present++;
            else if (record.status === 'Ausente') absent++;
            else if (record.status === 'Con retraso') late++;
            else if (record.status === 'Justificado') justified++;
            else if (record.status === 'Sale antes') earlyLeave++;
        });

        const totalMarked = present + absent + late + justified + earlyLeave;
        const attendanceRate = totalMarked > 0 ? Math.round(((present + late + justified + earlyLeave) / totalMarked) * 100) : 0;

        // Get total active students
        const totalActive = activeStudents.length;

        let html = `
            <div class="d-flex align-items-center justify-content-between gap-3">
                <!-- Attendance Rate -->
                <div>
                    <small class="text-muted d-block mb-1">Asistencia</small>
                    <span class="badge fs-6 ${attendanceRate >= 80 ? 'bg-warning' : attendanceRate >= 60 ? 'bg-warning' : 'bg-danger'}">${attendanceRate}%</span>
                </div>
        `;

        // Show student with most TOTAL absences if there are any
        const studentsWithAbsences = sortedStudents.filter(s => s.absences > 0);

        if (studentsWithAbsences.length > 0) {
            const maxAbsenceStudent = studentsWithAbsences[0];
            html += `
                <!-- Max Absences -->
                <div class="flex-grow-1">
                    <small class="text-muted d-block mb-1">Mayor ausencias</small>
                    <div class="d-flex align-items-center gap-2">
                        <span class="small">${maxAbsenceStudent.name}</span>
                        <span class="badge bg-warning">${maxAbsenceStudent.absences}</span>
                    </div>
                </div>
            `;
        } else {
            html += `
                <!-- No Absences -->
                <div class="flex-grow-1">
                    <small class="text-success d-block">
                        <i class="bi bi-check-circle me-1"></i>¡Excelente asistencia!
                    </small>
                </div>
            `;
        }

        html += `</div>`;
        contentEl.innerHTML = html;
    } catch (error) {
        console.error('[loadOverviewAttendanceAlert] Error:', error);
        const contentEl = document.getElementById('attendance-alert-content');
        if (contentEl) {
            contentEl.innerHTML = `<p class="text-danger small mb-0"><i class="bi bi-exclamation-triangle me-2"></i>Error cargando asistencias</p>`;
        }
    }
}

async function loadCalendar() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/calendar`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const calendar = await response.json();
            // Store in global variable for use across the application
            currentCalendarId = calendar.googleCalendarId || '';
            //console.log('[loadCalendar] Calendar ID stored globally:', currentCalendarId);

            // Also store in the HTML field if it exists (for the calendar configuration tab)
            const calendarIdInput = document.getElementById('google-calendar-id');
            if (calendarIdInput) {
                calendarIdInput.value = currentCalendarId;
            }

            displayCalendar(currentCalendarId);
            // Also update the calendar preview in Overview
            if (window.setupCalendarPreview) {
                window.setupCalendarPreview();
            }
        }
    } catch (error) {
        console.error('Error loading calendar:', error);
    }
}

function displayCalendar(calendarId) {
    const preview = document.getElementById('calendar-preview');
    const iframe = document.getElementById('calendar-iframe');

    if (calendarId) {
        iframe.src = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId)}&ctz=Europe/Madrid`;
        preview.classList.remove('hidden');
    }
}

let currentEditingModuleId = null;

function addCoursField(courseName = '', courseUrl = '', courseDuration = 1, courseOffset = 0) {
    const container = document.getElementById('courses-container');
    const courseItem = document.createElement('div');
    courseItem.className = 'course-item mb-3 p-2 border rounded bg-white';

    // Reverse calculate UI values from stored values (force Number to avoid string concat)
    const semanaInicio = Number(courseOffset) + 1;
    const semanaFinal = Number(courseOffset) + Number(courseDuration);

    courseItem.innerHTML = `
        <div class="row align-items-end g-2">
            <div class="col-md-4">
                <label class="form-label form-label-sm">Nombre Curso</label>
                <input type="text" class="form-control form-control-sm course-name" placeholder="e.g., JavaScript Basics" value="${escapeHtml(courseName)}" required />
            </div>
            <div class="col-md-3">
                <label class="form-label form-label-sm">URL (opt)</label>
                <input type="url" class="form-control form-control-sm course-url" placeholder="https://..." value="${escapeHtml(courseUrl)}" />
            </div>
            <div class="col-md-2">
                <label class="form-label form-label-sm">Semana Inicio</label>
                <input type="number" class="form-control form-control-sm course-start-week" min="1" value="${semanaInicio}" required />
            </div>
            <div class="col-md-2">
                <label class="form-label form-label-sm">Semana Final</label>
                <input type="number" class="form-control form-control-sm course-end-week" min="1" value="${semanaFinal}" required />
            </div>
            <div class="col-md-1 text-end">
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeCoursField(this)">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
    `;
    container.appendChild(courseItem);
}

function removeCoursField(button) {
    button.closest('.course-item').remove();
}

function addProjectField(projectName = '', projectUrl = '', projectDuration = 1, projectOffset = 0, projectCompetenceIds = []) {
    const container = document.getElementById('projects-container');
    const projectItem = document.createElement('div');
    projectItem.className = 'project-item mb-3 p-2 border rounded bg-white';

    // Reverse calculate UI values from stored values (force Number to avoid string concat)
    const semanaInicio = Number(projectOffset) + 1;
    const semanaFinal = Number(projectOffset) + Number(projectDuration);

    projectItem.innerHTML = `
        <div class="row align-items-end g-2">
            <div class="col-md-4">
                <label class="form-label form-label-sm">Nombre Proyecto</label>
                <input type="text" class="form-control form-control-sm project-name" placeholder="e.g., Build a Todo App" value="${escapeHtml(projectName)}" required />
            </div>
            <div class="col-md-3">
                <label class="form-label form-label-sm">URL (opt)</label>
                <input type="url" class="form-control form-control-sm project-url" placeholder="https://github.com/..." value="${escapeHtml(projectUrl)}" />
            </div>
            <div class="col-md-2">
                <label class="form-label form-label-sm">Semana Inicio</label>
                <input type="number" class="form-control form-control-sm project-start-week" min="1" value="${semanaInicio}" required />
            </div>
            <div class="col-md-2">
                <label class="form-label form-label-sm">Semana Final</label>
                <input type="number" class="form-control form-control-sm project-end-week" min="1" value="${semanaFinal}" required />
            </div>
            <div class="col-md-1 text-end">
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeProjectField(this)">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
        <div class="mt-2">
            <div class="d-flex align-items-center gap-2">
                <button type="button" class="btn btn-xs btn-outline-warning py-0 px-2" style="font-size:0.75rem;"
                    onclick="openProjectCompetencePicker(this)">
                    <i class="bi bi-award me-1"></i>Competencias
                    <span class="badge bg-warning text-dark ms-1 project-comp-badge">${projectCompetenceIds.length || 0}</span>
                </button>
                <small class="text-muted project-comp-labels fst-italic"></small>
            </div>
            <input type="hidden" class="project-competence-ids" value="${escapeHtml(JSON.stringify(projectCompetenceIds))}">
        </div>
    `;
    container.appendChild(projectItem);

    // If we already have competence IDs, render the labels
    if (projectCompetenceIds.length) {
        _updateProjectCompetenceLabels(projectItem, projectCompetenceIds);
    }
}

function removeProjectField(button) {
    button.closest('.project-item').remove();
}

// ─── Helper: update the competence labels shown next to a project row ────────
function _updateProjectCompetenceLabels(projectItem, competenceIds) {
    const labelEl = projectItem.querySelector('.project-comp-labels');
    const badgeEl = projectItem.querySelector('.project-comp-badge');
    if (!labelEl || !badgeEl) return;

    const programComps = window.ProgramCompetences ? window.ProgramCompetences.getCompetences() : (window._extendedInfoCompetences || []);
    if (!competenceIds.length) {
        labelEl.textContent = '';
        badgeEl.textContent = '0';
        return;
    }
    const names = competenceIds.map(id => {
        const c = programComps.find(c => c.id == id);
        return c ? c.name : `#${id}`;
    });
    badgeEl.textContent = competenceIds.length;
    labelEl.textContent = names.join(', ');
}

// ─── Opens the competence picker popover for a project row ───────────────────
function openProjectCompetencePicker(btn) {
    const projectItem = btn.closest('.project-item');
    const hiddenInput = projectItem.querySelector('.project-competence-ids');
    let currentIds = [];
    try { currentIds = JSON.parse(hiddenInput.value || '[]'); } catch (e) { currentIds = []; }

    // Remove any existing picker
    document.getElementById('project-comp-picker')?.remove();

    const programComps = window.ProgramCompetences ? window.ProgramCompetences.getCompetences() : (window._extendedInfoCompetences || []);

    if (!programComps.length) {
        alert('No hay competencias añadidas al programa. Ve a Contenido del Programa → Competencias para añadirlas primero.');
        return;
    }

    const checkboxes = programComps.map((c, i) => {
        const checked = currentIds.includes(c.id) ? 'checked' : '';
        const safeId = `pcp-${i}`;
        return `<div class="form-check py-1 border-bottom">
            <input class="form-check-input pcp-check" type="checkbox" value="${escapeHtml(String(c.id))}" id="${safeId}" ${checked}>
            <label class="form-check-label small" for="${safeId}">
                <span class="badge bg-secondary me-1" style="font-size:.65rem;">${escapeHtml(c.area || '')}</span>
                ${escapeHtml(c.name)}
            </label>
        </div>`;
    }).join('');

    const picker = document.createElement('div');
    picker.id = 'project-comp-picker';
    picker.className = 'card shadow border position-absolute';
    picker.style.cssText = 'z-index:9999; min-width:320px; max-width:400px; max-height:320px; overflow-y:auto;';
    picker.innerHTML = `
        <div class="card-header py-2 px-3 d-flex justify-content-between align-items-center bg-light">
            <strong class="small"><i class="bi bi-award me-1"></i>Competencias de este proyecto</strong>
            <button type="button" class="btn-close btn-sm" onclick="document.getElementById('project-comp-picker')?.remove()"></button>
        </div>
        <div class="card-body py-2 px-3">
            <p class="text-muted small mb-2">Selecciona las competencias que se evaluarán en este proyecto:</p>
            ${checkboxes}
        </div>
        <div class="card-footer py-2 px-3 d-flex gap-2">
            <button type="button" class="btn btn-sm btn-primary flex-grow-1" onclick="saveProjectCompetencePicker()">
                <i class="bi bi-check-lg me-1"></i>Aplicar
            </button>
            <button type="button" class="btn btn-sm btn-secondary" onclick="document.getElementById('project-comp-picker')?.remove()">Cancelar</button>
        </div>`;

    // Store reference to projectItem for save
    picker._targetProjectItem = projectItem;
    document.body.appendChild(picker);

    // Position near the button
    const rect = btn.getBoundingClientRect();
    const pickerH = 320;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow > pickerH ? rect.bottom + window.scrollY + 4 : rect.top + window.scrollY - pickerH - 4;
    picker.style.top = `${top}px`;
    picker.style.left = `${Math.min(rect.left + window.scrollX, window.innerWidth - 420)}px`;

    // Close on outside click
    setTimeout(() => {
        document.addEventListener('click', _closePicker, { once: true });
    }, 50);
}

function _closePicker(e) {
    const picker = document.getElementById('project-comp-picker');
    if (picker && !picker.contains(e.target)) picker.remove();
}

function saveProjectCompetencePicker() {
    const picker = document.getElementById('project-comp-picker');
    if (!picker || !picker._targetProjectItem) return;

    const selectedIds = [...picker.querySelectorAll('.pcp-check:checked')].map(cb => {
        const n = parseInt(cb.value);
        return isNaN(n) ? cb.value : n;
    });

    const projectItem = picker._targetProjectItem;
    const hiddenInput = projectItem.querySelector('.project-competence-ids');
    hiddenInput.value = JSON.stringify(selectedIds);
    _updateProjectCompetenceLabels(projectItem, selectedIds);
    picker.remove();
}

// Píldoras UI
function addPildoraField(title = '', type = 'individual') {
    const container = document.getElementById('pildoras-container');
    const item = document.createElement('div');
    item.className = 'pildora-item mb-3 p-2 border rounded bg-white';
    item.innerHTML = `
        <div class="row align-items-end g-2">
            <div class="col-md-6">
                <label class="form-label form-label-sm">Título de la Píldora</label>
                <input type="text" class="form-control form-control-sm pildora-title" placeholder="e.g., Intro a Node.js" value="${escapeHtml(title)}" required />
            </div>
            <div class="col-md-4">
                <label class="form-label form-label-sm">Tipo</label>
                <select class="form-select form-select-sm pildora-type">
                    <option value="individual" ${type === 'individual' ? 'selected' : ''}>Individual</option>
                    <option value="couple" ${type === 'couple' ? 'selected' : ''}>Pareja</option>
                </select>
            </div>
            <div class="col-md-2 text-end">
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="removePildoraField(this)">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
    `;
    container.appendChild(item);
}

function removePildoraField(button) {
    button.closest('.pildora-item').remove();
}

function setupForms() {
    // Module form
    document.getElementById('module-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('module-name').value;
        const duration = parseInt(document.getElementById('module-duration').value);

        // Collect courses with URLs, duration, and offset (calculated from semana inicio/final)
        const courses = [];
        document.querySelectorAll('#courses-container .course-item').forEach(item => {
            const courseName = item.querySelector('.course-name')?.value || '';
            const courseUrl = item.querySelector('.course-url')?.value || '';
            const valInicio = item.querySelector('.course-start-week')?.value;
            const valFinal = item.querySelector('.course-end-week')?.value;

            const semanaInicio = parseInt(valInicio) || 1;
            const semanaFinal = parseInt(valFinal) || 1;

            const startOffset = Math.max(0, semanaInicio - 1);
            const duration = Math.max(1, semanaFinal - semanaInicio + 1);

            if (courseName) {
                courses.push({ name: courseName, url: courseUrl, duration: Number(duration), startOffset: Number(startOffset) });
            }
        });

        // Collect projects with URLs, duration, and offset
        const projects = [];
        document.querySelectorAll('#projects-container .project-item').forEach(item => {
            const projectName = item.querySelector('.project-name')?.value || '';
            const projectUrl = item.querySelector('.project-url')?.value || '';
            const valInicio = item.querySelector('.project-start-week')?.value;
            const valFinal = item.querySelector('.project-end-week')?.value;

            const semanaInicio = parseInt(valInicio) || 1;
            const semanaFinal = parseInt(valFinal) || 1;

            const startOffset = Math.max(0, semanaInicio - 1);
            const duration = Math.max(1, semanaFinal - semanaInicio + 1);

            let competenceIds = [];
            try { competenceIds = JSON.parse(item.querySelector('.project-competence-ids')?.value || '[]'); } catch (e) { competenceIds = []; }

            if (projectName) {
                projects.push({ name: projectName, url: projectUrl, duration: Number(duration), startOffset: Number(startOffset), competenceIds });
            }
        });

        // Collect pildoras
        const pildoras = [];
        document.querySelectorAll('#pildoras-container .pildora-item').forEach(item => {
            const title = item.querySelector('.pildora-title')?.value || '';
            const type = item.querySelector('.pildora-type')?.value || 'individual';
            if (title) {
                pildoras.push({ title, type, assignedStudentIds: [] });
            }
        });

        const token = localStorage.getItem('token');

        try {
            // Check if we're editing an existing module
            if (currentEditingModuleId) {
                // Update existing module
                const promotionResponse = await fetch(`${API_URL}/api/promotions/${promotionId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!promotionResponse.ok) {
                    alert('Error loading promotion data');
                    return;
                }

                const promotion = await promotionResponse.json();
                const moduleIndex = promotion.modules.findIndex(m => m.id === currentEditingModuleId);

                if (moduleIndex === -1) {
                    alert('Module not found');
                    return;
                }

                // Update the module while preserving its ID and creation date
                promotion.modules[moduleIndex] = {
                    ...promotion.modules[moduleIndex],
                    name,
                    duration,
                    courses,
                    projects,
                    pildoras: pildoras.length > 0 ? pildoras : (promotion.modules[moduleIndex].pildoras || [])
                };

                const updateResponse = await fetch(`${API_URL}/api/promotions/${promotionId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(promotion)
                });

                if (updateResponse.ok) {
                    moduleModal.hide();
                    document.getElementById('module-form').reset();
                    currentEditingModuleId = null;
                    loadModules();
                    loadPromotion();
                    alert('Module updated successfully');
                } else {
                    const error = await updateResponse.json();
                    alert(`Error: ${error.error || 'Failed to update module'}`);
                }
            } else {
                // Create new module
                const response = await fetch(`${API_URL}/api/promotions/${promotionId}/modules`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ name, duration, courses, projects, pildoras })
                });

                if (response.ok) {
                    moduleModal.hide();
                    document.getElementById('module-form').reset();
                    currentEditingModuleId = null;
                    loadModules();
                    loadPromotion();
                    alert('Module created successfully');
                } else {
                    const error = await response.json();
                    alert(`Error: ${error.error || 'Failed to save module'}`);
                }
            }
        } catch (error) {
            console.error('Error saving module:', error);
            alert('Error saving module');
        }
    });

    // Quick link form
    document.getElementById('quick-link-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('link-name').value;
        const url = document.getElementById('link-url').value;
        const platform = document.getElementById('link-platform').value || 'custom';

        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`${API_URL}/api/promotions/${promotionId}/quick-links`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, url, platform })
            });

            if (response.ok) {
                quickLinkModal.hide();
                document.getElementById('quick-link-form').reset();
                loadQuickLinks();
                refreshQuickActions();
            }
        } catch (error) {
            console.error('Error adding quick link:', error);
        }
    });

    // Section form
    document.getElementById('section-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('section-title').value;
        const content = document.getElementById('section-content').value;

        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`${API_URL}/api/promotions/${promotionId}/sections`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title, content })
            });

            if (response.ok) {
                sectionModal.hide();
                document.getElementById('section-form').reset();
                loadSections();
                loadPromotion();
            }
        } catch (error) {
            console.error('Error adding section:', error);
        }
    });

    // Calendar form
    document.getElementById('calendar-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const googleCalendarId = document.getElementById('google-calendar-id').value;

        if (!googleCalendarId) {
            alert('Please enter a Google Calendar ID');
            return;
        }

        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`${API_URL}/api/promotions/${promotionId}/calendar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ googleCalendarId })
            });

            if (response.ok) {
                displayCalendar(googleCalendarId);
                alert('Calendar saved successfully!');
            }
        } catch (error) {
            console.error('Error saving calendar:', error);
        }
    });

    // Student form
    document.getElementById('student-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('student-name').value;
        const lastname = document.getElementById('student-lastname').value;
        const email = document.getElementById('student-email').value;
        // const englishLevel = document.getElementById('student-english-level')?.value;
        // const educationLevel = document.getElementById('student-education-level')?.value;
        // const profession = document.getElementById('student-profession')?.value;
        // const community = document.getElementById('student-community')?.value;

        // Check if we're editing an existing student
        const editingStudentId = document.getElementById('student-form').dataset.editingStudentId;

        const token = localStorage.getItem('token');

        const studentData = {
            name,
            lastname,
            email
        };

        //console.log('Sending student data:', studentData);

        try {
            let response;

            if (editingStudentId) {
                // Update existing student using the /profile endpoint which works reliably
                response = await fetch(`${API_URL}/api/promotions/${promotionId}/students/${editingStudentId}/profile`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(studentData)
                });
            } else {
                // Create new student
                response = await fetch(`${API_URL}/api/promotions/${promotionId}/students`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(studentData)
                });
            }

            if (response.ok) {
                const data = await response.json();
                studentModal.hide();
                document.getElementById('student-form').reset();
                delete document.getElementById('student-form').dataset.editingStudentId;
                loadStudents();

                const action = editingStudentId ? 'updated' : 'added';
                alert(`Student ${action} successfully!`);
            } else {
                console.error('Response status:', response.status);
                console.error('Response headers:', response.headers);
                let errorMessage = 'Unknown error';

                // Clone the response so we can read it multiple times if needed
                const responseClone = response.clone();

                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                    // If response is not JSON (like HTML error page), get text from the clone
                    try {
                        const errorText = await responseClone.text();
                        console.error('Error response text:', errorText.substring(0, 200));
                        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                    } catch (textError) {
                        console.error('Could not read response text:', textError);
                        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                    }
                }

                alert(`Error ${editingStudentId ? 'updating' : 'adding'} student: ${errorMessage}`);
            }
        } catch (error) {
            console.error(`Error ${editingStudentId ? 'updating' : 'adding'} student:`, error);
            alert(`Error ${editingStudentId ? 'updating' : 'adding'} student`);
        }
    });
}

// ==================== STUDENT MANAGEMENT FUNCTIONS ====================
async function importStudentsFromExcel(input) {
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const formData = new FormData();
    formData.append('excelFile', file);

    const token = localStorage.getItem('token');

    const btn = document.querySelector('button[onclick*="students-excel-input"]');
    const originalBtnContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Importando...';

    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/students/upload-excel`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            const created = result.created?.length || 0;
            const skipped = result.skipped?.length || 0;
            const errors  = result.errors?.length  || 0;

            let lines = [];
            if (created > 0) lines.push(`✅ ${created} estudiante(s) importado(s) correctamente`);
            if (skipped > 0) lines.push(`⚠️ ${skipped} omitido(s) porque ya existían en la promoción`);
            if (errors  > 0) lines.push(`❌ ${errors} fila(s) con error`);

            if (created === 0 && skipped > 0 && errors === 0) {
                lines.push('\nTodos los estudiantes del archivo ya estaban registrados en esta promoción.');
            }

            if (result.errors && result.errors.length) {
                lines.push('\nDetalle de errores:\n' + result.errors.join('\n'));
            }

            alert(lines.join('\n'));
            if (created > 0) loadStudents();
        } else {
            alert(`Error al importar: ${result.error || 'Error desconocido'}`);
        }
    } catch (error) {
        console.error('Error importing students:', error);
        alert('Error al importar estudiantes desde Excel');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalBtnContent;
        input.value = '';
    }
}

// Download a blank Excel template with the 3 required columns for student import
function downloadStudentsExcelTemplate() {
    const headers = ['Nombre', 'Apellidos', 'Email'];
    const hint    = ['Ej: María', 'Ej: García López', 'Ej: maria@email.com'];

    const escape = v => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [
        headers.map(escape).join(','),
        hint.map(escape).join(',')
    ];
    const csvContent = rows.join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel UTF-8
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla_importar_estudiantes.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}


// Debug function to test student endpoints
async function debugStudentEndpoints() {
    //console.log('=== TESTING STUDENT ENDPOINTS ===');
    const token = localStorage.getItem('token');

    if (!window.currentStudents || window.currentStudents.length === 0) {
        //console.log('No students available for testing');
        return;
    }

    const student = window.currentStudents[0];
    //console.log('Testing with student:', student);
    //console.log('Student fields present:', { id: !!student.id, name: !!student.name, lastname: !!student.lastname, email: !!student.email, age: !!student.age, nationality: !!student.nationality, profession: !!student.profession, address: !!student.address });

    // Test GET endpoint
    try {
        const getResponse = await fetch(`${API_URL}/api/promotions/${promotionId}/students/${student.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        //console.log('GET /students/:id status:', getResponse.status);
        if (getResponse.ok) {
            const studentData = await getResponse.json();
            //console.log('GET student data:', studentData);
        }
    } catch (error) {
        //console.log('GET /students/:id error:', error.message);
    }

    // Test PUT /profile endpoint
    try {
        const testData = {
            name: student.name || 'Test Name',
            lastname: student.lastname || 'Test Lastname',
            email: student.email,
            age: student.age || 25,
            nationality: student.nationality || 'Test Nationality',
            profession: student.profession || 'Test Profession',
            address: student.address || 'Test Address'
        };

        //console.log('Testing PUT with data:', testData);

        const putResponse = await fetch(`${API_URL}/api/promotions/${promotionId}/students/${student.id}/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(testData)
        });

        //console.log('PUT /students/:id/profile status:', putResponse.status);
        if (putResponse.ok) {
            const updatedData = await putResponse.json();
            //console.log('✓ Profile endpoint works!');
            //console.log('Updated student data:', updatedData);
        } else {
            const errorText = await putResponse.text();
            //console.log('PUT error response:', errorText);
        }
    } catch (error) {
        //console.log('PUT /students/:id/profile error:', error.message);
    }
}

// Load and display students for the promotion
async function loadStudents(retryCount = 0) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/students`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            // On a brand-new promotion the server may not have committed the record yet — retry once with short backoff
            if (response.status === 404 && retryCount < 1) {
                await new Promise(resolve => setTimeout(resolve, 600));
                return loadStudents(retryCount + 1);
            }
            // For any other error just log silently — don't block the page with an alert
            console.warn(`loadStudents: HTTP ${response.status}`);
            const studentsContainer = document.getElementById('students-list');
            if (studentsContainer) {
                studentsContainer.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No se pudo cargar la lista de estudiantes.</td></tr>';
            }
            return;
        }

        const students = await response.json();
        //console.log('Loaded students:', students);

        // Store students data globally for multi-select operations
        // Backend already normalizes the ID field, so we can use it directly
        window.currentStudents = students;
        // Clear any active search filter
        const searchInput = document.getElementById('student-search-input');
        if (searchInput) searchInput.value = '';
        displayStudents(window.currentStudents);

        // Update progress info with newly loaded students
        if (window.currentPromotion) {
            updateProgressInfo(window.currentPromotion, window.currentStudents);
        }
    } catch (error) {
        console.error('Error loading students:', error);
        // Never show a blocking alert during page load — just display inline message
        const studentsContainer = document.getElementById('students-list');
        if (studentsContainer) {
            studentsContainer.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">Error al cargar estudiantes.</td></tr>';
        }
    }
}

// Display students in a table format for better readability
function displayStudents(students) {
    const studentsContainer = document.getElementById('students-list');
    if (!studentsContainer) {
        console.warn('Students container not found');
        return;
    }

    if (!students || students.length === 0) {
        studentsContainer.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">No students registered yet.</td></tr>';
        return;
    }

    // Sort: active students first, withdrawn at the bottom
    const sorted = [...students].sort((a, b) => {
        const aW = !!a.isWithdrawn || (a.withdrawal && a.withdrawal.date);
        const bW = !!b.isWithdrawn || (b.withdrawal && b.withdrawal.date);
        if (aW === bW) return (a.name || '').localeCompare(b.name || '');
        return aW ? 1 : -1;
    });

    const activeCount = sorted.filter(s => !(!!s.isWithdrawn || (s.withdrawal && s.withdrawal.date))).length;
    const withdrawnCount = sorted.length - activeCount;

    studentsContainer.innerHTML = sorted.map((student, index) => {
        const isStudWithdrawn = !!student.isWithdrawn || (student.withdrawal && student.withdrawal.date);
        const separator = (index === activeCount && withdrawnCount > 0)
            ? `<tr class="table-danger"><td colspan="4" class="py-1 px-3 small fw-semibold text-danger"><i class="bi bi-person-x me-1"></i>Bajas oficiales (${withdrawnCount})</td></tr>`
            : '';
        const row = `<tr class="${isStudWithdrawn ? 'student-row-withdrawn' : ''}">
            <td>
                <input type="checkbox" class="form-check-input student-checkbox" 
                       data-student-id="${student.id}" 
                       onchange="updateSelectionState()"
                       ${isStudWithdrawn ? 'disabled' : ''}>
            </td>
            <td>
                <div class="fw-bold">
                    ${!isStudWithdrawn
                ? `<a href="#" class="student-name-link text-decoration-none text-dark"
                            onclick="event.preventDefault(); window.StudentTracking?.openFicha('${student.id}')"
                            title="Ver ficha de ${escapeHtml(studentFullName(student))}"
                            >${student.name || student.lastname ? escapeHtml(studentFullName(student)) : 'N/A'}</a>`
                : (student.name || student.lastname ? escapeHtml(studentFullName(student)) : 'N/A')
            }
                    ${isStudWithdrawn ? `<span class="badge bg-danger ms-2" style="font-size:.65rem;" title="Baja desde ${student.withdrawal?.date ? new Date(student.withdrawal.date).toLocaleDateString('es-ES') : ''}">BAJA</span>` : ''}
                </div>
            </td>
            <td>${student.email || 'N/A'}</td>
            <td class="text-end">
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-success" onclick="window.StudentTracking?.openFicha('${student.id}')" title="Ficha de Seguimiento">
                        <i class="bi bi-person-lines-fill"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="if(window.Reports){ window.Reports.printTechnical('${student.id}', promotionId) } else { alert('La librería de informes no está cargada.') }" title="PDF Seguimiento Técnico">
                        <i class="bi bi-file-earmark-bar-graph"></i>
                    </button>
                    ${!student.isWithdrawn ? `<button class="btn btn-sm btn-outline-danger" onclick="deleteStudent('${student.id}', '${student.email}')" title="Delete">
                        <i class="bi bi-trash"></i>
                    </button>` : ''}
                </div>
            </td>
        </tr>`;
        return separator + row;
    }).join('');

    updateSelectionState();
}

// Delete individual student
async function deleteStudent(studentId, studentEmail) {
    if (!confirm(`Are you sure you want to delete student ${studentEmail}?`)) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/students/${studentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            alert('Student deleted successfully');
            loadStudents();
        } else {
            alert('Error deleting student');
        }
    } catch (error) {
        console.error('Error deleting student:', error);
        alert('Error deleting student');
    }
}

// Edit student - populate form with existing data
function editStudent(studentId) {
    const student = window.currentStudents?.find(s => s.id === studentId);
    if (!student) {
        alert('Student not found');
        return;
    }

    // Populate the form with existing data
    document.getElementById('student-name').value = student.name || '';
    document.getElementById('student-lastname').value = student.lastname || '';
    document.getElementById('student-email').value = student.email || '';

    // Store the student ID for updating
    document.getElementById('student-form').dataset.editingStudentId = studentId;

    // Update modal title
    const modalTitle = document.querySelector('#studentModal .modal-title');
    if (modalTitle) modalTitle.textContent = 'Edit Student';

    // Show the modal
    studentModal.show();
}

// Export all students as CSV
// ── Export students to Excel ───────────────────────────────────────────
// ── Export students to Excel ───────────────────────────────────────────
async function downloadStudentsExcel(students, filenamePrefix = 'estudiantes') {
    if (!students || students.length === 0) {
        alert('No hay estudiantes para exportar.');
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        alert('Sesión expirada. Por favor, inicie sesión.');
        return;
    }

    try {
        const studentIds = students.map(s => s.id).join(',');
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/students/export?ids=${studentIds}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Error al generar el archivo Excel');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filenamePrefix}-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Error exporting students to Excel:', error);
        alert('Error al exportar a Excel: ' + error.message);
    }
}

async function exportAllStudentsExcel() {
    const students = window.currentStudents || [];
    await downloadStudentsExcel(students, 'todos-los-estudiantes');
}

async function exportSelectedStudentsExcel() {
    const selectedCheckboxes = document.querySelectorAll('.student-checkbox:checked');
    const selectedStudentIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.studentId);

    if (selectedStudentIds.length === 0) {
        alert('No hay estudiantes seleccionados para exportar.');
        return;
    }

    const selectedStudents = (window.currentStudents || []).filter(s => selectedStudentIds.includes(s.id));
    await downloadStudentsExcel(selectedStudents, 'estudiantes-seleccionados');
}

// Keep CSV as fallback or legacy if needed, but the user wants Excel
function exportStudentsToCSV(students, filename) {
    const rows = [];
    rows.push(['Nombre', 'Apellidos', 'Email', 'Teléfono', 'Edad', 'Situación Administrativa',
        'Nacionalidad', 'Documento', 'Sexo', 'Nivel Inglés', 'Nivel Educativo', 'Profesión', 'Comunidad'].join(','));

    students.forEach(student => {
        const escape = v => `"${(v || '').toString().replace(/"/g, '""')}"`;
        rows.push([
            escape(student.name),
            escape(student.lastname),
            escape(student.email),
            escape(student.phone),
            student.age || '',
            escape(student.administrativeSituation),
            escape(student.nationality),
            escape(student.identificationDocument),
            escape(student.gender),
            escape(student.englishLevel),
            escape(student.educationLevel),
            escape(student.profession),
            escape(student.community)
        ].join(','));
    });

    const csvContent = rows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Export all students
function exportAllStudentsCSV() {
    const students = window.currentStudents || [];
    if (students.length === 0) {
        alert('No students to export.');
        return;
    }
    exportStudentsToCSV(students, `all-students-promotion-${promotionId}.csv`);
}

const platformIcons = {
    'zoom': { name: 'Zoom', icon: 'bi-camera-video', color: '#2D8CFF' },
    'discord': { name: 'Discord', icon: 'bi-discord', color: '#5865F2' },
    'classroom': { name: 'Google Classroom', icon: 'bi-google', color: '#EA4335' },
    'github': { name: 'GitHub', icon: 'bi-github', color: '#333' },
    'custom': { name: 'Link', icon: 'bi-link', color: '#667eea' }
};

function updateLinkName() {
    const platform = document.getElementById('link-platform').value;
    const nameInput = document.getElementById('link-name');

    if (platform && platform !== 'custom' && platformIcons[platform]) {
        nameInput.value = platformIcons[platform].name;
        // nameInput.readOnly = true; // User requested ability to change name
    } else {
        // nameInput.readOnly = false;
        if (platform === 'custom') {
            nameInput.value = '';
        }
    }
}

function openModuleModal() {
    document.getElementById('module-form').reset();
    document.getElementById('moduleModalTitle').textContent = 'Add Module';
    document.getElementById('courses-container').innerHTML = '';
    document.getElementById('projects-container').innerHTML = '';
    currentEditingModuleId = null;

    // Add one empty course field to start
    addCoursField();
    // Add one empty project field to start
    addProjectField();

    moduleModal.show();
}

function openQuickLinkModal() {
    document.getElementById('quick-link-form').reset();
    document.getElementById('link-platform').value = '';
    document.getElementById('link-name').readOnly = false;
    quickLinkModal.show();
}

function openSectionModal() {
    document.getElementById('section-form').reset();
    sectionModal.show();
}

function openStudentModal() {
    document.getElementById('student-form').reset();

    // Clear any editing state
    delete document.getElementById('student-form').dataset.editingStudentId;

    // Update modal title
    const modalTitle = document.querySelector('#studentModal .modal-title');
    if (modalTitle) modalTitle.textContent = 'Add Student';

    studentModal.show();
}

async function deleteQuickLink(linkId) {
    if (!confirm('Are you sure?')) return;

    const token = localStorage.getItem('token');

    try {
        await fetch(`${API_URL}/api/promotions/${promotionId}/quick-links/${linkId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        loadQuickLinks();
        refreshQuickActions();
    } catch (error) {
        console.error('Error deleting link:', error);
    }
}

// ==================== EDIT PROMOTION ====================

let _editPromotionModal = null;

function openEditPromotionModal() {
    const promotion = window.currentPromotion;
    if (!promotion) {
        alert('No se pudieron cargar los datos de la promoción.');
        return;
    }

    // Pre-fill fields
    const nameEl   = document.getElementById('edit-promotion-name');
    const descEl   = document.getElementById('edit-promotion-desc');
    const weeksEl  = document.getElementById('edit-promotion-weeks');
    const hoursEl  = document.getElementById('edit-promotion-hours');
    const startEl  = document.getElementById('edit-promotion-start');
    const endEl    = document.getElementById('edit-promotion-end');
    const alertEl  = document.getElementById('edit-promotion-alert');

    if (nameEl)  nameEl.value  = promotion.name        || '';
    if (descEl)  descEl.value  = promotion.description || '';
    if (weeksEl) weeksEl.value = promotion.weeks       || '';
    // Pre-fill totalHours from extendedInfoData if available
    if (hoursEl) hoursEl.value = extendedInfoData?.totalHours || '';

    // Dates arrive as ISO strings — convert to YYYY-MM-DD for <input type="date">
    if (startEl) startEl.value = promotion.startDate ? promotion.startDate.slice(0, 10) : '';
    if (endEl)   endEl.value   = promotion.endDate   ? promotion.endDate.slice(0, 10)   : '';

    if (alertEl) alertEl.classList.add('d-none');

    if (!_editPromotionModal) {
        const el = document.getElementById('editPromotionModal');
        if (!el) return;
        _editPromotionModal = new bootstrap.Modal(el);
    }
    _editPromotionModal.show();
}

async function saveEditPromotion(event) {
    event.preventDefault();

    const nameEl   = document.getElementById('edit-promotion-name');
    const descEl   = document.getElementById('edit-promotion-desc');
    const weeksEl  = document.getElementById('edit-promotion-weeks');
    const hoursEl  = document.getElementById('edit-promotion-hours');
    const startEl  = document.getElementById('edit-promotion-start');
    const endEl    = document.getElementById('edit-promotion-end');
    const alertEl  = document.getElementById('edit-promotion-alert');
    const saveBtn  = document.getElementById('edit-promotion-save-btn');
    const spinner  = saveBtn?.querySelector('.spinner-border');
    const label    = saveBtn?.querySelector('.btn-label');

    const payload = {
        name:        nameEl?.value.trim(),
        description: descEl?.value.trim(),
        weeks:       parseInt(weeksEl?.value, 10) || undefined,
        totalHours:  parseInt(hoursEl?.value, 10) || undefined,
        startDate:   startEl?.value || undefined,
        endDate:     endEl?.value   || undefined,
    };

    if (!payload.name) {
        if (alertEl) { alertEl.textContent = 'El nombre de la promoción es obligatorio.'; alertEl.classList.remove('d-none'); }
        return;
    }

    // Show spinner
    if (saveBtn) saveBtn.disabled = true;
    if (spinner) spinner.classList.remove('d-none');
    if (label)   label.classList.add('d-none');
    if (alertEl) alertEl.classList.add('d-none');

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/api/promotions/${promotionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || `Error ${res.status}`);
        }

        if (_editPromotionModal) _editPromotionModal.hide();

        // Update local extendedInfoData with new totalHours so Syllabus picks it up
        if (payload.totalHours && extendedInfoData) {
            extendedInfoData.totalHours = String(payload.totalHours);
        }

        // Reload promotion data to refresh header/progress bar
        await loadPromotion();

    } catch (err) {
        console.error('Error updating promotion:', err);
        if (alertEl) {
            alertEl.textContent = err.message || 'Error al guardar los cambios.';
            alertEl.classList.remove('d-none');
        }
    } finally {
        if (saveBtn) saveBtn.disabled = false;
        if (spinner) spinner.classList.add('d-none');
        if (label)   label.classList.remove('d-none');
    }
}

// ==================== DELETE PROMOTION ====================

function openDeletePromotionModal() {
    if (!deletePromotionModal) {
        const el = document.getElementById('deletePromotionModal');
        if (!el) return;
        deletePromotionModal = new bootstrap.Modal(el);
    }
    const input = document.getElementById('delete-promotion-confirm-input');
    if (input) {
        input.value = '';
        input.focus();
    }
    deletePromotionModal.show();
}

async function confirmDeletePromotion() {
    const input = document.getElementById('delete-promotion-confirm-input');
    if (!input || input.value.trim().toUpperCase() !== 'ELIMINAR') {
        alert('Para confirmar, escribe exactamente "ELIMINAR".');
        return;
    }

    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            if (deletePromotionModal) {
                deletePromotionModal.hide();
            }
            window.location.href = 'dashboard.html';
        } else {
            alert('Error al eliminar la promoción');
        }
    } catch (error) {
        console.error('Error deleting promotion:', error);
        alert('Error al eliminar la promoción');
    }
}

async function deleteSection(sectionId) {
    if (!confirm('Are you sure?')) return;

    const token = localStorage.getItem('token');

    try {
        await fetch(`${API_URL}/api/promotions/${promotionId}/sections/${sectionId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        loadSections();
        loadPromotion();
    } catch (error) {
        console.error('Error deleting section:', error);
    }
}

/**
 * Returns the base path for the public promotion page.
 * Uses clean URLs (no .html) to avoid serve/GitHub Pages redirect stripping query strings.
 */
function getPublicPromotionPath() {
    const isGitHubPages = window.location.hostname.includes('github.io');
    if (isGitHubPages) {
        const repoName = window.location.pathname.split('/')[1];
        return `/${repoName}/public-promotion`;
    }
    return '/public-promotion';
}

async function previewPromotion() {
    // Generate the same link as Access Settings
    const baseUrl = window.location.origin;
    let previewLink = `${baseUrl}${getPublicPromotionPath()}?id=${promotionId}&preview=1`;

    // Try to get the password to auto-verify access
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const promotion = await response.json();
            if (promotion.accessPassword) {
                // Include password in URL for auto-verification
                previewLink += `&pwd=${encodeURIComponent(promotion.accessPassword)}`;
            }
        }
    } catch (error) {
        console.error('Error loading promotion for preview:', error);
    }

    // Open in a new window
    window.open(previewLink, '_blank');
}

// (student role view logic is applied inside the main DOMContentLoaded block)

// ==================== COLLABORATORS ====================

// ==================== COLLABORATORS ====================

async function loadCollaborators() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/collaborators`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const collaborators = await response.json();
            console.log('[loadCollaborators] received:', JSON.stringify(collaborators));
            _currentCollabModulesList = collaborators;
            displayCollaborators(collaborators);
        } else {
            console.error('[loadCollaborators] error:', response.status, await response.text());
        }
    } catch (error) {
        console.error('Error loading collaborators:', error);
    }
}

async function displayCollaborators(collaborators) {
    const tbody = document.getElementById('collaborators-list-body');
    const listGroup = document.getElementById('collaborators-list');

    if (!tbody && !listGroup) return;

    const userId = currentUser.id || currentUser._id;
    const role = localStorage.getItem('role') || currentUser.userRole || currentUser.role;
    const isAdmin = role === 'superadmin';
    const isOwner = window.currentPromotion && window.currentPromotion.teacherId === userId;
    const isCollab = window.currentPromotion && (window.currentPromotion.collaborators || []).includes(userId);
    const canManage = isOwner || isCollab || isAdmin;

    const modules = window.promotionModules || [];
    const roleColors = { 'Formador/a': 'primary', 'CoFormador/a': 'success', 'Coordinador/a': 'warning' };

    const getModuleNames = (moduleIds) => {
        if (!moduleIds || moduleIds.length === 0) return '<span class="text-muted small">—</span>';
        if (modules.length > 0 && moduleIds.length === modules.length) return '<span class="badge bg-secondary">Todos</span>';
        return moduleIds.map(mid => {
            const mod = modules.find(m => m.id === mid);
            return mod ? `<span class="badge bg-light text-dark border me-1">${escapeHtml(mod.name)}</span>` : '';
        }).join('');
    };

    // Update table view
    if (tbody) {
        tbody.innerHTML = '';
        if (collaborators.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No collaborators added yet</td></tr>';
        } else {
            collaborators.forEach(collab => {
                const userRole = collab.userRole || 'Formador/a';
                const badgeColor = roleColors[userRole] || 'secondary';
                const ownerBadge = collab.isOwner ? '<span class="badge bg-dark ms-1">Owner</span>' : '';
                const editModulesBtn = canManage
                    ? `<button class="btn btn-sm btn-outline-primary me-1" onclick="openCollaboratorModulesModal('${collab.id}')" title="Modificar"><i class="bi bi-pencil"></i></button>`
                    : '';
                const removeBtn = (canManage && !collab.isOwner)
                    ? `<button class="btn btn-sm btn-outline-danger" onclick="removeCollaborator('${collab.id}')" title="Quitar colaborador"><i class="bi bi-trash"></i></button>`
                    : '';
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${escapeHtml(collab.name)} ${ownerBadge}</td>
                    <td><span class="badge bg-${badgeColor}">${escapeHtml(userRole)}</span></td>
                    <td>${escapeHtml(collab.email)}</td>
                    <td>${getModuleNames(collab.moduleIds)}</td>
                    <td class="text-nowrap">${editModulesBtn}${removeBtn}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    // Update list-group view
    if (listGroup) {
        listGroup.innerHTML = '';
        if (collaborators.length === 0) {
            listGroup.innerHTML = '<p class="text-muted p-3">No collaborators yet</p>';
        } else {
            collaborators.forEach(teacher => {
                const userRole = teacher.userRole || 'Formador/a';
                const badgeColor = roleColors[userRole] || 'secondary';
                const ownerBadge = teacher.isOwner ? '<span class="badge bg-dark ms-2">Owner</span>' : '';
                const editModulesBtn = canManage
                    ? `<button class="btn btn-sm btn-outline-primary me-1" onclick="openCollaboratorModulesModal('${teacher.id}')" title="Modificar"><i class="bi bi-pencil"></i></button>`
                    : '';
                const deleteBtn = (canManage && !teacher.isOwner)
                    ? `<button class="btn btn-sm btn-outline-danger" onclick="removeCollaborator('${teacher.id}')" title="Quitar colaborador"><i class="bi bi-trash"></i></button>`
                    : '';
                const div = document.createElement('div');
                div.className = 'list-group-item d-flex justify-content-between align-items-center';
                div.innerHTML = `
                    <div>
                        <h6 class="mb-1">${escapeHtml(teacher.name)} ${ownerBadge}</h6>
                        <span class="badge bg-${badgeColor} me-2">${escapeHtml(userRole)}</span>
                        <span class="text-muted small">${escapeHtml(teacher.email)}</span>
                        <div class="mt-1">${getModuleNames(teacher.moduleIds)}</div>
                    </div>
                    <div class="d-flex gap-1">${editModulesBtn}${deleteBtn}</div>
                `;
                listGroup.appendChild(div);
            });
        }
    }
}

let collaboratorModulesModal;
let _currentCollabModulesId = null;
let _currentCollabModulesList = [];

function openCollaboratorModulesModal(collaboratorId) {
    if (!collaboratorModulesModal) {
        collaboratorModulesModal = new bootstrap.Modal(document.getElementById('collaboratorModulesModal'));
    }
    _currentCollabModulesId = collaboratorId;

    const allCollabs = _currentCollabModulesList || [];
    const entry = allCollabs.find(c => c.id === collaboratorId);
    
    // Populate header info (Read-only)
    if (entry) {
        document.getElementById('collab-name-display').textContent = entry.name || '';
        document.getElementById('collab-email-display').textContent = entry.email || '';
        document.getElementById('collab-role-display').textContent = entry.userRole || 'Colaborador';
    }

    const modules = window.promotionModules || [];
    const checklist = document.getElementById('collab-modules-checklist');
    checklist.innerHTML = '';
    const selected = entry ? (entry.moduleIds || []) : [];

    if (modules.length === 0) {
        checklist.innerHTML = '<p class="text-muted small">No hay módulos definidos en el roadmap.</p>';
    } else {
        modules.forEach(mod => {
            const checked = selected.includes(mod.id) ? 'checked' : '';
            const div = document.createElement('div');
            div.className = 'form-check';
            div.innerHTML = `
                <input class="form-check-input" type="checkbox" value="${mod.id}" id="collab-mod-${mod.id}" ${checked}>
                <label class="form-check-label" for="collab-mod-${mod.id}">${escapeHtml(mod.name)}</label>
            `;
            checklist.appendChild(div);
        });
    }

    collaboratorModulesModal.show();
}

async function saveCollaboratorModules() {
    const checkboxes = document.querySelectorAll('#collab-modules-checklist .form-check-input:checked');
    const moduleIds = Array.from(checkboxes).map(cb => cb.value);

    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/collaborators/${_currentCollabModulesId}/modules`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ moduleIds })
        });
        if (response.ok) {
            collaboratorModulesModal.hide();

            // Update local list for instant render
            const collabEntry = (_currentCollabModulesList || []).find(c => c.id === _currentCollabModulesId);
            if (collabEntry) {
                collabEntry.moduleIds = moduleIds;
            }
            displayCollaborators(_currentCollabModulesList || []);

            // Re-fetch everything to ensure perfect sync
            await loadCollaborators();

            // Update main promotion object to reflect new assigned modules in GANNT, etc.
            const promoRes = await fetch(`${API_URL}/api/promotions/${promotionId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (promoRes.ok) {
                const promo = await promoRes.json();
                window.currentPromotion = promo;
            }

            // Sync with Team tab if this person is there
            if (extendedInfoData && extendedInfoData.team) {
                const modNames = [];
                moduleIds.forEach(mid => {
                    const found = (window.promotionModules || []).find(m => String(m.id) === String(mid));
                    if (found) modNames.push(found.name);
                });

                extendedInfoData.team.forEach(m => {
                    if (m.collaboratorId === _currentCollabModulesId) {
                        m.moduleIds = moduleIds;
                        m.moduleName = modNames.join(', ');
                    }
                });
                displayTeam();
            }
        } else {
            const data = await response.json();
            alert(data.error || 'Error guardando módulos');
        }
    } catch (error) {
        console.error('Error in saveCollaboratorModules:', error);
        alert('Error de conexión');
    }
}

async function openCollaboratorModal() {
    const select = document.getElementById('collaborator-select');
    if (!select) return;

    // Reset preview
    document.getElementById('collaborator-info-preview').classList.add('d-none');

    // Populate module checkboxes
    const moduleChecklist = document.getElementById('collaborator-module-checklist');
    const modules = window.promotionModules || [];
    if (modules.length === 0) {
        moduleChecklist.innerHTML = '<span class="text-muted small">No hay módulos definidos en el roadmap.</span>';
    } else {
        moduleChecklist.innerHTML = '';
        modules.forEach(mod => {
            const div = document.createElement('div');
            div.className = 'form-check';
            div.innerHTML = `
                <input class="form-check-input" type="checkbox" value="${mod.id}" id="add-collab-mod-${mod.id}">
                <label class="form-check-label" for="add-collab-mod-${mod.id}">${escapeHtml(mod.name)}</label>
            `;
            moduleChecklist.appendChild(div);
        });
    }

    select.innerHTML = '<option value="">Loading users...</option>';
    collaboratorModal.show();

    const token = localStorage.getItem('token');
    try {
        const [teachersRes, collabRes, promoRes] = await Promise.all([
            fetch(`${API_URL}/api/teachers`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/api/promotions/${promotionId}/collaborators`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/api/promotions/${promotionId}`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (teachersRes.ok && collabRes.ok && promoRes.ok) {
            const allTeachers = await teachersRes.json();
            const currentCollaborators = await collabRes.json();
            const promo = await promoRes.json();

            const existingIds = new Set(currentCollaborators.map(c => c.id));

            const available = allTeachers.filter(t =>
                t.id !== currentUser.id &&
                t.id !== promo.teacherId &&
                !existingIds.has(t.id)
            );

            // Store teacher data for preview use
            select._teacherData = {};
            available.forEach(t => { select._teacherData[t.id] = t; });

            if (available.length === 0) {
                select.innerHTML = '<option value="">No other users available</option>';
            } else {
                select.innerHTML = '<option value="">Select a user...</option>';
                available.forEach(t => {
                    const opt = document.createElement('option');
                    opt.value = t.id;
                    opt.textContent = `${t.name} — ${t.userRole || 'Formador/a'} (${t.email})`;
                    select.appendChild(opt);
                });
            }
        }
    } catch (error) {
        console.error('Error loading users:', error);
        if (select) select.innerHTML = '<option value="">Error loading users</option>';
    }
}

function onCollaboratorSelected() {
    const select = document.getElementById('collaborator-select');
    const preview = document.getElementById('collaborator-info-preview');
    const teacher = select._teacherData && select._teacherData[select.value];
    if (!teacher) { preview.classList.add('d-none'); return; }

    const roleColors = { 'Formador/a': 'primary', 'CoFormador/a': 'success', 'Coordinador/a': 'warning' };
    const role = teacher.userRole || 'Formador/a';
    document.getElementById('collab-preview-name').textContent = teacher.name;
    document.getElementById('collab-preview-email').textContent = teacher.email;
    const badge = document.getElementById('collab-preview-role-badge');
    badge.textContent = role;
    badge.className = `badge bg-${roleColors[role] || 'secondary'} mt-1`;
    preview.classList.remove('d-none');
}

async function addCollaboratorById() {
    const teacherId = document.getElementById('collaborator-select').value;
    if (!teacherId) {
        alert('Please select a user');
        return;
    }
    const checked = document.querySelectorAll('#collaborator-module-checklist .form-check-input:checked');
    const moduleIds = Array.from(checked).map(cb => cb.value);

    // Diagnostic: log what we're sending vs what the promotion has
    console.log('[addCollaboratorById] currentUser.id:', currentUser.id);
    console.log('[addCollaboratorById] promotion.teacherId:', window.currentPromotion?.teacherId);
    console.log('[addCollaboratorById] match:', currentUser.id === window.currentPromotion?.teacherId);
    console.log('[addCollaboratorById] teacherId to add:', teacherId, '| moduleIds:', moduleIds);

    // Disable button while request is in flight
    const addBtn = document.querySelector('#collaboratorModal .btn-primary');
    if (addBtn) { addBtn.disabled = true; addBtn.textContent = 'Agregando...'; }

    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/collaborators`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ teacherId, moduleIds })
        });

        const data = await response.json();
        console.log('[addCollaboratorById] response status:', response.status, '| body:', JSON.stringify(data));

        if (response.ok) {
            collaboratorModal.hide();
            await loadCollaborators();
        } else {
            console.error('[addCollaboratorById] Server error:', response.status, data);
            alert(data.error || 'Failed to add collaborator');
            if (addBtn) { addBtn.disabled = false; addBtn.textContent = 'Agregar Colaborador'; }
        }
    } catch (error) {
        console.error('Error adding collaborator:', error);
        alert('Connection error');
        if (addBtn) { addBtn.disabled = false; addBtn.textContent = 'Agregar Colaborador'; }
    }
}

async function removeCollaborator(teacherId) {
    if (!confirm('¿Estás seguro de que deseas quitar a este colaborador del programa?')) return;

    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/collaborators/${teacherId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            // Also remove from team list if present
            const tIdx = (extendedInfoData.team || []).findIndex(m => m.collaboratorId === teacherId);
            if (tIdx !== -1) {
                extendedInfoData.team.splice(tIdx, 1);
            }
            // Better to reload or just refresh lists
            await loadCollaborators();
            displayTeam();
        } else {
            const data = await response.json();
            alert(data.error || 'No se pudo quitar al colaborador');
        }
    } catch (error) {
        console.error('Error removing collaborator:', error);
        alert('Error de conexión');
    }
}

// ==================== ACCESS SETTINGS ====================

async function loadAccessPassword() {
    if (!isTeacherOrAdmin()) return;

    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/access-password`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            console.error('[loadAccessPassword] API error:', response.status, await response.text().catch(() => ''));
        } else {
            const data = await response.json();
            const passwordInput = document.getElementById('access-password-input');
            const accessLinkInput = document.getElementById('student-access-link');

            if (passwordInput) {
                passwordInput.value = data.accessPassword || '';
            }

            // Update the access link
            if (accessLinkInput) {
                accessLinkInput.value = `${window.location.origin}${getPublicPromotionPath()}?id=${promotionId}`;
            }
        }
    } catch (error) {
        console.error('Error loading access password:', error);
    }

    // Load teaching content
    loadTeachingContent();

    // Load Asana workspace configuration
    loadAsanaWorkspace();
}

async function updateAccessPassword(source = 'default') {
    if (!isTeacherOrAdmin()) return;

    const token = localStorage.getItem('token');

    // Determine which input fields to use based on source
    const prefix = source === 'teacher-area' ? 'teacher-area-' : '';
    const passwordInput = document.getElementById(`${prefix}access-password-input`);
    const alertEl = document.getElementById(`${prefix}password-alert`);
    const password = passwordInput ? passwordInput.value.trim() : '';

    try {
        let response;
        if (password) {
            // Set new password
            response = await fetch(`${API_URL}/api/promotions/${promotionId}/access-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ password })
            });
        } else {
            // Remove password protection (if endpoint exists)
            response = await fetch(`${API_URL}/api/promotions/${promotionId}/access-password`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        }

        if (response.ok) {
            if (alertEl) {
                alertEl.className = 'alert alert-success';
                alertEl.textContent = password
                    ? 'Access password updated successfully! Students can now use the link below to access this promotion.'
                    : 'Password protection removed successfully!';
                alertEl.classList.remove('hidden');

                setTimeout(() => {
                    alertEl.classList.add('hidden');
                }, 5000);
            }

            // Update the access link
            const accessLinkInput = document.getElementById(`${prefix}student-access-link`);
            if (accessLinkInput) {
                accessLinkInput.value = `${window.location.origin}${getPublicPromotionPath()}?id=${promotionId}`;
            }
        } else {
            const data = await response.json();
            if (alertEl) {
                alertEl.className = 'alert alert-danger';
                alertEl.textContent = data.error || 'Error updating password';
                alertEl.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error('Error updating access password:', error);
        if (alertEl) {
            alertEl.className = 'alert alert-danger';
            alertEl.textContent = 'Connection error. Please try again.';
            alertEl.classList.remove('hidden');
        }
    }
}

function copyAccessLink(source = 'default') {
    const prefix = source === 'teacher-area' ? 'teacher-area-' : '';
    const accessLinkInput = document.getElementById(`${prefix}student-access-link`);
    if (accessLinkInput && accessLinkInput.value) {
        navigator.clipboard.writeText(accessLinkInput.value).then(() => {
            // Show success feedback
            const copyBtn = event.currentTarget;
            if (copyBtn) {
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="bi bi-check me-2"></i>Copied!';
                copyBtn.classList.add('btn-success');
                copyBtn.classList.remove('btn-outline-secondary');

                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                    copyBtn.classList.remove('btn-success');
                    copyBtn.classList.add('btn-outline-secondary');
                }, 2000);
            }
        }).catch(err => {
            console.error('Failed to copy link:', err);
            // Fallback selection method
            accessLinkInput.select();
            accessLinkInput.setSelectionRange(0, 99999);
            try {
                document.execCommand('copy');
                alert('Link copied to clipboard!');
            } catch (fallbackErr) {
                alert('Could not copy link. Please copy manually.');
            }
        });
    }
}

// ==================== TEACHING CONTENT FUNCTIONS ====================

async function loadTeachingContent() {
    if (!isTeacherOrAdmin()) return;

    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/teaching-content`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            console.error('[loadTeachingContent] API error:', response.status, await response.text().catch(() => ''));
            return;
        }
        if (response.ok) {
            const data = await response.json();
            const urlInput = document.getElementById('teaching-content-url');
            const previewBtn = document.getElementById('teaching-content-preview-btn');
            const overviewBtn = document.getElementById('teaching-content-btn');
            const noContentMsg = document.getElementById('no-content-message');
            const removeBtn = document.getElementById('remove-teaching-btn');

            if (data.teachingContentUrl) {
                if (urlInput) {
                    urlInput.value = data.teachingContentUrl;
                }
                if (previewBtn) {
                    previewBtn.href = data.teachingContentUrl;
                    previewBtn.classList.remove('hidden');
                }
                if (overviewBtn) {
                    overviewBtn.href = data.teachingContentUrl;
                    overviewBtn.classList.remove('hidden');
                }
                if (noContentMsg) {
                    noContentMsg.style.display = 'none';
                }
                if (removeBtn) {
                    removeBtn.style.display = 'inline-block';
                }
            } else {
                if (previewBtn) {
                    previewBtn.classList.add('hidden');
                }
                if (overviewBtn) {
                    overviewBtn.classList.add('hidden');
                }
                if (noContentMsg) {
                    noContentMsg.style.display = 'block';
                }
                if (removeBtn) {
                    removeBtn.style.display = 'none';
                }
                if (urlInput) {
                    urlInput.value = '';
                }
            }
        }
    } catch (error) {
        console.error('Error loading teaching content:', error);
    }
}

async function updateTeachingContent(source = 'default') {
    if (!isTeacherOrAdmin()) return;

    const token = localStorage.getItem('token');

    // Determine which input fields to use based on source
    const prefix = source === 'teacher-area' ? 'teacher-area-' : '';
    const urlInput = document.getElementById(`${prefix}teaching-content-url`);
    const alertEl = document.getElementById(`${prefix}teaching-content-alert`);
    const url = urlInput ? urlInput.value.trim() : '';

    if (!url) {
        if (alertEl) {
            alertEl.className = 'alert alert-warning';
            alertEl.textContent = 'Please enter a URL for the teaching content';
            alertEl.classList.remove('hidden');
        }
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/teaching-content`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ teachingContentUrl: url })
        });

        if (response.ok) {
            if (alertEl) {
                alertEl.className = 'alert alert-success';
                alertEl.textContent = 'Teaching content link saved successfully! The button will now appear in the Overview section.';
                alertEl.classList.remove('hidden');

                setTimeout(() => {
                    alertEl.classList.add('hidden');
                }, 5000);
            }

            // Update the preview button
            if (source === 'teacher-area') {
                await _loadTeachingContentInTeacherArea();
            } else {
                loadTeachingContent();
            }
        } else {
            const data = await response.json();
            if (alertEl) {
                alertEl.className = 'alert alert-danger';
                alertEl.textContent = data.error || 'Error saving teaching content';
                alertEl.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error('Error updating teaching content:', error);
        if (alertEl) {
            alertEl.className = 'alert alert-danger';
            alertEl.textContent = 'Connection error. Please try again.';
            alertEl.classList.remove('hidden');
        }
    }
}

async function removeTeachingContent(source = 'default') {
    if (!isTeacherOrAdmin()) return;

    if (!confirm('Are you sure you want to remove the teaching content link?')) {
        return;
    }

    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/teaching-content`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const prefix = source === 'teacher-area' ? 'teacher-area-' : '';
            const alertEl = document.getElementById(`${prefix}teaching-content-alert`);
            if (alertEl) {
                alertEl.className = 'alert alert-success';
                alertEl.textContent = 'Teaching content link removed successfully!';
                alertEl.classList.remove('hidden');

                setTimeout(() => {
                    alertEl.classList.add('hidden');
                }, 5000);
            }

            // Update the UI
            if (source === 'teacher-area') {
                await _loadTeachingContentInTeacherArea();
            } else {
                loadTeachingContent();
            }
        } else {
            const data = await response.json();
            alert(data.error || 'Error removing teaching content');
        }
    } catch (error) {
        console.error('Error removing teaching content:', error);
        alert('Connection error. Please try again.');
    }
}

// ==================== ASANA WORKSPACE ACCESS ====================
// Configuration for Asana workspace URL - follows the same pattern as Teaching Content
// Allows instructors to store and access their Asana workspace link

async function loadAsanaWorkspace() {
    if (!isTeacherOrAdmin()) return;

    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/asana-workspace`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            console.error('[loadAsanaWorkspace] API error:', response.status, await response.text().catch(() => ''));
            return;
        }

        if (response.ok) {
            const data = await response.json();
            const urlInput = document.getElementById('asana-workspace-url');
            const previewBtn = document.getElementById('asana-workspace-preview-btn');
            const noAsanaMsg = document.getElementById('no-asana-message');
            const removeBtn = document.getElementById('remove-asana-btn');

            if (data.asanaWorkspaceUrl) {
                if (urlInput) {
                    urlInput.value = data.asanaWorkspaceUrl;
                }
                if (previewBtn) {
                    previewBtn.href = data.asanaWorkspaceUrl;
                    previewBtn.classList.remove('hidden');
                }
                if (noAsanaMsg) {
                    noAsanaMsg.style.display = 'none';
                }
                if (removeBtn) {
                    removeBtn.style.display = 'inline-block';
                }
            } else {
                if (previewBtn) {
                    previewBtn.classList.add('hidden');
                }
                if (noAsanaMsg) {
                    noAsanaMsg.style.display = 'block';
                }
                if (removeBtn) {
                    removeBtn.style.display = 'none';
                }
                if (urlInput) {
                    urlInput.value = '';
                }
            }
        }
    } catch (error) {
        console.error('Error loading Asana workspace:', error);
    }
}

// Save or update the Asana workspace URL
async function updateAsanaWorkspace(source = 'default') {
    if (!isTeacherOrAdmin()) return;

    const token = localStorage.getItem('token');

    // Determine which input fields to use based on source
    const prefix = source === 'teacher-area' ? 'teacher-area-' : '';
    const urlInput = document.getElementById(`${prefix}asana-workspace-url`);
    const alertEl = document.getElementById(`${prefix}asana-workspace-alert`);
    const url = urlInput ? urlInput.value.trim() : '';

    if (!url) {
        if (alertEl) {
            alertEl.className = 'alert alert-warning';
            alertEl.textContent = 'Por favor, ingresa una URL para el espacio de trabajo de Asana';
            alertEl.classList.remove('hidden');
        }
        return;
    }

    // Basic URL validation
    if (!url.includes('asana.com') && !url.includes('app.asana')) {
        if (alertEl) {
            alertEl.className = 'alert alert-warning';
            alertEl.textContent = 'La URL debe ser un enlace válido de Asana (asana.com)';
            alertEl.classList.remove('hidden');
        }
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/asana-workspace`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ asanaWorkspaceUrl: url })
        });

        if (response.ok) {
            if (alertEl) {
                alertEl.className = 'alert alert-success';
                alertEl.textContent = '¡Enlace de Asana guardado exitosamente! Los estudiantes podrán acceder al espacio de trabajo.';
                alertEl.classList.remove('hidden');

                setTimeout(() => {
                    alertEl.classList.add('hidden');
                }, 5000);
            }

            // Update the preview button and UI
            if (source === 'teacher-area') {
                await _loadAsanaWorkspaceInTeacherArea();
            } else {
                loadAsanaWorkspace();
            }
        } else {
            const data = await response.json();
            if (alertEl) {
                alertEl.className = 'alert alert-danger';
                alertEl.textContent = data.error || 'Error al guardar el enlace de Asana';
                alertEl.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error('Error updating Asana workspace:', error);
        if (alertEl) {
            alertEl.className = 'alert alert-danger';
            alertEl.textContent = 'Error de conexión. Por favor, intenta de nuevo.';
            alertEl.classList.remove('hidden');
        }
    }
}

// Remove the Asana workspace URL configuration
async function removeAsanaWorkspace(source = 'default') {
    if (!isTeacherOrAdmin()) return;

    if (!confirm('¿Estás seguro de que deseas eliminar el enlace de Asana?')) {
        return;
    }

    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/asana-workspace`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const prefix = source === 'teacher-area' ? 'teacher-area-' : '';
            const alertEl = document.getElementById(`${prefix}asana-workspace-alert`);
            if (alertEl) {
                alertEl.className = 'alert alert-success';
                alertEl.textContent = '¡Enlace de Asana eliminado exitosamente!';
                alertEl.classList.remove('hidden');

                setTimeout(() => {
                    alertEl.classList.add('hidden');
                }, 5000);
            }

            // Update the UI
            if (source === 'teacher-area') {
                await _loadAsanaWorkspaceInTeacherArea();
            } else {
                loadAsanaWorkspace();
            }
        } else {
            const data = await response.json();
            alert(data.error || 'Error al eliminar el enlace de Asana');
        }
    } catch (error) {
        console.error('Error removing Asana workspace:', error);
        alert('Error de conexión. Por favor, intenta de nuevo.');
    }
}

// ==================== STUDENT SELECTION FUNCTIONS ====================

// ── Bulk Reports ──────────────────────────────────────────────────────────
function generateSelectedStudentsPDF() {
    const selectedCheckboxes = document.querySelectorAll('.student-checkbox:checked');
    const selectedStudentIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.studentId);

    if (selectedStudentIds.length === 0) {
        alert('Por favor, selecciona al menos un estudiante para generar los informes.');
        return;
    }

    if (window.Reports && window.Reports.printBulkTechnical) {
        window.Reports.printBulkTechnical(selectedStudentIds, promotionId);
    } else {
        console.error('Reports library not loaded');
        alert('La librería de informes no está cargada. Por favor, recarga la página.');
    }
}

function filterStudentsTable(query) {
    const q = (query || '').toLowerCase().trim();
    const rows = document.querySelectorAll('#students-list tr');
    let separatorRow = null;
    let visibleAfterSeparator = 0;

    rows.forEach(row => {
        // Identify the withdrawn separator row (has a td with colspan)
        if (row.querySelector('td[colspan]')) {
            separatorRow = row;
            visibleAfterSeparator = 0;
            return; // decide visibility later
        }
        if (!q) {
            row.style.display = '';
            if (separatorRow) separatorRow.style.display = '';
            return;
        }
        const text = row.textContent.toLowerCase();
        const visible = text.includes(q);
        row.style.display = visible ? '' : 'none';
        if (visible && separatorRow && row.style.display !== 'none') visibleAfterSeparator++;
    });

    // Hide separator if no withdrawn rows are visible
    if (separatorRow && q) {
        separatorRow.style.display = visibleAfterSeparator > 0 ? '' : 'none';
    }
}

function updateSelectionState() {
    const checkboxes = document.querySelectorAll('.student-checkbox');
    const selectAllCheckboxHeader = document.getElementById('select-all-students-header');
    const selectAllCheckboxControls = document.getElementById('select-all-students');
    const selectedCountEl = document.getElementById('selected-count');
    const selectionControls = document.getElementById('selection-controls');
    const exportSelectedBtn = document.getElementById('export-selected-btn');
    const deleteSelectedBtn = document.getElementById('delete-selected-btn');
    const exportAllBtn = document.getElementById('export-all-students-btn');
    const importExcelBtn = document.getElementById('import-students-excel-btn');
    const templateExcelBtn = document.getElementById('download-students-template-btn');
    const createStudentBtn = document.getElementById('create-student-btn');

    const selectedCheckboxes = document.querySelectorAll('.student-checkbox:checked');
    const selectedCount = selectedCheckboxes.length;
    const totalCount = checkboxes.length;

    // Update selected count display
    if (selectedCountEl) {
        selectedCountEl.textContent = `${selectedCount} selected`;
    }

    // Helper to update checkbox state (including indeterminate)
    const updateCheckbox = (cb) => {
        if (!cb || totalCount === 0) return;
        if (selectedCount === 0) {
            cb.indeterminate = false;
            cb.checked = false;
        } else if (selectedCount === totalCount) {
            cb.indeterminate = false;
            cb.checked = true;
        } else {
            cb.indeterminate = true;
            cb.checked = false;
        }
    };

    updateCheckbox(selectAllCheckboxHeader);
    updateCheckbox(selectAllCheckboxControls);

    // Show/hide selection controls and buttons
    if (selectionControls) {
        selectionControls.style.display = totalCount > 0 ? 'block' : 'none';
    }

    if (exportSelectedBtn) {
        exportSelectedBtn.style.display = selectedCount > 0 ? 'inline-block' : 'none';
    }

    if (deleteSelectedBtn) {
        deleteSelectedBtn.style.display = selectedCount > 0 ? 'inline-block' : 'none';
    }

    const bulkReportsDropdown = document.getElementById('bulk-reports-dropdown');
    if (bulkReportsDropdown) {
        bulkReportsDropdown.style.display = selectedCount > 0 ? 'inline-block' : 'none';

        // Always populate the dropdown menu when it's displayed to ensure correct handlers
        const dropdownMenu = bulkReportsDropdown.querySelector('.dropdown-menu');
        if (dropdownMenu) {
            dropdownMenu.innerHTML = `
                <li><a class="dropdown-item" href="#" onclick="event.preventDefault(); if(window._bulkReportTechnical) { window._bulkReportTechnical() } else { console.error('_bulkReportTechnical not found') }">
                    <i class="bi bi-file-earmark-person me-2"></i>Seguimiento Técnico
                </a></li>
                <li><a class="dropdown-item" href="#" onclick="event.preventDefault(); if(window._bulkReportTransversal) { window._bulkReportTransversal() } else { console.error('_bulkReportTransversal not found') }">
                    <i class="bi bi-file-earmark-check me-2"></i>Evaluación Transversal
                </a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item" href="#" onclick="event.preventDefault(); if(window._bulkReportByProject) { window._bulkReportByProject() } else { console.error('_bulkReportByProject not found') }">
                    <i class="bi bi-folder me-2"></i>Informes por Proyecto
                </a></li>
            `;
        }
    }

    // Toggle base action buttons (no selection vs with selection)
    const baseDisplay = selectedCount > 0 ? 'none' : '';
    if (exportAllBtn) exportAllBtn.style.display = baseDisplay;
    if (importExcelBtn) importExcelBtn.style.display = baseDisplay;
    if (templateExcelBtn) templateExcelBtn.style.display = baseDisplay;
    if (createStudentBtn) createStudentBtn.style.display = baseDisplay;
}

function toggleAllStudents(source) {
    const studentCheckboxes = document.querySelectorAll('.student-checkbox');
    const isChecked = source.checked;

    studentCheckboxes.forEach(checkbox => {
        checkbox.checked = isChecked;
    });

    // Sync the other "Select All" checkbox
    const selectAllHeader = document.getElementById('select-all-students-header');
    const selectAllControls = document.getElementById('select-all-students');

    if (source === selectAllHeader && selectAllControls) selectAllControls.checked = isChecked;
    if (source === selectAllControls && selectAllHeader) selectAllHeader.checked = isChecked;

    updateSelectionState();
}

// Export selected students to CSV
function exportSelectedStudentsCsv() {
    exportSelectedStudentsExcel();
}

// ── Bulk PDF Report helpers ───────────────────────────────────────────────────
function _getSelectedStudentIds() {
    return Array.from(document.querySelectorAll('.student-checkbox:checked'))
        .map(cb => cb.dataset.studentId);
}

window._bulkReportTechnical = function () {
    //console.log('[Reports] _bulkReportTechnical triggered');
    const ids = _getSelectedStudentIds();
    //console.log('[Reports] Selected student IDs:', ids);
    if (!ids.length) {
        alert('Selecciona al menos un estudiante.');
        return;
    }
    if (!window.Reports) {
        console.error('[Reports] window.Reports library is not defined!');
        alert('La librería de informes no está disponible. Por favor, recarga la página.');
        return;
    }
    window.Reports.printBulkTechnical(ids, promotionId);
}

window._bulkReportTransversal = function () {
    //console.log('[Reports] _bulkReportTransversal triggered');
    const ids = _getSelectedStudentIds();
    if (!ids.length) { alert('Selecciona al menos un estudiante.'); return; }
    if (!window.Reports) {
        alert('La librería de informes no está disponible.');
        return;
    }
    window.Reports.printBulkTransversal(ids, promotionId);
}

window._bulkReportByProject = async function () {
    // ... rest of the function remains the same but attached to window
    // I'll just change the start of the function in SearchReplace
    // Remove any existing modal
    document.getElementById('_project-picker-modal')?.remove();

    // Show a loading modal while we fetch the promotion roadmap
    const loadingModal = document.createElement('div');
    loadingModal.id = '_project-picker-modal';
    loadingModal.innerHTML = `
        <div style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;display:flex;align-items:center;justify-content:center;">
            <div style="background:#fff;border-radius:10px;padding:32px 40px;min-width:280px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.25);">
                <div style="width:36px;height:36px;border:4px solid #FF6B35;border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 14px;"></div>
                <div style="font-family:Inter,sans-serif;font-size:14px;color:#444;">Cargando proyectos…</div>
                <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
            </div>
        </div>`;
    document.body.appendChild(loadingModal);

    try {
        const token = localStorage.getItem('token');

        // Fetch just the promotion to read the roadmap projects
        const promoRes = await fetch(`${API_URL}/api/promotions/${promotionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const promo = promoRes.ok ? await promoRes.json() : {};

        // Collect all project names from the roadmap (modules[].projects[].name)
        const allProjects = [];
        const seen = new Set();
        (promo.modules || []).forEach(mod => {
            (mod.projects || []).forEach(p => {
                if (p.name && !seen.has(p.name.trim())) {
                    seen.add(p.name.trim());
                    allProjects.push({ name: p.name.trim(), moduleName: mod.name || '' });
                }
            });
        });

        // Remove loading modal
        document.getElementById('_project-picker-modal')?.remove();

        if (!allProjects.length) {
            alert('No hay proyectos definidos en el roadmap de esta promoción.');
            return;
        }

        // Build the dropdown options grouped by module
        const options = allProjects.map(({ name, moduleName }) =>
            `<option value="${name.replace(/"/g, '&quot;')}" data-module="${moduleName.replace(/"/g, '&quot;')}">${name}</option>`
        ).join('');

        // Get selected student IDs to know how many PDFs will be generated
        const selectedIds = _getSelectedStudentIds();

        // Build the picker modal
        const modal = document.createElement('div');
        modal.id = '_project-picker-modal';
        modal.innerHTML = `
            <div style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;display:flex;align-items:center;justify-content:center;">
                <div style="background:#fff;border-radius:12px;padding:28px 28px 22px;min-width:360px;max-width:480px;box-shadow:0 8px 32px rgba(0,0,0,.28);font-family:Inter,sans-serif;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
                        <div>
                            <div style="font-size:11px;color:#FF6B35;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:3px;">Informes por Proyecto</div>
                            <strong style="font-size:16px;color:#1A1A2E;">Selecciona un proyecto</strong>
                        </div>
                        <button onclick="document.getElementById('_project-picker-modal').remove()"
                            style="background:none;border:1px solid #dee2e6;border-radius:6px;padding:4px 10px;font-size:13px;cursor:pointer;color:#666;">✕</button>
                    </div>
                    <div style="margin-bottom:16px;">
                        <label style="font-size:12px;font-weight:600;color:#4A4A6A;display:block;margin-bottom:6px;">Proyecto del roadmap</label>
                        <select id="_proj-select"
                            style="width:100%;padding:10px 12px;border:1.5px solid #dee2e6;border-radius:8px;font-size:14px;
                                   font-family:Inter,sans-serif;color:#1A1A2E;background:#fff;outline:none;cursor:pointer;">
                            <option value="" disabled selected>— Elige un proyecto —</option>
                            ${options}
                        </select>
                    </div>
                    <div id="_proj-preview" style="min-height:28px;margin-bottom:16px;font-size:12px;color:#4A4A6A;">
                        ${selectedIds.length
                ? `<span style="background:#fff8f0;color:#FF6B35;border-radius:6px;padding:4px 10px;display:inline-block;">
                                Se generará un PDF por cada uno de los <strong>${selectedIds.length}</strong> coders seleccionados
                              </span>`
                : `<span style="background:#fff3cd;color:#856404;border-radius:6px;padding:4px 10px;display:inline-block;">
                                ⚠ No hay coders seleccionados. Se procesarán todos los de la promoción.
                              </span>`
            }
                    </div>
                    <div style="display:flex;gap:10px;justify-content:flex-end;">
                        <button onclick="document.getElementById('_project-picker-modal').remove()"
                            style="padding:9px 18px;border:1px solid #dee2e6;border-radius:8px;font-size:13px;
                                   background:#fff;color:#666;cursor:pointer;font-family:Inter,sans-serif;">
                            Cancelar
                        </button>
                        <button id="_proj-download-btn" disabled
                            onclick="_confirmBulkProjectDownload()"
                            style="padding:9px 22px;border:none;border-radius:8px;font-size:13px;font-weight:600;
                                   background:#FF6B35;color:#fff;cursor:pointer;font-family:Inter,sans-serif;
                                   opacity:0.5;transition:opacity .15s;">
                            <i class="bi bi-download me-1"></i> Descargar PDFs
                        </button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modal);

        // Wire up the select change
        const sel = document.getElementById('_proj-select');
        const btn = document.getElementById('_proj-download-btn');
        sel.addEventListener('change', () => {
            if (sel.value) {
                btn.disabled = false;
                btn.style.opacity = '1';
            } else {
                btn.disabled = true;
                btn.style.opacity = '0.5';
            }
        });

    } catch (err) {
        document.getElementById('_project-picker-modal')?.remove();
        console.error('[BulkByProject] Error cargando proyectos:', err);
        alert('Error al cargar los proyectos: ' + err.message);
    }
}

function _confirmBulkProjectDownload() {
    const sel = document.getElementById('_proj-select');
    const projectName = sel?.value;
    if (!projectName) return;
    document.getElementById('_project-picker-modal')?.remove();
    // Pass the currently selected student IDs (or null = all students)
    const selectedIds = _getSelectedStudentIds();
    window.Reports?.printBulkByProject(projectName, promotionId, selectedIds.length ? selectedIds : null);
}
// ── /Bulk PDF Report helpers ──────────────────────────────────────────────────

// Delete selected students
async function deleteSelectedStudents() {
    const selectedCheckboxes = document.querySelectorAll('.student-checkbox:checked');
    const selectedStudentIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.studentId);

    if (selectedStudentIds.length === 0) {
        alert('No students selected for deletion.');
        return;
    }

    const confirmMessage = `Are you sure you want to delete ${selectedStudentIds.length} selected student(s)? This action cannot be undone.`;
    if (!confirm(confirmMessage)) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const deletePromises = selectedStudentIds.map(studentId =>
            fetch(`${API_URL}/api/promotions/${promotionId}/students/${studentId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
        );

        await Promise.all(deletePromises);

        alert(`Successfully deleted ${selectedStudentIds.length} student(s).`);
        loadStudents(); // Reload the students list
    } catch (error) {
        console.error('Error deleting selected students:', error);
        alert('Error deleting students. Please try again.');
    }
}

// Attendance Control Functions
async function loadAttendance() {
    try {
        const token = localStorage.getItem('token');
        const [year, month] = currentAttendanceMonth.split('-');

        // Update display
        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        document.getElementById('current-attendance-month-display').textContent = `${monthNames[parseInt(month) - 1]} ${year}`;

        // Get students first (if not already loaded)
        const studentsRes = await fetch(`${API_URL}/api/promotions/${promotionId}/students`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        studentsForAttendance = await studentsRes.json();

        // Get attendance data
        const attendanceRes = await fetch(`${API_URL}/api/promotions/${promotionId}/attendance?month=${currentAttendanceMonth}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        attendanceData = await attendanceRes.json();

        // Load holidays (only once per page load; refresh when promotionId changes)
        if (promotionHolidays.size === 0) {
            try {
                const holRes = await fetch(`${API_URL}/api/promotions/${promotionId}/holidays`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (holRes.ok) {
                    const { holidays } = await holRes.json();
                    promotionHolidays = new Set(holidays || []);
                }
            } catch (_) { }
        }

        renderAttendanceTable();
    } catch (error) {
        console.error('Error loading attendance:', error);
    }
}

function renderAttendanceTable() {
    const headerRow = document.getElementById('attendance-header-row');
    const weekdayRow = document.getElementById('attendance-weekday-row');
    const body = document.getElementById('attendance-body');

    // Clear previous
    headerRow.innerHTML = '<th class="sticky-column bg-light" style="min-width: 250px; z-index: 10;">Student</th>';
    if (weekdayRow) weekdayRow.innerHTML = '<th class="sticky-column bg-light" style="min-width: 250px; z-index: 10;"></th>';
    body.innerHTML = '';

    if (studentsForAttendance.length === 0) {
        body.innerHTML = '<tr><td colspan="100" class="text-center py-4 text-muted">No students found in this promotion.</td></tr>';
        return;
    }

    // Determine days in month
    const [year, month] = currentAttendanceMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    // Weekday abbreviations (0=Sun, 1=Mon, ..., 6=Sat)
    const WEEKDAY_ABBR = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];

    // Generate headers (weekday row + day number row)
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${day < 10 ? '0' : ''}${day}`;
        const dateKey = `${currentAttendanceMonth}-${dateStr}`;
        const dayOfWeek = new Date(year, month - 1, day).getDay(); // 0=Sun, 6=Sat
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = promotionHolidays.has(dateKey);
        const isBlocked = isWeekend || isHoliday;

        const weekendStyle = isBlocked ? ' background-color:#e5e5e5; color:#888;' : '';
        const holidayMark = isHoliday ? ' title="Festivo – clic derecho para quitar"' : (!isWeekend ? ' title="Clic derecho para marcar como festivo"' : '');

        if (weekdayRow) {
            const th = document.createElement('th');
            th.className = 'text-center';
            th.style.cssText = `font-size:0.7rem; font-weight:500; padding:2px 4px;${weekendStyle}`;
            th.textContent = WEEKDAY_ABBR[dayOfWeek];
            weekdayRow.appendChild(th);
        }

        const thDay = document.createElement('th');
        thDay.className = 'text-center';
        thDay.style.cssText = weekendStyle;
        thDay.dataset.date = dateKey;
        if (isHoliday) {
            thDay.innerHTML = `<span style="font-size:0.65rem;">🎉</span><br><small>${dateStr}</small>`;
        } else {
            thDay.textContent = dateStr;
        }
        // Right-click on weekday header (not on weekends) to toggle holiday
        if (!isWeekend) {
            thDay.style.cursor = 'context-menu';
            thDay.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                toggleHoliday(dateKey);
            });
        }
        headerRow.appendChild(thDay);
    }

    // Generate rows — active first, withdrawn at bottom
    const sortedStudents = [...studentsForAttendance].sort((a, b) => {
        if (!!a.isWithdrawn === !!b.isWithdrawn) return (a.name || '').localeCompare(b.name || '');
        return a.isWithdrawn ? 1 : -1;
    });
    const activeAttCount = sortedStudents.filter(s => !s.isWithdrawn).length;
    let withdrawnSeparatorInserted = false;

    sortedStudents.forEach((student, idx) => {
        // Insert a separator row before the first withdrawn student
        if (student.isWithdrawn && !withdrawnSeparatorInserted) {
            withdrawnSeparatorInserted = true;
            const sepTr = document.createElement('tr');
            sepTr.className = 'table-danger';
            sepTr.innerHTML = `<td colspan="100" class="py-1 px-3 small fw-semibold text-danger" style="position:sticky;left:0;"><i class="bi bi-person-x me-1"></i>Bajas oficiales</td>`;
            body.appendChild(sepTr);
        }

        const tr = document.createElement('tr');
        if (student.isWithdrawn) tr.classList.add('student-row-withdrawn');

        // Name column
        const nameTd = document.createElement('td');
        nameTd.className = `sticky-column student-name-cell ${student.isWithdrawn ? 'student-name-cell-withdrawn' : 'bg-white'}`;
        if (student.isWithdrawn) {
            const withdrawalDateStr = student.withdrawal?.date
                ? new Date(student.withdrawal.date).toLocaleDateString('es-ES')
                : '';
            nameTd.innerHTML = `${escapeHtml(studentFullName(student))}&nbsp;<span class="badge bg-danger" style="font-size:.6rem;vertical-align:middle;" title="Baja${withdrawalDateStr ? ' desde ' + withdrawalDateStr : ''}">BAJA</span>`;
        } else {
            nameTd.textContent = studentFullName(student);
        }
        nameTd.onclick = () => openAttendanceModal(student.id, null);
        tr.appendChild(nameTd);

        // Day columns
        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = `${currentAttendanceMonth}-${day < 10 ? '0' : ''}${day}`;
            const record = attendanceData.find(a => a.studentId === student.id && a.date === dateKey);
            const status = record ? record.status : '';
            const note = (record && record.note) ? record.note : '';

            const dayOfWeek = new Date(year, month - 1, day).getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isHoliday = promotionHolidays.has(dateKey);
            const isBlocked = isWeekend || isHoliday;

            // Block attendance cells on/after withdrawal date for withdrawn students
            const isWithdrawnDay = student.isWithdrawn &&
                student.withdrawal?.date &&
                (dateKey >= student.withdrawal.date.split('T')[0]);

            const td = document.createElement('td');

            if (isBlocked) {
                // Non-working day: grey, no click, no status shown
                td.className = 'attendance-cell attendance-blocked';
                td.style.backgroundColor = isHoliday ? '#f0e8ff' : '#e5e5e5';
                td.style.color = isHoliday ? '#7c3aed' : '#aaa';
                td.style.cursor = 'default';
                td.innerHTML = isHoliday ? '<i class="bi bi-balloon" style="font-size:0.75rem;"></i>' : '';
                tr.appendChild(td);
                continue;
            }

            if (isWithdrawnDay) {
                // Day on/after withdrawal: striped red, no click
                td.className = 'attendance-cell attendance-blocked';
                td.style.backgroundColor = '#ffe0e0';
                td.style.color = '#c0392b';
                td.style.cursor = 'default';
                td.title = 'Baja oficial';
                td.innerHTML = '<i class="bi bi-dash" style="font-size:0.75rem;"></i>';
                tr.appendChild(td);
                continue;
            }

            let statusClass = '';
            if (status === 'Presente') statusClass = 'attendance-present';
            else if (status === 'Ausente') statusClass = 'attendance-absent';
            else if (status === 'Con retraso') statusClass = 'attendance-late';
            else if (status === 'Justificado') statusClass = 'attendance-justified';
            else if (status === 'Sale antes') statusClass = 'attendance-early-leave';

            td.className = `attendance-cell ${statusClass} ${note ? 'attendance-has-note' : ''}`;
            td.dataset.studentId = student.id;
            td.dataset.date = dateKey;
            td.dataset.status = status;

            // Icon or text representation
            if (status === 'Presente') td.innerHTML = '<i class="bi bi-check-lg"></i>';
            else if (status === 'Ausente') td.innerHTML = '<i class="bi bi-x-lg"></i>';
            else if (status === 'Con retraso') td.innerHTML = '<i class="bi bi-clock"></i>';
            else if (status === 'Justificado') td.innerHTML = '<i class="bi bi-info-circle"></i>';
            else if (status === 'Sale antes') td.innerHTML = '<i class="bi bi-box-arrow-left"></i>';
            else td.innerHTML = '';

            td.onclick = (e) => {
                if (e.shiftKey) {
                    openAttendanceModal(student.id, dateKey);
                } else {
                    cycleAttendanceStatus(td);
                }
            };
            td.oncontextmenu = (e) => {
                e.preventDefault();
                openAttendanceModal(student.id, dateKey);
            };
            tr.appendChild(td);
        }

        body.appendChild(tr);
    });

    updateAttendanceStats();
}

// ── Holiday toggle ───────────────────────────────────────────────────────────
async function toggleHoliday(dateKey) {
    const token = localStorage.getItem('token');
    if (promotionHolidays.has(dateKey)) {
        promotionHolidays.delete(dateKey);
    } else {
        promotionHolidays.add(dateKey);
    }
    // Persist to server
    try {
        await fetch(`${API_URL}/api/promotions/${promotionId}/holidays`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ holidays: [...promotionHolidays] })
        });
    } catch (_) { }
    renderAttendanceTable();
}

function updateAttendanceStats() {
    const totalDays = studentsForAttendance.length * new Date(
        ...currentAttendanceMonth.split('-').map(Number), 0
    ).getDate();

    let present = 0, absent = 0, late = 0, justified = 0, earlyLeave = 0;

    attendanceData.forEach(record => {
        if (record.status === 'Presente') present++;
        else if (record.status === 'Ausente') absent++;
        else if (record.status === 'Con retraso') late++;
        else if (record.status === 'Justificado') justified++;
        else if (record.status === 'Sale antes') earlyLeave++;
    });

    document.getElementById('stat-present-total').textContent = present;
    document.getElementById('stat-absent-total').textContent = absent;
    document.getElementById('stat-late-total').textContent = late;
    document.getElementById('stat-justified-total').textContent = justified;
    const earlyLeaveEl = document.getElementById('stat-early-leave-total');
    if (earlyLeaveEl) earlyLeaveEl.textContent = earlyLeave;

    const totalMarked = present + absent + late + justified + earlyLeave;
    const avg = totalMarked > 0 ? Math.round(((present + late + justified + earlyLeave) / totalMarked) * 100) : 0;
    document.getElementById('stat-attendance-avg').textContent = `${avg}%`;
}

// ── Per-cell debounce map: cellKey -> { timer, pendingStatus } ───────────────
// This allows rapid clicks on the same cell to accumulate (cycling the status
// optimistically) while firing only ONE network request per cell — the very last
// desired state — after a short idle period.
// Clicks on DIFFERENT cells are always independent and never block each other.
const _attendancePendingMap = new Map(); // key: "studentId|date"

function cycleAttendanceStatus(cell) {
    const studentId = cell.dataset.studentId;
    const date = cell.dataset.date;
    const cellKey = `${studentId}|${date}`;

    // Determine the current "displayed" status (may differ from saved if user clicked rapidly)
    const currentStatus = cell.dataset.status;

    // Cycle: "" -> "Presente" -> "Ausente" -> "Con retraso" -> "Justificado" -> "Sale antes" -> ""
    let nextStatus = "";
    if (currentStatus === "") nextStatus = "Presente";
    else if (currentStatus === "Presente") nextStatus = "Ausente";
    else if (currentStatus === "Ausente") nextStatus = "Con retraso";
    else if (currentStatus === "Con retraso") nextStatus = "Justificado";
    else if (currentStatus === "Justificado") nextStatus = "Sale antes";
    else if (currentStatus === "Sale antes") nextStatus = "";

    // Update dataset immediately so the next rapid click cycles from the right state
    cell.dataset.status = nextStatus;

    // Apply visual feedback right away (no waiting for the server)
    _applyAttendanceCellStyle(cell, nextStatus, cell.classList.contains('attendance-has-note'));

    // Cancel any pending debounced save for this cell and schedule a fresh one
    const existing = _attendancePendingMap.get(cellKey);
    if (existing?.timer) clearTimeout(existing.timer);

    const timer = setTimeout(() => {
        _attendancePendingMap.delete(cellKey);
        // Show subtle saving indicator
        cell.style.opacity = '0.6';
        _flushAttendanceSave(studentId, date, nextStatus, null, cell);
    }, 300); // 300 ms debounce — comfortable for rapid multi-cell clicking

    _attendancePendingMap.set(cellKey, { timer, pendingStatus: nextStatus });
}

// Applies visual style to a cell without touching the DOM outside it
function _applyAttendanceCellStyle(cell, status, hasNote) {
    cell.className = 'attendance-cell';
    if (hasNote) cell.classList.add('attendance-has-note');
    if (status === 'Presente') {
        cell.classList.add('attendance-present');
        cell.innerHTML = '<i class="bi bi-check-lg"></i>';
    } else if (status === 'Ausente') {
        cell.classList.add('attendance-absent');
        cell.innerHTML = '<i class="bi bi-x-lg"></i>';
    } else if (status === 'Con retraso') {
        cell.classList.add('attendance-late');
        cell.innerHTML = '<i class="bi bi-clock"></i>';
    } else if (status === 'Justificado') {
        cell.classList.add('attendance-justified');
        cell.innerHTML = '<i class="bi bi-info-circle"></i>';
    } else if (status === 'Sale antes') {
        cell.classList.add('attendance-early-leave');
        cell.innerHTML = '<i class="bi bi-box-arrow-left"></i>';
    } else {
        cell.innerHTML = '';
    }
}

// Sends the actual network request for a single cell save (called after debounce)
async function _flushAttendanceSave(studentId, date, status, note, cell) {
    try {
        const token = localStorage.getItem('token');
        const body = { studentId, date, status };
        if (note !== null && note !== undefined) body.note = note;

        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/attendance`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error('[Attendance] Server error:', response.status, errBody);
            if (cell) cell.style.opacity = '';
            return;
        }

        const updatedRecord = await response.json();

        // Update local attendanceData — use the COMMITTED status from the server response
        // (matches what we sent, but trust the server as source of truth)
        const savedStatus = updatedRecord.status ?? status;
        // Compare as strings to guard against MySQL returning numeric IDs
        const index = attendanceData.findIndex(a =>
            String(a.studentId) === String(studentId) && a.date === date
        );
        if (index > -1) {
            if (savedStatus === "" && !updatedRecord.note) {
                attendanceData.splice(index, 1);
            } else {
                attendanceData[index] = updatedRecord;
            }
        } else if (savedStatus !== "" || updatedRecord.note) {
            attendanceData.push(updatedRecord);
        }

        // Restore opacity and sync the cell with the confirmed server state
        if (cell) {
            cell.style.opacity = '';
            // Only re-apply style if the cell's displayed status matches what we saved
            // (if the user clicked again while the request was in flight, dataset.status
            //  will already reflect the newer pending state — don't clobber it)
            if (cell.dataset.status === status) {
                _applyAttendanceCellStyle(cell, savedStatus, !!updatedRecord.note);
                cell.dataset.status = savedStatus;
            }
        } else {
            renderAttendanceTable();
        }

        updateAttendanceStats();
    } catch (error) {
        console.error('Error updating attendance:', error);
        if (cell) cell.style.opacity = '';
    }
}

async function updateAttendance(studentId, date, status, note, cell) {
    // Legacy entry-point used by the modal save path — goes straight through, no debounce needed
    try {
        const token = localStorage.getItem('token');
        const body = { studentId, date, status };
        if (note !== null && note !== undefined) body.note = note;

        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/attendance`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error('[Attendance] Server error:', response.status, errBody);
            if (cell) cell.style.opacity = '';
            return;
        }

        const updatedRecord = await response.json();

        const index = attendanceData.findIndex(a => String(a.studentId) === String(studentId) && a.date === date);
        if (index > -1) {
            if (status === "" && !updatedRecord.note) {
                attendanceData.splice(index, 1);
            } else {
                attendanceData[index] = updatedRecord;
            }
        } else if (status !== "" || updatedRecord.note) {
            attendanceData.push(updatedRecord);
        }

        if (cell) {
            cell.style.opacity = '';
            _applyAttendanceCellStyle(cell, status, !!updatedRecord.note);
            cell.dataset.status = status;
        } else {
            renderAttendanceTable();
        }
        updateAttendanceStats();
    } catch (error) {
        console.error('Error updating attendance:', error);
    }
}

let currentModalAttendance = { studentId: null, date: null };

function openAttendanceModal(studentId, date) {
    const student = studentsForAttendance.find(s => s.id === studentId);
    if (!student) return;

    // If date is null, default to first day of currently viewed month
    if (!date) {
        date = `${currentAttendanceMonth}-01`;
    }

    currentModalAttendance = { studentId, date };
    const record = attendanceData.find(a => a.studentId === studentId && a.date === date);

    document.getElementById('attendance-modal-student-name').textContent = studentFullName(student);
    document.getElementById('attendance-modal-date').textContent = date;
    document.getElementById('attendance-modal-status').value = (record && record.status) ? record.status : '';
    document.getElementById('attendance-modal-note').value = (record && record.note) ? record.note : '';

    // Calculate student stats for this month
    let sPres = 0, sAbs = 0, sLate = 0, sJust = 0;
    attendanceData.filter(a => a.studentId === studentId).forEach(r => {
        if (r.status === 'Presente') sPres++;
        else if (r.status === 'Ausente') sAbs++;
        else if (r.status === 'Con retraso') sLate++;
        else if (r.status === 'Justificado') sJust++;
    });

    document.getElementById('student-stat-present').textContent = sPres;
    document.getElementById('student-stat-absent').textContent = sAbs;
    document.getElementById('student-stat-late').textContent = sLate;
    document.getElementById('student-stat-justified').textContent = sJust;

    // Determine if this date is blocked due to withdrawal
    const withdrawalDate = student.isWithdrawn && student.withdrawal?.date
        ? student.withdrawal.date.split('T')[0]
        : null;
    const isWithdrawnDay = withdrawalDate && date >= withdrawalDate;

    // Lock / unlock editing controls based on withdrawal status
    const statusSelect = document.getElementById('attendance-modal-status');
    const noteField = document.getElementById('attendance-modal-note');
    const saveBtn = document.getElementById('attendance-modal-save-btn');
    const withdrawalBanner = document.getElementById('attendance-modal-withdrawal-banner');

    if (statusSelect) statusSelect.disabled = !!isWithdrawnDay;
    if (noteField) noteField.disabled = !!isWithdrawnDay;
    if (saveBtn) saveBtn.disabled = !!isWithdrawnDay;

    // Show/hide withdrawal warning banner
    if (withdrawalBanner) {
        if (isWithdrawnDay) {
            withdrawalBanner.classList.remove('d-none');
            withdrawalBanner.textContent = `Alumno/a dado de baja el ${new Date(withdrawalDate).toLocaleDateString('es-ES')} — no se puede registrar asistencia desde esta fecha.`;
        } else {
            withdrawalBanner.classList.add('d-none');
        }
    }

    const modalEl = document.getElementById('attendanceModal');
    const modal = new bootstrap.Modal(modalEl);

    // Focus note field when modal is shown (only if not locked)
    modalEl.addEventListener('shown.bs.modal', () => {
        if (!isWithdrawnDay) document.getElementById('attendance-modal-note').focus();
    }, { once: true });

    // Wire up summary button
    const summaryBtn = document.getElementById('view-student-summary-btn');
    summaryBtn.onclick = () => {
        modal.hide();
        openStudentSummary(studentId);
    };

    modal.show();
}

let _summaryStudentId = null; // tracks which student is open in the summary modal

function openStudentSummary(studentId) {
    _summaryStudentId = studentId;
    const student = studentsForAttendance.find(s => s.id === studentId);
    if (!student) return;

    document.getElementById('summary-student-name').textContent = studentFullName(student);

    const [year, month] = currentAttendanceMonth.split('-');
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    document.getElementById('summary-month-title').textContent = `${monthNames[parseInt(month) - 1]} ${year}`;

    const tbody = document.getElementById('student-summary-body');
    tbody.innerHTML = '';

    // Get all records for this student in this month, sorted by date
    const records = attendanceData
        .filter(a => a.studentId === studentId && a.date.startsWith(currentAttendanceMonth))
        .sort((a, b) => a.date.localeCompare(b.date));

    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center py-3 text-muted">No attendance records found for this month.</td></tr>';
    } else {
        records.forEach(r => {
            const tr = document.createElement('tr');

            let statusBadge = '';
            if (r.status === 'Presente') statusBadge = '<span class="badge" style="background-color: var(--green-f5); color: var(--principal-2);">Presente</span>';
            else if (r.status === 'Ausente') statusBadge = '<span class="badge" style="background-color: var(--principal-1); color: var(--principal-3);">Ausente</span>';
            else if (r.status === 'Con retraso') statusBadge = '<span class="badge" style="background-color: var(--complementario-2); color: var(--principal-2);">Con retraso</span>';
            else if (r.status === 'Justificado') statusBadge = '<span class="badge" style="background-color: var(--blue-light-f5); color: var(--principal-2);">Justificado</span>';
            else statusBadge = '<span class="badge" style="background-color: var(--complementario-1-extra-light); color: var(--principal-2); border: 1px solid var(--complementario-1);">No marcado</span>';

            tr.innerHTML = `
                <td class="fw-bold">${r.date.split('-')[2]}</td>
                <td>${statusBadge}</td>
                <td class="small">${escapeHtml(r.note || '-')}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    const summaryModal = new bootstrap.Modal(document.getElementById('studentSummaryModal'));
    summaryModal.show();
}

/**
 * Genera y descarga un PDF con el resumen de asistencia de un estudiante.
 * @param {'month'|'all'} mode  - 'month' = solo el mes visible; 'all' = todos los meses con registro
 */
async function exportStudentAttendancePdf(mode) {
    const studentId = _summaryStudentId;
    const student = studentsForAttendance.find(s => s.id === studentId);
    if (!student) return;

    const MONTH_NAMES_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const STATUS_LABELS = {
        'Presente': 'Presente',
        'Ausente': 'Ausente',
        'Con retraso': 'Con retraso',
        'Justificado': 'Justificado',
        'Sale antes': 'Sale antes'
    };
    const STATUS_COLORS = {
        'Presente': [154, 246, 194],   // --green-f5
        'Ausente': [255, 71, 0],      // --principal-1
        'Con retraso': [255, 163, 127],   // --complementario-2
        'Justificado': [192, 246, 248],   // --blue-light-f5
        'Sale antes': [233, 216, 253]    // purple pastel
    };

    // ── 1. Recopilar registros ───────────────────────────────────────────────
    let records = [];

    if (mode === 'month') {
        records = attendanceData
            .filter(a => a.studentId === studentId && a.date.startsWith(currentAttendanceMonth))
            .sort((a, b) => a.date.localeCompare(b.date));
    } else {
        // Fetch ALL attendance for this promotion (reuses existing export endpoint data)
        const btn = document.getElementById('summary-pdf-all-btn');
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Generando…';
        try {
            const token = localStorage.getItem('token');
            // Use the generic attendance endpoint month by month, or pull all via the export
            // The export endpoint returns xlsx — instead query month by month for all months with data
            // First get the promotion to know start/end
            const promoRes = await fetch(`${API_URL}/api/promotions/${promotionId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const promo = promoRes.ok ? await promoRes.json() : {};

            // Build list of YYYY-MM from promotion start to end (or ±12 months fallback)
            const start = promo.startDate ? new Date(promo.startDate) : new Date(new Date().getFullYear(), 0, 1);
            const end = promo.endDate ? new Date(promo.endDate) : new Date();
            const months = [];
            const cur = new Date(start.getFullYear(), start.getMonth(), 1);
            while (cur <= end) {
                months.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
                cur.setMonth(cur.getMonth() + 1);
            }
            if (!months.length) months.push(currentAttendanceMonth);

            // Fetch each month in parallel
            const fetched = await Promise.all(months.map(m =>
                fetch(`${API_URL}/api/promotions/${promotionId}/attendance?month=${m}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).then(r => r.ok ? r.json() : [])
            ));
            records = fetched.flat()
                .filter(a => a.studentId === studentId)
                .sort((a, b) => a.date.localeCompare(b.date));
        } finally {
            btn.disabled = false;
            btn.innerHTML = orig;
        }
    }

    if (!records.length) {
        alert('No hay registros de asistencia para este estudiante' + (mode === 'month' ? ' en este mes.' : '.'));
        return;
    }

    // ── 2. Construir PDF con jsPDF ───────────────────────────────────────────
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const ORANGE = [255, 107, 53];   // #FF6B35
    const DARK = [2, 1, 0];
    const LIGHT_BG = [245, 242, 242]; // complementario-1-extra-light approx
    const PAGE_W = 210;
    const MARGIN = 14;
    const COL_W = PAGE_W - MARGIN * 2;

    // ── Header ───────────────────────────────────────────────────────────────
    doc.setFillColor(...ORANGE);
    doc.rect(0, 0, PAGE_W, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen de Asistencia', MARGIN, 10);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(studentFullName(student), MARGIN, 17);

    const scope = mode === 'month'
        ? (() => { const [y, m] = currentAttendanceMonth.split('-'); return `${MONTH_NAMES_ES[parseInt(m) - 1]} ${y}`; })()
        : 'Todos los meses';
    doc.text(scope, PAGE_W - MARGIN, 17, { align: 'right' });

    // ── Global totals (used in header summary + final summary) ───────────────
    let y = 30;
    const globalCounts = { 'Presente': 0, 'Ausente': 0, 'Con retraso': 0, 'Justificado': 0, 'Sale antes': 0 };
    records.forEach(r => { if (globalCounts[r.status] !== undefined) globalCounts[r.status]++; });
    const totalRecords = records.length;
    const totalAttended = globalCounts['Presente'] + globalCounts['Con retraso'] + globalCounts['Justificado'] + globalCounts['Sale antes'];
    const totalAbsent = globalCounts['Ausente'];
    const globalPct = totalRecords > 0 ? Math.round((totalAttended / totalRecords) * 100) : 0;
    const absentPct = totalRecords > 0 ? Math.round((totalAbsent / totalRecords) * 100) : 0;

    // ── Table — group by month ───────────────────────────────────────────────
    const byMonth = {};
    records.forEach(r => {
        const mo = r.date.substring(0, 7);
        if (!byMonth[mo]) byMonth[mo] = [];
        byMonth[mo].push(r);
    });

    const ROW_H = 7;
    const COL_DATE = 28, COL_STATUS = 42, COL_NOTE = COL_W - COL_DATE - COL_STATUS;
    const col1 = MARGIN, col2 = MARGIN + COL_DATE, col3 = MARGIN + COL_DATE + COL_STATUS;

    const ensureSpace = (needed) => {
        if (y + needed > 280) {
            doc.addPage();
            y = 14;
        }
    };

    Object.entries(byMonth).forEach(([mo, recs]) => {
        const [my, mm] = mo.split('-');
        const monthLabel = `${MONTH_NAMES_ES[parseInt(mm) - 1]} ${my}`;

        ensureSpace(ROW_H + recs.length * ROW_H + 4);

        // Month header
        doc.setFillColor(...ORANGE);
        doc.rect(MARGIN, y, COL_W, ROW_H, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(monthLabel, MARGIN + 2, y + 5);
        const monthAttended = recs.filter(r => r.status === 'Presente' || r.status === 'Con retraso' || r.status === 'Justificado' || r.status === 'Sale antes').length;
        const monthAbsent = recs.filter(r => r.status === 'Ausente').length;
        const monthPct = recs.length > 0 ? Math.round((monthAttended / recs.length) * 100) : 0;
        doc.text(`${monthAttended} asistidos · ${monthAbsent} faltas · ${monthPct}%`, PAGE_W - MARGIN - 2, y + 5, { align: 'right' });
        y += ROW_H;

        // Column headers
        doc.setFillColor(...LIGHT_BG);
        doc.rect(MARGIN, y, COL_W, ROW_H - 1, 'F');
        doc.setTextColor(80, 80, 80);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('Fecha', col1 + 2, y + 4.5);
        doc.text('Estado', col2 + 2, y + 4.5);
        doc.text('Nota', col3 + 2, y + 4.5);
        y += ROW_H - 1;

        // Data rows
        recs.forEach((r, idx) => {
            ensureSpace(ROW_H);
            const rowBg = idx % 2 === 0 ? [255, 255, 255] : [250, 249, 248];
            doc.setFillColor(...rowBg);
            doc.rect(MARGIN, y, COL_W, ROW_H, 'F');

            // Status badge color as left border stripe
            const sc = STATUS_COLORS[r.status] || [220, 220, 220];
            doc.setFillColor(...sc);
            doc.rect(col2, y, 3, ROW_H, 'F');

            doc.setTextColor(...DARK);
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'normal');

            // Date: day/month
            const [, rmo, rd] = r.date.split('-');
            doc.text(`${rd}/${rmo}`, col1 + 2, y + 5);

            // Status text
            doc.setFont('helvetica', 'bold');
            doc.text(STATUS_LABELS[r.status] || r.status || '—', col2 + 5, y + 5);

            // Note (truncated)
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            const noteText = r.note ? doc.splitTextToSize(r.note, COL_NOTE - 4)[0] : '—';
            doc.text(noteText, col3 + 2, y + 5);

            y += ROW_H;
        });

        y += 4; // gap between months
    });

    // ── Global summary at the end ────────────────────────────────────────────
    if (mode === 'all' || Object.keys(byMonth).length >= 1) {
        ensureSpace(58);
        y += 4;

        // Section title
        doc.setFillColor(...ORANGE);
        doc.rect(MARGIN, y, COL_W, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.text('Resumen Global', MARGIN + 2, y + 5.5);
        y += 8;

        // Big numbers row: attended / % attendance | absent / % absence
        doc.setFillColor(...LIGHT_BG);
        doc.rect(MARGIN, y, COL_W, 22, 'F');

        // ── Asistió
        const col_A = MARGIN + COL_W * 0.15;
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(40, 140, 80);
        doc.text(String(totalAttended), col_A, y + 12, { align: 'center' });
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        doc.text('días asistidos', col_A, y + 18, { align: 'center' });

        // ── % asistencia
        const col_B = MARGIN + COL_W * 0.38;
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(40, 140, 80);
        doc.text(`${globalPct}%`, col_B, y + 12, { align: 'center' });
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        doc.text('% asistencia', col_B, y + 18, { align: 'center' });

        // Vertical divider
        doc.setDrawColor(200, 200, 200);
        doc.line(MARGIN + COL_W * 0.52, y + 2, MARGIN + COL_W * 0.52, y + 20);

        // ── Faltó
        const col_C = MARGIN + COL_W * 0.65;
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(200, 50, 10);
        doc.text(String(totalAbsent), col_C, y + 12, { align: 'center' });
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        doc.text('días faltados', col_C, y + 18, { align: 'center' });

        // ── % ausencia
        const col_D = MARGIN + COL_W * 0.86;
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(200, 50, 10);
        doc.text(`${absentPct}%`, col_D, y + 12, { align: 'center' });
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        doc.text('% ausencia', col_D, y + 18, { align: 'center' });

        y += 22;

        // ── Detail row: one cell per status with count + % ───────────────────
        const allStatuses = [
            { label: 'Presente', count: globalCounts['Presente'], color: [40, 140, 80] },
            { label: 'Con retraso', count: globalCounts['Con retraso'], color: [220, 100, 20] },
            { label: 'Justificado', count: globalCounts['Justificado'], color: [20, 120, 160] },
            { label: 'Sale antes', count: globalCounts['Sale antes'], color: [100, 50, 180] },
            { label: 'Ausente', count: globalCounts['Ausente'], color: [200, 50, 10] }
        ];
        const detailRowH = 13;
        doc.setFillColor(255, 255, 255);
        doc.rect(MARGIN, y, COL_W, detailRowH, 'F');
        doc.setDrawColor(220, 220, 220);
        doc.rect(MARGIN, y, COL_W, detailRowH);
        const dW = COL_W / allStatuses.length;
        allStatuses.forEach((item, i) => {
            const dx = MARGIN + i * dW + dW / 2;
            const pct = totalRecords > 0 ? Math.round((item.count / totalRecords) * 100) : 0;
            // Vertical separator between cells
            if (i > 0) {
                doc.setDrawColor(220, 220, 220);
                doc.line(MARGIN + i * dW, y + 1, MARGIN + i * dW, y + detailRowH - 1);
            }
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...item.color);
            doc.text(String(item.count), dx, y + 5.5, { align: 'center' });
            doc.setFontSize(5.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...item.color);
            doc.text(`${pct}%`, dx, y + 9, { align: 'center' });
            doc.setFontSize(5);
            doc.setTextColor(100, 100, 100);
            doc.text(item.label, dx, y + 12, { align: 'center' });
        });

        y += detailRowH;

        // ── Total records footnote ────────────────────────────────────────────
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(140, 140, 140);
        doc.text(`Total de registros: ${totalRecords}`, MARGIN + COL_W, y + 4, { align: 'right' });

        y += 6;
    }
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFillColor(...LIGHT_BG);
        doc.rect(0, 288, PAGE_W, 9, 'F');
        doc.setFontSize(7);
        doc.setTextColor(140, 140, 140);
        doc.setFont('helvetica', 'normal');
        doc.text(`Bootcamp Manager · ${studentFullName(student)}`, MARGIN, 293);
        doc.text(`Pág. ${p} / ${totalPages}`, PAGE_W - MARGIN, 293, { align: 'right' });
    }

    // ── Download ─────────────────────────────────────────────────────────────
    const safeName = studentFullName(student).replace(/\s+/g, '_');
    const fileSuffix = mode === 'month' ? currentAttendanceMonth : 'todos';
    doc.save(`asistencia_${safeName}_${fileSuffix}.pdf`);
}

function saveAttendanceFromModal() {
    const { studentId, date } = currentModalAttendance;

    // Guard: do not allow saving attendance on/after the student's withdrawal date
    const student = studentsForAttendance.find(s => s.id === studentId);
    if (student?.isWithdrawn && student.withdrawal?.date) {
        const withdrawalDate = student.withdrawal.date.split('T')[0];
        if (date >= withdrawalDate) return; // silently blocked — button should already be disabled
    }

    const status = document.getElementById('attendance-modal-status').value;
    const note = document.getElementById('attendance-modal-note').value;

    updateAttendance(studentId, date, status, note, null);
    bootstrap.Modal.getInstance(document.getElementById('attendanceModal')).hide();
}

function prevAttendanceMonth() {
    const [year, month] = currentAttendanceMonth.split('-').map(Number);
    let newYear = year;
    let newMonth = month - 1;
    if (newMonth === 0) {
        newMonth = 12;
        newYear--;
    }
    currentAttendanceMonth = `${newYear}-${newMonth < 10 ? '0' : ''}${newMonth}`;
    loadAttendance();
}

function nextAttendanceMonth() {
    const [year, month] = currentAttendanceMonth.split('-').map(Number);
    let newYear = year;
    let newMonth = month + 1;
    if (newMonth === 13) {
        newMonth = 1;
        newYear++;
    }
    currentAttendanceMonth = `${newYear}-${newMonth < 10 ? '0' : ''}${newMonth}`;
    loadAttendance();
}

// Export attendance to Excel for the entire promotion period
async function exportAttendanceToExcel() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('No se encontró token de autenticación. Por favor, inicie sesión nuevamente.');
            return;
        }

        // Get promotion data to show user what period will be exported
        const promotionData = window.currentPromotion;
        let confirmMessage = 'Se exportará la asistencia completa del programa';

        if (promotionData && promotionData.startDate && promotionData.endDate) {
            confirmMessage = `Se exportará la asistencia desde ${promotionData.startDate} hasta ${promotionData.endDate} (solo días laborables L-V).\n\nEl archivo Excel tendrá una pestaña por cada mes con datos de asistencia.\n\n¿Desea continuar?`;
        } else {
            confirmMessage += ' para el período completo del programa.\n\nEl archivo Excel tendrá una pestaña por cada mes con datos de asistencia.\n\n¿Desea continuar?';
        }

        if (!confirm(confirmMessage)) {
            return;
        }

        // Show loading state
        const exportBtn = document.querySelector('[onclick="exportAttendanceToExcel()"]');
        const originalText = exportBtn ? exportBtn.innerHTML : '';
        if (exportBtn) {
            exportBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Exportando...';
            exportBtn.disabled = true;
        }

        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/attendance/export`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Error del servidor: ${response.status}`);
        }

        // Get the blob and create download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;

        // Extract filename from response header or use default
        const disposition = response.headers.get('Content-Disposition');
        let filename = 'asistencia-completa.xlsx';
        if (disposition && disposition.includes('filename=')) {
            filename = disposition.split('filename=')[1].replace(/"/g, '');
        }

        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Show success message
        alert('✅ Asistencia exportada exitosamente.\n\nEl archivo Excel incluye:\n• Una pestaña por cada mes del programa\n• Todos los estudiantes en cada mes\n• Solo días laborables (L-V)\n• Estados: P=Presente, A=Ausente, T=Tardanza, J=Justificado\n• Leyenda en cada pestaña');

    } catch (error) {
        console.error('Error exporting attendance:', error);
        alert(`❌ Error al exportar la asistencia: ${error.message}`);
    } finally {
        // Restore button state
        const exportBtn = document.querySelector('[onclick="exportAttendanceToExcel()"]');
        if (exportBtn) {
            exportBtn.innerHTML = '<i class="bi bi-file-earmark-spreadsheet me-2"></i>Export Excel';
            exportBtn.disabled = false;
        }
    }
}

/**
 * Update the subtitle in Program Details when switching between tabs
 * @param {string} sectionName - Name of the section being viewed
 */
function updateProgramDetailsSubtitle(sectionName) {
    const subtitle = document.getElementById('program-details-subtitle');
    if (subtitle) {
        subtitle.textContent = sectionName;
    }
}

/**
 * Switch Program Details Tabs with reliable behavior
 * @param {string} tabName - Name of the tab to activate (schedule, team, resources, pildoras, evaluation, quicklinks, sections)
 */
function switchProgramDetailsTab(tabName) {
    const tabNameMap = {
        'roadmap': { tabId: 'program-details-roadmap', buttonId: 'program-details-roadmap-tab', label: 'Roadmap' },
        'calendar': { tabId: 'program-details-calendar', buttonId: 'program-details-calendar-tab', label: 'Calendario' },
        'schedule': { tabId: 'program-details-schedule', buttonId: 'program-details-schedule-tab', label: 'Horario' },
        'team': { tabId: 'program-details-team', buttonId: 'program-details-team-tab', label: 'Team' },
        'resources': { tabId: 'program-details-resources', buttonId: 'program-details-resources-tab', label: 'Resources' },
        'pildoras': { tabId: 'program-details-pildoras', buttonId: 'program-details-pildoras-tab', label: 'Píldoras' },
        'evaluation': { tabId: 'program-details-evaluation', buttonId: 'program-details-evaluation-tab', label: 'Evaluation' },
        'virtual-classroom': { tabId: 'program-details-virtual-classroom', buttonId: 'program-details-virtual-classroom-tab', label: 'Aula Virtual' },
        'quicklinks': { tabId: 'program-details-quicklinks', buttonId: 'program-details-quicklinks-tab', label: 'Quick Links' },
        'sections': { tabId: 'program-details-sections', buttonId: 'program-details-sections-tab', label: 'Sections' },
        'competences': { tabId: 'program-details-competences', buttonId: 'program-details-competences-tab', label: 'Competencias' }
    };

    const tab = tabNameMap[tabName];
    if (!tab) return;

    // Hide all tabs
    const allTabs = document.querySelectorAll('#program-details-content .tab-pane');
    allTabs.forEach(t => {
        t.style.display = 'none';
        t.classList.remove('show', 'active');
    });

    // Remove active class from all buttons
    const allButtons = document.querySelectorAll('#program-details-tabs .nav-link');
    allButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
    });

    // Show selected tab with animation
    const selectedTab = document.getElementById(tab.tabId);
    if (selectedTab) {
        selectedTab.style.display = 'block';
        // Trigger reflow to enable animation
        void selectedTab.offsetHeight;
        selectedTab.classList.add('show', 'active');
    }

    // Activate selected button
    const selectedButton = document.getElementById(tab.buttonId);
    if (selectedButton) {
        selectedButton.classList.add('active');
        selectedButton.setAttribute('aria-selected', 'true');
    }

    // Lazy-load data for roadmap, calendar and aula virtual sub-tabs
    if (tabName === 'roadmap') loadModules();
    if (tabName === 'calendar') loadCalendar();
    if (tabName === 'virtual-classroom') {
        // Aseguramos que el estado de evaluación (proyectos + competences) esté cargado
        if (!window._evalState || !(window._evalState.modules || []).length) {
            loadEvaluation();
        } else {
            const extInfo = (typeof extendedInfoData !== 'undefined') ? extendedInfoData : (window.publicPromotionExtendedInfo || {});
            const promoData = (window.currentPromotion || window.publicPromotionData || {});
            initVirtualClassroomPanel(extInfo, promoData);
        }
    }

    // Update subtitle
    updateProgramDetailsSubtitle(tab.label);
}

// Selection state management

// ==================== EVALUACIÓN DE PROYECTOS ====================

// Internal state for evaluation
window._evalState = {
    modules: [],
    competences: [],
    catalog: [],
    students: [],
    savedEvaluations: [],
    projectCompetences: [],
    virtualClassroom: null,
    currentModuleIdx: null,
    currentProjectIdx: null
};

async function loadEvaluation() {
    const container = document.getElementById('evaluation-content');
    if (container) {
        container.innerHTML = `<div class="text-center text-muted py-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-2">Cargando proyectos...</p>
        </div>`;
    }

    const token = localStorage.getItem('token');
    try {
        const [promoRes, extRes, studentsRes, catalogRes] = await Promise.all([
            fetch(`${API_URL}/api/promotions/${promotionId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/api/promotions/${promotionId}/extended-info`),
            fetch(`${API_URL}/api/promotions/${promotionId}/students`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/api/competences`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        const promo = promoRes.ok ? await promoRes.json() : {};
        const ext = extRes.ok ? await extRes.json() : {};
        //console.log('[DEBUG] Full ext data:', ext);
        const studentsData = studentsRes.ok ? await studentsRes.json() : [];
        const catalogRaw = catalogRes.ok ? await catalogRes.json() : [];

        //console.log('✅ [VERIFICATION] Competences received from API https://evaluation.coderf5.es/v1/competences');
        // DEBUG: log first catalog entry to verify structure
        if (catalogRaw.length > 0) {
            //console.log('[Eval] catalogRaw.length:', catalogRaw.length, 'competences');
            //console.log('[Eval] catalogRaw[0].id:', catalogRaw[0].id);
            //console.log('[Eval] catalogRaw[0].name:', catalogRaw[0].name);
            //console.log('[Eval] catalogRaw[0].areas:', JSON.stringify(catalogRaw[0].areas));
            //console.log('😎 [Eval] catalogRaw[0].tools count:', (catalogRaw[0].tools || []).length, '(from API)');
            if (catalogRaw[0].tools && catalogRaw[0].tools[0]) {
                //console.log('[Eval] catalogRaw[0].tools[0]:', JSON.stringify(catalogRaw[0].tools[0], null, 2).substring(0, 300));
            }
            //console.log('[Eval] catalogRaw[0].indicators (COMPETENCE INDICATORS):', JSON.stringify(catalogRaw[0].indicators, null, 2));
        }

        // Normalize the full catalog: id, name, area, description, levels, allTools, toolsWithIndicators, competenceIndicators
        const catalog = catalogRaw.map(comp => ({
            id: comp.id,
            name: comp.name,
            area: (comp.areas && comp.areas[0]) ? comp.areas[0].name : (comp.area || ''),
            description: comp.description || '',
            levels: (comp.levels || []).map(l => ({
                level: l.levelId,
                description: l.levelName || `Nivel ${l.levelId}`,
                indicators: (l.indicators || []).map(i => i.name || i)
            })),
            allTools: (comp.tools || []).map(t => t.name || t),
            // Full tool objects with their indicators (for indicator-based evaluation)
            toolsWithIndicators: (comp.tools || []).map(t => ({
                id: t.id,
                name: t.name || '',
                description: t.description || '',
                indicators: (t.indicators || []).map(ind => ({
                    id: ind.id,
                    name: ind.name || '',
                    description: ind.description || '',
                    levelId: ind.levelId || 1
                }))
            })),
            // General competence indicators grouped by level
            competenceIndicators: {
                initial: (comp.indicators?.initial || []).map(ind => ({ id: ind.id, name: ind.name || '', description: ind.description || '', levelId: 1 })),
                medio: (comp.indicators?.medio || []).map(ind => ({ id: ind.id, name: ind.name || '', description: ind.description || '', levelId: 2 })),
                advance: (comp.indicators?.advance || []).map(ind => ({ id: ind.id, name: ind.name || '', description: ind.description || '', levelId: 3 }))
            }
        }));


        // Merge program competences (from ext) with full catalog data so description/levels/tools are available
        const extComps = ext.competences || window._extendedInfoCompetences || [];
        const enrichedCompetences = extComps.map(ec => {
            const full = catalog.find(c => String(c.id) === String(ec.id));
            if (!full) return ec;
            return {
                ...full,
                selectedTools: ec.selectedTools || [],
                startModule: ec.startModule || null
            };
        });

        // //console.log(`🎈 ${(let i = 0; i < catalog.length; i++) catalog[i].name}`)
        // Also keep catalog entries that might be referenced by project competenceIds but not in extComps
        const extIds = new Set(extComps.map(c => String(c.id)));
        catalog.forEach(c => { if (!extIds.has(String(c.id))) enrichedCompetences.push(c); });

        window._evalState.modules = promo.modules || [];
        window._evalState.programCompetences = enrichedCompetences.filter(c => extIds.has(String(c.id)));
        window._evalState.competences = enrichedCompetences;
        window._evalState.catalog = catalog;  // full catalog for competence picker
        window._evalState.allStudents = studentsData;
        window._evalState.students = studentsData.filter(s => !s.isWithdrawn);
        const rawEvals = ext.projectEvaluations;
        window._evalState.savedEvaluations = Array.isArray(rawEvals) ? rawEvals : [];
        //console.log('[DEBUG] Loaded evaluations:', window._evalState.savedEvaluations);
        window._evalState.projectCompetences = ext.projectCompetences || []; // per-project competence definitions
        window._evalState.virtualClassroom = ext.virtualClassroom || null;

        initVirtualClassroomPanel(ext, promo);
        renderEvaluationTab();
    } catch (err) {
        console.error('Error loading evaluation data:', err);
        if (container) {
            container.innerHTML = `<div class="alert alert-danger">Error al cargar los proyectos: ${err.message}</div>`;
        }
    }
}

// ==================== AULA VIRTUAL – PANEL PROFESOR ====================

function initVirtualClassroomPanel(ext, promo) {
    const panel = document.getElementById('virtual-classroom-panel');
    if (!panel) return;

    const selectEl = document.getElementById('vc-project-select');
    const repoBaseEl = document.getElementById('vc-repo-base');
    const briefingEl = document.getElementById('vc-briefing-url');
    const statusBadge = document.getElementById('vc-status-badge');
    const deactivateBtn = document.getElementById('vc-deactivate-btn');
    const activateBtn = document.getElementById('vc-activate-btn');
    const competencesList = document.getElementById('vc-competences-list');
    const competencesCount = document.getElementById('vc-competences-count');

    if (!selectEl || !repoBaseEl || !briefingEl || !statusBadge || !deactivateBtn || !activateBtn) return;

    const modules = promo.modules || [];
    const projectCompetences = window._evalState.projectCompetences || [];

    // Build a quick lookup: "moduleId__projectName" → url (from roadmap)
    window._projectUrlMap = {};
    modules.forEach((m, idx) => {
        const mId = m.id || String(idx);
        (m.projects || []).forEach(p => {
            if (p && p.name && p.url) {
                window._projectUrlMap[`${mId}__${p.name}`] = p.url;
            }
        });
    });

    // Map rápido de módulo por id para obtener el nombre de módulo
    const moduleById = {};
    modules.forEach((m, idx) => {
        const id = m.id || String(idx);
        moduleById[id] = m;
    });

    // Populate project selector SOLO con los proyectos definidos en Evaluación (projectCompetences)
    const prevValue = selectEl.value;
    let optionsHtml = '<option value="">Selecciona módulo y proyecto…</option>';

    projectCompetences.forEach(pc => {
        const modId = pc.moduleId;
        const mod = moduleById[modId];
        const labelModule = mod ? (mod.name || '') : `Módulo ${modId}`;
        const value = `${modId}__${pc.projectName}`;
        const label = `${labelModule} — ${pc.projectName}`;
        optionsHtml += `<option value="${value}">${escapeHtml(label)}</option>`;
    });

    selectEl.innerHTML = optionsHtml;

    // Pre-select active project if any
    const vc = ext.virtualClassroom || {};
    let activeValue = '';
    if (vc && vc.moduleId && vc.projectName) {
        activeValue = `${vc.moduleId}__${vc.projectName}`;
    }
    // Solo mantener el valor si existe en el selector actual
    const candidate = activeValue || prevValue || '';
    if (candidate && Array.from(selectEl.options).some(o => o.value === candidate)) {
        selectEl.value = candidate;
    } else {
        selectEl.value = '';
    }

    // Fill inputs from active config
    // Repo base: prefer saved value, fall back to GitHub quick link
    const _githubUrl = window._githubQuickLinkUrl || '';
    if (vc.repoBaseUrl) {
        repoBaseEl.value = vc.repoBaseUrl;
        _setRepoBaseBadge(false);
    } else if (_githubUrl) {
        repoBaseEl.value = _githubUrl;
        _setRepoBaseBadge(true);
    } else {
        repoBaseEl.value = '';
        _setRepoBaseBadge(false);
    }
    // Fill briefing URL — prefer roadmap URL for the selected project (auto-fill)
    const _activeKey = selectEl.value;
    const _roadmapUrl = _activeKey && window._projectUrlMap ? window._projectUrlMap[_activeKey] : '';
    if (_roadmapUrl) {
        briefingEl.value = _roadmapUrl;
        _setBriefingSourceBadge(true);
    } else {
        briefingEl.value = vc.briefingUrl || '';
        _setBriefingSourceBadge(false);
    }

    // Update status UI
    if (vc.isActive && activeValue) {
        statusBadge.textContent = `Proyecto activo: ${vc.projectName}`;
        statusBadge.className = 'badge bg-success';
        deactivateBtn.disabled = false;
        activateBtn.textContent = 'Actualizar Aula Virtual';
        activateBtn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i>Actualizar Aula Virtual';
    } else {
        statusBadge.textContent = 'Sin proyecto activo';
        statusBadge.className = 'badge bg-secondary';
        deactivateBtn.disabled = true;
        activateBtn.innerHTML = '<i class="bi bi-play-circle me-1"></i>Activar Aula Virtual';
    }

    // Render competences preview for selected/active project
    updateVirtualClassroomCompetencesPreview();
}

function updateVirtualClassroomCompetencesPreview() {
    const selectEl = document.getElementById('vc-project-select');
    const competencesList = document.getElementById('vc-competences-list');
    const competencesCount = document.getElementById('vc-competences-count');
    if (!selectEl || !competencesList || !competencesCount) return;

    const value = selectEl.value;
    if (!value) {
        competencesList.innerHTML = '<span class="fst-italic">Selecciona un proyecto para ver sus competencias.</span>';
        competencesCount.textContent = '0 competencias';
        return;
    }

    const [moduleId, projectName] = value.split('__');
    const pcEntry = (window._evalState.projectCompetences || []).find(
        pc => pc.moduleId === moduleId && pc.projectName === projectName
    );

    const compIds = pcEntry ? (pcEntry.competenceIds || []) : [];
    const catalog = window._evalState.catalog || window._evalState.competences || [];

    if (!compIds.length) {
        competencesList.innerHTML = '<span class="fst-italic">Este proyecto no tiene competencias definidas todavía en Evaluación.</span>';
        competencesCount.textContent = '0 competencias';
        return;
    }

    const pcTools = (pcEntry && pcEntry.competenceTools) ? pcEntry.competenceTools : {};
    
    const mainAccordionId = `vc-preview-acc`;
    const items = compIds.map((cid, idx) => {
        const cidStr = String(cid);
        const c = catalog.find(ec => String(ec.id) === cidStr);
        if (!c) return `<div class="accordion-item"><div class="accordion-header px-3 py-2 small text-muted">Competencia ${cid}</div></div>`;

        const levelDescs = (c.levels || []).reduce((acc, l) => { acc[l.level] = l.description; return acc; }, {});
        const compInds = c.competenceIndicators || { initial: [], medio: [], advance: [] };
        const selectedToolNames = pcTools[cidStr] || [];
        const allToolObjs = c.toolsWithIndicators || [];
        const tools = allToolObjs.filter(t => selectedToolNames.includes(t.name));
        
        const LEVEL_COLORS = { 1: '#ffc107', 2: '#0d6efd', 3: '#198754' };
        const LEVEL_BG = { 1: '#fff3cd', 2: '#cfe2ff', 3: '#d1e7dd' };
        const LEVEL_NAMES = { 1: 'Básico', 2: 'Medio', 3: 'Avanzado' };

        // Competence levels side-by-side
        const compLevelCols = [1, 2, 3].map(lvl => {
            const catInds = lvl === 1 ? compInds.initial : (lvl === 2 ? compInds.medio : compInds.advance);
            const levelObj = (c.levels || []).find(l => l.level === lvl);
            const finalIndNames = (catInds && catInds.length > 0) 
                ? catInds.map(i => i.name || i) 
                : (levelObj && levelObj.indicators ? levelObj.indicators : []);

            const desc = levelDescs[lvl] || LEVEL_NAMES[lvl];
            return `
                <div class="col-md-4">
                    <div class="p-2 h-100 rounded border" style="background:${LEVEL_BG[lvl]}; border-color:${LEVEL_COLORS[lvl]} !important;">
                        <div class="extra-small fw-bold mb-1 text-uppercase" style="color:${LEVEL_COLORS[lvl]}; font-size: 0.6rem; letter-spacing: 0.05em;">
                            <i class="bi bi-award-fill me-1"></i>Nivel ${lvl}
                        </div>
                        <div class="small fw-semibold mb-1" style="font-size: 0.75rem; line-height: 1.2;">${escapeHtml(desc)}</div>
                        ${(finalIndNames && finalIndNames.length > 0) ? `
                        <ul class="mb-0 ps-3 extra-small text-muted" style="font-size: 0.7rem; line-height: 1.2;">
                            ${finalIndNames.map(name => `<li>${escapeHtml(name)}</li>`).join('')}
                        </ul>` : '<div class="text-muted extra-small fst-italic">Sin indicadores definidos.</div>'}
                    </div>
                </div>
            `;
        }).join('');

        // Tool accordion
        const toolAccordionId = `vc-tool-acc-${idx}`;
        const toolAccordionHtml = tools.length > 0 ? `
            <div class="accordion accordion-flush mt-3 border rounded shadow-sm" id="${toolAccordionId}">
                <div class="bg-light px-3 py-2 border-bottom extra-small fw-bold text-uppercase text-muted" style="font-size: 0.6rem; letter-spacing: 0.05em;">
                    <i class="bi bi-tools me-1"></i>Herramientas y Tecnologías
                </div>
                ${tools.map((tool, tIdx) => {
                    const toolByLevel = { 1: [], 2: [], 3: [] };
                    (tool.indicators || []).forEach(ind => { if (toolByLevel[ind.levelId]) toolByLevel[ind.levelId].push(ind); });
                    
                    const toolLevelCols = [1, 2, 3].filter(l => toolByLevel[l].length > 0).map(lvl => `
                        <div class="col-md-4">
                            <div class="extra-small fw-bold mb-1 text-uppercase" style="color:${LEVEL_COLORS[lvl]}; font-size: 0.55rem;">
                                Nivel ${lvl} ${LEVEL_NAMES[lvl]}
                            </div>
                            <ul class="mb-0 ps-3 extra-small text-muted" style="font-size: 0.65rem; line-height: 1.2;">
                                ${toolByLevel[lvl].map(ind => `<li>${escapeHtml(ind.name)}</li>`).join('')}
                            </ul>
                        </div>
                    `).join('');

                    return `
                        <div class="accordion-item">
                            <h2 class="accordion-header">
                                <button class="accordion-button collapsed py-2 px-3 small fw-bold" type="button" 
                                    data-bs-toggle="collapse" data-bs-target="#${toolAccordionId}-${tIdx}">
                                    ${escapeHtml(tool.name)}
                                </button>
                            </h2>
                            <div id="${toolAccordionId}-${tIdx}" class="accordion-collapse collapse" data-bs-parent="#${toolAccordionId}">
                                <div class="accordion-body p-3">
                                    ${tool.description ? `<p class="text-muted extra-small mb-3 italic">${escapeHtml(tool.description)}</p>` : ''}
                                    <div class="row g-2">${toolLevelCols || '<div class="col text-muted extra-small fst-italic">Sin indicadores definidos para esta herramienta.</div>'}</div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        ` : '';

        const collapseId = `vc-prev-collapse-${idx}`;
        return `
            <div class="accordion-item shadow-sm mb-2 border rounded overflow-hidden">
                <h2 class="accordion-header">
                    <button class="accordion-button ${idx === 0 ? '' : 'collapsed'} py-2 px-3" type="button" 
                        data-bs-toggle="collapse" data-bs-target="#${collapseId}">
                        <div class="d-flex align-items-center gap-2">
                            <span class="badge bg-primary px-2" style="font-size: 0.65rem;">${escapeHtml(c.area || 'General')}</span>
                            <strong class="small">${escapeHtml(c.name)}</strong>
                        </div>
                    </button>
                </h2>
                <div id="${collapseId}" class="accordion-collapse collapse ${idx === 0 ? 'show' : ''}" data-bs-parent="#${mainAccordionId}">
                    <div class="accordion-body p-3">
                        ${c.description ? `<p class="text-muted extra-small mb-3" style="line-height: 1.3;">${escapeHtml(c.description)}</p>` : ''}
                        <div class="row g-2">
                            ${compLevelCols}
                        </div>
                        ${toolAccordionHtml}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    competencesList.innerHTML = `<div class="accordion accordion-flush" id="${mainAccordionId}">${items}</div>`;
    competencesCount.textContent = `${compIds.length} competencia${compIds.length !== 1 ? 's' : ''}`;
}

// Called by select change in the panel
window.onVirtualClassroomProjectChange = function () {
    updateVirtualClassroomCompetencesPreview();
    const selectEl = document.getElementById('vc-project-select');
    if (selectEl) _applyBriefingUrlFromRoadmap(selectEl.value);
};

function _setBriefingSourceBadge(fromRoadmap) {
    const badge = document.getElementById('vc-briefing-source');
    const hint = document.getElementById('vc-briefing-hint');
    if (badge) badge.classList.toggle('d-none', !fromRoadmap);
    if (hint) hint.classList.toggle('d-none', !fromRoadmap);
}

function _setRepoBaseBadge(fromGithub) {
    const badge = document.getElementById('vc-repo-base-source');
    const hint = document.getElementById('vc-repo-base-hint');
    if (badge) badge.classList.toggle('d-none', !fromGithub);
    if (hint) hint.classList.toggle('d-none', !fromGithub);
}

function _applyBriefingUrlFromRoadmap(selectValue) {
    const briefingEl = document.getElementById('vc-briefing-url');
    if (!briefingEl) return;
    const roadmapUrl = selectValue && window._projectUrlMap ? window._projectUrlMap[selectValue] : '';
    if (roadmapUrl) {
        briefingEl.value = roadmapUrl;
        _setBriefingSourceBadge(true);
    } else {
        // Only clear if currently showing a roadmap URL (don't wipe manually entered values)
        const badge = document.getElementById('vc-briefing-source');
        if (badge && !badge.classList.contains('d-none')) {
            briefingEl.value = '';
        }
        _setBriefingSourceBadge(false);
    }
}

async function saveVirtualClassroom(isActive) {
    const selectEl = document.getElementById('vc-project-select');
    const repoBaseEl = document.getElementById('vc-repo-base');
    const briefingEl = document.getElementById('vc-briefing-url');
    const statusBadge = document.getElementById('vc-status-badge');
    const deactivateBtn = document.getElementById('vc-deactivate-btn');
    const activateBtn = document.getElementById('vc-activate-btn');

    if (!selectEl || !repoBaseEl || !briefingEl || !statusBadge || !deactivateBtn || !activateBtn) return;

    const value = selectEl.value;
    if (!value && isActive) {
        showToast('Selecciona un proyecto antes de activar el Aula Virtual', 'danger');
        return;
    }

    const [moduleId, projectName] = value ? value.split('__') : ['', ''];

    // Derive project type from saved evaluations if exists (fallback: individual)
    const savedEvaluations = window._evalState.savedEvaluations || [];
    const existingEval = savedEvaluations.find(e => e.moduleId === moduleId && e.projectName === projectName);
    const projectType = existingEval ? (existingEval.type || 'individual') : 'individual';

    // Prepare current enriched competences from _evalState to sync with DB
    // IMPORTANT: Only sync the actual program competences (preventing the full catalog save)
    const syncComps = (window._evalState.programCompetences || []).map(c => ({
        id: c.id, name: c.name, area: c.area, description: c.description || '',
        levels: c.levels || [], allTools: c.allTools || [],
        selectedTools: Array.from(c.selectedTools || []),
        toolsWithIndicators: c.toolsWithIndicators || [],
        competenceIndicators: c.competenceIndicators || { initial: [], medio: [], advance: [] }
    }));

    const body = {
        competences: syncComps,
        virtualClassroom: {
            isActive: !!isActive,
            moduleId,
            projectName,
            projectType,
            repoBaseUrl: repoBaseEl.value || '',
            briefingUrl: briefingEl.value || ''
        }
    };

    const token = localStorage.getItem('token');
    activateBtn.disabled = true;
    deactivateBtn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/api/promotions/${promotionId}/extended-info`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.error('Error saving virtual classroom:', err);
            showToast('Error al guardar la configuración del Aula Virtual', 'danger');
            return;
        }

        const updated = await res.json();
        window._evalState.virtualClassroom = updated.virtualClassroom || body.virtualClassroom;
        
        // Sync with global extendedInfoData to prevent stale overwrites on next "Guardar Todos los Cambios"
        if (typeof extendedInfoData !== 'undefined') {
            extendedInfoData.virtualClassroom = window._evalState.virtualClassroom;
            if (updated.competences) {
                extendedInfoData.competences = updated.competences;
            }
        }

        if (body.virtualClassroom.isActive && moduleId && projectName) {
            statusBadge.textContent = `Proyecto activo: ${projectName}`;
            statusBadge.className = 'badge bg-success';
            deactivateBtn.disabled = false;
            activateBtn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i>Actualizar Aula Virtual';
            showToast('Aula Virtual activada/actualizada correctamente', 'success');
        } else {
            statusBadge.textContent = 'Sin proyecto activo';
            statusBadge.className = 'badge bg-secondary';
            deactivateBtn.disabled = true;
            activateBtn.innerHTML = '<i class="bi bi-play-circle me-1"></i>Activar Aula Virtual';
            showToast('Aula Virtual desactivada', 'success');
        }
    } catch (err) {
        console.error('Error saving virtual classroom:', err);
        showToast('Error de conexión al guardar Aula Virtual', 'danger');
    } finally {
        activateBtn.disabled = false;
        if (window._evalState.virtualClassroom && window._evalState.virtualClassroom.isActive) {
            deactivateBtn.disabled = false;
        }
    }
}

window.deactivateVirtualClassroom = function () {
    saveVirtualClassroom(false);
};

function renderEvaluationTab() {
    const container = document.getElementById('evaluation-content');
    if (!container) return;

    const { modules, savedEvaluations } = window._evalState;

    if (!modules || modules.length === 0) {
        container.innerHTML = `<div class="alert alert-info">
            <i class="bi bi-info-circle me-2"></i>
            No hay módulos definidos en el roadmap. Añade módulos y proyectos en la sección Roadmap primero.
        </div>`;
        return;
    }

    const projectsExist = modules.some(m => m.projects && m.projects.length > 0);
    if (!projectsExist) {
        container.innerHTML = `<div class="alert alert-info">
            <i class="bi bi-info-circle me-2"></i>
            No hay proyectos definidos en ningún módulo. Añade proyectos al roadmap primero.
        </div>`;
        return;
    }

    // ── Toolbar: Histórico de equipos button ────────────────────────────────
    const grupalCount = savedEvaluations.filter(e => e.type === 'grupal' && e.groups && e.groups.length > 0).length;
    let html = `<div class="d-flex justify-content-end mb-3 gap-2">
        <button class="btn btn-outline-info btn-sm" onclick="switchToVirtualClassroom()" title="Ir al Aula Virtual en Contenido del Programa">
            <i class="bi bi-laptop me-2"></i>Aula Virtual (Activar Proyectos)
        </button>
        <button class="btn btn-outline-secondary btn-sm" onclick="openTeamHistoryModal()" title="Ver histórico de equipos entre proyectos grupales">
            <i class="bi bi-people-fill me-2"></i>Histórico de equipos
            ${grupalCount > 0 ? `<span class="badge bg-secondary ms-1">${grupalCount} grupal${grupalCount !== 1 ? 'es' : ''}</span>` : ''}
        </button>
    </div>`;

    html += `<div class="accordion" id="evalAccordion">`;

    modules.forEach((mod, mIdx) => {
        if (!mod.projects || mod.projects.length === 0) return;

        const modKey = `eval-mod-${mIdx}`;
        const projectCount = mod.projects.length;
        const savedForModule = savedEvaluations.filter(e => e.moduleId === (mod.id || String(mIdx)));
        // A project is considered 'evaluated' if it has at least one entry with evaluatedAt
        const evaluatedCount = savedForModule.filter(e => (e.evaluations || []).some(ev => ev.evaluatedAt)).length;

        html += `
        <div class="accordion-item mb-3 border rounded shadow-sm">
            <h2 class="accordion-header" id="heading-${modKey}">
                <button class="accordion-button collapsed fw-semibold" type="button"
                    data-bs-toggle="collapse" data-bs-target="#collapse-${modKey}"
                    aria-expanded="false" aria-controls="collapse-${modKey}">
                    <i class="bi bi-folder2-open me-2 text-primary"></i>
                    ${escapeHtml(mod.name || `Módulo ${mIdx + 1}`)}
                    <span class="badge bg-secondary ms-2">${projectCount} proyecto${projectCount !== 1 ? 's' : ''}</span>
                    ${evaluatedCount > 0 ? `<span class="badge bg-success ms-1">${evaluatedCount} evaluado${evaluatedCount !== 1 ? 's' : ''}</span>` : ''}
                </button>
            </h2>
            <div id="collapse-${modKey}" class="accordion-collapse collapse"
                aria-labelledby="heading-${modKey}" data-bs-parent="#evalAccordion">
                <div class="accordion-body p-3">
                    <div class="row g-3">`;

        mod.projects.forEach((proj, pIdx) => {
            const projKey = _evalProjectKey(mod.id || String(mIdx), proj.name);
            const saved = savedEvaluations.find(e => e.moduleId === (mod.id || String(mIdx)) && e.projectName === proj.name);
            const projType = saved ? saved.type : 'individual';
            const compCount = (proj.competenceIds || []).length;
            const evals = saved ? (saved.evaluations || []) : [];
            const evalCount = evals.filter(e => e.evaluatedAt).length; // Only counts those with a date (graded)
            const submissionCount = evals.filter(e => e.submissionLink).length; // Counts those with a link
            //console.log(`[DEBUG] Project "${proj.name}": evalCount=${evalCount}, submissionCount=${submissionCount}`, evals);
            const hasEval = evalCount > 0;
            const hasSubmission = submissionCount > 0;
            const groupCount = (saved && saved.groups) ? saved.groups.length : 0;
            const totalTargets = projType === 'grupal'
                ? groupCount
                : window._evalState.students.length;

            const submissionBadge = hasSubmission
                ? `<span class="badge bg-info text-dark me-1" title="Proyectos entregados"><i class="bi bi-cloud-arrow-up-fill me-1"></i>${submissionCount}/${totalTargets}</span>`
                : '';
            const evalBadge = hasEval
                ? `<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>${evalCount}/${totalTargets} evaluado${evalCount !== 1 ? 's' : ''}</span>`
                : `<span class="badge bg-light text-muted border">Sin evaluar</span>`;

            // Per-project competence count (from projectCompetences, not proj.competenceIds)
            const projCompDef = (window._evalState.projectCompetences || []).find(
                pc => pc.moduleId === (mod.id || String(mIdx)) && pc.projectName === proj.name
            );
            const projCompCount = projCompDef ? (projCompDef.competenceIds || []).length : 0;
            const compBadgeStyle = projCompCount > 0 ? 'background:#E85D26;color:#fff;' : '';
            const compBadgeClass = projCompCount > 0 ? '' : 'bg-light text-muted border';

            html += `
            <div class="col-md-6 col-lg-4">
                <div class="card h-100 ${hasEval ? 'border-success' : ''}">
                    <div class="card-body d-flex flex-column">
                        <div class="d-flex align-items-start justify-content-between mb-2">
                            <h6 class="card-title mb-0 fw-semibold">${escapeHtml(proj.name || 'Proyecto')}</h6>
                            <div class="d-flex align-items-center">
                                ${submissionBadge}
                                ${evalBadge}
                            </div>
                        </div>
                        ${proj.url ? `<a href="${escapeHtml(proj.url)}" target="_blank" class="text-muted small mb-2 text-truncate d-block"><i class="bi bi-link-45deg me-1"></i>${escapeHtml(proj.url)}</a>` : ''}
                        <div class="d-flex gap-2 flex-wrap mb-2">
                            <button class="badge border-0 ${compBadgeClass}" style="${compBadgeStyle}cursor:pointer;"
                                onclick="openEvalProjectCompetencePicker(${mIdx}, ${pIdx})" title="Definir competencias de este proyecto">
                                <i class="bi bi-award me-1"></i>${projCompCount} competencia${projCompCount !== 1 ? 's' : ''}
                                <i class="bi bi-pencil-square ms-1 opacity-75" style="font-size:.7rem;"></i>
                            </button>
                            <span class="badge ${projType === 'grupal' ? 'bg-info text-dark' : 'bg-warning text-dark'}">
                                <i class="bi bi-${projType === 'grupal' ? 'people' : 'person'} me-1"></i>${projType}
                            </span>
                            ${projType === 'grupal' ? `<span class="badge ${groupCount > 0 ? 'bg-primary' : 'bg-light text-muted border'}"><i class="bi bi-diagram-3 me-1"></i>${groupCount} grupo${groupCount !== 1 ? 's' : ''}</span>` : ''}
                        </div>
                        <div class="d-flex gap-2 mt-auto flex-wrap align-items-center">
                            <div class="btn-group btn-group-sm" role="group">
                                <button type="button" class="btn btn-outline-secondary ${projType === 'individual' ? 'active' : ''}"
                                    onclick="setEvalProjectType(${mIdx}, ${pIdx}, 'individual')" title="Individual">
                                    <i class="bi bi-person"></i> Individual
                                </button>
                                <button type="button" class="btn btn-outline-secondary ${projType === 'grupal' ? 'active' : ''}"
                                    onclick="setEvalProjectType(${mIdx}, ${pIdx}, 'grupal')" title="Grupal">
                                    <i class="bi bi-people"></i> Grupal
                                </button>
                            </div>
                            ${projType === 'grupal' ? `
                            <button class="btn btn-sm btn-outline-info" onclick="openGroupsModal(${mIdx}, ${pIdx})" title="Definir grupos">
                                <i class="bi bi-diagram-3 me-1"></i>Grupos
                            </button>` : ''}
                            <button class="btn btn-sm btn-primary ms-auto" onclick="openEvaluationView(${mIdx}, ${pIdx})"
                                style="background:#E85D26;border-color:#E85D26;">
                                <i class="bi bi-clipboard-check me-1"></i>Evaluar
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;
        });

        html += `
                    </div>
                </div>
            </div>
        </div>`;
    });

    html += `</div>`;
    container.innerHTML = html;
}

function _evalProjectKey(moduleId, projectName) {
    return `${moduleId}__${projectName}`;
}

// ==================== COMPETENCE PICKER (per-project, from Evaluation tab) ====================

/**
 * Opens the per-project competence+tools definition modal.
 * Stores data in window._evalState.projectCompetences[].
 */
function openEvalProjectCompetencePicker(mIdx, pIdx) {
    const { modules, catalog } = window._evalState;
    const mod = modules[mIdx];
    const proj = mod.projects[pIdx];
    const modId = mod.id || String(mIdx);

    // Find or create the entry for this project
    if (!window._evalState.projectCompetences) window._evalState.projectCompetences = [];
    let pcEntry = window._evalState.projectCompetences.find(
        pc => pc.moduleId === modId && pc.projectName === proj.name
    );
    if (!pcEntry) {
        // Start with empty selection — competences are defined here, not in the roadmap
        pcEntry = {
            moduleId: modId,
            projectName: proj.name,
            competenceIds: [],
            competenceTools: {}
        };
    }

    // Use full catalog (always all competences available)
    const fullCatalog = (catalog && catalog.length) ? catalog : (window._extendedInfoCompetences || []);

    if (!fullCatalog.length) {
        showToast('No se encontró el catálogo de competencias. Intenta recargar la página.', 'danger');
        return;
    }

    // Store working copy
    window._evalProjPickerState = {
        mIdx, pIdx, modId,
        projName: proj.name,
        modName: mod.name || `Módulo ${mIdx + 1}`,
        selectedIds: new Set((pcEntry.competenceIds || []).map(String)),
        competenceTools: JSON.parse(JSON.stringify(pcEntry.competenceTools || {})),
        catalog: fullCatalog
    };

    // Build modal HTML
    const areaSet = new Set(fullCatalog.map(c => c.area || 'Sin área'));
    const areaOptions = [...areaSet].sort().map(a =>
        `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`
    ).join('');

    const rows = fullCatalog.map(c => _buildPickerRow(c, window._evalProjPickerState)).join('');

    // Inject or create modal
    let modal = document.getElementById('eval-proj-comp-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'eval-proj-comp-modal';
        modal.className = 'modal fade';
        modal.setAttribute('tabindex', '-1');
        modal.innerHTML = `<div class="modal-dialog modal-xl modal-dialog-scrollable">
            <div class="modal-content">
                <div class="modal-header" style="background:linear-gradient(135deg,#fff8f5,#fff3ee);border-bottom:2px solid #E85D26;">
                    <div>
                        <h5 class="modal-title fw-bold mb-0">
                            <i class="bi bi-award me-2" style="color:#E85D26;"></i>
                            Competencias del proyecto: <span id="epcp-proj-title"></span>
                        </h5>
                        <small class="text-muted" id="epcp-mod-subtitle"></small>
                    </div>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-0">
                    <div class="p-3 border-bottom bg-light d-flex flex-wrap gap-2 align-items-center">
                        <div class="input-group input-group-sm" style="max-width:260px;">
                            <span class="input-group-text"><i class="bi bi-search"></i></span>
                            <input type="text" class="form-control" id="epcp-search" placeholder="Buscar competencia...">
                        </div>
                        <select class="form-select form-select-sm w-auto" id="epcp-area-filter">
                            <option value="">Todas las áreas</option>
                            ${areaOptions}
                        </select>
                        <span class="ms-auto badge bg-light text-dark border" id="epcp-selected-count">0 seleccionadas</span>
                    </div>
                    <div id="epcp-list" class="p-3" style="max-height:60vh;overflow-y:auto;">
                    </div>
                </div>
                <div class="modal-footer justify-content-between">
                    <small class="text-muted"><i class="bi bi-info-circle me-1"></i>Selecciona las competencias y elige qué herramientas se evaluarán en este proyecto.</small>
                    <div class="d-flex gap-2">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-primary" style="background:#E85D26;border-color:#E85D26;" onclick="saveEvalProjectCompetences()">
                            <i class="bi bi-check-lg me-1"></i>Guardar competencias
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.appendChild(modal);

        // Live filter
        modal.querySelector('#epcp-search').addEventListener('input', _filterEvalProjPicker);
        modal.querySelector('#epcp-area-filter').addEventListener('change', _filterEvalProjPicker);
    }

    // Update modal header
    modal.querySelector('#epcp-proj-title').textContent = proj.name;
    modal.querySelector('#epcp-mod-subtitle').textContent = mod.name || `Módulo ${mIdx + 1}`;

    // Re-render list (fresh state)
    _renderEvalProjPickerList();

    const bsModal = bootstrap.Modal.getOrCreateInstance(modal);
    bsModal.show();
}

function _buildPickerRow(comp, state) {
    const isSelected = state.selectedIds.has(String(comp.id));
    const selectedTools = state.competenceTools[String(comp.id)] || [];
    const allTools = comp.allTools || [];
    const toolsHtml = allTools.map(t => {
        const checked = selectedTools.includes(t) ? 'checked' : '';
        return `<div class="form-check form-check-inline">
            <input class="form-check-input epcp-tool-check" type="checkbox" value="${escapeHtml(t)}"
                data-comp-id="${escapeHtml(String(comp.id))}"
                id="epcp-tool-${escapeHtml(String(comp.id))}-${escapeHtml(t)}"
                ${checked} ${isSelected ? '' : 'disabled'}
                onchange="window._evalProjPickerToggleTool(this)">
            <label class="form-check-label small" for="epcp-tool-${escapeHtml(String(comp.id))}-${escapeHtml(t)}">${escapeHtml(t)}</label>
        </div>`;
    }).join('');

    return `<div class="epcp-row border rounded mb-2 p-2 ${isSelected ? 'border-warning bg-white' : 'bg-light'}"
            data-comp-id="${escapeHtml(String(comp.id))}"
            data-area="${escapeHtml(comp.area || '')}"
            data-name="${escapeHtml((comp.name || '').toLowerCase())}">
        <div class="d-flex align-items-center gap-2">
            <div class="form-check mb-0 flex-shrink-0">
                <input class="form-check-input epcp-comp-check" type="checkbox" value="${escapeHtml(String(comp.id))}"
                    id="epcp-comp-${escapeHtml(String(comp.id))}"
                    ${isSelected ? 'checked' : ''}
                    onchange="window._evalProjPickerToggleComp(this)">
            </div>
            <label class="form-check-label fw-semibold d-flex align-items-center gap-2 flex-grow-1" for="epcp-comp-${escapeHtml(String(comp.id))}">
                <span class="badge bg-secondary" style="font-size:.7rem;">${escapeHtml(comp.area || 'Sin área')}</span>
                ${escapeHtml(comp.name)}
            </label>
            ${allTools.length ? `<span class="badge bg-light text-muted border small">${selectedTools.length}/${allTools.length} herramientas</span>` : ''}
        </div>
        ${allTools.length ? `<div class="mt-2 ps-4 epcp-tools-section" ${isSelected ? '' : 'style="display:none;"'}>
            <small class="text-muted fw-semibold d-block mb-1"><i class="bi bi-tools me-1"></i>Herramientas a evaluar:</small>
            <div class="d-flex flex-wrap gap-1">${toolsHtml}</div>
            <button type="button" class="btn btn-link btn-sm p-0 mt-1 text-primary epcp-select-all-tools"
                data-comp-id="${escapeHtml(String(comp.id))}"
                onclick="window._evalProjPickerSelectAllTools('${escapeHtml(String(comp.id))}')">
                <i class="bi bi-check-all me-1"></i>Seleccionar todas
            </button>
        </div>` : ''}
    </div>`;
}

function _renderEvalProjPickerList() {
    const state = window._evalProjPickerState;
    if (!state) return;
    const listEl = document.getElementById('epcp-list');
    if (!listEl) return;
    listEl.innerHTML = state.catalog.map(c => _buildPickerRow(c, state)).join('');
    _updateEvalProjPickerCount();
}

function _filterEvalProjPicker() {
    const state = window._evalProjPickerState;
    if (!state) return;
    const search = (document.getElementById('epcp-search')?.value || '').toLowerCase();
    const area = document.getElementById('epcp-area-filter')?.value || '';

    document.querySelectorAll('#epcp-list .epcp-row').forEach(row => {
        const rowArea = row.dataset.area || '';
        const rowName = row.dataset.name || '';
        const matches = (!area || rowArea === area) && (!search || rowName.includes(search));
        row.style.display = matches ? '' : 'none';
    });
}

function _updateEvalProjPickerCount() {
    const state = window._evalProjPickerState;
    if (!state) return;
    const countEl = document.getElementById('epcp-selected-count');
    if (countEl) countEl.textContent = `${state.selectedIds.size} seleccionada${state.selectedIds.size !== 1 ? 's' : ''}`;
}

window._evalProjPickerToggleComp = function (checkbox) {
    const state = window._evalProjPickerState;
    if (!state) return;
    const compId = String(checkbox.value);
    const row = checkbox.closest('.epcp-row');

    if (checkbox.checked) {
        state.selectedIds.add(compId);
        // Default: all tools selected
        const comp = state.catalog.find(c => String(c.id) === compId);
        if (comp && comp.allTools && comp.allTools.length) {
            state.competenceTools[compId] = [...comp.allTools];
        }
        if (row) {
            row.classList.replace('bg-light', 'bg-white');
            row.classList.add('border-warning');
            const toolsSec = row.querySelector('.epcp-tools-section');
            if (toolsSec) toolsSec.style.display = '';
            row.querySelectorAll('.epcp-tool-check').forEach(cb => { cb.disabled = false; cb.checked = true; });
        }
    } else {
        state.selectedIds.delete(compId);
        delete state.competenceTools[compId];
        if (row) {
            row.classList.replace('bg-white', 'bg-light');
            row.classList.remove('border-warning');
            const toolsSec = row.querySelector('.epcp-tools-section');
            if (toolsSec) toolsSec.style.display = 'none';
            row.querySelectorAll('.epcp-tool-check').forEach(cb => { cb.disabled = true; cb.checked = false; });
        }
    }
    _updateEvalProjPickerCount();
};

window._evalProjPickerToggleTool = function (checkbox) {
    const state = window._evalProjPickerState;
    if (!state) return;
    const compId = String(checkbox.dataset.compId);
    const tool = checkbox.value;
    if (!state.competenceTools[compId]) state.competenceTools[compId] = [];
    if (checkbox.checked) {
        if (!state.competenceTools[compId].includes(tool)) state.competenceTools[compId].push(tool);
    } else {
        state.competenceTools[compId] = state.competenceTools[compId].filter(t => t !== tool);
    }
    // Update tool count badge in row
    const row = checkbox.closest('.epcp-row');
    if (row) {
        const comp = state.catalog.find(c => String(c.id) === compId);
        const allCount = comp ? (comp.allTools || []).length : 0;
        const selCount = (state.competenceTools[compId] || []).length;
        const badge = row.querySelector('.badge.bg-light.text-muted');
        if (badge) badge.textContent = `${selCount}/${allCount} herramientas`;
    }
};

window._evalProjPickerSelectAllTools = function (compId) {
    const state = window._evalProjPickerState;
    if (!state) return;
    const comp = state.catalog.find(c => String(c.id) === compId);
    if (!comp) return;
    state.competenceTools[compId] = [...(comp.allTools || [])];
    // Update checkboxes in DOM
    document.querySelectorAll(`.epcp-tool-check[data-comp-id="${escapeHtml(compId)}"]`).forEach(cb => { cb.checked = true; });
    // Update count badge
    const row = document.querySelector(`.epcp-row[data-comp-id="${escapeHtml(compId)}"]`);
    if (row) {
        const badge = row.querySelector('.badge.bg-light.text-muted');
        if (badge) badge.textContent = `${state.competenceTools[compId].length}/${state.competenceTools[compId].length} herramientas`;
    }
};

async function saveEvalProjectCompetences() {
    const state = window._evalProjPickerState;
    if (!state) return;

    if (!window._evalState.projectCompetences) window._evalState.projectCompetences = [];

    const entry = {
        moduleId: state.modId,
        projectName: state.projName,
        competenceIds: [...state.selectedIds].map(id => isNaN(Number(id)) ? id : Number(id)),
        competenceTools: state.competenceTools
    };

    const idx = window._evalState.projectCompetences.findIndex(
        pc => pc.moduleId === state.modId && pc.projectName === state.projName
    );
    if (idx >= 0) window._evalState.projectCompetences[idx] = entry;
    else window._evalState.projectCompetences.push(entry);

    // Persist to server
    await _persistProjectCompetences();

    // Also aggregate → update extendedInfo.competences for the program tab
    await _aggregateAndSyncCompetencesToProgram();

    // Close modal
    const modal = document.getElementById('eval-proj-comp-modal');
    if (modal) bootstrap.Modal.getOrCreateInstance(modal).hide();

    // Re-render evaluation tab to update badge count
    renderEvaluationTab();
    showToast('Competencias del proyecto guardadas ✓', 'success');
}

async function _persistProjectCompetences() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/api/promotions/${promotionId}/extended-info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ projectCompetences: window._evalState.projectCompetences })
        });
        if (!res.ok) console.error('[_persistProjectCompetences] Error:', res.status);
    } catch (err) {
        console.error('[_persistProjectCompetences] Exception:', err);
    }
}

/**
 * Aggregates competences defined across all projects → writes to extendedInfo.competences.
 * Deduplicates by competence ID; merges tools (union).
 * Then updates ProgramCompetences display (read-only).
 */
async function _aggregateAndSyncCompetencesToProgram() {
    const { catalog, projectCompetences } = window._evalState;
    if (!projectCompetences) return;

    // Build a map: competenceId → { ...catalogEntry, selectedTools: Set }
    const compMap = new Map();
    projectCompetences.forEach(pc => {
        (pc.competenceIds || []).forEach(cid => {
            const cidStr = String(cid);
            const catalogEntry = (catalog || []).find(c => String(c.id) === cidStr);
            if (!catalogEntry) return;
            if (!compMap.has(cidStr)) {
                compMap.set(cidStr, {
                    ...catalogEntry,
                    selectedTools: new Set()
                });
            }
            // Union of tools from all projects that reference this competence
            const tools = (pc.competenceTools && pc.competenceTools[cidStr]) || [];
            tools.forEach(t => compMap.get(cidStr).selectedTools.add(t));
        });
    });

    // Convert to array for saving
    const aggregated = [...compMap.values()].map(c => ({
        id: c.id,
        name: c.name,
        area: c.area,
        description: c.description || '',
        levels: c.levels || [],
        allTools: c.allTools || [],
        selectedTools: [...c.selectedTools],
        evalModules: []
    }));

    // Update extendedInfoData (for next Save All Changes)
    if (typeof extendedInfoData !== 'undefined') {
        extendedInfoData.competences = aggregated;
    }
    window._extendedInfoCompetences = aggregated;

    // Update ProgramCompetences display (view-only mode)
    if (window.ProgramCompetences && window.ProgramCompetences.initViewOnly) {
        window.ProgramCompetences.initViewOnly(aggregated);
    }

    // Persist aggregated competences immediately
    const token = localStorage.getItem('token');
    try {
        await fetch(`${API_URL}/api/promotions/${promotionId}/extended-info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ competences: aggregated })
        });
    } catch (err) {
        console.error('[_aggregateAndSyncCompetencesToProgram] Error persisting:', err);
    }
}

// ==================== HISTÓRICO DE EQUIPOS ====================

// ── Shared helper: compute pairCount & pairProjects from all grupal saved evaluations ──
function _computePairCount() {
    const { modules, savedEvaluations } = window._evalState;
    const pairCount = {};   // keyA → keyB → count  (keyA < keyB always)
    const pairProjects = {}; // keyA → keyB → [label, ...]

    modules.forEach((mod, mIdx) => {
        (mod.projects || []).forEach((proj) => {
            const modId = mod.id || String(mIdx);
            const saved = savedEvaluations.find(e => e.moduleId === modId && e.projectName === proj.name);
            if (!saved || saved.type !== 'grupal' || !saved.groups) return;
            saved.groups.forEach(grp => {
                const ids = (grp.studentIds || []).map(String);
                for (let i = 0; i < ids.length; i++) {
                    for (let j = i + 1; j < ids.length; j++) {
                        const a = ids[i] < ids[j] ? ids[i] : ids[j];
                        const b = ids[i] < ids[j] ? ids[j] : ids[i];
                        if (!pairCount[a]) pairCount[a] = {};
                        if (!pairProjects[a]) pairProjects[a] = {};
                        pairCount[a][b] = (pairCount[a][b] || 0) + 1;
                        if (!pairProjects[a][b]) pairProjects[a][b] = [];
                        const label = `${proj.name} (${mod.name || `Módulo ${mIdx + 1}`})`;
                        if (!pairProjects[a][b].includes(label)) pairProjects[a][b].push(label);
                    }
                }
            });
        });
    });

    return { pairCount, pairProjects };
}

function _getPairCount(pairCount, a, b) {
    const ka = a < b ? a : b, kb = a < b ? b : a;
    return (pairCount[ka] && pairCount[ka][kb]) || 0;
}

// ── Open inline history view (replaces modal approach) ───────────────────────
function openTeamHistoryView() {
    const evalTabView = document.getElementById('evaluation-tab-view');
    const studentEvalPanel = document.getElementById('student-eval-panel');
    const historyPanel = document.getElementById('team-history-panel');
    const historyBody = document.getElementById('team-history-panel-body');
    if (!historyPanel || !historyBody) return;

    // Hide other sub-views
    if (evalTabView) evalTabView.classList.add('hidden');
    if (studentEvalPanel) studentEvalPanel.classList.add('hidden');
    historyPanel.classList.remove('hidden');

    // Build content
    const { modules, savedEvaluations, allStudents } = window._evalState;

    // Grupal projects with groups
    const grupalProjects = [];
    modules.forEach((mod, mIdx) => {
        (mod.projects || []).forEach((proj, pIdx) => {
            const modId = mod.id || String(mIdx);
            const saved = savedEvaluations.find(e => e.moduleId === modId && e.projectName === proj.name);
            if (saved && saved.type === 'grupal' && saved.groups && saved.groups.length > 0) {
                grupalProjects.push({ mIdx, pIdx, modId, modName: mod.name || `Módulo ${mIdx + 1}`, projName: proj.name, groups: saved.groups });
            }
        });
    });

    // All grupal projects (even without groups) — for the "create groups" selector
    const allGrupalForSelect = [];
    modules.forEach((mod, mIdx) => {
        (mod.projects || []).forEach((proj, pIdx) => {
            const modId = mod.id || String(mIdx);
            const saved = savedEvaluations.find(e => e.moduleId === modId && e.projectName === proj.name);
            if (saved && saved.type === 'grupal') {
                allGrupalForSelect.push({ mIdx, pIdx, modName: mod.name, projName: proj.name });
            }
        });
    });

    // Student map (use allStudents to include withdrawn ones)
    const studentMap = new Map();
    (allStudents || []).forEach(s => {
        const id = String(s.id || s._id);
        studentMap.set(id, ((s.name || '') + ' ' + (s.lastname || '')).trim());
    });

    // Compute pairings
    const { pairCount, pairProjects } = _computePairCount();
    pairCount_closure = pairCount; // keep closure for matrix

    // Collect all student IDs seen in any grupal group
    const allStudentIds = new Set();
    grupalProjects.forEach(gp => gp.groups.forEach(g => (g.studentIds || []).forEach(id => allStudentIds.add(String(id)))));

    // Per-student partner summary
    const studentPartners = {};
    allStudentIds.forEach(id => { studentPartners[id] = []; });
    Object.keys(pairCount).forEach(a => {
        Object.keys(pairCount[a]).forEach(b => {
            const count = pairCount[a][b];
            const projs = pairProjects[a][b];
            if (allStudentIds.has(a)) {
                if (!studentPartners[a]) studentPartners[a] = [];
                studentPartners[a].push({ partnerId: b, count, projects: projs });
            }
            if (allStudentIds.has(b)) {
                if (!studentPartners[b]) studentPartners[b] = [];
                studentPartners[b].push({ partnerId: a, count, projects: projs });
            }
        });
    });
    Object.keys(studentPartners).forEach(id => studentPartners[id].sort((x, y) => y.count - x.count));

    historyBody.innerHTML = _renderTeamHistoryBody(grupalProjects, allStudentIds, studentMap, studentPartners, allGrupalForSelect);

    // Wire up the "open groups" button
    const btn = historyBody.querySelector('#th-open-groups-btn');
    if (btn) {
        btn.addEventListener('click', () => {
            const sel = historyBody.querySelector('#th-project-select');
            if (!sel || !sel.value) { showToast('Selecciona un proyecto primero', 'warning'); return; }
            const [mIdxStr, pIdxStr] = sel.value.split('|');
            closeTeamHistoryView(); // go back to eval view before opening modal
            openGroupsModal(parseInt(mIdxStr), parseInt(pIdxStr));
        });
    }
}

function closeTeamHistoryView() {
    const evalTabView = document.getElementById('evaluation-tab-view');
    const historyPanel = document.getElementById('team-history-panel');
    if (historyPanel) historyPanel.classList.add('hidden');
    if (evalTabView) evalTabView.classList.remove('hidden');
}

// Keep backward compat alias used by button onclick
function openTeamHistoryModal() { openTeamHistoryView(); }

function _renderTeamHistoryBody(grupalProjects, allStudentIds, studentMap, studentPartners, allGrupalForSelect) {

    if (grupalProjects.length === 0) {
        return `<div class="alert alert-info">
            <i class="bi bi-info-circle me-2"></i>
            No hay proyectos grupales con grupos definidos todavía. Marca proyectos como "Grupal" y crea los grupos primero.
        </div>`;
    }

    let html = `<p class="text-muted small mb-3">
        Muestra con quién ha coincidido cada estudiante en proyectos grupales.
        Las celdas indican el número de veces que han sido compañeros de equipo.
    </p>`;

    if (allGrupalForSelect.length > 0) {
        html += `
        <div class="card border-0 shadow-sm">
            <div class="card-body">
                <h6 class="fw-semibold mb-3"><i class="bi bi-plus-circle text-primary me-2"></i>Crear / editar grupos para un proyecto</h6>
                <div class="d-flex gap-2 flex-wrap align-items-center">
                    <select class="form-select form-select-sm" id="th-project-select" style="max-width:380px;">
                        <option value="">— Selecciona un proyecto grupal —</option>`;
        allGrupalForSelect.forEach(gp => {
            html += `<option value="${gp.mIdx}|${gp.pIdx}">${escapeHtml(gp.modName)} — ${escapeHtml(gp.projName)}</option>`;
        });
        html += `   </select>
                    <button id="th-open-groups-btn" class="btn btn-sm btn-primary" style="background:#E85D26;border-color:#E85D26;">
                        <i class="bi bi-diagram-3 me-1"></i>Abrir gestor de grupos
                    </button>
                </div>
                <p class="text-muted small mt-2 mb-0">
                    <i class="bi bi-lightbulb me-1 text-warning"></i>
                    Usa el histórico de arriba para evitar repetir compañeros y formar grupos equilibrados.
                </p>
            </div>
        </div>`;
    }

    // ── Project summary pills ────────────────────────────────────────────────
    html += `<div class="mb-4">
        <h6 class="fw-semibold text-secondary mb-2"><i class="bi bi-diagram-3 me-1"></i>Proyectos grupales registrados</h6>
        <div class="d-flex flex-wrap gap-2">`;
    grupalProjects.forEach(gp => {
        html += `<span class="badge rounded-pill bg-light text-dark border" style="font-size:.82rem;">
            <i class="bi bi-folder2 me-1 text-primary"></i>${escapeHtml(gp.modName)} — ${escapeHtml(gp.projName)}
            <span class="text-muted">(${gp.groups.length} grupo${gp.groups.length !== 1 ? 's' : ''})</span>
        </span>`;
    });
    html += `</div></div>`;

    // ── Actual teams per project (Accordion) ──────────────────────────────────
    html += `<h6 class="fw-semibold text-secondary mb-3 mt-4"><i class="bi bi-people me-1"></i>Listado de Equipos por Proyecto</h6>
    <div class="accordion accordion-flush border rounded mb-4 shadow-sm" id="projectTeamsAccordion">`;
    grupalProjects.forEach((gp, idx) => {
        const itemId = `accItem-${idx}`;
        html += `<div class="accordion-item">
            <h2 class="accordion-header" id="heading-${itemId}">
                <button class="accordion-button collapsed py-2" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${itemId}" aria-expanded="false" aria-controls="collapse-${itemId}" style="background: #fff;">
                    <div class="d-flex flex-column text-start">
                        <span class="text-primary fw-bold small" style="color:#E85D26 !important; font-size:0.7rem; line-height:1;">${escapeHtml(gp.modName)}</span>
                        <span class="fw-bold mt-1" style="color:#1A1A2E; font-size:0.9rem;">${escapeHtml(gp.projName)}</span>
                    </div>
                </button>
            </h2>
            <div id="collapse-${itemId}" class="accordion-collapse collapse" aria-labelledby="heading-${itemId}" data-bs-parent="#projectTeamsAccordion">
                <div class="accordion-body p-2" style="background:#fafafa;">
                    <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-2">`;
        gp.groups.forEach((grp, gIdx) => {
            const memberNames = (grp.studentIds || []).map(id => studentMap.get(String(id)) || id);
            html += `<div class="col">
                <div class="p-2 border rounded shadow-sm bg-white h-100">
                    <div class="fw-bold text-muted mb-1" style="font-size:0.65rem; text-transform:uppercase; letter-spacing:0.3px;">Equipo ${gIdx + 1}</div>
                    <div class="d-flex flex-wrap gap-1">
                        ${memberNames.map(name => `<span class="badge border fw-normal text-dark" style="background:#f8f9fa; font-size:0.75rem; padding: 3px 6px;">${escapeHtml(name)}</span>`).join('')}
                    </div>
                </div>
            </div>`;
        });
        html += `   </div>
                </div>
            </div>
        </div>`;
    });
    html += `</div>`;

    // ── Per-student table ────────────────────────────────────────────────────
    const sortedStudentIds = Array.from(allStudentIds).sort((a, b) =>
        (studentMap.get(a) || a).localeCompare(studentMap.get(b) || b));

    // html += `<h6 class="fw-semibold text-secondary mb-2"><i class="bi bi-person-lines-fill me-1"></i>Coincidencias por estudiante</h6>
    // <div class="table-responsive mb-4">
    // <table class="table table-bordered table-sm align-middle" style="font-size:.85rem;">
    //     <thead class="table-light">
    //         <tr>
    //             <th style="min-width:160px;">Estudiante</th>
    //             <th>Compañeros de equipo</th>
    //         </tr>
    //     </thead>
    //     <tbody>`;

    // ── Create/edit groups for a project ──────────────────────────────────────

    sortedStudentIds.forEach(id => {
        const name = studentMap.get(id) || id;
        const partners = studentPartners[id] || [];
        const maxRepeat = partners.reduce((m, p) => Math.max(m, p.count), 0);
        // const rowBg = maxRepeat >= 2 ? 'style="background:#fff8f8;"' : '';
        // html += `<tr ${rowBg}>
        //     <td class="fw-semibold">${escapeHtml(name)}</td>
        //     <td>`;
        // if (partners.length === 0) {
        //     html += `<span class="text-muted fst-italic small">Sin coincidencias</span>`;
        // } else {
        //     html += `<div class="d-flex flex-wrap gap-1">`;
        //     partners.forEach(p => {
        //         const pName = studentMap.get(p.partnerId) || p.partnerId;
        //         const tip = p.projects.join(', ');
        //         const style = p.count >= 2
        //             ? 'background:#f8d7da;color:#842029;border:1px solid #f5c2c7;'
        //             : 'background:#fff3cd;color:#856404;border:1px solid #ffc107;';
        //         const icon = p.count >= 2 ? '⚠ ' : '';
        //         html += `<span class="badge rounded-pill" style="${style}font-size:.8rem;" title="${escapeHtml(tip)}">
        //             ${escapeHtml(pName)} <strong>${icon}${p.count}×</strong>
        //         </span>`;
        //     });
        // html += `</div>`;
        // }
        // html += `</td></tr>`;
    });
    // html += `</tbody></table></div>`;

    // ── Matrix (if ≤ 20 students) ─────────────────────────────────────────────
    if (sortedStudentIds.length <= 20) {
        html += `
        <details class="mb-4">
            <summary class="fw-semibold text-secondary mb-2" style="cursor:pointer;">
                <i class="bi bi-grid-3x3-gap me-1"></i>Ver matriz de coincidencias
            </summary>
            <div class="table-responsive mt-2">
            <table class="table table-bordered table-sm text-center align-middle" style="font-size:.78rem;">
                <thead class="table-light"><tr><th style="min-width:120px;"></th>`;
        sortedStudentIds.forEach(id => {
            const short = (studentMap.get(id) || id).split(' ').map((w, i) => i === 0 ? w : w[0] + '.').join(' ');
            html += `<th title="${escapeHtml(studentMap.get(id) || id)}" style="max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(short)}</th>`;
        });
        html += `</tr></thead><tbody>`;
        sortedStudentIds.forEach(rowId => {
            html += `<tr><td class="fw-semibold text-start">${escapeHtml(studentMap.get(rowId) || rowId)}</td>`;
            sortedStudentIds.forEach(colId => {
                if (rowId === colId) { html += `<td style="background:#f8f9fa;">—</td>`; return; }
                const a = rowId < colId ? rowId : colId, b = rowId < colId ? colId : rowId;
                const cnt = (pairCount_closure?.[a]?.[b]) || 0;
                if (cnt === 0) html += `<td style="color:#ccc;">·</td>`;
                else if (cnt === 1) html += `<td style="background:#fff3cd;color:#856404;font-weight:600;">${cnt}</td>`;
                else html += `<td style="background:#f8d7da;color:#842029;font-weight:700;">${cnt}</td>`;
            });
            html += `</tr>`;
        });
        html += `</tbody></table></div></details>`;
    }

    // ── Legend ────────────────────────────────────────────────────────────────
    html += `<div class="text-muted small mt-3">
        <span class="badge me-1" style="background:#fff3cd;color:#856404;border:1px solid #ffc107;">Amarillo</span> = han coincidido 1 vez &nbsp;
        <span class="badge me-1" style="background:#f8d7da;color:#842029;border:1px solid #f5c2c7;">Rojo</span> = han coincidido 2+ veces
    </div>`;

    return html;
}

// Module-level closure variable for matrix rendering
let pairCount_closure = {};

async function setEvalProjectType(mIdx, pIdx, type) {
    const { modules, savedEvaluations } = window._evalState;
    const mod = modules[mIdx];
    const proj = mod.projects[pIdx];
    const modId = mod.id || String(mIdx);

    let saved = savedEvaluations.find(e => e.moduleId === modId && e.projectName === proj.name);
    if (!saved) {
        saved = {
            moduleId: modId,
            moduleName: mod.name,
            projectName: proj.name,
            type,
            groups: [],
            evaluations: []
        };
        window._evalState.savedEvaluations.push(saved);
    } else {
        saved.type = type;
        // Reset groups if switching away from grupal
        if (type === 'individual') saved.groups = [];
    }

    await _persistEvaluations();
    renderEvaluationTab();
}
// ─── Group management modal (standalone, before evaluation) ──────────────────

function openGroupsModal(mIdx, pIdx) {
    const { modules, students, savedEvaluations } = window._evalState;
    const mod = modules[mIdx];
    const proj = mod.projects[pIdx];
    const modId = mod.id || String(mIdx);

    window._evalState.currentModuleIdx = mIdx;
    window._evalState.currentProjectIdx = pIdx;

    // Ensure a saved entry exists
    let saved = savedEvaluations.find(e => e.moduleId === modId && e.projectName === proj.name);
    if (!saved) {
        saved = { moduleId: modId, moduleName: mod.name, projectName: proj.name, type: 'grupal', groups: [], evaluations: [] };
        window._evalState.savedEvaluations.push(saved);
    }
    window._evalCurrentSaved = saved;

    // Get or create the modal
    let modalEl = document.getElementById('groupsModal');
    if (!modalEl) {
        modalEl = document.createElement('div');
        modalEl.className = 'modal fade';
        modalEl.id = 'groupsModal';
        modalEl.tabIndex = -1;
        modalEl.innerHTML = `
        <div class="modal-dialog modal-lg modal-dialog-scrollable">
            <div class="modal-content">
                <div class="modal-header" style="background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#fff;">
                    <h5 class="modal-title fw-bold">
                        <i class="bi bi-diagram-3 me-2"></i>
                        <span id="groups-modal-title">Definir grupos</span>
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body" id="groups-modal-body"></div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                    <button type="button" class="btn btn-primary" onclick="saveGroups()"
                        style="background:#0ea5e9;border-color:#0ea5e9;">
                        <i class="bi bi-save me-1"></i>Guardar grupos
                    </button>
                </div>
            </div>
        </div>`;
        document.body.appendChild(modalEl);
    }

    document.getElementById('groups-modal-title').textContent =
        `Grupos — ${escapeHtml(proj.name)} (${escapeHtml(mod.name || `Módulo ${mIdx + 1}`)})`;

    // Render body AFTER modal is in the DOM
    _renderGroupsModalBody(saved, students, mod, proj);

    new bootstrap.Modal(modalEl).show();
}

function _renderGroupsModalBody(saved, students, mod, proj) {
    const container = document.getElementById('groups-modal-body');
    if (!container) return;

    const groups = saved.groups || [];

    // Build a set of all student IDs already assigned to any group
    const assignedIds = new Set(groups.flatMap(g => g.studentIds || []));
    const unassignedCount = students.filter(st => !assignedIds.has(String(st.id || st._id))).length;

    // ── Top bar: unassigned count alert + add button ──────────────────────────
    let html = `
    <div class="d-flex align-items-center justify-content-between gap-2 mb-3 flex-wrap">
        <div class="flex-grow-1">
            ${unassignedCount > 0
            ? `<div class="alert alert-warning py-2 mb-0 small">
                    <i class="bi bi-exclamation-triangle me-1"></i>
                    <strong>${unassignedCount} estudiante${unassignedCount !== 1 ? 's' : ''} sin grupo asignado.</strong>
                   </div>`
            : `<div class="alert alert-success py-2 mb-0 small">
                    <i class="bi bi-check-circle me-1"></i>Todos los estudiantes tienen grupo.
                   </div>`
        }
        </div>
        <button class="btn btn-sm btn-outline-primary flex-shrink-0" onclick="_addGroupInline()">
            <i class="bi bi-plus-circle me-1"></i>Añadir grupo
        </button>
    </div>`;

    // ── Smart mix suggestion bar ──────────────────────────────────────────────
    const defaultGroupCount = Math.max(groups.length, 2);
    html += `
    <div class="card mb-3 border-0" style="background:#f0f7ff;">
        <div class="card-body py-2 px-3">
            <div class="d-flex align-items-center gap-2 flex-wrap">
                <span class="fw-semibold small">
                    <i class="bi bi-magic text-primary me-1"></i>Sugerir distribución inteligente
                </span>
                <div class="d-flex align-items-center gap-1">
                    <label class="small text-muted mb-0">Grupos:</label>
                    <input type="number" id="suggest-num-groups" class="form-control form-control-sm"
                        style="width:65px;" min="1" max="30" value="${defaultGroupCount}">
                </div>
                <button class="btn btn-sm btn-outline-primary" onclick="_applySuggestedMix()">
                    ✨ Sugerir
                </button>
            </div>
            <p class="text-muted mb-0 mt-1" style="font-size:.78rem;">
                Distribuye a los estudiantes minimizando la repetición de compañeros de equipos anteriores.
            </p>
        </div>
    </div>`;

    if (groups.length === 0) {
        html += `<div class="alert alert-info py-2 small"><i class="bi bi-info-circle me-1"></i>
            No hay grupos todavía. Pulsa "Añadir grupo" o usa "Sugerir" para crearlos automáticamente.</div>`;
    }

    // ── Accordion: one item per group ─────────────────────────────────────────
    if (groups.length > 0) {
        html += `<div class="accordion" id="grp-accordion">`;

        groups.forEach((grp, gIdx) => {
            const memberIds = grp.studentIds || [];
            const memberNames = memberIds.map(sid => {
                const st = students.find(s => String(s.id || s._id) === String(sid));
                return st ? ((st.name || '') + ' ' + (st.lastname || '')).trim() : sid;
            });

            // Students available for this group = current members + unassigned
            const availableStudents = students.filter(st => {
                const stId = String(st.id || st._id);
                return memberIds.includes(stId) || !assignedIds.has(stId);
            });

            const collapseId = `grp-collapse-${gIdx}`;

            html += `
            <div class="accordion-item mb-2 border rounded" id="grp-card-${gIdx}">
                <h2 class="accordion-header">
                    <button class="accordion-button collapsed fw-semibold py-2 px-3" type="button"
                        data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="false">
                        <i class="bi bi-people-fill text-info me-2"></i>
                        <span id="grp-label-${gIdx}">${escapeHtml(grp.groupName)}</span>
                        <span class="badge bg-secondary ms-2">${memberIds.length} miembro${memberIds.length !== 1 ? 's' : ''}</span>
                        ${memberNames.length
                    ? `<span class="text-muted fw-normal fst-italic ms-2 small d-none d-md-inline text-truncate" style="max-width:220px;">
                                ${memberNames.map(n => escapeHtml(n)).join(' · ')}
                               </span>`
                    : `<span class="text-muted fw-normal fst-italic ms-2 small">Sin miembros</span>`
                }
                        <button class="btn btn-sm btn-outline-danger ms-auto me-2" style="font-size:.75rem; padding:1px 7px;"
                            onclick="event.stopPropagation(); _removeGroupInline(${gIdx})"
                            title="Eliminar grupo">
                            <i class="bi bi-trash"></i>
                        </button>
                    </button>
                </h2>
                <div id="${collapseId}" class="accordion-collapse collapse">
                    <div class="accordion-body pt-2 pb-3 px-3">
                        <div class="mb-3">
                            <label class="form-label small fw-semibold text-muted mb-1">Nombre del grupo</label>
                            <input type="text" class="form-control form-control-sm"
                                style="max-width:240px;" id="grp-name-inp-${gIdx}"
                                value="${escapeHtml(grp.groupName)}" placeholder="Nombre del grupo"
                                oninput="_updateGroupNameInline(${gIdx}, this.value)">
                        </div>
                        <label class="form-label small fw-semibold text-muted mb-1">
                            <i class="bi bi-person-check me-1"></i>Seleccionar miembros
                            <span class="text-muted fw-normal">(solo estudiantes sin grupo aparecen aquí)</span>
                        </label>
                        <ul class="list-group list-group-flush">
                            ${availableStudents.map(st => {
                    const stId = String(st.id || st._id);
                    const checked = memberIds.includes(stId);
                    const inputId = `grp-${gIdx}-st-${stId}`;
                    return `<li class="list-group-item py-1 px-2">
                                    <div class="form-check mb-0">
                                        <input class="form-check-input" type="checkbox"
                                            id="${inputId}"
                                            ${checked ? 'checked' : ''}
                                            onchange="_toggleGroupMemberInline(${gIdx}, '${stId}', this.checked)">
                                        <label class="form-check-label small" for="${inputId}">
                                            ${escapeHtml(((st.name || '') + ' ' + (st.lastname || '')).trim())}
                                        </label>
                                    </div>
                                </li>`;
                }).join('')}
                            ${availableStudents.length === 0
                    ? `<li class="list-group-item py-1 px-2 text-muted small fst-italic">No hay estudiantes disponibles.</li>`
                    : ''}
                        </ul>
                    </div>
                </div>
            </div>`;
        });

        html += `</div>`;
    }

    container.innerHTML = html;
}

function _addGroupInline() {
    const saved = window._evalCurrentSaved;
    if (!saved) return;
    if (!saved.groups) saved.groups = [];
    const newIdx = saved.groups.length;
    saved.groups.push({ groupName: `Grupo ${newIdx + 1}`, studentIds: [] });
    _renderGroupsModalBody(saved, window._evalState.students);
    // Auto-open the new group's accordion
    const collapseEl = document.getElementById(`grp-collapse-${newIdx}`);
    if (collapseEl) new bootstrap.Collapse(collapseEl, { toggle: false }).show();
}

function _removeGroupInline(gIdx) {
    const saved = window._evalCurrentSaved;
    if (!saved || !saved.groups) return;
    saved.groups.splice(gIdx, 1);
    _renderGroupsModalBody(saved, window._evalState.students);
}

function _updateGroupNameInline(gIdx, newName) {
    const saved = window._evalCurrentSaved;
    if (!saved || !saved.groups || !saved.groups[gIdx]) return;
    const oldName = saved.groups[gIdx].groupName;
    saved.groups[gIdx].groupName = newName;
    // Keep evaluation entries in sync
    (saved.evaluations || []).forEach(e => {
        if (e.targetId === oldName) { e.targetId = newName; e.targetName = newName; }
    });
    // Update the accordion header label without re-rendering (avoids collapsing the panel)
    const label = document.getElementById(`grp-label-${gIdx}`);
    if (label) label.textContent = newName;
}

function _toggleGroupMemberInline(gIdx, studentId, checked) {
    const saved = window._evalCurrentSaved;
    if (!saved || !saved.groups || !saved.groups[gIdx]) return;
    if (!saved.groups[gIdx].studentIds) saved.groups[gIdx].studentIds = [];

    if (checked) {
        // Remove from any other group first (safety)
        saved.groups.forEach((g, i) => {
            if (i !== gIdx) g.studentIds = (g.studentIds || []).filter(id => id !== studentId);
        });
        if (!saved.groups[gIdx].studentIds.includes(studentId)) {
            saved.groups[gIdx].studentIds.push(studentId);
        }
    } else {
        saved.groups[gIdx].studentIds = saved.groups[gIdx].studentIds.filter(id => id !== studentId);
    }

    // Re-render so available-student lists and the unassigned counter update
    // Preserve which accordion panel is open
    const openCollapseId = `grp-collapse-${gIdx}`;
    _renderGroupsModalBody(saved, window._evalState.students);
    // Re-open the same accordion panel after re-render
    const collapseEl = document.getElementById(openCollapseId);
    if (collapseEl) new bootstrap.Collapse(collapseEl, { toggle: false }).show();
}

async function saveGroups() {
    const saved = window._evalCurrentSaved;
    if (!saved) return;

    // Read any unsaved name inputs
    (saved.groups || []).forEach((grp, gIdx) => {
        const inp = document.getElementById(`grp-name-inp-${gIdx}`);
        if (inp) {
            const newName = inp.value.trim() || grp.groupName;
            if (newName !== grp.groupName) _updateGroupNameInline(gIdx, newName);
        }
    });

    // Merge into state
    const { modules, savedEvaluations } = window._evalState;
    const mIdx = window._evalState.currentModuleIdx;
    const pIdx = window._evalState.currentProjectIdx;
    const mod = modules[mIdx];
    const proj = mod.projects[pIdx];
    const modId = mod.id || String(mIdx);

    const existingIdx = savedEvaluations.findIndex(e => e.moduleId === modId && e.projectName === proj.name);
    if (existingIdx >= 0) {
        window._evalState.savedEvaluations[existingIdx] = saved;
    } else {
        window._evalState.savedEvaluations.push(saved);
    }

    await _persistEvaluations();

    bootstrap.Modal.getInstance(document.getElementById('groupsModal'))?.hide();

    // If the split view is open, refresh it; otherwise refresh the card grid
    const splitView = document.getElementById('eval-project-view');
    if (splitView && !splitView.classList.contains('hidden')) {
        _renderEvalTargetsList(saved, window._evalState.students);
        _showEvalRightEmpty();
    } else {
        renderEvaluationTab();
    }
    showToast('Grupos guardados correctamente', 'success');
}

// ── Smart group suggestion ─────────────────────────────────────────────────────

/**
 * Greedy algorithm: assign students to groups minimising repeated pairings.
 * @param {Array} students  - already excludes withdrawn students
 * @param {number} numGroups
 * @returns {Array} [{groupName, studentIds}]
 */
function _suggestGroupMix(students, numGroups) {
    const { pairCount } = _computePairCount();
    const pool = [...students];

    // Shuffle for fairness (avoid alphabetical bias)
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const groups = Array.from({ length: numGroups }, (_, i) => ({
        groupName: `Grupo ${i + 1}`,
        studentIds: []
    }));

    // Greedy: for each student assign to the group with the lowest total pairing score
    pool.forEach(s => {
        const sid = String(s.id || s._id);
        let bestGroup = 0, bestScore = Infinity;
        groups.forEach((g, gi) => {
            const score = g.studentIds.reduce(
                (sum, mid) => sum + _getPairCount(pairCount, sid, mid), 0
            );
            if (score < bestScore) { bestScore = score; bestGroup = gi; }
        });
        groups[bestGroup].studentIds.push(sid);
    });

    return groups;
}

/**
 * Called by the "✨ Sugerir" button inside the groups modal.
 * Computes a suggestion and applies it to the current saved entry, then re-renders.
 */
function _applySuggestedMix() {
    const saved = window._evalCurrentSaved;
    const students = window._evalState?.students;
    if (!saved || !students) return;

    const input = document.getElementById('suggest-num-groups');
    const numGroups = Math.max(1, parseInt(input?.value || '2', 10));

    const suggestedGroups = _suggestGroupMix(students, numGroups);

    // Preserve existing group names if the count matches, otherwise use defaults
    suggestedGroups.forEach((g, i) => {
        if (saved.groups && saved.groups[i]?.groupName) {
            g.groupName = saved.groups[i].groupName;
        }
    });

    // Clear any evaluations for groups that no longer exist
    saved.groups = suggestedGroups;

    _renderGroupsModalBody(saved, students);
    showToast('Distribución sugerida aplicada. Revisa los grupos y pulsa "Guardar grupos" cuando estés listo.', 'info');
}

// ==================== GOOGLE CLASSROOM–STYLE EVALUATION VIEW ====================

/**
 * Opens the inline split-panel evaluation view for a project.
 * Left: student/group list with evaluation status.
 * Right: competences + feedback for the selected target.
 */
function openEvaluationView(mIdx, pIdx) {
    const { modules, competences, students, savedEvaluations } = window._evalState;
    const mod = modules[mIdx];
    const proj = mod.projects[pIdx];
    const modId = mod.id || String(mIdx);

    window._evalState.currentModuleIdx = mIdx;
    window._evalState.currentProjectIdx = pIdx;
    window._evalRemovedComps = {};
    window._evalRemovedTools = {};

    const saved = savedEvaluations.find(e => e.moduleId === modId && e.projectName === proj.name) || {
        moduleId: modId, moduleName: mod.name, projectName: proj.name,
        type: 'individual', groups: [], evaluations: []
    };
    window._evalCurrentSaved = saved;

    // Build project competences exclusively from the evaluation picker (projectCompetences).
    // No longer falls back to proj.competenceIds (roadmap) — competences must be defined in Evaluación.
    const pcEntry = (window._evalState.projectCompetences || []).find(
        pc => pc.moduleId === modId && pc.projectName === proj.name
    );
    const compIdsForProj = pcEntry ? (pcEntry.competenceIds || []) : [];
    const catalog = window._evalState.catalog || [];
    const projCompetences = compIdsForProj.map(cid => {
        // Prefer full catalog entry (has toolsWithIndicators, competenceIndicators) over enriched list
        const full = catalog.find(c => String(c.id) === String(cid));
        const found = full || competences.find(c => String(c.id) === String(cid));
        if (!found) return { id: cid, name: `Competencia ${cid}`, area: '', allTools: [], selectedTools: [], toolsWithIndicators: [], competenceIndicators: { initial: [], medio: [], advance: [] } };
        // Use per-project tool selection from picker; fall back to all tools
        const projTools = (pcEntry && pcEntry.competenceTools && pcEntry.competenceTools[String(cid)])
            ? pcEntry.competenceTools[String(cid)]
            : (found.allTools || []);
        return { ...found, selectedTools: projTools };
    });
    window._evalCurrentProjectCompetences = projCompetences;

    // Show/hide panels
    const tabView = document.getElementById('evaluation-tab-view');
    const splitView = document.getElementById('eval-project-view');
    const histPanel = document.getElementById('team-history-panel');
    const legacyPanel = document.getElementById('student-eval-panel');
    if (tabView) tabView.classList.add('hidden');
    if (histPanel) histPanel.classList.add('hidden');
    if (legacyPanel) legacyPanel.classList.add('hidden');
    if (splitView) splitView.classList.remove('hidden');

    // Populate top bar
    const titleEl = document.getElementById('eval-view-title');
    const subtitleEl = document.getElementById('eval-view-subtitle');
    const groupsBtn = document.getElementById('eval-view-groups-btn');
    if (titleEl) titleEl.textContent = `${proj.name} — ${mod.name || `Módulo ${mIdx + 1}`}`;
    if (subtitleEl) subtitleEl.textContent = saved.type === 'grupal' ? 'Evaluación grupal' : 'Evaluación individual';
    if (groupsBtn) {
        if (saved.type === 'grupal') groupsBtn.classList.remove('d-none');
        else groupsBtn.classList.add('d-none');
    }

    // Render targets list
    _renderEvalTargetsList(saved, students);

    // Clear right panel
    _showEvalRightEmpty();
    // Update empty-state hint based on type
    const emptyEl = document.getElementById('eval-right-empty');
    if (emptyEl) {
        const isGrupal = saved.type === 'grupal';
        emptyEl.innerHTML = `
        <i class="bi bi-${isGrupal ? 'people' : 'person-check'} display-4 mb-3 text-muted opacity-50"></i>
        <p class="mb-1 fw-semibold">Selecciona ${isGrupal ? 'un grupo' : 'un estudiante'}</p>
        <p class="small">Haz clic en ${isGrupal ? 'un grupo' : 'un estudiante'} de la lista para comenzar su evaluación.</p>`;
    }
}

/** Re-renders the left targets list (students or groups). */
function _renderEvalTargetsList(saved, students) {
    const listEl = document.getElementById('eval-targets-list');
    const labelEl = document.getElementById('eval-targets-label');
    const countEl = document.getElementById('eval-targets-count');
    if (!listEl) return;

    const doneEvals = saved.evaluations || [];
    const isGrupal = saved.type === 'grupal';
    const targets = isGrupal
        ? (saved.groups || []).map(g => ({ id: g.groupName, label: g.groupName, sub: `${(g.studentIds || []).length} miembros`, isGroup: true }))
        : students.map(s => ({ id: String(s.id || s._id), label: `${s.name || ''} ${s.lastname || ''}`.trim(), sub: s.email || '', isGroup: false }));

    if (labelEl) labelEl.textContent = isGrupal ? 'Grupos' : 'Estudiantes';
    if (countEl) countEl.textContent = targets.length;

    if (targets.length === 0) {
        listEl.innerHTML = `<li class="p-3 text-muted small fst-italic">${isGrupal ? 'No hay grupos definidos. Usa el botón "Editar grupos".' : 'No hay estudiantes.'
            }</li>`;
        return;
    }

    listEl.innerHTML = targets.map(t => {
        const evalEntry = doneEvals.find(e => String(e.targetId) === String(t.id));
        const isEvaluated = !!(evalEntry && evalEntry.evaluatedAt);
        const isSubmitted = !!(evalEntry && evalEntry.submissionLink);
        const initials = t.label.split(' ').map(w => w[0] || '').slice(0, 2).join('').toUpperCase() || '?';

        let statusIcons = '';
        if (isSubmitted) {
            statusIcons += `<i class="bi bi-cloud-arrow-up-fill text-info" title="Entregado" style="font-size: 0.9rem;"></i>`;
        }
        if (isEvaluated) {
            statusIcons += `<i class="bi bi-check-circle-fill eval-target-check" title="Evaluado" style="font-size: 0.9rem; margin-top: 2px;"></i>`;
        }

        return `<li class="eval-target-item ${isEvaluated ? 'evaluated' : ''}" data-target-id="${escapeHtml(String(t.id))}"
                    onclick="selectEvalTarget('${escapeHtml(String(t.id))}')">
            <div class="eval-target-avatar">${t.isGroup ? `<i class="bi bi-people-fill" style="font-size:.85rem;"></i>` : escapeHtml(initials)}</div>
            <div class="eval-target-info">
                <div class="eval-target-name">${escapeHtml(t.label)}</div>
                <div class="eval-target-meta">${escapeHtml(t.sub)}</div>
            </div>
            <div class="eval-target-status d-flex flex-column align-items-center justify-content-center px-2">
                ${statusIcons}
            </div>
        </li>`;
    }).join('');
}

/** Hides the right content area, shows the empty-state placeholder. */
function _showEvalRightEmpty() {
    const empty = document.getElementById('eval-right-empty');
    const content = document.getElementById('eval-right-content');
    if (empty) empty.classList.remove('d-none');
    if (content) content.classList.add('d-none');
}

/** Shows the right content area, hides the empty-state placeholder. */
function _showEvalRightContent() {
    const empty = document.getElementById('eval-right-empty');
    const content = document.getElementById('eval-right-content');
    if (empty) empty.classList.add('d-none');
    if (content) { content.classList.remove('d-none'); content.style.display = ''; }
}

/**
 * Called when a target (student or group) is clicked in the left list.
 * Loads their competences + feedback into the right panel.
 */
function selectEvalTarget(targetId) {
    const saved = window._evalCurrentSaved;
    const students = window._evalState.students;
    if (!saved) return;

    // Reset removed-comps for this target when switching
    if (window._evalRemovedComps) delete window._evalRemovedComps[String(targetId)];

    // Mark active in left list
    document.querySelectorAll('#eval-targets-list .eval-target-item').forEach(li => {
        li.classList.toggle('active', li.dataset.targetId === String(targetId));
    });

    const isGrupal = saved.type === 'grupal';
    const savedEval = (saved.evaluations || []).find(e => String(e.targetId) === String(targetId));
    //console.log('[DEBUG] selectEvalTarget:', { targetId, isGrupal, savedEval });

    // Resolve display name
    let displayName = String(targetId);
    if (isGrupal) {
        const grp = (saved.groups || []).find(g => g.groupName === targetId);
        if (grp) {
            const members = (grp.studentIds || []).map(sid => {
                const st = students.find(s => String(s.id || s._id) === String(sid));
                return st ? `${st.name || ''} ${st.lastname || ''}`.trim() : sid;
            });
            displayName = grp.groupName + (members.length ? ` · ${members.slice(0, 3).map(n => escapeHtml(n)).join(', ')}${members.length > 3 ? '…' : ''}` : '');
        }
    } else {
        const st = students.find(s => String(s.id || s._id) === String(targetId));
        if (st) displayName = `${st.name || ''} ${st.lastname || ''}`.trim();
    }

    const isDone = !!(savedEval && savedEval.evaluatedAt);
    const savedFeedback = savedEval ? (savedEval.feedback || '') : '';
    const hasLink = !!(savedEval && savedEval.submissionLink);
    //console.log('[DEBUG] selectEvalTarget state:', { isDone, hasLink, savedEval });

    // Build competences HTML using existing buildCompetencesHtml logic
    const projCompetences = window._evalCurrentProjectCompetences || [];
    const LEVEL_LABELS = ['Sin nivel', 'Básico', 'Medio', 'Avanzado'];
    const LEVEL_COLORS = ['secondary', 'danger', 'warning', 'success'];

    // Re-use the existing buildCompetencesHtml inner function (which is scoped inside openEvaluationModal).
    // We call _openStudentEvalSubModalFor to populate the body but redirect its output to the split panel.
    // ── Instead, we build the HTML here directly from the shared sub-modal builder ──
    // We store the built HTML into the right panel.

    const headerEl = document.getElementById('eval-right-header');
    const bodyEl = document.getElementById('eval-right-body');

    if (headerEl) {
        const submissionStatus = savedEval
            ? (savedEval.submissionStatus || (hasLink ? 'Entregado' : 'Pendiente'))
            : 'Pendiente';
        const statusBadge = `<span class="badge ${submissionStatus === 'Entregado' ? 'bg-success' : 'bg-light text-muted border'} mt-1">
                <i class="bi bi-cloud-arrow-up${submissionStatus === 'Entregado' ? '-fill' : ''} me-1"></i>${submissionStatus}
            </span>`;
        const linkHtml = hasLink ? `
            <div class="alert alert-info py-2 px-3 mt-2 mb-0 d-flex align-items-center border-info" style="font-size: 0.85rem;">
                <i class="bi bi-git me-2 fs-5"></i>
                <div class="flex-grow-1">
                    <div class="fw-bold">Proyecto entregado</div>
                    <a href="${escapeHtml(savedEval.submissionLink)}" target="_blank" class="text-decoration-none">
                        ${escapeHtml(savedEval.submissionLink)} <i class="bi bi-box-arrow-up-right small ms-1"></i>
                    </a>
                </div>
            </div>` : '';

        headerEl.innerHTML = `
        <div class="d-flex align-items-center gap-3 flex-wrap">
            <div class="eval-target-avatar" style="width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;flex-shrink:0;background:${isDone ? 'linear-gradient(135deg,#198754,#20c997)' : 'linear-gradient(135deg,#E85D26,#f97316)'};">
                ${isGrupal ? `<i class="bi bi-people-fill" style="font-size:1rem;"></i>` : escapeHtml(displayName.split(' ').map(w => w[0] || '').slice(0, 2).join('').toUpperCase() || '?')}
            </div>
            <div class="flex-grow-1 min-w-0">
                <div class="fw-bold fs-6 text-truncate">${escapeHtml(displayName)}</div>
                ${isDone ? `<span class="badge bg-success mt-1"><i class="bi bi-check-circle me-1"></i>Evaluado el ${new Date(savedEval.evaluatedAt).toLocaleDateString('es-ES')}</span>` : `<span class="badge bg-light text-muted border mt-1">Sin evaluar</span>`}
                ${statusBadge}
                ${linkHtml}
            </div>
        </div>`;
    }

    // Build the body using the sub-modal builder
    // We need to temporarily reroute _openStudentEvalSubModalFor to write to our panel
    window._evalViewActiveTargetId = String(targetId);

    if (bodyEl) {
        // Use the existing function that builds the sub-modal HTML; we adapt the output
        const compHtml = _buildEvalCompetencesHtmlForTarget(targetId, savedEval, projCompetences);
        bodyEl.innerHTML = `
        <div class="mb-3">
            <div class="small fw-semibold text-secondary mb-2"><i class="bi bi-award me-1"></i>Competencias</div>
            ${compHtml}
        </div>
        <div class="mt-3 mb-4">
            <label class="form-label small fw-semibold"><i class="bi bi-chat-text me-1"></i>Feedback</label>
            <textarea class="form-control" rows="3" placeholder="Comentarios de feedback para el informe..."
                data-target-type="${isGrupal ? 'group' : 'individual'}"
                data-target-id="${escapeHtml(String(targetId))}">${escapeHtml(savedFeedback)}</textarea>
        </div>`;
    }

    _showEvalRightContent();

    // Store on the save button panel
    const splitView = document.getElementById('eval-project-view');
    if (splitView) splitView.dataset.targetStudentId = String(targetId);
}

/**
 * Builds competence cards HTML for the given targetId — shared by the split view and legacy modal.
 * This is extracted from the inline function inside _openStudentEvalSubModalFor so it can be called
 * both from the split view and from the legacy modal path.
 */
function _buildEvalCompetencesHtmlForTarget(targetId, savedEval, projCompetences) {
    if (!projCompetences || !projCompetences.length) {
        return `<p class="text-muted small">No hay competencias asociadas a este proyecto.</p>`;
    }
    const removedCompIds = window._evalRemovedComps?.[String(targetId)] || [];
    const visibleComps = projCompetences.filter(c => !removedCompIds.includes(String(c.id)));
    //console.log(`📌 ${visibleComps}`)
    if (!visibleComps.length) {
        return `<p class="text-muted small fst-italic">Todas las competencias han sido eliminadas de esta evaluación.</p>`;
    }

    const LEVEL_COLORS_IND = ['secondary', 'danger', 'warning', 'success'];
    const LEVEL_LABELS_IND = ['Sin nivel', 'Básico', 'Medio', 'Avanzado'];
    const LEVEL_LABELS = ['Sin nivel', 'Básico', 'Medio', 'Avanzado'];
    const LEVEL_COLORS = ['secondary', 'danger', 'warning', 'success'];
    const LEVEL_BG = { 1: '#fff3cd', 2: '#cfe2ff', 3: '#d1e7dd' };
    const LEVEL_BORDER = { 1: '#ffc107', 2: '#0d6efd', 3: '#198754' };
    const LEVEL_TEXT = { 1: 'Básico', 2: 'Medio', 3: 'Avanzado' };

    let html = `<div class="eval-competences-list">`;
    visibleComps.forEach(comp => {
        const savedCompEntry = savedEval
            ? (savedEval.competences || []).find(c => String(c.competenceId) === String(comp.id))
            : null;
        const currentLevel = savedCompEntry ? savedCompEntry.level : 0;
        const rawCompId = String(comp.id);
        const checkedDataForComp = savedCompEntry?.checkedIndicators
            || savedEval?.checkedIndicators?.[rawCompId]
            || {};

        const removed_sv = window._evalRemovedTools?.[String(targetId)]?.[String(comp.id)] || [];
        // Determine the active tool names for this competence in this project
        const activeTool_sv = (comp.selectedTools && comp.selectedTools.length > 0)
            ? comp.selectedTools
            : (comp.allTools && comp.allTools.length > 0 ? comp.allTools : []);
        const activeNames_sv = new Set(activeTool_sv.filter(n => !removed_sv.includes(n)));

        // All tool objects (with or without indicators) — keyed by name for lookup
        const allToolObjs_sv = comp.toolsWithIndicators || [];
        // Active tools that DO have indicators → shown as accordion checkboxes
        const activeToolsWithInds = activeNames_sv.size > 0
            ? allToolObjs_sv.filter(t => activeNames_sv.has(t.name) && t.indicators && t.indicators.length > 0)
            : allToolObjs_sv.filter(t => t.indicators && t.indicators.length > 0);
        // Active tools that have NO indicators → shown as a warning notice
        const activeToolsNoInds = activeNames_sv.size > 0
            ? activeTool_sv.filter(n => !removed_sv.includes(n) && !allToolObjs_sv.find(t => t.name === n && t.indicators && t.indicators.length > 0))
            : [];

        const compInds = comp.competenceIndicators || { initial: [], medio: [], advance: [] };
        const hasToolIndicators = activeToolsWithInds.some(t => t.indicators.length > 0);
        const hasCompIndicators = compInds.initial.length || compInds.medio.length || compInds.advance.length;

        const safeCompId = String(rawCompId).replace(/[^a-zA-Z0-9-]/g, '-');
        const safeTargetId = String(targetId).replace(/[^a-zA-Z0-9-]/g, '-');
        const prefix = `sv-${safeCompId}-${safeTargetId}`;

        // Counts: Only competenceIndicators (comp-* keys) affect the level
        const checkedByLevel = { 1: 0, 2: 0, 3: 0 };
        const totalByLevel = { 1: 0, 2: 0, 3: 0 };
        if (hasCompIndicators) {
            [{ lvl: 1, inds: compInds.initial }, { lvl: 2, inds: compInds.medio }, { lvl: 3, inds: compInds.advance }].forEach(({ lvl, inds }) => {
                totalByLevel[lvl] = (inds || []).length;
                (inds || []).forEach(ind => { if (checkedDataForComp[`comp-${ind.id}`]) checkedByLevel[lvl]++; });
            });
        }

        let autoLevel = 0;
        if (hasCompIndicators) {
            if (totalByLevel[1] > 0 && checkedByLevel[1] >= totalByLevel[1]) {
                autoLevel = 1;
                if (totalByLevel[2] > 0 && checkedByLevel[2] >= totalByLevel[2]) {
                    autoLevel = 2;
                    if (totalByLevel[3] > 0 && checkedByLevel[3] >= totalByLevel[3]) autoLevel = 3;
                }
            }
            if (totalByLevel[1] === 0 && totalByLevel[2] > 0 && checkedByLevel[2] >= totalByLevel[2]) {
                autoLevel = Math.max(autoLevel, 2);
                if (totalByLevel[3] > 0 && checkedByLevel[3] >= totalByLevel[3]) autoLevel = 3;
            }
        }
        const displayLevel = hasCompIndicators ? autoLevel : currentLevel;
        const lvlBadgeColor = LEVEL_COLORS_IND[displayLevel] || 'secondary';
        const lvlBadgeLabel = LEVEL_LABELS_IND[displayLevel] || 'Sin nivel';

        // Indicator HTML (accordion per tool)
        let indicatorsHtml = '';
        if (hasToolIndicators) {
            const accordionId = `acc-sv-${safeCompId}-${safeTargetId}`;
            indicatorsHtml = `<div class="accordion accordion-flush" id="${accordionId}">` +
                activeToolsWithInds.map((tool, toolIdx) => {
                    const byLevel = { 1: [], 2: [], 3: [] };
                    tool.indicators.forEach(ind => { if (byLevel[ind.levelId]) byLevel[ind.levelId].push(ind); });
                    const hasChecked = tool.indicators.some(ind => checkedDataForComp[`tool-${tool.id}-${ind.id}`]);
                    const collapseId = `${accordionId}-t${toolIdx}`;
                    const toolAutoLevel = (() => {
                        let lvl = 0;
                        for (const l of [1, 2, 3]) {
                            if (byLevel[l].length > 0 && byLevel[l].every(ind => checkedDataForComp[`tool-${tool.id}-${ind.id}`])) lvl = l;
                            else if (byLevel[l].length > 0) break;
                        }
                        return lvl;
                    })();
                    const activeLevels = [1, 2, 3].filter(l => byLevel[l].length > 0);
                    const levelCols = activeLevels.map(lvl => {
                        const inds = byLevel[lvl];
                        return `<div class="col">
                        <div class="small fw-semibold mb-1" style="color:${LEVEL_BORDER[lvl]}; font-size:.7rem;">
                            <i class="bi bi-${lvl === 1 ? 'circle' : lvl === 2 ? 'circle-half' : 'circle-fill'} me-1"></i>Nv.${lvl} ${LEVEL_TEXT[lvl]}
                        </div>
                        ${inds.map(ind => {
                            const indKey = `tool-${tool.id}-${ind.id}`;
                            const isChecked = !!(checkedDataForComp[indKey]);
                            return `<div class="form-check form-check-sm mb-0">
                                <input class="form-check-input" type="checkbox" ${isChecked ? 'checked' : ''}
                                    id="${prefix}-${escapeHtml(indKey)}"
                                    onchange="updateEvalIndicator('${safeTargetId}','${rawCompId}','${escapeHtml(indKey)}',${lvl},this.checked,'${escapeHtml(comp.name)}')">
                                <label class="form-check-label small" for="${prefix}-${escapeHtml(indKey)}" title="${escapeHtml(ind.description || '')}">
                                    ${escapeHtml(ind.name)}
                                    ${ind.description ? `<span class="text-muted fst-italic d-block" style="font-size:.65rem;">${escapeHtml(ind.description)}</span>` : ''}
                                </label>
                            </div>`;
                        }).join('')}
                    </div>`;
                    }).join('');
                    return `<div class="accordion-item border-0 border-bottom">
                    <h2 class="accordion-header">
                        <button class="accordion-button py-2 px-2 small fw-semibold ${hasChecked ? '' : 'collapsed'}"
                            type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" style="background:transparent;">
                            <i class="bi bi-tools me-2 text-secondary"></i>${escapeHtml(tool.name)}
                            ${toolAutoLevel > 0 ? `<span class="badge ms-2" style="background:${LEVEL_BG[toolAutoLevel]};color:${LEVEL_BORDER[toolAutoLevel]};border:1px solid ${LEVEL_BORDER[toolAutoLevel]};font-size:.65rem;">Nv.${toolAutoLevel}</span>` : ''}
                        </button>
                    </h2>
                    <div id="${collapseId}" class="accordion-collapse collapse ${hasChecked ? 'show' : ''}" data-bs-parent="#${accordionId}">
                        <div class="accordion-body p-2">
                            <div class="row g-2">${levelCols}</div>
                        </div>
                    </div>
                </div>`;
                }).join('') + `</div>`;
        } else if (hasCompIndicators) {
            indicatorsHtml = [
                { lvl: 1, inds: compInds.initial },
                { lvl: 2, inds: compInds.medio },
                { lvl: 3, inds: compInds.advance }
            ].filter(g => g.inds.length).map(({ lvl, inds }) => `
                <div class="border rounded p-2 mb-2" style="background:${LEVEL_BG[lvl]}; border-color:${LEVEL_BORDER[lvl]} !important;">
                    <div class="small fw-semibold mb-1" style="color:${LEVEL_BORDER[lvl]};">
                        <i class="bi bi-${lvl === 1 ? 'circle' : lvl === 2 ? 'circle-half' : 'circle-fill'} me-1"></i>Nivel ${lvl} — ${LEVEL_TEXT[lvl]}
                    </div>
                    ${inds.map(ind => {
                const indKey = `comp-${ind.id}`;
                const isChecked = !!(checkedDataForComp[indKey]);
                return `<div class="form-check form-check-sm mb-0">
                            <input class="form-check-input" type="checkbox" ${isChecked ? 'checked' : ''}
                                id="${prefix}-${escapeHtml(indKey)}"
                                onchange="updateEvalIndicator('${safeTargetId}','${rawCompId}','${escapeHtml(indKey)}',${lvl},this.checked,'${escapeHtml(comp.name)}')">
                            <label class="form-check-label small" for="${prefix}-${escapeHtml(indKey)}" title="${escapeHtml(ind.description || '')}">
                                ${escapeHtml(ind.name)}
                                ${ind.description ? `<span class="text-muted fst-italic ms-1" style="font-size:.7rem;">${escapeHtml(ind.description)}</span>` : ''}
                            </label>
                        </div>`;
            }).join('')}
                </div>`
            ).join('');
        }

        const indProgressHtml = (hasToolIndicators || hasCompIndicators) ? `
            <div class="d-flex gap-2 flex-wrap mb-2 eval-ind-progress">
                ${[1, 2, 3].filter(lvl => totalByLevel[lvl] > 0).map(lvl => `
                    <span class="badge rounded-pill" style="background:${LEVEL_BG[lvl]}; color:${LEVEL_BORDER[lvl]}; border:1px solid ${LEVEL_BORDER[lvl]}; font-size:.72rem;">
                        Nv.${lvl}: <span data-lvl-count="${lvl}">${checkedByLevel[lvl]}/${totalByLevel[lvl]}</span>
                    </span>`).join('')}
                <span class="badge bg-${lvlBadgeColor} ms-1" data-auto-level-badge>
                    <i class="bi bi-award me-1"></i>Nivel calculado: <strong>${displayLevel}</strong> — ${lvlBadgeLabel}
                </span>
            </div>` : '';

        const levelDescs = (comp.levels || []).reduce((acc, l) => { acc[l.level] = l.description; return acc; }, {});
        const manualLevelHtml = (!hasToolIndicators && !hasCompIndicators) ? `
            <div class="d-flex align-items-center gap-2 flex-wrap">
                <span class="small text-muted me-1">Nivel:</span>
                ${LEVEL_LABELS.map((lbl, lvl) => {
            const desc = levelDescs[lvl] ? ` — ${levelDescs[lvl]}` : '';
            return `<button type="button"
                        class="btn btn-sm level-btn ${currentLevel === lvl ? `btn-${LEVEL_COLORS[lvl]}` : 'btn-outline-secondary'}"
                        data-target="${safeTargetId}" data-comp="${safeCompId}"
                        data-comp-name="${escapeHtml(comp.name)}" data-level="${lvl}"
                        onclick="toggleEvalLevel(this,'${safeTargetId}','${safeCompId}',${lvl},'${escapeHtml(comp.name)}')"
                        title="${escapeHtml(lbl + desc)}">
                        ${lvl === 0 ? '<i class="bi bi-dash"></i>' : `<strong>${lvl}</strong>`}
                        <span class="ms-1 d-none d-md-inline" style="font-size:.7rem;">${escapeHtml(lbl)}</span>
                    </button>`;
        }).join('')}
            </div>
            ${currentLevel > 0 && levelDescs[currentLevel] ? `<div class="mt-1 small text-muted fst-italic level-desc-hint">${escapeHtml(levelDescs[currentLevel])}</div>` : `<div class="mt-1 level-desc-hint" style="min-height:1rem;"></div>`}
        ` : '';

        html += `<div class="eval-comp-card card mb-3 border" data-comp-id="${safeCompId}" data-target-id="${safeTargetId}">
            <div class="card-header py-2 px-3 d-flex align-items-start justify-content-between gap-2" style="background:#f8f9fa;">
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center gap-2 flex-wrap">
                        <span class="fw-semibold">${escapeHtml(comp.name)}</span>
                        ${comp.area ? `<span class="badge bg-secondary" style="font-size:.65rem;">${escapeHtml(comp.area)}</span>` : ''}
                    </div>
                    ${comp.description ? `<div class="text-muted small mt-1 fst-italic">${escapeHtml(comp.description)}</div>` : ''}
                </div>
                <button type="button" class="btn btn-sm btn-outline-danger flex-shrink-0" style="font-size:.7rem; padding:2px 6px;"
                    title="Eliminar esta competencia de la evaluación"
                    onclick="removeEvalCompetenceFromView('${safeTargetId}','${safeCompId}')">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
            <div class="card-body py-2 px-3">
                ${indProgressHtml}
                ${hasCompIndicators ? `<div class="mb-3">
                    <div class="small fw-semibold text-success mb-1"><i class="bi bi-bookmark-check me-1"></i>Indicadores de Competencia — marca los que cumple:</div>
                    <div class="ind-comp-container">
                        <div id="ind-container-comp-${safeCompId}-${safeTargetId}" style="display:flex; overflow-y:auto;">
                            ${[
                    { lvl: 1, inds: compInds.initial },
                    { lvl: 2, inds: compInds.medio },
                    { lvl: 3, inds: compInds.advance }
                ].filter(g => g.inds.length).map(({ lvl, inds }) => `
                                <div class="border rounded p-2 mb-2" style="background:${LEVEL_BG[lvl]}; border-color:${LEVEL_BORDER[lvl]} !important; margin: 0 1rem 0 1rem;">
                                    <div class="small fw-semibold mb-1" style="color:${LEVEL_BORDER[lvl]};">
                                        <i class="bi bi-${lvl === 1 ? 'circle' : lvl === 2 ? 'circle-half' : 'circle-fill'} me-1"></i>Nivel ${lvl} — ${LEVEL_TEXT[lvl]}
                                    </div>
                                    ${inds.map(ind => {
                    const indKey = `comp-${ind.id}`;
                    const isChecked = !!(checkedDataForComp[indKey]);
                    return `<div class="form-check form-check-sm mb-0">
                                            <input class="form-check-input" type="checkbox" ${isChecked ? 'checked' : ''}
                                                id="${prefix}-${escapeHtml(indKey)}"
                                                onchange="updateEvalIndicator('${safeTargetId}','${rawCompId}','${escapeHtml(indKey)}',${lvl},this.checked,'${escapeHtml(comp.name)}')">
                                            <label class="form-check-label small" for="${prefix}-${escapeHtml(indKey)}" title="${escapeHtml(ind.description || '')}">
                                                ${escapeHtml(ind.name)}
                                                ${ind.description ? `<span class="text-muted fst-italic ms-1" style="font-size:.7rem;">${escapeHtml(ind.description)}</span>` : ''}
                                            </label>
                                        </div>`;
                }).join('')}
                                </div>`
                ).join('')}
                        </div>
                    </div>
                </div>` : ''}
                ${hasToolIndicators ? `<div class="mb-3 border-top pt-2">
                    <div class="small fw-semibold text-info mb-1"><i class="bi bi-tools me-1"></i>Indicadores de Herramientas — para registro técnico (no afecta nivel):</div>
                    <div id="ind-container-tools-${safeCompId}-${safeTargetId}">
                        ${(() => {
                    const accordionId = `acc-sv-${safeCompId}-${safeTargetId}`;
                    return `<div class="accordion accordion-flush" id="${accordionId}">` +
                        activeToolsWithInds.map((tool, toolIdx) => {
                            const byLevel = { 1: [], 2: [], 3: [] };
                            tool.indicators.forEach(ind => { if (byLevel[ind.levelId]) byLevel[ind.levelId].push(ind); });
                            const hasChecked = tool.indicators.some(ind => checkedDataForComp[`tool-${tool.id}-${ind.id}`]);
                            const collapseId = `${accordionId}-t${toolIdx}`;
                            const toolAutoLevel = (() => {
                                let lvl = 0;
                                for (const l of [1, 2, 3]) {
                                    if (byLevel[l].length > 0 && byLevel[l].every(ind => checkedDataForComp[`tool-${tool.id}-${ind.id}`])) lvl = l;
                                    else if (byLevel[l].length > 0) break;
                                }
                                return lvl;
                            })();
                            const activeLevels = [1, 2, 3].filter(l => byLevel[l].length > 0);
                            const levelCols = activeLevels.map(lvl => {
                                const inds = byLevel[lvl];
                                return `<div class="col">
                                        <div class="small fw-semibold mb-1" style="color:${LEVEL_BORDER[lvl]}; font-size:.7rem;">
                                            <i class="bi bi-${lvl === 1 ? 'circle' : lvl === 2 ? 'circle-half' : 'circle-fill'} me-1"></i>Nv.${lvl} ${LEVEL_TEXT[lvl]}
                                        </div>
                                        ${inds.map(ind => {
                                    const indKey = `tool-${tool.id}-${ind.id}`;
                                    const isChecked = !!(checkedDataForComp[indKey]);
                                    return `<div class="form-check form-check-sm mb-0">
                                                <input class="form-check-input" type="checkbox" ${isChecked ? 'checked' : ''}
                                                    id="${prefix}-${escapeHtml(indKey)}"
                                                    onchange="updateEvalIndicator('${safeTargetId}','${rawCompId}','${escapeHtml(indKey)}',${lvl},this.checked,'${escapeHtml(comp.name)}')">
                                                <label class="form-check-label small" for="${prefix}-${escapeHtml(indKey)}" title="${escapeHtml(ind.description || '')}">
                                                    ${escapeHtml(ind.name)}
                                                    ${ind.description ? `<span class="text-muted fst-italic d-block" style="font-size:.65rem;">${escapeHtml(ind.description)}</span>` : ''}
                                                </label>
                                            </div>`;
                                }).join('')}
                                    </div>`;
                            }).join('');
                            return `<div class="accordion-item border-0 border-bottom">
                                    <h2 class="accordion-header">
                                        <button class="accordion-button py-2 px-2 small fw-semibold ${hasChecked ? '' : 'collapsed'}"
                                            type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" style="background:transparent;">
                                            <i class="bi bi-tools me-2 text-secondary"></i>${escapeHtml(tool.name)}
                                            ${toolAutoLevel > 0 ? `<span class="badge ms-2" style="background:${LEVEL_BG[toolAutoLevel]};color:${LEVEL_BORDER[toolAutoLevel]};border:1px solid ${LEVEL_BORDER[toolAutoLevel]};font-size:.65rem;">Nv.${toolAutoLevel}</span>` : ''}
                                        </button>
                                    </h2>
                                    <div id="${collapseId}" class="accordion-collapse collapse ${hasChecked ? 'show' : ''}" data-bs-parent="#${accordionId}">
                                        <div class="accordion-body p-2">
                                            <div class="row g-2">${levelCols}</div>
                                        </div>
                                    </div>
                                </div>`;
                        }).join('') + `</div>`;
                })()}
                    </div>
                </div>` : ''}
                ${activeToolsNoInds.length > 0 ? `<div class="alert alert-warning py-2 px-3 mb-2" style="font-size:.8rem;">
                    <i class="bi bi-exclamation-triangle me-1"></i>
                    <strong>Sin indicadores:</strong> las herramientas
                    <strong>${activeToolsNoInds.map(n => escapeHtml(n)).join(', ')}</strong>
                    no tienen indicadores definidos en el catálogo.
                    Puedes evaluarlas manualmente con el nivel de abajo, o solicitar que se añadan indicadores en la API externa.
                </div>` : ''}
                ${manualLevelHtml}
            </div>
        </div>`;
    });
    html += `</div>`;
    return html;
}

/** Removes a competence card from the split view (mirrors removeEvalCompetence for the modal). */
function removeEvalCompetenceFromView(targetId, compId) {
    if (!window._evalRemovedComps) window._evalRemovedComps = {};
    if (!window._evalRemovedComps[String(targetId)]) window._evalRemovedComps[String(targetId)] = [];
    if (!window._evalRemovedComps[String(targetId)].includes(String(compId))) {
        window._evalRemovedComps[String(targetId)].push(String(compId));
    }
    const saved = window._evalCurrentSaved;
    if (saved) {
        const evalEntry = (saved.evaluations || []).find(e => e.targetId === String(targetId));
        if (evalEntry) evalEntry.competences = (evalEntry.competences || []).filter(c => String(c.competenceId) !== String(compId));
    }
    const card = document.querySelector(`.eval-comp-card[data-comp-id="${CSS.escape(String(compId))}"][data-target-id="${CSS.escape(String(targetId))}"]`);
    if (card) {
        card.style.transition = 'opacity .2s';
        card.style.opacity = '0';
        setTimeout(() => card.remove(), 200);
    }
}

/** Closes the split-view and returns to the evaluation tab. */
function closeEvaluationView() {
    const splitView = document.getElementById('eval-project-view');
    const tabView = document.getElementById('evaluation-tab-view');
    if (splitView) splitView.classList.add('hidden');
    if (tabView) tabView.classList.remove('hidden');
    renderEvaluationTab();
}

/** Opens the groups modal from the split-view top bar. */
function openGroupsModalFromView() {
    const mIdx = window._evalState?.currentModuleIdx;
    const pIdx = window._evalState?.currentProjectIdx;
    if (mIdx !== undefined && pIdx !== undefined) openGroupsModal(mIdx, pIdx);
}

function openEvaluationModal(mIdx, pIdx) {
    const { modules, competences, students, savedEvaluations } = window._evalState;
    const mod = modules[mIdx];
    const proj = mod.projects[pIdx];
    const modId = mod.id || String(mIdx);

    window._evalState.currentModuleIdx = mIdx;
    window._evalState.currentProjectIdx = pIdx;

    // Reset per-target removed-competence tracking each time the modal opens
    window._evalRemovedComps = {};

    const saved = savedEvaluations.find(e => e.moduleId === modId && e.projectName === proj.name) || {
        moduleId: modId, moduleName: mod.name, projectName: proj.name,
        type: 'individual', groups: [], evaluations: []
    };

    const projCompetences = (() => {
        const pcEntry = (window._evalState.projectCompetences || []).find(
            pc => pc.moduleId === modId && pc.projectName === proj.name
        );
        // No longer falls back to proj.competenceIds (roadmap) — competences are defined in Evaluación only.
        const compIds = pcEntry ? (pcEntry.competenceIds || []) : [];
        const catalog = window._evalState.catalog || [];
        return compIds.map(cid => {
            // Prefer full catalog entry (has toolsWithIndicators, competenceIndicators)
            const full = catalog.find(c => String(c.id) === String(cid));
            const found = full || competences.find(c => String(c.id) === String(cid)) || { id: cid, name: `Competencia ${cid}`, area: '', allTools: [], toolsWithIndicators: [], competenceIndicators: { initial: [], medio: [], advance: [] } };
            const projTools = (pcEntry && pcEntry.competenceTools && pcEntry.competenceTools[String(cid)])
                ? pcEntry.competenceTools[String(cid)]
                : (found.allTools || []);
            return { ...found, selectedTools: projTools };
        });
    })();

    // DEBUG: log competence tool data
    //console.log('[Eval] projCompetences:', projCompetences.map(c => ({ id: c.id, name: c.name, toolsWithIndicators_count: (c.toolsWithIndicators || []).length, first_tool: (c.toolsWithIndicators || [])[0] ? { name: (c.toolsWithIndicators || [])[0].name, indicators_count: ((c.toolsWithIndicators || [])[0].indicators || []).length, first_indicator: ((c.toolsWithIndicators || [])[0].indicators || [])[0] } : null })));

    document.getElementById('eval-modal-title').textContent = `${escapeHtml(proj.name)} — ${escapeHtml(mod.name || `Módulo ${mIdx + 1}`)}`;

    const LEVEL_LABELS = ['Sin nivel', 'Básico', 'Medio', 'Avanzado'];
    const LEVEL_COLORS = ['secondary', 'danger', 'warning', 'success'];

    // Build competences level HTML for a target (student or group)
    function buildCompetencesHtml(targetId, savedEval) {
        if (!projCompetences.length) {
            return `<p class="text-muted small">No hay competencias asociadas a este proyecto.</p>`;
        }
        // Track which competences have been manually removed for this target
        const removedIds = window._evalRemovedComps?.[String(targetId)] || [];
        const visibleComps = projCompetences.filter(c => !removedIds.includes(String(c.id)));

        if (!visibleComps.length) {
            return `<p class="text-muted small fst-italic">Todas las competencias han sido eliminadas de esta evaluación.</p>`;
        }

        const LEVEL_COLORS_IND = ['secondary', 'danger', 'warning', 'success'];
        const LEVEL_LABELS_IND = ['Sin nivel', 'Básico', 'Medio', 'Avanzado'];
        const LEVEL_BG = { 1: '#fff3cd', 2: '#cfe2ff', 3: '#d1e7dd' };
        const LEVEL_BORDER = { 1: '#ffc107', 2: '#0d6efd', 3: '#198754' };
        const LEVEL_TEXT = { 1: 'Básico', 2: 'Medio', 3: 'Avanzado' };

        let html = `<div class="eval-competences-list">`;
        visibleComps.forEach((comp) => {
            const savedCompEntry = savedEval ? (savedEval.competences || []).find(c => String(c.competenceId) === String(comp.id)) : null;
            const currentLevel = savedCompEntry ? savedCompEntry.level : 0;
            const rawCompId = String(comp.id);
            // savedCompEntry.checkedIndicators is flat: { [indKey]: bool }
            // savedEval.checkedIndicators is nested: { [compId]: { [indKey]: bool } }
            const checkedData = savedCompEntry?.checkedIndicators
                || savedEval?.checkedIndicators?.[rawCompId]
                || {};
            const levelDescs = (comp.levels || []).reduce((acc, l) => { acc[l.level] = l.description; return acc; }, {});

            const allToolsWithInds = (comp.toolsWithIndicators || []).filter(t => t.indicators && t.indicators.length > 0);
            const removed_modal = window._evalRemovedTools?.[String(targetId)]?.[String(comp.id)] || [];
            const activeTool_modal = (comp.selectedTools && comp.selectedTools.length > 0)
                ? comp.selectedTools
                : (comp.allTools && comp.allTools.length > 0 ? comp.allTools : []);
            const activeNames_modal = new Set(activeTool_modal.filter(n => !removed_modal.includes(n)));
            const allToolObjs_modal = comp.toolsWithIndicators || [];
            // Active tools that DO have indicators → shown as accordion checkboxes
            const activeToolsWithInds = activeNames_modal.size > 0
                ? allToolObjs_modal.filter(t => activeNames_modal.has(t.name) && t.indicators && t.indicators.length > 0)
                : allToolObjs_modal.filter(t => t.indicators && t.indicators.length > 0);
            // Active tools that have NO indicators → shown as a warning notice
            const activeToolsNoInds_modal = activeNames_modal.size > 0
                ? activeTool_modal.filter(n => !removed_modal.includes(n) && !allToolObjs_modal.find(t => t.name === n && t.indicators && t.indicators.length > 0))
                : [];

            const compInds = comp.competenceIndicators || { initial: [], medio: [], advance: [] };
            const hasToolIndicators = activeToolsWithInds.some(t => t.indicators.length > 0);
            const hasCompIndicators = compInds.initial.length || compInds.medio.length || compInds.advance.length;

            const safeCompId = String(rawCompId).replace(/[^a-zA-Z0-9-]/g, '-');
            const safeTargetId = String(targetId).replace(/[^a-zA-Z0-9-]/g, '-');
            const prefix = `grp-ind-${safeCompId}-${safeTargetId}`;

            // Count checked/total indicators to compute auto-level
            // (checkedData is already set above as the flat {indKey: bool} map)
            // Level is calculated ONLY from competence indicators
            const checkedByLevel = { 1: 0, 2: 0, 3: 0 };
            const totalByLevel = { 1: 0, 2: 0, 3: 0 };

            if (hasCompIndicators) {
                [{ lvl: 1, inds: compInds.initial }, { lvl: 2, inds: compInds.medio }, { lvl: 3, inds: compInds.advance }].forEach(({ lvl, inds }) => {
                    totalByLevel[lvl] = (inds || []).length;
                    (inds || []).forEach(ind => { if (checkedData[`comp-${ind.id}`]) checkedByLevel[lvl]++; });
                });
            }

            let autoLevel = 0;
            if (hasCompIndicators) {
                if (totalByLevel[1] > 0 && checkedByLevel[1] >= totalByLevel[1]) {
                    autoLevel = 1;
                    if (totalByLevel[2] > 0 && checkedByLevel[2] >= totalByLevel[2]) {
                        autoLevel = 2;
                        if (totalByLevel[3] > 0 && checkedByLevel[3] >= totalByLevel[3]) autoLevel = 3;
                    }
                }
                if (totalByLevel[1] === 0 && totalByLevel[2] > 0 && checkedByLevel[2] >= totalByLevel[2]) {
                    autoLevel = Math.max(autoLevel, 2);
                    if (totalByLevel[3] > 0 && checkedByLevel[3] >= totalByLevel[3]) autoLevel = 3;
                }
            }

            const displayLevel = hasCompIndicators ? autoLevel : currentLevel;
            const lvlBadgeColor = LEVEL_COLORS_IND[displayLevel] || 'secondary';
            const lvlBadgeLabel = LEVEL_LABELS_IND[displayLevel] || 'Sin nivel';

            // Build indicator checkboxes grouped by tool — accordion, levels side-by-side
            let indicatorsHtml = '';
            if (hasToolIndicators) {
                const accordionId = `acc-grp-${safeCompId}-${safeTargetId}`;
                indicatorsHtml = `<div class="accordion accordion-flush" id="${accordionId}">` +
                    activeToolsWithInds.map((tool, toolIdx) => {
                        const byLevel = { 1: [], 2: [], 3: [] };
                        tool.indicators.forEach(ind => { if (byLevel[ind.levelId]) byLevel[ind.levelId].push(ind); });
                        const hasChecked = tool.indicators.some(ind => checkedData[`tool-${tool.id}-${ind.id}`]);
                        const collapseId = `${accordionId}-t${toolIdx}`;
                        const toolAutoLevel = (() => {
                            let lvl = 0;
                            for (const l of [1, 2, 3]) {
                                if (byLevel[l].length > 0 && byLevel[l].every(ind => checkedData[`tool-${tool.id}-${ind.id}`])) lvl = l;
                                else if (byLevel[l].length > 0) break;
                            }
                            return lvl;
                        })();
                        const activeLevels = [1, 2, 3].filter(l => byLevel[l].length > 0);
                        const levelCols = activeLevels.map(lvl => {
                            const inds = byLevel[lvl];
                            return `<div class="col">
                            <div class="small fw-semibold mb-1" style="color:${LEVEL_BORDER[lvl]}; font-size:.7rem;">
                                <i class="bi bi-${lvl === 1 ? 'circle' : lvl === 2 ? 'circle-half' : 'circle-fill'} me-1"></i>Nv.${lvl} ${LEVEL_TEXT[lvl]}
                            </div>
                            ${inds.map(ind => {
                                const indKey = `tool-${tool.id}-${ind.id}`;
                                const isChecked = !!(checkedData[indKey]);
                                return `<div class="form-check form-check-sm mb-0">
                                    <input class="form-check-input" type="checkbox" ${isChecked ? 'checked' : ''}
                                        id="${prefix}-${escapeHtml(indKey)}"
                                        onchange="updateEvalIndicator('${safeTargetId}','${rawCompId}','${escapeHtml(indKey)}',${lvl},this.checked,'${escapeHtml(comp.name)}')">
                                    <label class="form-check-label small" for="${prefix}-${escapeHtml(indKey)}" title="${escapeHtml(ind.description || '')}">
                                        ${escapeHtml(ind.name)}
                                        ${ind.description ? `<span class="text-muted fst-italic d-block" style="font-size:.65rem;">${escapeHtml(ind.description)}</span>` : ''}
                                    </label>
                                </div>`;
                            }).join('')}
                        </div>`;
                        }).join('');
                        return `<div class="accordion-item border-0 border-bottom">
                        <h2 class="accordion-header">
                            <button class="accordion-button py-2 px-2 small fw-semibold ${hasChecked ? '' : 'collapsed'}"
                                type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" style="background:transparent;">
                                <i class="bi bi-tools me-2 text-secondary"></i>${escapeHtml(tool.name)}
                                ${toolAutoLevel > 0 ? `<span class="badge ms-2" style="background:${LEVEL_BG[toolAutoLevel]};color:${LEVEL_BORDER[toolAutoLevel]};border:1px solid ${LEVEL_BORDER[toolAutoLevel]};font-size:.65rem;">Nv.${toolAutoLevel}</span>` : ''}
                            </button>
                        </h2>
                        <div id="${collapseId}" class="accordion-collapse collapse ${hasChecked ? 'show' : ''}" data-bs-parent="#${accordionId}">
                            <div class="accordion-body p-2">
                                <div class="row g-2">${levelCols}</div>
                            </div>
                        </div>
                    </div>`;
                    }).join('') + `</div>`;
            } else if (hasCompIndicators) {
                indicatorsHtml = [
                    { lvl: 1, inds: compInds.initial },
                    { lvl: 2, inds: compInds.medio },
                    { lvl: 3, inds: compInds.advance }
                ].filter(g => g.inds.length).map(({ lvl, inds }) => `
                    <div class="border rounded p-2 mb-2" style="background:${LEVEL_BG[lvl]}; border-color:${LEVEL_BORDER[lvl]} !important;">
                        <div class="small fw-semibold mb-1" style="color:${LEVEL_BORDER[lvl]};">
                            <i class="bi bi-${lvl === 1 ? 'circle' : lvl === 2 ? 'circle-half' : 'circle-fill'} me-1"></i>Nivel ${lvl} — ${LEVEL_TEXT[lvl]}
                        </div>
                        ${inds.map(ind => {
                    const indKey = `comp-${ind.id}`;
                    const isChecked = !!(checkedData[indKey]);
                    return `<div class="form-check form-check-sm mb-0">
                                <input class="form-check-input" type="checkbox" ${isChecked ? 'checked' : ''}
                                    id="${prefix}-${escapeHtml(indKey)}"
                                    onchange="updateEvalIndicator('${safeTargetId}','${rawCompId}','${escapeHtml(indKey)}',${lvl},this.checked,'${escapeHtml(comp.name)}')">
                                <label class="form-check-label small" for="${prefix}-${escapeHtml(indKey)}">
                                    ${escapeHtml(ind.name)}
                                    ${ind.description ? `<span class="text-muted fst-italic ms-1" style="font-size:.7rem;">${escapeHtml(ind.description)}</span>` : ''}
                                </label>
                            </div>`;
                }).join('')}
                    </div>`
                ).join('');
            }

            const indProgressHtml = (hasToolIndicators || hasCompIndicators) ? `
                <div class="d-flex gap-2 flex-wrap mb-2 eval-ind-progress">
                    ${[1, 2, 3].filter(lvl => totalByLevel[lvl] > 0).map(lvl => `
                        <span class="badge rounded-pill" style="background:${LEVEL_BG[lvl]}; color:${LEVEL_BORDER[lvl]}; border:1px solid ${LEVEL_BORDER[lvl]}; font-size:.72rem;">
                            Nv.${lvl}: <span data-lvl-count="${lvl}">${checkedByLevel[lvl]}/${totalByLevel[lvl]}</span>
                        </span>`).join('')}
                    <span class="badge bg-${lvlBadgeColor} ms-1" data-auto-level-badge>
                        <i class="bi bi-award me-1"></i>Nivel calculado: <strong>${displayLevel}</strong> — ${lvlBadgeLabel}
                    </span>
                </div>` : '';

            // Manual level buttons — only when no indicators at all
            const manualLevelHtml = (!hasToolIndicators && !hasCompIndicators) ? `
                <div class="d-flex align-items-center gap-2 flex-wrap">
                    <span class="small text-muted me-1">Nivel:</span>
                    ${LEVEL_LABELS.map((lbl, lvl) => {
                const desc = levelDescs[lvl] ? ` — ${levelDescs[lvl]}` : '';
                return `<button type="button"
                            class="btn btn-sm level-btn ${currentLevel === lvl ? `btn-${LEVEL_COLORS[lvl]}` : 'btn-outline-secondary'}"
                            data-target="${safeTargetId}" data-comp="${safeCompId}"
                            data-comp-name="${escapeHtml(comp.name)}" data-level="${lvl}"
                            onclick="toggleEvalLevel(this,'${safeTargetId}','${safeCompId}',${lvl},'${escapeHtml(comp.name)}')"
                            title="${escapeHtml(lbl + desc)}">
                            ${lvl === 0 ? '<i class="bi bi-dash"></i>' : `<strong>${lvl}</strong>`}
                            <span class="ms-1 d-none d-md-inline" style="font-size:.7rem;">${escapeHtml(lbl)}</span>
                        </button>`;
            }).join('')}
                </div>
                ${currentLevel > 0 && levelDescs[currentLevel] ? `<div class="mt-1 small text-muted fst-italic">${escapeHtml(levelDescs[currentLevel])}</div>` : ''}
            ` : '';

            html += `<div class="eval-comp-card card mb-2 border" data-comp-id="${safeCompId}" data-target-id="${safeTargetId}">
                <div class="card-header py-2 px-3 d-flex align-items-start justify-content-between gap-2" style="background:#f8f9fa;">
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center gap-2 flex-wrap">
                            <span class="fw-semibold">${escapeHtml(comp.name)}</span>
                            ${comp.area ? `<span class="badge bg-secondary" style="font-size:.65rem;">${escapeHtml(comp.area)}</span>` : ''}
                        </div>
                        ${comp.description ? `<div class="text-muted small mt-1 fst-italic">${escapeHtml(comp.description)}</div>` : ''}
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-danger flex-shrink-0" style="font-size:.7rem; padding:2px 6px;"
                        title="Eliminar esta competencia de la evaluación"
                        onclick="removeEvalCompetence('${safeTargetId}','${safeCompId}')">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
                <div class="card-body py-2 px-3">
                    ${indProgressHtml}
                    ${indicatorsHtml ? `<div class="mb-2">
                        <div class="small fw-semibold text-secondary mb-1"><i class="bi bi-list-check me-1"></i>Indicadores — marca los que cumple:</div>
                        <div id="ind-container-${safeCompId}-${safeTargetId}">${indicatorsHtml}</div>
                    </div>` : ''}
                    ${activeToolsNoInds_modal.length > 0 ? `<div class="alert alert-warning py-2 px-3 mb-2" style="font-size:.8rem;">
                        <i class="bi bi-exclamation-triangle me-1"></i>
                        <strong>Sin indicadores:</strong> las herramientas
                        <strong>${activeToolsNoInds_modal.map(n => escapeHtml(n)).join(', ')}</strong>
                        no tienen indicadores definidos en el catálogo.
                        Puedes evaluarlas manualmente con el nivel de abajo, o solicitar que se añadan indicadores en la API externa.
                    </div>` : ''}
                    ${manualLevelHtml}
                </div>
            </div>`;
        });
        html += `</div>`;
        return html;
    }

    let bodyHtml = '';

    if (saved.type === 'grupal') {
        if (!saved.groups || saved.groups.length === 0) {
            const mIdxRef = window._evalState.currentModuleIdx;
            const pIdxRef = window._evalState.currentProjectIdx;
            bodyHtml += `
            <div class="alert alert-warning">
                <i class="bi bi-exclamation-triangle me-2"></i>
                No hay grupos definidos para este proyecto.
                <button class="btn btn-sm btn-outline-primary ms-2" data-bs-dismiss="modal"
                    onclick="openGroupsModal(${mIdxRef}, ${pIdxRef})">
                    <i class="bi bi-diagram-3 me-1"></i>Definir grupos ahora
                </button>
            </div>`;
        } else {
            bodyHtml += `
            <div class="d-flex align-items-center justify-content-between mb-3">
                <h6 class="fw-bold mb-0"><i class="bi bi-people me-2 text-info"></i>Evaluación por grupos</h6>
                <button class="btn btn-sm btn-outline-info" data-bs-dismiss="modal"
                    onclick="openGroupsModal(${window._evalState.currentModuleIdx}, ${window._evalState.currentProjectIdx})">
                    <i class="bi bi-pencil me-1"></i>Editar grupos
                </button>
            </div>`;

            saved.groups.forEach((grp, gIdx) => {
                const savedEval = (saved.evaluations || []).find(e => e.targetId === grp.groupName);
                const savedFeedback = savedEval ? savedEval.feedback || '' : '';

                // Member names list (read-only)
                const memberNames = (grp.studentIds || []).map(sid => {
                    const st = students.find(s => String(s.id || s._id) === String(sid));
                    return st ? escapeHtml(((st.name || '') + ' ' + (st.lastname || '')).trim()) : sid;
                });

                bodyHtml += `
                <div class="card mb-3" id="eval-group-card-${gIdx}">
                    <div class="card-header d-flex align-items-center gap-2 py-2" style="background:#f0f9ff;">
                        <i class="bi bi-people-fill text-info"></i>
                        <span class="fw-semibold">${escapeHtml(grp.groupName)}</span>
                        <span class="badge bg-secondary ms-1">${(grp.studentIds || []).length} miembro${(grp.studentIds || []).length !== 1 ? 's' : ''}</span>
                        ${memberNames.length ? `<span class="text-muted small ms-2 fst-italic">${memberNames.join(' · ')}</span>` : ''}
                    </div>
                    <div class="card-body pb-2">
                        <div class="mb-2 d-flex justify-content-between align-items-start flex-wrap gap-2">
                            <div class="flex-grow-1">
                                <label class="form-label small fw-semibold mb-1"><i class="bi bi-award me-1"></i>Competencias</label>
                                ${buildCompetencesHtml(grp.groupName, savedEval)}
                            </div>
                            ${(() => {
                        const ge = (saved.evaluations || []).find(e => String(e.targetId) === String(grp.groupName));
                        if (!ge) return '';
                        const status = ge.submissionStatus || (ge.submissionLink ? 'Entregado' : 'Pendiente');
                        const hasLink = !!ge.submissionLink;
                        const badge = `<span class="badge ${status === 'Entregado' ? 'bg-success' : 'bg-light text-muted border'} ms-1">
                                    <i class="bi bi-cloud-arrow-up${status === 'Entregado' ? '-fill' : ''} me-1"></i>${status}
                                </span>`;
                        const linkHtml = hasLink ? `<div class="small mt-1 text-end">
                                    <a href="${escapeHtml(ge.submissionLink)}" target="_blank" class="text-decoration-none">
                                        <i class="bi bi-git me-1"></i>Repositorio entregado
                                    </a>
                                </div>` : '';
                        return `<div class="text-end small">
                                    ${badge}
                                    ${linkHtml}
                                </div>`;
                    })()}
                        </div>
                        <div class="mt-2">
                            <label class="form-label small fw-semibold"><i class="bi bi-chat-text me-1"></i>Feedback del grupo</label>
                            <textarea class="form-control form-control-sm" rows="2" placeholder="Comentarios de feedback..."
                                data-target-type="group" data-target-id="${escapeHtml(grp.groupName)}">${escapeHtml(savedFeedback)}</textarea>
                        </div>
                    </div>
                </div>`;
            });
        }
        bodyHtml += `</div>`;

    } else {
        // Individual evaluation
        // ── Panel: evaluaciones ya guardadas ──────────────────────────────────
        const doneEvals = saved.evaluations || [];
        let existingEvalsHtml = '';
        if (doneEvals.length > 0) {
            const LEVEL_COLORS_MAP = ['secondary', 'danger', 'warning', 'success'];
            const LEVEL_LABELS_MAP = ['Sin nivel', 'Básico', 'Medio', 'Avanzado'];
            existingEvalsHtml = `
            <div class="mb-4">
                <h6 class="fw-bold mb-2"><i class="bi bi-list-check me-2 text-success"></i>Evaluaciones guardadas (${doneEvals.length}/${students.length})</h6>
                <div class="list-group gap-2">
                ${doneEvals.map(ev => {
                const st = students.find(s => String(s.id || s._id) === String(ev.targetId));
                const stName = st ? `${st.name || ''} ${st.lastname || ''}`.trim() : ev.targetName || ev.targetId;
                const compsHtml = (ev.competences || []).map(c =>
                    `<span class="badge bg-${LEVEL_COLORS_MAP[c.level] || 'secondary'} me-1">
                            Nv.${c.level} ${c.competenceName}
                        </span>`
                ).join('');
                const status = ev.submissionStatus || (ev.submissionLink ? 'Entregado' : 'Pendiente');
                const hasLink = !!ev.submissionLink;
                const statusBadge = `<span class="badge ${status === 'Entregado' ? 'bg-success' : 'bg-light text-muted border'} ms-1">
                        <i class="bi bi-cloud-arrow-up${status === 'Entregado' ? '-fill' : ''} me-1"></i>${status}
                    </span>`;
                return `<div class="list-group-item list-group-item-action p-2 rounded border" id="saved-eval-${escapeHtml(String(ev.targetId))}">
                        <div class="d-flex align-items-start justify-content-between gap-2">
                            <div class="flex-grow-1">
                                <div class="fw-semibold small mb-1">
                                    <i class="bi bi-person-check me-1 text-success"></i>${escapeHtml(stName)}
                                    ${ev.evaluatedAt ? `<span class="text-muted fw-normal ms-2" style="font-size:.7rem;">${new Date(ev.evaluatedAt).toLocaleDateString('es-ES')}</span>` : ''}
                                    ${statusBadge}
                                </div>
                                ${compsHtml ? `<div class="mb-1">${compsHtml}</div>` : ''}
                                ${hasLink ? `<div class="small mb-1">
                                    <a href="${escapeHtml(ev.submissionLink)}" target="_blank" class="text-decoration-none">
                                        <i class="bi bi-git me-1"></i>Repositorio entregado
                                    </a>
                                </div>` : ''}
                                ${ev.feedback ? `<div class="text-muted small fst-italic">"${escapeHtml(ev.feedback)}"</div>` : ''}
                                ${ev.studentComment ? `<div class="text-primary small mt-1"><i class="bi bi-chat-right-text me-1"></i>"${escapeHtml(ev.studentComment)}"</div>` : ''}
                            </div>
                            <div class="d-flex flex-column gap-1 flex-shrink-0">
                                <button class="btn btn-sm btn-outline-primary py-0 px-2" style="font-size:.75rem;"
                                    onclick="editStudentEvaluation('${escapeHtml(String(ev.targetId))}')">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger py-0 px-2" style="font-size:.75rem;"
                                    onclick="deleteStudentEvaluation('${escapeHtml(String(ev.targetId))}')">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>`;
            }).join('')}
                </div>
            </div>`;
        }

        bodyHtml += `
        <div class="mb-4">
            <label class="form-label fw-semibold"><i class="bi bi-person me-1"></i>Evaluar estudiante</label>
            <div class="input-group">
                <select class="form-select" id="eval-student-select">
                    <option value="">— Seleccionar estudiante —</option>
                    ${students.map(st => {
            const alreadyDone = doneEvals.some(e => String(e.targetId) === String(st.id || st._id));
            return `<option value="${escapeHtml(String(st.id || st._id))}" ${alreadyDone ? 'style="color:#198754;font-weight:600;"' : ''}>
                            ${escapeHtml((st.name || '') + ' ' + (st.lastname || ''))}${alreadyDone ? ' ✓' : ''}
                        </option>`;
        }).join('')}
                </select>
                <button class="btn btn-primary" type="button" onclick="openStudentEvalSubModal()"
                    style="background:#E85D26;border-color:#E85D26;">
                    <i class="bi bi-clipboard-check me-1"></i>Evaluar
                </button>
            </div>
            <div class="text-muted small mt-1"><i class="bi bi-info-circle me-1"></i>Selecciona un estudiante y pulsa "Evaluar" para abrir el formulario de evaluación.</div>
        </div>
        ${existingEvalsHtml}`;
    }

    document.getElementById('eval-modal-body').innerHTML = bodyHtml;

    // Show "Guardar" button only for grupal evaluations; individual uses sub-modal
    const saveBtn = document.getElementById('eval-modal-save-btn');
    if (saveBtn) saveBtn.classList.toggle('d-none', saved.type !== 'grupal');

    // Store saved reference so JS functions can access it
    window._evalCurrentSaved = saved;
    window._evalCurrentProjectCompetences = projCompetences;

    const modal = new bootstrap.Modal(document.getElementById('evaluationModal'));
    modal.show();
}

function openStudentEvalSubModal() {
    const sel = document.getElementById('eval-student-select');
    const studentId = sel ? sel.value : '';
    if (!studentId) {
        showToast('Selecciona un estudiante primero', 'danger');
        return;
    }
    _openStudentEvalSubModalFor(studentId);
}

function _openStudentEvalSubModalFor(studentId) {
    const { students } = window._evalState;
    const saved = window._evalCurrentSaved;
    const projCompetences = window._evalCurrentProjectCompetences || [];
    const LEVEL_LABELS = ['Sin nivel', 'Básico', 'Medio', 'Avanzado'];
    const LEVEL_COLORS = ['secondary', 'danger', 'warning', 'success'];

    const student = students.find(s => String(s.id || s._id) === String(studentId));
    const studentName = student ? `${student.name || ''} ${student.lastname || ''}`.trim() : studentId;

    // Restore any previously removed competences for this target
    if (window._evalRemovedComps) delete window._evalRemovedComps[String(studentId)];
    // Track removed tools per competence in the sub-modal (per-target per-comp)
    if (!window._evalRemovedTools) window._evalRemovedTools = {};
    if (!window._evalRemovedTools[String(studentId)]) window._evalRemovedTools[String(studentId)] = {};

    const savedEval = (saved.evaluations || []).find(e => e.targetId === studentId);
    const savedFeedback = savedEval ? savedEval.feedback || '' : '';

    function buildSubModalCompetencesHtml(targetId, savedEval) {
        if (!projCompetences.length) {
            return `<p class="text-muted small">No hay competencias asociadas a este proyecto.</p>`;
        }
        const removedCompIds = window._evalRemovedComps?.[String(targetId)] || [];
        const visibleComps = projCompetences.filter(c => !removedCompIds.includes(String(c.id)));

        if (!visibleComps.length) {
            return `<p class="text-muted small fst-italic">Todas las competencias han sido eliminadas de esta evaluación.</p>`;
        }

        const LEVEL_COLORS_IND = ['secondary', 'danger', 'warning', 'success'];
        const LEVEL_LABELS_IND = ['Sin nivel', 'Básico', 'Medio', 'Avanzado'];
        const LEVEL_BG = { 1: '#fff3cd', 2: '#cfe2ff', 3: '#d1e7dd' };
        const LEVEL_BORDER = { 1: '#ffc107', 2: '#0d6efd', 3: '#198754' };
        const LEVEL_TEXT = { 1: 'Básico', 2: 'Medio', 3: 'Avanzado' };

        let html = `<div class="eval-competences-list">`;
        visibleComps.forEach(comp => {
            const savedCompEntry = savedEval ? (savedEval.competences || []).find(c => String(c.competenceId) === String(comp.id)) : null;
            const currentLevel = savedCompEntry ? savedCompEntry.level : 0;
            // Use the raw comp.id (not HTML-escaped) as the key when reading checkedIndicators
            const rawCompId = String(comp.id);
            // savedCompEntry.checkedIndicators is flat: { [indKey]: bool }
            // savedEval.checkedIndicators is nested: { [compId]: { [indKey]: bool } }
            const checkedDataForComp = savedCompEntry?.checkedIndicators
                || savedEval?.checkedIndicators?.[rawCompId]
                || {};

            // Build the indicators structure from toolsWithIndicators + competenceIndicators
            // Priority: use toolsWithIndicators if available and have indicators; else use competenceIndicators
            const toolsWithInds_t3 = comp.toolsWithIndicators || [];
            const removed_t3 = window._evalRemovedTools?.[String(targetId)]?.[String(comp.id)] || [];
            const activeTool_t3 = (comp.selectedTools && comp.selectedTools.length > 0)
                ? comp.selectedTools
                : (comp.allTools && comp.allTools.length > 0 ? comp.allTools : []);
            const activeNames_t3 = new Set(activeTool_t3.filter(n => !removed_t3.includes(n)));
            // Active tools that DO have indicators → shown as accordion checkboxes
            const activeToolsWithInds = activeNames_t3.size > 0
                ? toolsWithInds_t3.filter(t => activeNames_t3.has(t.name) && t.indicators && t.indicators.length > 0)
                : toolsWithInds_t3.filter(t => t.indicators && t.indicators.length > 0);
            // Active tools that have NO indicators → shown as a warning notice
            const activeToolsNoInds_t3 = activeNames_t3.size > 0
                ? activeTool_t3.filter(n => !removed_t3.includes(n) && !toolsWithInds_t3.find(t => t.name === n && t.indicators && t.indicators.length > 0))
                : [];

            // Fallback to general competence indicators grouped by level
            const compInds = comp.competenceIndicators || { initial: [], medio: [], advance: [] };
            const hasToolIndicators = activeToolsWithInds.some(t => t.indicators.length > 0);
            const hasCompIndicators = compInds.initial.length || compInds.medio.length || compInds.advance.length;

            // Unique ID prefix for this competence+target combo
            const safeCompId = String(comp.id).replace(/[^a-zA-Z0-9-]/g, '-');
            const safeTargetId = String(targetId).replace(/[^a-zA-Z0-9-]/g, '-');
            const prefix = `ind-${safeCompId}-${safeTargetId}`;

            // Build indicators HTML — accordion per tool, levels side-by-side
            let indicatorsHtml = '';

            if (hasToolIndicators) {
                // Each tool = accordion item, levels shown as side-by-side columns inside
                const accordionId = `acc-ind-${safeCompId}-${safeTargetId}`;
                indicatorsHtml = `<div class="accordion accordion-flush" id="${accordionId}">` +
                    activeToolsWithInds.map((tool, toolIdx) => {
                        const byLevel = { 1: [], 2: [], 3: [] };
                        tool.indicators.forEach(ind => { if (byLevel[ind.levelId]) byLevel[ind.levelId].push(ind); });
                        const hasChecked = tool.indicators.some(ind => checkedDataForComp[`tool-${tool.id}-${ind.id}`]);
                        const collapseId = `${accordionId}-t${toolIdx}`;
                        const toolAutoLevel = (() => {
                            let lvl = 0;
                            for (const l of [1, 2, 3]) {
                                if (byLevel[l].length > 0 && byLevel[l].every(ind => checkedDataForComp[`tool-${tool.id}-${ind.id}`])) lvl = l;
                                else if (byLevel[l].length > 0) break;
                            }
                            return lvl;
                        })();
                        const activeLevels = [1, 2, 3].filter(l => byLevel[l].length > 0);
                        const levelCols = activeLevels.map(lvl => {
                            const inds = byLevel[lvl];
                            return `<div class="col">
                            <div class="small fw-semibold mb-1" style="color:${LEVEL_BORDER[lvl]}; font-size:.7rem;">
                                <i class="bi bi-${lvl === 1 ? 'circle' : lvl === 2 ? 'circle-half' : 'circle-fill'} me-1"></i>Nv.${lvl} ${LEVEL_TEXT[lvl]}
                            </div>
                            ${inds.map(ind => {
                                const indKey = `tool-${tool.id}-${ind.id}`;
                                const isChecked = !!(checkedDataForComp[indKey]);
                                return `<div class="form-check form-check-sm mb-0">
                                    <input class="form-check-input" type="checkbox" ${isChecked ? 'checked' : ''}
                                        id="${prefix}-${escapeHtml(indKey)}"
                                        data-comp-id="${safeCompId}"
                                        data-target-id="${safeTargetId}"
                                        data-ind-key="${escapeHtml(indKey)}"
                                        data-level="${lvl}"
                                        onchange="updateEvalIndicator('${safeTargetId}','${rawCompId}','${escapeHtml(indKey)}',${lvl},this.checked,'${escapeHtml(comp.name)}')">
                                    <label class="form-check-label small" for="${prefix}-${escapeHtml(indKey)}" title="${escapeHtml(ind.description || '')}">
                                        ${escapeHtml(ind.name)}
                                        ${ind.description ? `<span class="text-muted fst-italic d-block" style="font-size:.65rem;">${escapeHtml(ind.description)}</span>` : ''}
                                    </label>
                                </div>`;
                            }).join('')}
                        </div>`;
                        }).join('');
                        return `<div class="accordion-item border-0 border-bottom">
                        <h2 class="accordion-header">
                            <button class="accordion-button py-2 px-2 small fw-semibold ${hasChecked ? '' : 'collapsed'}"
                                type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" style="background:transparent;">
                                <i class="bi bi-tools me-2 text-secondary"></i>${escapeHtml(tool.name)}
                                ${toolAutoLevel > 0 ? `<span class="badge ms-2" style="background:${LEVEL_BG[toolAutoLevel]};color:${LEVEL_BORDER[toolAutoLevel]};border:1px solid ${LEVEL_BORDER[toolAutoLevel]};font-size:.65rem;">Nv.${toolAutoLevel}</span>` : ''}
                            </button>
                        </h2>
                        <div id="${collapseId}" class="accordion-collapse collapse ${hasChecked ? 'show' : ''}" data-bs-parent="#${accordionId}">
                            <div class="accordion-body p-2">
                                <div class="row g-2">${levelCols}</div>
                            </div>
                        </div>
                    </div>`;
                    }).join('') + `</div>`;

            } else if (hasCompIndicators) {
                // Use general competence indicators grouped by level
                indicatorsHtml = [
                    { lvl: 1, inds: compInds.initial },
                    { lvl: 2, inds: compInds.medio },
                    { lvl: 3, inds: compInds.advance }
                ].filter(g => g.inds.length).map(({ lvl, inds }) => `
                    <div class="border rounded p-2 mb-2" style="background:${LEVEL_BG[lvl]}; border-color:${LEVEL_BORDER[lvl]} !important;">
                        <div class="small fw-semibold mb-1" style="color:${LEVEL_BORDER[lvl]};">
                            <i class="bi bi-${lvl === 1 ? 'circle' : lvl === 2 ? 'circle-half' : 'circle-fill'} me-1"></i>Nivel ${lvl} — ${LEVEL_TEXT[lvl]}
                        </div>
                        ${inds.map(ind => {
                    const indKey = `comp-${ind.id}`;
                    const isChecked = !!(checkedDataForComp[indKey]);
                    return `<div class="form-check form-check-sm mb-0">
                                <input class="form-check-input" type="checkbox" ${isChecked ? 'checked' : ''}
                                    id="${prefix}-${escapeHtml(indKey)}"
                                    data-comp-id="${safeCompId}"
                                    data-target-id="${safeTargetId}"
                                    data-ind-key="${escapeHtml(indKey)}"
                                    data-level="${lvl}"
                                    onchange="updateEvalIndicator('${safeTargetId}','${rawCompId}','${escapeHtml(indKey)}',${lvl},this.checked,'${escapeHtml(comp.name)}')">
                                <label class="form-check-label small" for="${prefix}-${escapeHtml(indKey)}" title="${escapeHtml(ind.description || '')}">
                                    ${escapeHtml(ind.name)}
                                    ${ind.description ? `<span class="text-muted fst-italic ms-1" style="font-size:.7rem;">${escapeHtml(ind.description)}</span>` : ''}
                                </label>
                            </div>`;
                }).join('')}
                    </div>`
                ).join('');
            }

            // Calculate current level from checked COMPETENCE indicators only
            // Tool indicators do NOT affect the competence level — same rule as updateEvalIndicator
            const checkedData = checkedDataForComp;
            const checkedByLevel = { 1: 0, 2: 0, 3: 0 };
            const totalByLevel = { 1: 0, 2: 0, 3: 0 };

            if (hasCompIndicators) {
                [{ lvl: 1, inds: compInds.initial }, { lvl: 2, inds: compInds.medio }, { lvl: 3, inds: compInds.advance }].forEach(({ lvl, inds }) => {
                    totalByLevel[lvl] = (inds || []).length;
                    (inds || []).forEach(ind => {
                        if (checkedData[`comp-${ind.id}`]) checkedByLevel[lvl]++;
                    });
                });
            }

            // Auto-computed level: highest level where ALL indicators of that level are checked
            // (and all lower levels are also fully checked)
            let autoLevel = 0;
            if (hasCompIndicators) {
                if (totalByLevel[1] > 0 && checkedByLevel[1] >= totalByLevel[1]) {
                    autoLevel = 1;
                    if (totalByLevel[2] > 0 && checkedByLevel[2] >= totalByLevel[2]) {
                        autoLevel = 2;
                        if (totalByLevel[3] > 0 && checkedByLevel[3] >= totalByLevel[3]) {
                            autoLevel = 3;
                        }
                    }
                }
                // If no level-1 indicators defined but level-2+ checked
                if (totalByLevel[1] === 0 && totalByLevel[2] > 0 && checkedByLevel[2] >= totalByLevel[2]) {
                    autoLevel = Math.max(autoLevel, 2);
                    if (totalByLevel[3] > 0 && checkedByLevel[3] >= totalByLevel[3]) autoLevel = 3;
                }
            }

            const displayLevel = hasCompIndicators ? autoLevel : currentLevel;

            const lvlBadgeColor = LEVEL_COLORS_IND[displayLevel] || 'secondary';
            const lvlBadgeLabel = LEVEL_LABELS_IND[displayLevel] || 'Sin nivel';

            // Progress counters per level
            const indProgressHtml = (hasToolIndicators || hasCompIndicators) ? `
                <div class="d-flex gap-2 flex-wrap mb-2 eval-ind-progress">
                    ${[1, 2, 3].filter(lvl => totalByLevel[lvl] > 0).map(lvl => `
                        <span class="badge rounded-pill" style="background:${LEVEL_BG[lvl]}; color:${LEVEL_BORDER[lvl]}; border:1px solid ${LEVEL_BORDER[lvl]}; font-size:.72rem;">
                            Nv.${lvl}: <span data-lvl-count="${lvl}">${checkedByLevel[lvl]}/${totalByLevel[lvl]}</span>
                        </span>`).join('')}
                    <span class="badge bg-${lvlBadgeColor} ms-1" data-auto-level-badge>
                        <i class="bi bi-award me-1"></i>Nivel calculado: <strong>${displayLevel}</strong> — ${lvlBadgeLabel}
                    </span>
                </div>` : '';

            // Fallback manual level buttons (shown only if no indicators at all)
            const levelDescs = (comp.levels || []).reduce((acc, l) => { acc[l.level] = l.description; return acc; }, {});
            const manualLevelHtml = (!hasToolIndicators && !hasCompIndicators) ? `
                <div class="d-flex align-items-center gap-2 flex-wrap">
                    <span class="small text-muted me-1">Nivel:</span>
                    ${LEVEL_LABELS.map((lbl, lvl) => {
                const desc = levelDescs[lvl] ? ` — ${levelDescs[lvl]}` : '';
                return `<button type="button"
                            class="btn btn-sm level-btn ${currentLevel === lvl ? `btn-${LEVEL_COLORS[lvl]}` : 'btn-outline-secondary'}"
                            data-target="${safeTargetId}"
                            data-comp="${safeCompId}"
                            data-comp-name="${escapeHtml(comp.name)}"
                            data-level="${lvl}"
                            onclick="toggleEvalLevel(this, '${safeTargetId}', '${safeCompId}', ${lvl}, '${escapeHtml(comp.name)}')"
                            title="${escapeHtml(lbl + desc)}">
                            ${lvl === 0 ? '<i class="bi bi-dash"></i>' : `<strong>${lvl}</strong>`}
                            <span class="ms-1 d-none d-md-inline" style="font-size:.7rem;">${escapeHtml(lbl)}</span>
                        </button>`;
            }).join('')}
                </div>
                ${currentLevel > 0 && levelDescs[currentLevel] ? `<div class="mt-1 small text-muted fst-italic level-desc-hint">${escapeHtml(levelDescs[currentLevel])}</div>` : `<div class="mt-1 small text-muted fst-italic level-desc-hint" style="min-height:1rem;"></div>`}
            ` : '';

            html += `<div class="eval-comp-card card mb-3 border" data-comp-id="${safeCompId}" data-target-id="${safeTargetId}">
                <div class="card-header py-2 px-3 d-flex align-items-start justify-content-between gap-2" style="background:#f8f9fa;">
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center gap-2 flex-wrap">
                            <span class="fw-semibold">${escapeHtml(comp.name)}</span>
                            ${comp.area ? `<span class="badge bg-secondary" style="font-size:.65rem;">${escapeHtml(comp.area)}</span>` : ''}
                        </div>
                        ${comp.description ? `<div class="text-muted small mt-1 fst-italic">${escapeHtml(comp.description)}</div>` : ''}
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-danger flex-shrink-0" style="font-size:.7rem; padding:2px 6px;"
                        title="Eliminar esta competencia de la evaluación"
                        onclick="removeEvalCompetence('${safeTargetId}', '${safeCompId}')">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
                <div class="card-body py-2 px-3">
                    ${indProgressHtml}
                    ${indicatorsHtml
                    ? `<div class="mb-2">
                            <div class="small fw-semibold text-secondary mb-1">
                                <i class="bi bi-list-check me-1"></i>Indicadores — marca los que cumple el estudiante:
                            </div>
                            <div id="ind-container-${safeCompId}-${safeTargetId}">
                                ${indicatorsHtml}
                            </div>
                           </div>`
                    : ''}
                    ${activeToolsNoInds_t3.length > 0 ? `<div class="alert alert-warning py-2 px-3 mb-2" style="font-size:.8rem;">
                        <i class="bi bi-exclamation-triangle me-1"></i>
                        <strong>Sin indicadores:</strong> las herramientas
                        <strong>${activeToolsNoInds_t3.map(n => escapeHtml(n)).join(', ')}</strong>
                        no tienen indicadores definidos en el catálogo.
                        Puedes evaluarlas manualmente con el nivel de abajo, o solicitar que se añadan indicadores en la API externa.
                    </div>` : ''}
                    ${manualLevelHtml}
                </div>
            </div>`;
        });
        html += `</div>`;
        return html;
    }

    const bodyHtml = `
        <div class="mb-3">
            <label class="form-label small fw-semibold"><i class="bi bi-award me-1"></i>Competencias</label>
            ${buildSubModalCompetencesHtml(studentId, savedEval)}
        </div>
        <div class="mt-3">
            <label class="form-label small fw-semibold"><i class="bi bi-chat-text me-1"></i>Feedback</label>
            <textarea class="form-control form-control-sm" rows="2" placeholder="Comentarios de feedback para el informe..."
                data-target-type="individual" data-target-id="${escapeHtml(studentId)}">${escapeHtml(savedFeedback)}</textarea>
        </div>`;

    // ── Show the inline eval panel (within the page, sidebar + navbar still visible) ──
    const panel = document.getElementById('student-eval-panel');
    const tabView = document.getElementById('evaluation-tab-view');
    const evalModal = document.getElementById('evaluationModal');

    // Close the evaluation modal first
    const evalModalInstance = bootstrap.Modal.getInstance(evalModal);
    if (evalModalInstance) evalModalInstance.hide();

    // Populate the panel
    const titleEl = document.getElementById('student-eval-panel-title');
    const subtitleEl = document.getElementById('student-eval-panel-subtitle');
    const bodyEl = document.getElementById('student-eval-panel-body');

    if (titleEl) titleEl.innerHTML = `<i class="bi bi-person-check me-2 text-warning"></i>Evaluando: ${escapeHtml(studentName)}`;
    if (subtitleEl) subtitleEl.innerHTML = `<i class="bi bi-clipboard-check me-2"></i>${escapeHtml(studentName)}`;
    if (bodyEl) bodyEl.innerHTML = bodyHtml;

    // Store the current student id on the panel element
    if (panel) panel.dataset.targetStudentId = studentId;

    // Swap views: hide the tab overview, show the panel
    if (tabView) tabView.classList.add('hidden');
    if (panel) panel.classList.remove('hidden');

    // Scroll to top of panel smoothly
    panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function removeEvalTool(targetId, compId, toolName) {
    if (!window._evalRemovedTools) window._evalRemovedTools = {};
    if (!window._evalRemovedTools[String(targetId)]) window._evalRemovedTools[String(targetId)] = {};
    if (!window._evalRemovedTools[String(targetId)][String(compId)]) window._evalRemovedTools[String(targetId)][String(compId)] = [];

    const arr = window._evalRemovedTools[String(targetId)][String(compId)];
    if (!arr.includes(toolName)) arr.push(toolName);

    // Remove the badge from the DOM
    const container = document.getElementById(`submodal-tools-${CSS.escape(String(compId))}-${CSS.escape(String(targetId))}`);
    if (container) {
        const badges = container.querySelectorAll('.badge');
        badges.forEach(badge => {
            if (badge.textContent.trim().replace('×', '').trim() === toolName || badge.textContent.includes(toolName)) {
                badge.style.transition = 'opacity .2s';
                badge.style.opacity = '0';
                setTimeout(() => badge.remove(), 200);
            }
        });
    }
}

/**
 * Called when the user checks/unchecks an indicator checkbox in the evaluation sub-modal.
 * Updates the in-memory checkedIndicators state and recalculates the auto-level badge.
 */
function updateEvalIndicator(targetId, compId, indKey, level, checked, compName) {
    const saved = window._evalCurrentSaved;
    if (!saved) return;

    // Ensure eval entry exists
    let evalEntry = (saved.evaluations || []).find(e => e.targetId === targetId);
    if (!evalEntry) {
        evalEntry = {
            targetId, targetName: targetId,
            competences: [], feedback: '', studentComment: '', evaluatedAt: null
        };
        if (!saved.evaluations) saved.evaluations = [];
        saved.evaluations.push(evalEntry);
    }

    // Ensure checkedIndicators map exists on the eval entry
    if (!evalEntry.checkedIndicators) evalEntry.checkedIndicators = {};
    if (!evalEntry.checkedIndicators[compId]) evalEntry.checkedIndicators[compId] = {};

    evalEntry.checkedIndicators[compId][indKey] = checked;

    // Recalculate auto-level from all checked COMPETENCE indicators for this comp
    // Tool indicators do NOT affect the competence level — they are saved for reports only
    const comp = (window._evalCurrentProjectCompetences || []).find(c => String(c.id) === String(compId));
    if (!comp) return;

    const checkedData = evalEntry.checkedIndicators[compId] || {};
    const compInds = comp.competenceIndicators || { initial: [], medio: [], advance: [] };
    const hasCompIndicators = compInds.initial.length || compInds.medio.length || compInds.advance.length;

    // Calculate level ONLY from competenceIndicators (comp-* keys), never from tool indicators
    const totalByLevel = { 1: 0, 2: 0, 3: 0 };
    const checkedByLevel = { 1: 0, 2: 0, 3: 0 };

    if (hasCompIndicators) {
        [{ lvl: 1, inds: compInds.initial }, { lvl: 2, inds: compInds.medio }, { lvl: 3, inds: compInds.advance }].forEach(({ lvl, inds }) => {
            totalByLevel[lvl] = (inds || []).length;
            (inds || []).forEach(ind => { if (checkedData[`comp-${ind.id}`]) checkedByLevel[lvl]++; });
        });
    }

    let autoLevel = 0;
    if (hasCompIndicators) {
        if (totalByLevel[1] > 0 && checkedByLevel[1] >= totalByLevel[1]) {
            autoLevel = 1;
            if (totalByLevel[2] > 0 && checkedByLevel[2] >= totalByLevel[2]) {
                autoLevel = 2;
                if (totalByLevel[3] > 0 && checkedByLevel[3] >= totalByLevel[3]) autoLevel = 3;
            }
        }
        if (totalByLevel[1] === 0 && totalByLevel[2] > 0 && checkedByLevel[2] >= totalByLevel[2]) {
            autoLevel = Math.max(autoLevel, 2);
            if (totalByLevel[3] > 0 && checkedByLevel[3] >= totalByLevel[3]) autoLevel = 3;
        }
    }

    // Update the competence entry level
    let compEntry = evalEntry.competences.find(c => String(c.competenceId) === String(compId));
    if (!compEntry) {
        compEntry = { competenceId: compId, competenceName: compName, level: autoLevel, toolsUsed: [], checkedIndicators: {} };
        evalEntry.competences.push(compEntry);
    } else {
        compEntry.level = autoLevel;
    }
    compEntry.checkedIndicators = evalEntry.checkedIndicators[compId];

    // Update badge in DOM without full re-render
    const LEVEL_COLORS_IND = ['secondary', 'danger', 'warning', 'success'];
    const LEVEL_LABELS_IND = ['Sin nivel', 'Básico', 'Medio', 'Avanzado'];
    const safeCompId = CSS.escape(String(compId));
    const safeTargetId = CSS.escape(String(targetId));

    // Update progress counters
    const progressContainer = document.querySelector(
        `.eval-comp-card[data-comp-id="${CSS.escape(String(compId))}"][data-target-id="${CSS.escape(String(targetId))}"] .eval-ind-progress`
    );

    // Find and update the auto-level badge span (the last badge in the progress bar)
    const cardEl = document.querySelector(
        `.eval-comp-card[data-comp-id="${CSS.escape(String(compId))}"][data-target-id="${CSS.escape(String(targetId))}"]`
    );
    if (cardEl) {
        // Update per-level counter badges
        [1, 2, 3].forEach(lvl => {
            const lvlBadge = cardEl.querySelector(`[data-lvl-count="${lvl}"]`);
            if (lvlBadge) lvlBadge.textContent = `${checkedByLevel[lvl]}/${totalByLevel[lvl]}`;
        });
        // Update the auto-level badge
        const autoLevelBadge = cardEl.querySelector('[data-auto-level-badge]');
        if (autoLevelBadge) {
            autoLevelBadge.className = `badge bg-${LEVEL_COLORS_IND[autoLevel]} ms-1`;
            autoLevelBadge.innerHTML = `<i class="bi bi-award me-1"></i>Nivel calculado: <strong>${autoLevel}</strong> — ${LEVEL_LABELS_IND[autoLevel]}`;
        }
    }
}

async function saveIndividualStudentEval() {
    // Detect which panel is active: split view or legacy panel
    const splitView = document.getElementById('eval-project-view');
    const legacyPanel = document.getElementById('student-eval-panel');
    const inSplitView = splitView && !splitView.classList.contains('hidden');

    const studentId = inSplitView
        ? (splitView.dataset.targetStudentId || null)
        : (legacyPanel ? legacyPanel.dataset.targetStudentId : null);

    if (!studentId) { showToast('Selecciona un estudiante primero', 'danger'); return; }

    const saved = window._evalCurrentSaved;
    if (!saved) return;

    // ── Show spinner on the save button ──────────────────────────────────────
    const saveBtn = document.getElementById('save-eval-panel-btn');
    const originalBtnHtml = saveBtn ? saveBtn.innerHTML : '';
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Guardando...`;
    }

    try {
        // Collect feedback from whichever panel is active
        const searchRoot = inSplitView ? document.getElementById('eval-right-body') : legacyPanel;
        const ta = searchRoot ? searchRoot.querySelector(`textarea[data-target-id="${CSS.escape(studentId)}"]`) : null;
        const feedback = ta ? ta.value : '';

        let evalEntry = (saved.evaluations || []).find(e => e.targetId === studentId);
        if (!evalEntry) {
            if (!saved.evaluations) saved.evaluations = [];
            evalEntry = { targetId: studentId, targetName: _resolveTargetName(studentId), competences: [], feedback: '' };
            saved.evaluations.push(evalEntry);
        }
        evalEntry.feedback = feedback;
        evalEntry.evaluatedAt = new Date().toISOString();

        // Persist
        const { modules, savedEvaluations } = window._evalState;
        const mIdx = window._evalState.currentModuleIdx;
        const pIdx = window._evalState.currentProjectIdx;
        const mod = modules[mIdx];
        const proj = mod.projects[pIdx];
        const modId = mod.id || String(mIdx);
        const existingIdx = savedEvaluations.findIndex(e => e.moduleId === modId && e.projectName === proj.name);
        if (existingIdx >= 0) window._evalState.savedEvaluations[existingIdx] = saved;
        else window._evalState.savedEvaluations.push(saved);

        await _persistEvaluations();

        // Sync to student ficha (individual only)
        const { students } = window._evalState;
        if (saved.type !== 'grupal') {
            await _syncEvaluationsToStudentTracking(saved, mod, proj, students);
        }

        showToast('Evaluación guardada correctamente', 'success');

        if (inSplitView) {
            // Stay in split view: refresh the target list and reload the right panel
            _renderEvalTargetsList(saved, students);
            // Re-open same target so the header shows "Evaluado"
            selectEvalTarget(studentId);
            // Reset button
            if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = originalBtnHtml; }
        } else {
            // Legacy path: close panel and reopen evaluation modal
            _closeStudentEvalPanel();
            openEvaluationModal(mIdx, pIdx);
        }
    } catch (err) {
        console.error('[saveIndividualStudentEval]', err);
        showToast('Error al guardar la evaluación', 'danger');
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = originalBtnHtml; }
    }
}

/** Hides the inline student-eval panel and restores the evaluation tab view. */
function _closeStudentEvalPanel() {
    const panel = document.getElementById('student-eval-panel');
    const tabView = document.getElementById('evaluation-tab-view');
    if (panel) panel.classList.add('hidden');
    if (tabView) tabView.classList.remove('hidden');
    // Reset save button just in case
    const saveBtn = document.getElementById('save-eval-panel-btn');
    if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<i class="bi bi-save me-1"></i>Guardar evaluación`;
    }
}

/** Called by the "Cancelar" / "Volver" buttons in the inline eval panel or split view. */
window.cancelStudentEvalPanel = function () {
    const splitView = document.getElementById('eval-project-view');
    const inSplitView = splitView && !splitView.classList.contains('hidden');
    if (inSplitView) {
        // In split view: just clear the right panel selection (go back to empty state)
        _showEvalRightEmpty();
        if (splitView) splitView.dataset.targetStudentId = '';
        document.querySelectorAll('#eval-targets-list .eval-target-item').forEach(li => li.classList.remove('active'));
    } else {
        _closeStudentEvalPanel();
        const mIdx = window._evalState?.currentModuleIdx;
        const pIdx = window._evalState?.currentProjectIdx;
        if (mIdx !== undefined && pIdx !== undefined) {
            openEvaluationModal(mIdx, pIdx);
        }
    }
};

// Legacy – kept for group eval and backward compat; also handles "edit" click scroll
function onEvalStudentChange() {
    // No-op: individual evaluation is now done via sub-modal
}

function toggleEvalLevel(btn, targetId, compId, level, compName) {
    const saved = window._evalCurrentSaved;
    if (!saved) return;

    let evalEntry = (saved.evaluations || []).find(e => e.targetId === targetId);
    if (!evalEntry) {
        if (!saved.evaluations) saved.evaluations = [];
        evalEntry = { targetId, targetName: _resolveTargetName(targetId), competences: [], feedback: '' };
        saved.evaluations.push(evalEntry);
    }

    let compEntry = evalEntry.competences.find(c => String(c.competenceId) === String(compId));
    if (!compEntry) {
        compEntry = { competenceId: compId, competenceName: compName, level: 0 };
        evalEntry.competences.push(compEntry);
    }
    compEntry.level = level;

    // Update button styles in the same card
    const LEVEL_COLORS = ['secondary', 'danger', 'warning', 'success'];
    const card = btn.closest('.eval-comp-card');
    if (card) {
        card.querySelectorAll('button[data-comp]').forEach(b => {
            const bLevel = parseInt(b.getAttribute('data-level'));
            const bComp = b.getAttribute('data-comp');
            const bTarget = b.getAttribute('data-target');
            if (bComp === String(compId) && bTarget === String(targetId)) {
                b.className = `btn btn-sm level-btn ${bLevel === level ? `btn-${LEVEL_COLORS[bLevel]}` : 'btn-outline-secondary'}`;
            }
        });
        // Update level description hint
        const hintEl = card.querySelector('.level-desc-hint');
        if (hintEl) {
            const comp = (window._evalCurrentProjectCompetences || []).find(c => String(c.id) === String(compId));
            const levelDescs = (comp?.levels || []).reduce((acc, l) => { acc[l.level] = l.description; return acc; }, {});
            hintEl.textContent = (level > 0 && levelDescs[level]) ? levelDescs[level] : '';
        }
    }
}

function removeEvalCompetence(targetId, compId) {
    if (!window._evalRemovedComps) window._evalRemovedComps = {};
    if (!window._evalRemovedComps[String(targetId)]) window._evalRemovedComps[String(targetId)] = [];
    if (!window._evalRemovedComps[String(targetId)].includes(String(compId))) {
        window._evalRemovedComps[String(targetId)].push(String(compId));
    }

    // Also remove from saved evaluations in memory so it won't be persisted
    const saved = window._evalCurrentSaved;
    if (saved) {
        const evalEntry = (saved.evaluations || []).find(e => e.targetId === String(targetId));
        if (evalEntry) {
            evalEntry.competences = (evalEntry.competences || []).filter(c => String(c.competenceId) !== String(compId));
        }
    }

    // Re-render only the card — find the card and remove it from DOM
    const card = document.querySelector(`.eval-comp-card[data-comp-id="${CSS.escape(String(compId))}"][data-target-id="${CSS.escape(String(targetId))}"]`);
    if (card) {
        card.style.transition = 'opacity .2s';
        card.style.opacity = '0';
        setTimeout(() => card.remove(), 200);
    }
}

function _resolveTargetName(targetId) {
    const { students } = window._evalState;
    const st = students.find(s => String(s.id || s._id) === String(targetId));
    if (st) return ((st.name || '') + ' ' + (st.lastname || '')).trim();
    // fallback: it's a group name
    return targetId;
}

async function saveProjectEvaluation() {
    const saveBtn = document.getElementById('eval-modal-save-btn');
    const originalBtnHtml = saveBtn ? saveBtn.innerHTML : '';
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Guardando...`;
    }

    try {
        const saved = window._evalCurrentSaved;
        const { modules, savedEvaluations, students } = window._evalState;
        const mIdx = window._evalState.currentModuleIdx;
        const pIdx = window._evalState.currentProjectIdx;
        if (saved == null || mIdx == null || pIdx == null) {
            if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = originalBtnHtml; }
            return;
        }

        const mod = modules[mIdx];
        const proj = mod.projects[pIdx];
        const modId = mod.id || String(mIdx);

        // Collect feedback from textareas
        document.querySelectorAll('#eval-modal-body textarea[data-target-id]').forEach(ta => {
            const targetId = ta.getAttribute('data-target-id');
            if (!targetId) return;
            // Skip the student-comment textarea — handled separately below
            if (ta.getAttribute('data-student-comment') === 'true') return;

            let evalEntry = (saved.evaluations || []).find(e => e.targetId === targetId);
            if (!evalEntry) {
                if (!saved.evaluations) saved.evaluations = [];
                evalEntry = { targetId, targetName: _resolveTargetName(targetId), competences: [], feedback: '' };
                saved.evaluations.push(evalEntry);
            }
            evalEntry.feedback = ta.value;
            evalEntry.evaluatedAt = new Date().toISOString();
        });

        // Merge into savedEvaluations state
        const existingIdx = savedEvaluations.findIndex(e => e.moduleId === modId && e.projectName === proj.name);
        if (existingIdx >= 0) {
            window._evalState.savedEvaluations[existingIdx] = saved;
        } else {
            window._evalState.savedEvaluations.push(saved);
        }

        await _persistEvaluations();

        // ── Sync individual evaluations → student technicalTracking ──────────────
        if (saved.type === 'individual') {
            await _syncEvaluationsToStudentTracking(saved, mod, proj, students);
        }

        bootstrap.Modal.getInstance(document.getElementById('evaluationModal'))?.hide();
        renderEvaluationTab();
        showToast('Evaluación guardada correctamente', 'success');

        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = originalBtnHtml; }
    } catch (err) {
        console.error('[saveProjectEvaluation]', err);
        showToast('Error al guardar la evaluación', 'danger');
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = originalBtnHtml; }
    }
}

/**
 * Syncs a saved individual evaluation into each student's technicalTracking:
 * - Merges competence levels into technicalTracking.competences
 * - Upserts a teams entry with the evaluation feedback and student comment
 */
async function _syncEvaluationsToStudentTracking(saved, mod, proj, students) {
    const token = localStorage.getItem('token');
    const LEVEL_LABELS_SYNC = { 0: 'Sin nivel', 1: 'Básico', 2: 'Medio', 3: 'Avanzado' };

    for (const evalEntry of (saved.evaluations || [])) {
        const student = students.find(s => String(s.id || s._id) === String(evalEntry.targetId));
        if (!student) continue;
        const studentId = student.id || student._id;

        try {
            // Fetch fresh student data
            const sRes = await fetch(`${API_URL}/api/promotions/${promotionId}/students/${studentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!sRes.ok) continue;
            const sData = await sRes.json();

            const tt = sData.technicalTracking || {};

            // ── Merge competence levels ──────────────────────────────────────
            const existingComps = (tt.competences || []).map(c => ({ ...c }));
            for (const ce of (evalEntry.competences || [])) {
                if (!ce.competenceName) continue;
                const idx = existingComps.findIndex(c => String(c.competenceId) === String(ce.competenceId));

                // Extract indicators achieved from checkedIndicators
                // ce.checkedIndicators is flat { [indKey]: bool } stored at comp level
                const compChecked = ce.checkedIndicators || evalEntry.checkedIndicators?.[String(ce.competenceId)] || {};
                const projComp = (window._evalCurrentProjectCompetences || []).find(c => String(c.id) === String(ce.competenceId));
                const toolsWithInds = projComp?.toolsWithIndicators || [];
                const compIndicators = projComp?.competenceIndicators || { initial: [], medio: [], advance: [] };

                // Build achieved indicators list: [{type, toolName, indicatorName, indicatorId, levelId}]
                // Now includes BOTH tool indicators and competence indicators
                const achievedIndicators = [];

                // Add tool indicators (for technical tracking)
                toolsWithInds.forEach(t => {
                    if (!t.indicators) return;
                    t.indicators.forEach(ind => {
                        if (compChecked[`tool-${t.id}-${ind.id}`]) {
                            achievedIndicators.push({
                                type: 'tool',
                                toolName: t.name,
                                indicatorName: ind.name,
                                indicatorId: String(ind.id),
                                levelId: ind.levelId || 1
                            });
                        }
                    });
                });

                // Add competence indicators (for competence level assessment)
                [
                    { lvl: 1, inds: compIndicators.initial },
                    { lvl: 2, inds: compIndicators.medio },
                    { lvl: 3, inds: compIndicators.advance }
                ].forEach(({ lvl, inds }) => {
                    if (!inds) return;
                    inds.forEach(ind => {
                        if (compChecked[`comp-${ind.id}`]) {
                            achievedIndicators.push({
                                type: 'competence',
                                indicatorName: ind.name,
                                indicatorId: String(ind.id),
                                levelId: lvl
                            });
                        }
                    });
                });

                // Tools used (only those with tool indicators)
                const toolsUsed = toolsWithInds
                    .filter(t => t.indicators && t.indicators.some(ind => compChecked[`tool-${t.id}-${ind.id}`]))
                    .map(t => t.name);

                const entry = {
                    competenceId: ce.competenceId,
                    competenceName: ce.competenceName,
                    level: ce.level,
                    toolsUsed,
                    achievedIndicators,
                    evaluatedDate: new Date().toISOString().split('T')[0],
                    notes: evalEntry.feedback || ''
                };
                if (idx >= 0) existingComps[idx] = { ...existingComps[idx], ...entry };
                else existingComps.push(entry);
            }

            // ── Upsert teams entry ───────────────────────────────────────────
            const existingTeams = (tt.teams || []).map(t => ({ ...t }));
            const teamIdx = existingTeams.findIndex(
                t => t.teamName === (proj.name || '') && t.moduleId === (mod.id || String(window._evalState.currentModuleIdx))
            );

            // Build competences list for team entry with tools + indicators
            const teamCompetences = (evalEntry.competences || []).map(ce => {
                const compChecked = ce.checkedIndicators || evalEntry.checkedIndicators?.[String(ce.competenceId)] || {};
                const projComp = (window._evalCurrentProjectCompetences || []).find(c => String(c.id) === String(ce.competenceId));
                const toolsWithInds = projComp?.toolsWithIndicators || [];
                const compIndicators = projComp?.competenceIndicators || { initial: [], medio: [], advance: [] };
                const toolsUsed = toolsWithInds
                    .filter(t => t.indicators && t.indicators.some(ind => compChecked[`tool-${t.id}-${ind.id}`]))
                    .map(t => t.name);
                const achievedIndicators = [];

                // Add tool indicators
                toolsWithInds.forEach(t => {
                    if (!t.indicators) return;
                    t.indicators.forEach(ind => {
                        if (compChecked[`tool-${t.id}-${ind.id}`]) {
                            achievedIndicators.push({
                                type: 'tool',
                                toolName: t.name,
                                indicatorName: ind.name,
                                indicatorId: String(ind.id),
                                levelId: ind.levelId || 1
                            });
                        }
                    });
                });

                // Add competence indicators
                [
                    { lvl: 1, inds: compIndicators.initial },
                    { lvl: 2, inds: compIndicators.medio },
                    { lvl: 3, inds: compIndicators.advance }
                ].forEach(({ lvl, inds }) => {
                    if (!inds) return;
                    inds.forEach(ind => {
                        if (compChecked[`comp-${ind.id}`]) {
                            achievedIndicators.push({
                                type: 'competence',
                                indicatorName: ind.name,
                                indicatorId: String(ind.id),
                                levelId: lvl
                            });
                        }
                    });
                });

                return {
                    competenceId: ce.competenceId,
                    competenceName: ce.competenceName,
                    level: ce.level,
                    toolsUsed,
                    achievedIndicators
                };
            });

            const teamEntry = {
                teamName: proj.name || '',
                projectType: 'individual',
                role: '',
                moduleName: mod.name || '',
                moduleId: mod.id || String(window._evalState.currentModuleIdx),
                assignedDate: new Date().toISOString().split('T')[0],
                teacherNote: evalEntry.feedback || '',
                studentComment: evalEntry.studentComment || '',
                members: [],
                competences: teamCompetences
            };
            if (teamIdx >= 0) existingTeams[teamIdx] = { ...existingTeams[teamIdx], ...teamEntry };
            else existingTeams.push(teamEntry);

            // ── Auto-calculate module progress ───────────────────────────────
            const allModules = window._evalState?.modules || [];
            const updatedCompletedModules = (tt.completedModules || []).map(m => ({ ...m }));

            allModules.forEach(module => {
                const mid = String(module.id || '');
                const totalProjects = (module.projects || []).length;
                if (totalProjects === 0) return; // skip modules with no projects

                // Count unique evaluated project names for this module in the student's teams
                const evaluatedProjectNames = new Set(
                    existingTeams
                        .filter(t => String(t.moduleId) === mid)
                        .map(t => t.teamName)
                );
                const evaluatedCount = evaluatedProjectNames.size;
                const progressPct = Math.round((evaluatedCount / totalProjects) * 100);

                if (evaluatedCount === 0) return; // don't create entry if nothing evaluated yet

                // Compute average competence level for modules with evaluated projects
                const moduleTeams = existingTeams.filter(t => String(t.moduleId) === mid);
                const allLevels = moduleTeams.flatMap(t => (t.competences || []).map(c => c.level)).filter(l => l > 0);
                const avgLevel = allLevels.length
                    ? Math.round(allLevels.reduce((a, b) => a + b, 0) / allLevels.length)
                    : 0;
                // Map 0-3 team level → 1-4 module grade: 0→1, 1→2, 2→3, 3→4
                const autoGrade = Math.min(4, avgLevel + 1);

                const existingIdx = updatedCompletedModules.findIndex(cm => String(cm.moduleId) === mid);
                const today = new Date().toISOString().split('T')[0];
                const totalCourses = (module.courses || []).length;
                const completedNotes = `${evaluatedCount}/${totalProjects} proyectos evaluados${totalCourses > 0 ? `, ${totalCourses} cursos` : ''}`;

                const entry = {
                    moduleId: mid,
                    moduleName: module.name || '',
                    progressPercent: progressPct,
                    finalGrade: existingIdx >= 0 && updatedCompletedModules[existingIdx].finalGrade
                        ? updatedCompletedModules[existingIdx].finalGrade
                        : autoGrade,
                    completionDate: progressPct >= 100 ? today : (existingIdx >= 0 ? updatedCompletedModules[existingIdx].completionDate : ''),
                    notes: completedNotes,
                    // Preserve existing completedCourses so course checkboxes in the ficha are not lost
                    completedCourses: existingIdx >= 0
                        ? (updatedCompletedModules[existingIdx].completedCourses || [])
                        : []
                };

                if (existingIdx >= 0) {
                    updatedCompletedModules[existingIdx] = { ...updatedCompletedModules[existingIdx], ...entry };
                } else {
                    updatedCompletedModules.push(entry);
                }
            });

            // ── Persist to student ficha ─────────────────────────────────────
            await fetch(`${API_URL}/api/promotions/${promotionId}/students/${studentId}/ficha/technical`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    teacherNotes: tt.teacherNotes || [],
                    teams: existingTeams,
                    competences: existingComps,
                    completedModules: updatedCompletedModules,
                    completedPildoras: tt.completedPildoras || []
                })
            });
        } catch (e) {
            console.error(`[Eval] Error syncing to student ${studentId}:`, e);
        }
    }
}

/** Deletes a specific student evaluation from the current project and re-renders */
window.deleteStudentEvaluation = function (targetId) {
    const saved = window._evalCurrentSaved;
    if (!saved) return;
    if (!confirm('¿Eliminar la evaluación de este estudiante?')) return;

    saved.evaluations = (saved.evaluations || []).filter(e => String(e.targetId) !== String(targetId));

    // Remove from DOM immediately
    const row = document.getElementById(`saved-eval-${CSS.escape(String(targetId))}`);
    if (row) { row.style.transition = 'opacity .2s'; row.style.opacity = '0'; setTimeout(() => row.remove(), 200); }

    // Update the count badge
    const title = document.getElementById('eval-modal-title');
    const doneEvals = saved.evaluations || [];
    const students = window._evalState.students;
    // Refresh the whole modal body
    const mIdx = window._evalState.currentModuleIdx;
    const pIdx = window._evalState.currentProjectIdx;
    openEvaluationModal(mIdx, pIdx);
};

/** Loads a student's existing evaluation into the sub-modal for editing */
window.editStudentEvaluation = function (targetId) {
    const saved = window._evalCurrentSaved;
    if (!saved) return;
    // Restore removed competences for this target so they appear again
    if (window._evalRemovedComps) delete window._evalRemovedComps[String(targetId)];
    // Also restore removed tools for this target
    if (window._evalRemovedTools && window._evalRemovedTools[String(targetId)]) {
        delete window._evalRemovedTools[String(targetId)];
    }
    // Also update the student select if it exists
    const sel = document.getElementById('eval-student-select');
    if (sel) sel.value = targetId;
    _openStudentEvalSubModalFor(targetId);
};

async function _persistEvaluations() {
    const token = localStorage.getItem('token');
    const body = JSON.stringify({ projectEvaluations: window._evalState.savedEvaluations });

    try {
        const res = await fetch(`${API_URL}/api/promotions/${promotionId}/extended-info`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body
        });
        if (!res.ok) {
            const err = await res.json();
            console.error('Error saving evaluations:', err);
        }
    } catch (err) {
        console.error('Error persisting evaluations:', err);
    }
}

function showToast(message, type = 'info') {
    // Create a simple Bootstrap toast
    const id = 'toast-' + Date.now();
    const bg = type === 'success' ? 'bg-success' : type === 'danger' ? 'bg-danger' : 'bg-primary';
    const toastHtml = `<div id="${id}" class="toast align-items-center text-white ${bg} border-0 position-fixed bottom-0 end-0 m-3" role="alert" style="z-index:9999">
        <div class="d-flex">
            <div class="toast-body">${escapeHtml(message)}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', toastHtml);
    const toastEl = document.getElementById(id);
    const t = new bootstrap.Toast(toastEl, { delay: 3000 });
    t.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

// ==================== SYLLABUS PDF (PROMOCIÓN ACTIVA) ====================

/**
 * Descarga el Syllabus PDF de la promoción activa.
 * Combina los datos de window.currentPromotion y extendedInfoData.
 */
function downloadPromotionSyllabus() {
    const promotion = window.currentPromotion;
    if (!promotion) {
        alert('Aún no se han cargado los datos de la promoción. Espera un momento e inténtalo de nuevo.');
        return;
    }
    if (!window.SyllabusPDF) {
        alert('El módulo de generación no está disponible. Recarga la página.');
        return;
    }

    // El modal de selección de formato lo muestra SyllabusPDF internamente
    SyllabusPDF.fromPromotion(promotion, extendedInfoData || {});
}
