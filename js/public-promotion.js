const API_URL = window.APP_CONFIG?.API_URL || window.location.origin;
let promotionId = null;
let passwordModal = null;
let promotionHasPassword = false;
let isAccessVerified = false;
let isPreviewMode = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    promotionId = params.get('id');
    isPreviewMode = params.get('preview') === '1';
    const passwordFromUrl = params.get('pwd');

    if (!promotionId) {
        document.body.innerHTML = '<div class="alert alert-danger m-5">Promotion not found</div>';
        return;
    }

    // Initialize password modal (student access mode only)
    const modalEl = document.getElementById('passwordModal');
    if (modalEl) {
        passwordModal = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false });
    }

    if (isPreviewMode) {
        // In preview mode (from teacher overview), bypass password and tracking
        loadPromotionContent();
    } else if (passwordFromUrl) {
        // Auto-verify with password from URL
        autoVerifyPassword(passwordFromUrl);
    } else {
        // Check if promotion requires password
        checkPasswordRequirement();
    }
});

async function autoVerifyPassword(password) {
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/verify-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        const contentType = response.headers.get('content-type');
        let data;
        try {
            data = contentType && contentType.includes('application/json')
                ? await response.json()
                : {};
        } catch (parseError) {
            console.error('Error parsing response:', parseError);
            // Fall back to checking password requirement
            checkPasswordRequirement();
            return;
        }

        if (response.ok) {
            // Store access token in session storage for security
            sessionStorage.setItem('promotionAccessToken', data.accessToken);
            sessionStorage.setItem('promotionId', promotionId);
            isAccessVerified = true;

            // Load content directly without showing modal
            loadPromotionContent();
        } else {
            // Invalid password from URL, check requirements normally
            console.error('Auto-verification failed:', response.status, data);
            checkPasswordRequirement();
        }
    } catch (error) {
        console.error('Auto-verification error:', error);
        // Fall back to checking password requirement
        checkPasswordRequirement();
    }
}

//visibility password
function togglePasswordVisibility() {
    const input = document.getElementById('access-password');
    const icon = document.getElementById('togglePasswordIcon');

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('bi-eye', 'bi-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('bi-eye-slash', 'bi-eye');
    }
}

async function checkPasswordRequirement() {
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}`);

        if (response.ok) {
            const promotion = await response.json();
            promotionHasPassword = !!promotion.accessPassword;

            if (promotionHasPassword && !isAccessVerified) {
                // Show password modal
                if (passwordModal) {
                    passwordModal.show();
                }
            } else {
                // Load promotion content
                loadPromotionContent();
            }
        }
    } catch (error) {
        console.error('Error checking password requirement:', error);
    }
}

// Verify promotion password
window.verifyPromotionPassword = async function () {
    const password = document.getElementById('access-password').value;
    const alertEl = document.getElementById('password-alert');
    const btnSpinner = document.querySelector('.modal-footer .spinner-border');

    if (!password) {
        alertEl.textContent = 'Please enter the password';
        alertEl.classList.remove('hidden');
        return;
    }

    alertEl.classList.add('hidden');
    btnSpinner.classList.remove('hidden');

    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/verify-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        const contentType = response.headers.get('content-type');
        let data;
        try {
            data = contentType && contentType.includes('application/json')
                ? await response.json()
                : {};
        } catch (parseError) {
            console.error('Error parsing response:', parseError);
            alertEl.textContent = 'Invalid server response. Please try again.';
            alertEl.classList.remove('hidden');
            btnSpinner.classList.add('hidden');
            return;
        }

        if (response.ok) {
            // Store access token in session storage (not localStorage) for security
            sessionStorage.setItem('promotionAccessToken', data.accessToken);
            sessionStorage.setItem('promotionId', promotionId);

            isAccessVerified = true;

            // Hide modal and load content
            if (passwordModal) {
                passwordModal.hide();
            }

            // Load content after successful password verification
            loadPromotionContent();
        } else {
            const errorMsg = data.error || 'Invalid password. Please try again.';
            alertEl.textContent = errorMsg;
            alertEl.classList.remove('hidden');
            console.error('Password verification failed:', response.status, data);
        }
    } catch (error) {
        console.error('Password verification error:', error);
        alertEl.textContent = 'Connection error. Please try again.';
        alertEl.classList.remove('hidden');
    } finally {
        btnSpinner.classList.add('hidden');
    }
};

// ── Tab switching ──────────────────────────────────────────────────────────
function switchPublicTab(tab) {
    const progresoPanel = document.getElementById('tab-progreso');
    const infoPanel = document.getElementById('tab-info');
    const progresoBtn = document.getElementById('tab-progreso-btn');
    const infoBtn = document.getElementById('tab-info-btn');

    if (tab === 'progreso') {
        progresoPanel?.classList.remove('d-none');
        infoPanel?.classList.add('d-none');
        progresoBtn?.classList.add('active');
        infoBtn?.classList.remove('active');
    } else {
        infoPanel?.classList.remove('d-none');
        progresoPanel?.classList.add('d-none');
        infoBtn?.classList.add('active');
        progresoBtn?.classList.remove('active');
    }
}

// ── Progress bar ───────────────────────────────────────────────────────────
function renderProgressBar() {
    const promotion = window.publicPromotionData;
    const students = Array.isArray(window.publicStudents) ? window.publicStudents : [];

    const activeStudents = students.filter(s => !s.isWithdrawn && !s.withdrawn).length || students.length;

    let pct = 0, weeksDone = 0, weeksLeft = 0, totalWeeks = 0;

    if (promotion) {
        totalWeeks = promotion.weeks || 0;
        if (totalWeeks > 0 && promotion.startDate) {
            const start = new Date(promotion.startDate);
            const today = new Date();
            const msPerWeek = 7 * 24 * 60 * 60 * 1000;
            weeksDone = Math.max(0, Math.min(totalWeeks, Math.floor((today - start) / msPerWeek)));
            weeksLeft = Math.max(0, totalWeeks - weeksDone);
            pct = Math.round((weeksDone / totalWeeks) * 100);
        }
    }

    // Helper to update one set of bar + stats
    function _update(barId, totalId, doneId, leftId, totalWeeksId) {
        const bar = document.getElementById(barId);
        if (bar) {
            bar.style.width = pct + '%';
            bar.setAttribute('aria-valuenow', pct);
            bar.textContent = pct + '%';
        }
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        setVal(totalId, activeStudents || '—');
        setVal(doneId, weeksDone || '—');
        setVal(leftId, weeksLeft !== undefined ? weeksLeft : '—');
        setVal(totalWeeksId, totalWeeks || '—');
    }

    _update('pp-progress-bar',      'pp-stat-total',      'pp-stat-weeks-done',      'pp-stat-weeks-left',      'pp-stat-weeks-total');
    _update('pp-progress-bar-info', 'pp-info-stat-total', 'pp-info-stat-weeks-done', 'pp-info-stat-weeks-left', 'pp-info-stat-weeks-total');
}

// ── Next-Pildora notice ────────────────────────────────────────────────────
function _renderNextPildoraNotice(info) {
    const bodyEl = document.getElementById('pp-next-pildora-body');
    if (!bodyEl) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let nextPildora = null;
    let nextDate = null;

    // Module-based
    const modulesWithActualPildoras = Array.isArray(info.modulesPildoras)
        ? info.modulesPildoras.filter(mp => Array.isArray(mp.pildoras) && mp.pildoras.length > 0)
        : [];

    const allPildoras = modulesWithActualPildoras.length > 0
        ? modulesWithActualPildoras.flatMap(mp => mp.pildoras)
        : (Array.isArray(info.pildoras) ? info.pildoras : []);

    allPildoras.forEach(p => {
        if (!p.date || !p.date.trim()) return;
        const d = new Date(p.date);
        d.setHours(0, 0, 0, 0);
        if (d >= today && (!nextDate || d < nextDate)) {
            nextDate = d;
            nextPildora = p;
        }
    });

    if (!nextPildora) {
        bodyEl.innerHTML = '<em>Sin píldoras próximas.</em>';
        return;
    }

    const students = Array.isArray(nextPildora.students) && nextPildora.students.length
        ? nextPildora.students.map(s => `${(s.name || '').trim()} ${(s.lastname || '').trim()}`.trim()).join(', ')
        : '<em class="text-muted">Desierta — ¡apúntate!</em>';

    bodyEl.innerHTML = `
        <p class="mb-1"><strong>${escapeHtml(nextPildora.title || 'Píldora')}</strong></p>
        <p class="mb-1 small"><i class="bi bi-calendar2-event me-1"></i>${escapeHtml(nextPildora.date)}</p>
        ${nextPildora.mode ? `<p class="mb-1 small"><i class="bi bi-broadcast me-1"></i>${escapeHtml(nextPildora.mode)}</p>` : ''}
        <p class="mb-0 small"><i class="bi bi-person me-1"></i>${students}</p>
    `;
}

// ── Date helper ────────────────────────────────────────────────────────────
function _formatDateShort(dateStr) {
    if (!dateStr) return '';
    try {
        return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
}

async function loadPromotionContent() {
    await loadPromotion();
    // await loadModules(); // loadPromotion already calls generateGanttChart
    await loadQuickLinks();
    await loadSections();
    await loadCalendar();
    await loadPublicStudents(); // needed for progress bar and pildoras self-assign
    await loadExtendedInfo(); // Load Program Info after main promotion data
    await loadPublicPromoResources(); // Load published promotion resources
    renderProgressBar(); // render after both promotion and students are loaded
}

async function loadPromotion() {
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}`);

        if (response.ok) {
            const promotion = await response.json();
            document.getElementById('promotion-title').textContent = `¡Hola Coder! 👋 - ${promotion.name}`;
            document.title = `${promotion.name} - Bootcamp`;

            // Store promotion data globally for module access
            window.publicPromotionData = promotion;

            // Populate banner subtitles and info-tab title
            const titleEl = document.getElementById('promotion-title');
            if (titleEl) titleEl.textContent = `¡Hola Coder! 👋 - ${promotion.name}`;

            const infoTitle = document.getElementById('pp-info-title');
            if (infoTitle) infoTitle.textContent = promotion.name;

            const sub = promotion.startDate && promotion.endDate
                ? `${_formatDateShort(promotion.startDate)} → ${_formatDateShort(promotion.endDate)}`
                : '';
            const subEl = document.getElementById('pp-banner-sub');
            if (subEl) subEl.textContent = sub;
            const infoSub = document.getElementById('pp-info-sub');
            if (infoSub) infoSub.textContent = sub;

            document.title = `${promotion.name} - Bootcamp`;

            // Store promotion data globally for module access
            // window.publicPromotionData already set above

            generateGanttChart(promotion);
        }
    } catch (error) {
        console.error('Error loading promotion:', error);
    }
}

async function loadModules() {
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}`);

        if (response.ok) {
            const promotion = await response.json();
            generateGanttChart(promotion);
        }
    } catch (error) {
        console.error('Error loading modules:', error);
    }
}

function generateGanttChart(promotion) {
    const table = document.getElementById('gantt-table');
    table.innerHTML = '';

    const weeks = promotion.weeks || 0;
    const modules = promotion.modules || [];
    const employability = promotion.employability || [];

    if (modules.length === 0) {
        table.innerHTML = '<tr><td class="text-muted">No modules configured</td></tr>';
        return;
    }

    // Add responsive wrapper styling to the table
    table.style.fontSize = '0.75rem';
    table.className = 'table table-sm table-bordered';

    // Ensure parent container has proper overflow handling
    const tableContainer = table.closest('.table-responsive') || table.parentElement;
    if (tableContainer) {
        tableContainer.style.overflowX = 'auto';
        tableContainer.style.maxWidth = '100%';
    }

    // Helper function to get month for a week (1-indexed)
    function getMonthForWeek(weekNum) {
        return Math.ceil(weekNum / 4);
    }

    // Create month header
    const monthRow = document.createElement('tr');
    const monthHeaderCell = document.createElement('th');
    monthHeaderCell.innerHTML = '<strong>Meses</strong>';
    monthHeaderCell.style.minWidth = '150px';
    monthHeaderCell.style.maxWidth = '200px';
    monthHeaderCell.style.fontSize = '0.7rem';
    monthHeaderCell.style.textAlign = 'left';
    monthRow.appendChild(monthHeaderCell);

    let currentMonth = 0;
    let monthSpan = 0;
    let monthCell = null;

    for (let i = 1; i <= weeks; i++) {
        const month = getMonthForWeek(i);

        if (month !== currentMonth) {
            if (monthCell) {
                monthCell.colSpan = monthSpan;
            }
            currentMonth = month;
            monthCell = document.createElement('th');
            monthCell.innerHTML = `<strong>M${month}</strong>`;
            monthCell.style.textAlign = 'center';
            monthCell.style.fontSize = '0.65rem';
            monthCell.style.minWidth = '20px';
            monthCell.style.padding = '2px';
            monthRow.appendChild(monthCell);
            monthSpan = 1;
        } else {
            monthSpan++;
        }
    }
    if (monthCell) {
        monthCell.colSpan = monthSpan;
    }

    table.appendChild(monthRow);

    // Create week header
    const headerRow = document.createElement('tr');
    const weekHeaderCell = document.createElement('th');
    weekHeaderCell.innerHTML = 'Semanas:';
    weekHeaderCell.style.minWidth = '150px';
    weekHeaderCell.style.maxWidth = '200px';
    weekHeaderCell.style.fontSize = '0.7rem';
    weekHeaderCell.style.textAlign = 'left';
    headerRow.appendChild(weekHeaderCell);

    for (let i = 1; i <= weeks; i++) {
        const th = document.createElement('th');
        th.textContent = `${i}`;
        th.style.textAlign = 'center';
        th.style.fontSize = '0.6rem';
        th.style.minWidth = '20px';
        th.style.maxWidth = '25px';
        th.style.padding = '2px';
        th.style.writingMode = 'vertical-rl';
        th.style.textOrientation = 'mixed';
        headerRow.appendChild(th);
    }

    table.appendChild(headerRow);

    // Sesiones Empleabilidad — accordion header row + collapsible tbody (one row per session)
    // Only render if showEmployability is not explicitly set to false
    const showEmp = window._showEmployability !== false;
    if (showEmp && employability && employability.length > 0) {
        const empGroupId = 'employability-group';

        // Header row (acts as the accordion toggle)
        const headerRow = document.createElement('tr');
        headerRow.style.cursor = 'pointer';
        headerRow.setAttribute('data-bs-toggle', 'collapse');
        headerRow.setAttribute('data-bs-target', `#${empGroupId}`);
        headerRow.setAttribute('aria-expanded', 'false');
        headerRow.setAttribute('aria-controls', empGroupId);

        const headerLabel = document.createElement('td');
        headerLabel.innerHTML = `
            <div class="d-flex align-items-center">
                <button class="btn btn-link p-0 me-1" type="button" style="font-size: 0.7rem;">
                    <i class="bi bi-chevron-right" id="chevron-${empGroupId}"></i>
                </button>
                <strong style="font-size: 0.7rem;">Sesiones Empleabilidad</strong>
                <span class="badge bg-warning text-dark ms-2" style="font-size: 0.6rem;">${employability.length}</span>
            </div>
        `;
        headerLabel.style.minWidth = '150px';
        headerLabel.style.maxWidth = '200px';
        headerLabel.style.padding = '4px';
        headerLabel.style.textAlign = 'left';
        headerRow.appendChild(headerLabel);

        // Compute the overall span of all employability sessions to show on the header row
        const allStartWeeks = employability.map(e => (e.startMonth - 1) * 4);
        const allEndWeeks = employability.map(e => (e.startMonth - 1) * 4 + (e.duration * 4));
        const minStart = Math.min(...allStartWeeks);
        const maxEnd = Math.min(Math.max(...allEndWeeks), weeks);

        for (let i = 0; i < weeks; i++) {
            const cell = document.createElement('td');
            cell.style.textAlign = 'center';
            cell.style.height = '28px';
            cell.style.minWidth = '20px';
            cell.style.maxWidth = '25px';
            cell.style.padding = '1px';
            if (i >= minStart && i < maxEnd) {
                cell.style.backgroundColor = '#ffe082';
            }
            headerRow.appendChild(cell);
        }
        table.appendChild(headerRow);

        // Toggle chevron on expand/collapse
        headerRow.addEventListener('click', () => {
            const chevron = document.getElementById(`chevron-${empGroupId}`);
            const collapseEl = document.getElementById(empGroupId);
            const isExpanded = collapseEl.classList.contains('show');
            if (chevron) {
                chevron.style.transform = isExpanded ? '' : 'rotate(90deg)';
                chevron.style.transition = 'transform 0.2s';
            }
        });

        // Collapsible tbody — one row per session
        const collapseBody = document.createElement('tbody');
        collapseBody.className = 'collapse';
        collapseBody.id = empGroupId;

        employability.forEach((item) => {
            const itemRow = document.createElement('tr');
            const itemLabel = document.createElement('td');
            const itemUrl = item.url
                ? `<a href="${escapeHtml(item.url)}" target="_blank" class="text-decoration-none">${escapeHtml(item.name)}</a>`
                : escapeHtml(item.name);
            itemLabel.innerHTML = `<small style="margin-left: 1.5rem; font-size: 0.6rem;">${itemUrl}</small>`;
            itemLabel.style.minWidth = '150px';
            itemLabel.style.maxWidth = '200px';
            itemLabel.style.padding = '2px';
            itemLabel.style.textAlign = 'left';
            itemRow.appendChild(itemLabel);

            const startWeek = (item.startMonth - 1) * 4;
            const endWeek = startWeek + (item.duration * 4);

            for (let i = 0; i < weeks; i++) {
                const cell = document.createElement('td');
                cell.style.textAlign = 'center';
                cell.style.height = '22px';
                cell.style.minWidth = '20px';
                cell.style.maxWidth = '25px';
                cell.style.padding = '1px';
                cell.style.fontSize = '0.7rem';
                if (i >= startWeek && i < endWeek) {
                    cell.style.backgroundColor = '#fff3cd';
                }
                itemRow.appendChild(cell);
            }
            collapseBody.appendChild(itemRow);
        });

        table.appendChild(collapseBody);
    }

    // Create rows for modules (below Sesiones Empleabilidad)
    let weekCounter = 0;
    modules.forEach((module, index) => {
        const moduleId = `module-${index}`;

        // Main module row with dropdown toggle
        const row = document.createElement('tr');
        const nameCell = document.createElement('td');
        nameCell.innerHTML = `
            <div class="d-flex align-items-center">
                <button class="btn btn-link p-0 me-1" type="button" data-bs-toggle="collapse" data-bs-target="#${moduleId}" aria-expanded="false" style="font-size: 0.7rem;">
                    <i class="bi bi-chevron-right" id="chevron-${moduleId}"></i>
                </button>
                <strong style="font-size: 0.7rem;">M${index + 1}: ${escapeHtml(module.name)}</strong>
            </div>
        `;
        nameCell.style.minWidth = '150px';
        nameCell.style.maxWidth = '200px';
        nameCell.style.padding = '4px';
        nameCell.style.textAlign = 'left';
        row.appendChild(nameCell);

        for (let i = 0; i < weeks; i++) {
            const cell = document.createElement('td');
            cell.style.textAlign = 'center';
            cell.style.height = '30px';
            cell.style.minWidth = '20px';
            cell.style.maxWidth = '25px';
            cell.style.padding = '1px';
            cell.style.fontSize = '0.7rem';

            if (i >= weekCounter && i < weekCounter + module.duration) {
                cell.style.backgroundColor = '#667eea';
                cell.style.color = 'white'
            }

            row.appendChild(cell);
        }

        table.appendChild(row);

        // Create collapsible section for courses and projects
        const hasSubItems = (module.courses && module.courses.length > 0) || (module.projects && module.projects.length > 0);

        if (hasSubItems) {
            const collapseContainer = document.createElement('tbody');
            collapseContainer.className = 'collapse';
            collapseContainer.id = moduleId;

            // Create rows for courses
            if (module.courses && module.courses.length > 0) {
                module.courses.forEach(courseObj => {
                    const isObj = courseObj && typeof courseObj === 'object';
                    const courseName = isObj ? (courseObj.name || 'Unnamed') : String(courseObj);
                    const courseUrl = isObj ? (courseObj.url || '') : '';
                    const courseDur = isObj ? (Number(courseObj.duration) || 1) : 1;
                    const courseOff = isObj ? (Number(courseObj.startOffset) || 0) : 0;

                    const coursesRow = document.createElement('tr');
                    const coursesLabel = document.createElement('td');
                    const courseLink = courseUrl ? `<a href="${escapeHtml(courseUrl)}" target="_blank" class="text-decoration-none"> ${escapeHtml(courseName)}</a>` : ` ${escapeHtml(courseName)}`;
                    coursesLabel.innerHTML = `<small style="margin-left: 1.5rem; font-size: 0.6rem;">${courseLink}</small>`;
                    coursesLabel.style.minWidth = '150px';
                    coursesLabel.style.maxWidth = '200px';
                    coursesLabel.style.padding = '2px';
                    coursesLabel.style.textAlign = 'left';
                    coursesRow.appendChild(coursesLabel);

                    const absoluteStart = weekCounter + courseOff;
                    const absoluteEnd = absoluteStart + courseDur;

                    for (let i = 0; i < weeks; i++) {
                        const cell = document.createElement('td');
                        cell.style.minWidth = '20px';
                        cell.style.maxWidth = '25px';
                        cell.style.padding = '1px';
                        cell.style.height = '20px';
                        cell.style.fontSize = '0.6rem';
                        if (i >= absoluteStart && i < absoluteEnd) {
                            cell.style.backgroundColor = '#d1e7dd';

                        }
                        coursesRow.appendChild(cell);
                    }
                    collapseContainer.appendChild(coursesRow);
                });
            }

            // Create rows for projects
            if (module.projects && module.projects.length > 0) {
                module.projects.forEach(projectObj => {
                    const isObj = projectObj && typeof projectObj === 'object';
                    const projectName = isObj ? (projectObj.name || 'Unnamed') : String(projectObj);
                    const projectUrl = isObj ? (projectObj.url || '') : '';
                    const projectDur = isObj ? (Number(projectObj.duration) || 1) : 1;
                    const projectOff = isObj ? (Number(projectObj.startOffset) || 0) : 0;

                    const projectsRow = document.createElement('tr');
                    const projectsLabel = document.createElement('td');
                    const projectLink = escapeHtml(projectName); // links disabled on public roadmap
                    projectsLabel.innerHTML = `<small style="margin-left: 1.5rem; font-size: 0.6rem;"> ${projectLink}</small>`;
                    projectsLabel.style.minWidth = '150px';
                    projectsLabel.style.maxWidth = '200px';
                    projectsLabel.style.padding = '2px';
                    projectsLabel.style.textAlign = 'left';
                    projectsRow.appendChild(projectsLabel);

                    const absoluteStart = weekCounter + projectOff;
                    const absoluteEnd = absoluteStart + projectDur;

                    for (let i = 0; i < weeks; i++) {
                        const cell = document.createElement('td');
                        cell.style.minWidth = '20px';
                        cell.style.maxWidth = '25px';
                        cell.style.padding = '1px';
                        cell.style.height = '20px';
                        cell.style.fontSize = '0.6rem';
                        if (i >= absoluteStart && i < absoluteEnd) {
                            cell.style.backgroundColor = '#fce4e4';

                        }
                        projectsRow.appendChild(cell);
                    }
                    collapseContainer.appendChild(projectsRow);
                });
            }

            table.appendChild(collapseContainer);

            // Add event listener for chevron rotation
            const toggleButton = nameCell.querySelector(`[data-bs-target="#${moduleId}"]`);
            const chevron = document.getElementById(`chevron-${moduleId}`);

            toggleButton.addEventListener('click', function () {
                setTimeout(() => {
                    if (collapseContainer.classList.contains('show')) {
                        chevron.className = 'bi bi-chevron-down';
                    } else {
                        chevron.className = 'bi bi-chevron-right';
                    }
                }, 10);
            });
        }

        // Correct position for weekCounter update
        weekCounter += module.duration;
    });
}

async function loadQuickLinks() {
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/quick-links`);

        if (response.ok) {
            const links = await response.json();
            displayQuickLinks(links);
        }
    } catch (error) {
        console.error('Error loading quick links:', error);
    }
}

function displayQuickLinks(links) {
    const list = document.getElementById('quick-links-list');
    list.innerHTML = '';

    if (!links || links.length === 0) {
        document.getElementById('quick-links').classList.add('hidden');
        return;
    }

    document.getElementById('quick-links').classList.remove('hidden');

    links.forEach(link => {
        // Determine icon and color based on platform or name
        let icon = 'bi-box-arrow-up-right';
        let color = 'var(--principal-1)';
        const name = (link.name || '').toLowerCase();
        const platform = (link.platform || '').toLowerCase();

        if (platform === 'zoom' || name.includes('zoom')) {
            icon = 'bi-camera-video';
            color = '#2D8CFF';
        } else if (platform === 'discord' || name.includes('discord')) {
            icon = 'bi-discord';
            color = '#5865F2';
        } else if (platform === 'github' || name.includes('github')) {
            icon = 'bi-github';
            color = '#333';
        } else if (name.includes('meet') || name.includes('google meet')) {
            icon = 'bi-google';
            color = '#ea4335';
        }

        const card = document.createElement('div');
        card.className = 'quick-action-card';
        card.innerHTML = `
            <a href="${escapeHtml(link.url)}" 
               target="_blank" 
               rel="noopener noreferrer"
               title="${escapeHtml(link.name)}"
               class="quick-action-link">
                <div class="quick-action-icon" style="color: ${color};">
                    <i class="bi ${icon}"></i>
                </div>
                <div class="quick-action-label">${escapeHtml(link.name)}</div>
            </a>
        `;
        list.appendChild(card);
    });
}

async function loadSections() {
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/sections`);

        if (response.ok) {
            const sections = await response.json();
            displaySections(sections);
        }
    } catch (error) {
        console.error('Error loading sections:', error);
    }
}

function displaySections(sections) {
    const container = document.getElementById('sections-container');
    container.innerHTML = '';

    sections.forEach((section, index) => {
        const col = document.createElement('div');
        col.className = 'col-md-12';
        col.id = section.id;
        col.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title section-title">
                        <i class="bi bi-file-text me-2"></i> ${escapeHtml(section.title)}
                    </h5>
                    <p class="card-text">${escapeHtml(section.content).replace(/\n/g, '<br>')}</p>
                </div>
            </div>
        `;
        container.appendChild(col);
    });

    // Update sidebar navigation
    updateSidebar(sections);
}

function updateSidebar(sections) {
    const nav = document.getElementById('sidebar-nav');
    nav.innerHTML = '';

    // Only show Roadmap if there are modules configured
    const hasModules = window.publicPromotionData &&
        Array.isArray(window.publicPromotionData.modules) &&
        window.publicPromotionData.modules.length > 0;
    if (hasModules) {
        nav.innerHTML = `<li class="nav-item"><a class="nav-link" href="#roadmap" onclick="closeAulaVirtualPage()"><i class="bi bi-map me-2"></i>Roadmap</a></li>`;
    }

    sections.forEach(section => {
        const li = document.createElement('li');
        li.className = 'nav-item';
        li.innerHTML = `<a class="nav-link" href="#${section.id}" onclick="closeAulaVirtualPage()"><i class="bi bi-file-text me-2"></i>${escapeHtml(section.title)}</a>`;
        nav.appendChild(li);
    });

    // Note: Program Info sections will be added by updateSidebarWithExtendedInfo()

    // const li = document.createElement('li');
    // li.className = 'nav-item';
    // li.innerHTML = '<a class="nav-link" href="#quick-links" onclick="closeAulaVirtualPage()"><i class="bi bi-lightning-charge me-2"></i>Quick Links</a>';
    // nav.appendChild(li);
}

// Update sidebar with only the Program Info sections that have data
function updateSidebarWithExtendedInfo(info) {
    const nav = document.getElementById('sidebar-nav');
    if (!nav) {
        console.error('Sidebar navigation not found');
        return;
    }

    //console.log('Updating sidebar with extended info:', info);

    // Find roadmap item as reference point for píldoras
    const roadmapAnchor = nav.querySelector('a[href="#roadmap"]');
    const roadmapItem = roadmapAnchor ? roadmapAnchor.parentElement : null;

    // Find Quick Links item as reference point for other sections
    const quickLinksAnchor = nav.querySelector('a[href="#quick-links"]');
    const quickLinksItem = quickLinksAnchor ? quickLinksAnchor.parentElement : null;

    //console.log('Roadmap item found:', !!roadmapItem);
    //console.log('Quick links item found:', !!quickLinksItem);

    // Add Píldoras right after Roadmap if they exist
    if ((Array.isArray(info.pildoras) && info.pildoras.length > 0) ||
        (Array.isArray(info.modulesPildoras) && info.modulesPildoras.some(mp => Array.isArray(mp.pildoras) && mp.pildoras.length > 0))) {
        //console.log('Adding pildoras section to sidebar right after roadmap');
        const pildorasLi = document.createElement('li');
        pildorasLi.className = 'nav-item';
        pildorasLi.innerHTML = '<a class="nav-link" href="#pildoras-wrapper" onclick="switchPublicTab(\'progreso\')"><i class="bi bi-lightbulb me-2"></i>Píldoras</a>';

        if (roadmapItem) {
            roadmapItem.insertAdjacentElement('afterend', pildorasLi);
        } else if (quickLinksItem) {
            nav.insertBefore(pildorasLi, quickLinksItem);
        } else {
            nav.appendChild(pildorasLi);
        }

        // Add Calendar right after Píldoras, but only if a Google Calendar was configured
        if (window._calendarConfigured) {
            const calendarLi = document.createElement('li');
            calendarLi.className = 'nav-item';
            calendarLi.innerHTML = '<a class="nav-link" href="#calendar" onclick="switchPublicTab(\'progreso\')"><i class="bi bi-calendar me-2"></i>Calendario</a>';
            pildorasLi.insertAdjacentElement('afterend', calendarLi);
        }
    } else if (window._calendarConfigured) {
        // No pildoras but calendar exists — insert after Roadmap or at top
        const calendarLi = document.createElement('li');
        calendarLi.className = 'nav-item';
        calendarLi.innerHTML = '<a class="nav-link" href="#calendar" onclick="switchPublicTab(\'progreso\')"><i class="bi bi-calendar me-2"></i>Calendario</a>';
        if (roadmapItem) {
            roadmapItem.insertAdjacentElement('afterend', calendarLi);
        } else if (quickLinksItem) {
            nav.insertBefore(calendarLi, quickLinksItem);
        } else {
            nav.appendChild(calendarLi);
        }
    }

    // Aula Virtual sidebar entry is added later by loadVirtualClassroom() only when there is an active project

    // Add other Program Info sections before Quick Links
    if (info.schedule && hasScheduleData(info.schedule)) {
        //console.log('Adding schedule section to sidebar');
        const li = document.createElement('li');
        li.className = 'nav-item';
        li.innerHTML = '<a class="nav-link" href="#horario-wrapper" onclick="switchPublicTab(\'info\')"><i class="bi bi-clock me-2"></i>Horario</a>';

        if (quickLinksItem) {
            nav.insertBefore(li, quickLinksItem);
        } else {
            nav.appendChild(li);
        }
    }

    if (info.team && info.team.length > 0) {
        //console.log('Adding team section to sidebar');
        const li = document.createElement('li');
        li.className = 'nav-item';
        li.innerHTML = '<a class="nav-link" href="#equipo-wrapper" onclick="switchPublicTab(\'info\')"><i class="bi bi-people me-2"></i>Equipo</a>';

        if (quickLinksItem) {
            nav.insertBefore(li, quickLinksItem);
        } else {
            nav.appendChild(li);
        }
    }

    if (info.evaluation && info.evaluation.trim()) {
        //console.log('Adding evaluation section to sidebar');
        const li = document.createElement('li');
        li.className = 'nav-item';
        li.innerHTML = '<a class="nav-link" href="#evaluacion-wrapper" onclick="switchPublicTab(\'info\')"><i class="bi bi-clipboard-check me-2"></i>Evaluación</a>';

        if (quickLinksItem) {
            nav.insertBefore(li, quickLinksItem);
        } else {
            nav.appendChild(li);
        }
    }

    if (info.resources && info.resources.length > 0) {
        //console.log('Adding resources section to sidebar');
        const li = document.createElement('li');
        li.className = 'nav-item';
        li.innerHTML = '<a class="nav-link" href="#recursos-wrapper" onclick="switchPublicTab(\'progreso\')"><i class="bi bi-tools me-2"></i>Recursos</a>';

        if (quickLinksItem) {
            nav.insertBefore(li, quickLinksItem);
        } else {
            nav.appendChild(li);
        }
    }

    if (Array.isArray(info.competences) && info.competences.length > 0) {
        //console.log('Adding competences section to sidebar');
        const li = document.createElement('li');
        li.className = 'nav-item';
        li.innerHTML = '<a class="nav-link" href="#competences-section" onclick="switchPublicTab(\'info\')"><i class="bi bi-award me-2"></i>Competencias</a>';

        if (quickLinksItem) {
            nav.insertBefore(li, quickLinksItem);
        } else {
            nav.appendChild(li);
        }
    }
}

async function loadCalendar() {
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/calendar`);

        if (response.ok) {
            const calendar = await response.json();
            const calendarCard = document.getElementById('calendar-card');
            if (calendarCard) calendarCard.classList.remove('hidden');
            const iframe = document.getElementById('calendar-iframe');
            if (iframe) iframe.src = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendar.googleCalendarId)}&ctz=Europe/Madrid`;

            // Flag so that updateSidebarWithExtendedInfo knows calendar is configured
            window._calendarConfigured = true;
        }
    } catch (error) {
        console.error('Error loading calendar:', error);
    }
}

// ── Promotion Resources (public view — "En Progreso" tab) ─────────────────
const _PR_TYPE_META = {
    video:      { icon: 'bi-play-btn-fill',           color: '#dc3545', label: 'Vídeo' },
    repository: { icon: 'bi-github',                  color: '#212529', label: 'Repositorio' },
    canva:      { icon: 'bi-palette-fill',             color: '#7c3aed', label: 'Canva' },
    powerpoint: { icon: 'bi-file-earmark-slides-fill', color: '#e55a1c', label: 'PowerPoint' },
    other:      { icon: 'bi-paperclip',               color: '#6c757d', label: 'Recurso' }
};

async function loadPublicPromoResources() {
    try {
        const res = await fetch(`${API_URL}/api/promotions/${promotionId}/promotion-resources`);
        if (!res.ok) return;
        const resources = await res.json();
        renderPublicPromoResources(resources);
    } catch (err) {
        console.error('[loadPublicPromoResources] Error:', err);
    }
}

function renderPublicPromoResources(resources) {
    const wrapper = document.getElementById('recursos-wrapper');
    if (!wrapper) return;

    // Remove any previously injected promo-resources subsection to avoid duplicates on reload
    const existing = wrapper.querySelector('#promo-recursos-section');
    if (existing) existing.remove();

    if (!resources || resources.length === 0) return;

    // Group by module
    const grouped = {};
    resources.forEach(r => {
        const key = r.module || '__sin_modulo__';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(r);
    });

    // Build module-level accordion (each module is an accordion-item that expands to show resources)
    const outerAccId = 'pp-res-modules-acc';
    let modulesHtml = '';

    Object.entries(grouped).forEach(([moduleName, items], modIdx) => {
        const groupLabel = moduleName === '__sin_modulo__' ? 'Sin módulo' : escapeHtml(moduleName);
        const moduleItemId = `pp-res-mod-${modIdx}`;
        const innerAccId   = `pp-res-inner-${modIdx}`;

        // Inner accordion items — one per resource
        let innerHtml = '';
        items.forEach((r, rIdx) => {
            const meta = _PR_TYPE_META[r.type] || _PR_TYPE_META.other;
            const itemCollapseId = `pp-res-item-${modIdx}-${rIdx}`;

            innerHtml += `
                <div class="accordion-item border rounded mb-2">
                    <h2 class="accordion-header">
                        <button class="accordion-button collapsed py-2 px-3" type="button"
                                data-bs-toggle="collapse" data-bs-target="#${itemCollapseId}"
                                aria-expanded="false" aria-controls="${itemCollapseId}">
                            <div class="d-flex align-items-center gap-2 w-100 flex-wrap">
                                <i class="bi ${meta.icon}" style="color:${meta.color}; font-size:1.1rem; min-width:1.2rem;"></i>
                                <span class="fw-semibold flex-grow-1">${escapeHtml(r.title)}</span>
                                <span class="badge bg-light text-muted border" style="font-size:0.7rem;">${meta.label}</span>
                            </div>
                        </button>
                    </h2>
                    <div id="${itemCollapseId}" class="accordion-collapse collapse" data-bs-parent="#${innerAccId}">
                        <div class="accordion-body py-2 px-3">
                            ${r.description ? `<p class="text-muted small mb-2">${escapeHtml(r.description)}</p>` : ''}
                            <a href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer"
                               class="btn btn-sm btn-primary">
                                <i class="bi bi-box-arrow-up-right me-1"></i>Abrir recurso
                            </a>
                        </div>
                    </div>
                </div>`;
        });

        modulesHtml += `
            <div class="accordion-item border-0 mb-2">
                <h2 class="accordion-header">
                    <button class="accordion-button py-2 px-3 fw-semibold text-primary bg-light collapsed" type="button"
                            data-bs-toggle="collapse" data-bs-target="#${moduleItemId}"
                            aria-expanded="false" aria-controls="${moduleItemId}">
                        <i class="bi bi-folder2-open me-2"></i>${groupLabel}
                        <span class="badge bg-primary ms-2" style="font-size:0.7rem;">${items.length}</span>
                    </button>
                </h2>
                <div id="${moduleItemId}" class="accordion-collapse collapse" data-bs-parent="#${outerAccId}">
                    <div class="accordion-body py-2 px-2">
                        <div class="accordion" id="${innerAccId}">
                            ${innerHtml}
                        </div>
                    </div>
                </div>
            </div>`;
    });

    const section = document.createElement('div');
    section.id = 'promo-recursos-section';
    section.className = 'pp-section-card mb-4';
    section.innerHTML = `
        <div class="pp-section-header">
            <i class="bi bi-collection-play pp-section-header-icon"></i>
            <h5>Recursos de la Promoción</h5>
        </div>
        <div class="pp-section-body">
            <div class="accordion" id="${outerAccId}">
                ${modulesHtml}
            </div>
        </div>`;
    wrapper.appendChild(section);

    // Ensure a single "Recursos" sidebar entry pointing to recursos-wrapper
    const nav = document.getElementById('sidebar-nav');
    if (nav && !nav.querySelector('a[href="#recursos-wrapper"]') && !nav.querySelector('a[href="#recursos"]')) {
        const li = document.createElement('li');
        li.className = 'nav-item';
        li.innerHTML = `<a class="nav-link" href="#recursos-wrapper" onclick="switchPublicTab('progreso')"><i class="bi bi-collection-play me-2"></i>Recursos</a>`;
        nav.appendChild(li);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Helper function to apply colors to cells based on content
function applyCellColors(cellContent, cellType) {
    let baseStyle = 'border: 1px solid #dee2e6; text-align: center; vertical-align: middle; padding: 8px;';

    if (cellType === 'presentacion') {
        if (cellContent.toLowerCase().includes('presencial')) {
            baseStyle += ' background-color: #d4edda; color: #155724;';
        } else if (cellContent.toLowerCase().includes('virtual')) {
            baseStyle += ' background-color: #cce5ff; color: #004085;';
        }
    } else if (cellType === 'estado') {
        if (cellContent.toLowerCase().includes('presentada') && !cellContent.toLowerCase().includes('no')) {
            baseStyle += ' background-color: #d4edda; color: #155724;';
        } else if (cellContent.toLowerCase().includes('no presentada')) {
            baseStyle += ' background-color: #f8d7da; color: #721c24;';
        }
    }

    return baseStyle;
}

// Load Program Info (Extended Info) data
async function loadExtendedInfo() {
    try {
        //console.log('Loading extended info for promotion:', promotionId);
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/extended-info?t=${Date.now()}`);

        if (response.ok) {
            const info = await response.json();
            //console.log('Extended info loaded:', info);
            //console.log('Self-assignment status:', info.pildorasAssignmentOpen);
            // Students are already loaded by loadPromotionContent before this call

            displayExtendedInfo(info);
            displayPublicCompetences(info);
            await loadVirtualClassroom();
        } else {
            //console.log('No extended info found or error loading:', response.status);
        }
    } catch (error) {
        console.error('Error loading extended info:', error);
    }
}

// ==================== AULA VIRTUAL – VISTA PÚBLICA ====================

let _virtualClassroomState = null;

function _addAulaVirtualToSidebar() {
    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;
    // Avoid duplicates
    if (nav.querySelector('a[onclick*="openAulaVirtualPage"]')) return;
    const aulaLi = document.createElement('li');
    aulaLi.className = 'nav-item';
    aulaLi.innerHTML = '<a class="nav-link" href="#" onclick="openAulaVirtualPage(event)"><i class="bi bi-laptop me-2"></i>Aula Virtual</a>';
    const quickLinksAnchor = nav.querySelector('a[href="#quick-links"]');
    const quickLinksItem = quickLinksAnchor ? quickLinksAnchor.parentElement : null;
    if (quickLinksItem) {
        nav.insertBefore(aulaLi, quickLinksItem);
    } else {
        nav.appendChild(aulaLi);
    }
    // Also reveal the CTA button in the "En Progreso" tab
    const ctaDiv = document.getElementById('pp-cta-aula-virtual');
    if (ctaDiv) ctaDiv.classList.remove('d-none');
}

async function loadVirtualClassroom() {
    try {
        const res = await fetch(`${API_URL}/api/promotions/${promotionId}/virtual-classroom`);
        if (!res.ok) {
            console.error('Error loading virtual classroom:', res.status);
            _virtualClassroomState = null;
            return;
        }
        const data = await res.json();
        if (!data.active) {
            _virtualClassroomState = { active: false };
            // Mantener la tarjeta en modo "sin proyecto activo"
            return;
        }

        _virtualClassroomState = data;

        // Only add Aula Virtual to the sidebar when there is an active project
        _addAulaVirtualToSidebar();

        // Preparar UI base (si la página ya estuviera abierta)
        const prefixEl = document.getElementById('aula-virtual-repo-prefix');
        if (prefixEl) {
            const base = data.repoBaseUrl && data.repoBaseUrl.trim()
                ? data.repoBaseUrl.trim().replace(/\/+$/, '') + '/'
                : 'https://github.com/';
            prefixEl.textContent = base;
        }

        const briefingEl = document.getElementById('aula-virtual-briefing');
        if (briefingEl) {
            const url = data.briefingUrl;
            if (url) {
                briefingEl.innerHTML = `<a href="${escapeHtml(url)}" target="_blank" class="text-decoration-none">
                    <i class="bi bi-box-arrow-up-right me-1"></i>${escapeHtml(url)}
                </a>`;
            } else {
                briefingEl.innerHTML = '<span class="text-muted small fst-italic">El formador no ha definido un briefing.</span>';
            }
        }

        const compContainer = document.getElementById('aula-virtual-competences');
        if (compContainer) {
            const comps = Array.isArray(data.competences) ? data.competences : [];
            if (!comps.length) {
                compContainer.innerHTML = '<span class="text-muted small fst-italic">Este proyecto no tiene competencias asociadas.</span>';
            } else {
                const mainAccordionId = `aula-virtual-comps-acc`;
                compContainer.innerHTML = `
                    <div class="accordion accordion-flush border rounded overflow-hidden" id="${mainAccordionId}">
                        ${comps.map((c, idx) => {
                            const levelDescs = (c.levels || []).reduce((acc, l) => { acc[l.level] = l.description; return acc; }, {});
                            const compInds = c.competenceIndicators || { initial: [], medio: [], advance: [] };
                            const tools = c.toolsWithIndicators || [];
                            
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
                            const toolAccordionId = `tool-acc-${promotionId}-${idx}`;
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

                            const collapseId = `comp-collapse-${idx}`;
                            return `
                                <div class="accordion-item">
                                    <h2 class="accordion-header">
                                        <button class="accordion-button ${idx === 0 ? '' : 'collapsed'} py-3 px-4" type="button" 
                                            data-bs-toggle="collapse" data-bs-target="#${collapseId}">
                                            <div class="d-flex align-items-center gap-2">
                                                <span class="badge bg-primary px-2" style="font-size: 0.7rem;">${escapeHtml(c.area || 'General')}</span>
                                                <strong class="h6 mb-0">${escapeHtml(c.name)}</strong>
                                            </div>
                                        </button>
                                    </h2>
                                    <div id="${collapseId}" class="accordion-collapse collapse ${idx === 0 ? 'show' : ''}" data-bs-parent="#${mainAccordionId}">
                                        <div class="accordion-body p-4">
                                            ${c.description ? `<p class="text-muted small mb-4" style="line-height: 1.4;">${escapeHtml(c.description)}</p>` : ''}
                                            <div class="row g-3">
                                                ${compLevelCols}
                                            </div>
                                            ${toolAccordionHtml}
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Error loading virtual classroom:', error);
        _virtualClassroomState = null;
    }
}

function openAulaVirtualPage(event) {
    if (event && event.preventDefault) event.preventDefault();

    const page = document.getElementById('aula-virtual-page');
    const emptyEl = document.getElementById('aula-virtual-empty');
    const contentEl = document.getElementById('aula-virtual-content');
    if (!page || !emptyEl || !contentEl) return;

    // Hide both tab panels and tab nav
    const tabProgreso = document.getElementById('tab-progreso');
    const tabInfo = document.getElementById('tab-info');
    const tabNav = document.getElementById('pp-main-tabs');
    const banner = document.querySelector('.pp-banner');

    [tabProgreso, tabInfo, tabNav, banner].forEach(el => {
        if (el) el.classList.add('d-none');
    });

    page.classList.remove('d-none');

    // Configurar contenido según estado actual
    if (!_virtualClassroomState || !_virtualClassroomState.active) {
        emptyEl.classList.remove('d-none');
        contentEl.classList.add('d-none');
    } else {
        emptyEl.classList.add('d-none');
        contentEl.classList.remove('d-none');
        populateAulaVirtualTargets();
    }

    // Scroll al inicio
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeAulaVirtualPage() {
    const page = document.getElementById('aula-virtual-page');
    if (page) page.classList.add('d-none');

    // Restore tab panels and nav
    const tabNav = document.getElementById('pp-main-tabs');
    const banner = document.querySelector('.pp-banner');
    if (tabNav) tabNav.classList.remove('d-none');
    if (banner) banner.classList.remove('d-none');

    // Show whichever tab was active
    const progresoBtn = document.getElementById('tab-progreso-btn');
    if (progresoBtn && progresoBtn.classList.contains('active')) {
        document.getElementById('tab-progreso')?.classList.remove('d-none');
        document.getElementById('tab-info')?.classList.add('d-none');
    } else {
        document.getElementById('tab-info')?.classList.remove('d-none');
        document.getElementById('tab-progreso')?.classList.add('d-none');
    }

    const feedbackEl = document.getElementById('aula-virtual-feedback');
    const suffixEl = document.getElementById('aula-virtual-repo-suffix');
    if (feedbackEl) feedbackEl.textContent = '';
    if (suffixEl) suffixEl.value = '';
}

async function populateAulaVirtualTargets() {
    const select = document.getElementById('aula-virtual-target-select');
    const label = document.getElementById('aula-virtual-target-label');
    if (!select || !label) return;

    if (!_virtualClassroomState || !_virtualClassroomState.active) {
        select.innerHTML = '<option value="">No hay proyecto activo</option>';
        return;
    }

    const type = _virtualClassroomState.projectType === 'grupal' ? 'grupal' : 'individual';

    if (!window.publicStudents) {
        await loadPublicStudents();
    }
    const students = Array.isArray(window.publicStudents) ? window.publicStudents : [];

    let optionsHtml = '';
    if (type === 'individual') {
        label.textContent = 'Selecciona tu nombre';
        optionsHtml = '<option value="">Selecciona tu nombre…</option>' +
            students.map(st => `
                <option value="student:${escapeHtml(String(st.id))}">
                    ${escapeHtml(`${st.name || ''} ${st.lastname || ''}`.trim())}
                </option>
            `).join('');
    } else {
        label.textContent = 'Selecciona tu equipo';
        const groups = Array.isArray(_virtualClassroomState.groups) ? _virtualClassroomState.groups : [];
        const byId = {};
        students.forEach(s => { byId[String(s.id)] = s; });

        optionsHtml = '<option value="">Selecciona tu equipo…</option>' +
            groups.map(g => {
                const members = (g.studentIds || []).map(id => {
                    const st = byId[String(id)];
                    return st ? `${st.name || ''} ${st.lastname || ''}`.trim() : id;
                }).filter(Boolean);
                const membersLabel = members.slice(0, 3).join(', ') + (members.length > 3 ? '…' : '');
                return `
                    <option value="group:${escapeHtml(g.groupName)}">
                        ${escapeHtml(g.groupName)}${membersLabel ? ` — ${escapeHtml(membersLabel)}` : ''}
                    </option>
                `;
            }).join('');
    }

    select.innerHTML = optionsHtml;
}

async function submitVirtualClassroomDelivery() {
    const btn = document.querySelector('#aula-virtual-page button[onclick*="submitVirtualClassroomDelivery"]');
    const spinner = btn ? btn.querySelector('.spinner-border') : null;
    const labelSpan = btn ? btn.querySelector('.btn-label') : null;
    const select = document.getElementById('aula-virtual-target-select');
    const suffixEl = document.getElementById('aula-virtual-repo-suffix');
    const feedbackEl = document.getElementById('aula-virtual-feedback');

    if (!select || !suffixEl || !feedbackEl) return;
    if (!_virtualClassroomState || !_virtualClassroomState.active) {
        feedbackEl.textContent = 'No hay proyecto activo para entregar.';
        feedbackEl.className = 'small text-danger';
        return;
    }

    const targetVal = select.value;
    const repoName = suffixEl.value.trim();
    //console.log('[DEBUG] submitVirtualClassroomDelivery:', { targetVal, repoName });

    if (!targetVal) {
        feedbackEl.textContent = 'Selecciona tu nombre o equipo antes de enviar.';
        feedbackEl.className = 'small text-danger';
        return;
    }

    if (!repoName) {
        feedbackEl.textContent = 'Escribe el nombre de tu repositorio.';
        feedbackEl.className = 'small text-danger';
        return;
    }

    const [kind, id] = targetVal.split(':');
    const body = {
        type: _virtualClassroomState.projectType === 'grupal' ? 'grupal' : 'individual',
        repoName
    };
    if (body.type === 'grupal') {
        body.groupName = id;
    } else {
        body.studentId = id;
    }

    if (btn && spinner && labelSpan) {
        btn.disabled = true;
        spinner.classList.remove('d-none');
        labelSpan.classList.add('d-none');
    }
    feedbackEl.textContent = '';

    try {
        const res = await fetch(`${API_URL}/api/promotions/${promotionId}/virtual-classroom/submissions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json().catch(() => ({}));
        //console.log('[DEBUG] Submission response:', { status: res.status, data });

        if (!res.ok) {
            console.error('Error submitting virtual classroom delivery:', data);
            feedbackEl.textContent = data.error || 'Error al registrar la entrega.';
            feedbackEl.className = 'small text-danger';
            return;
        }

        feedbackEl.textContent = 'Entrega registrada correctamente.';
        feedbackEl.className = 'small text-success';
        suffixEl.value = '';
    } catch (error) {
        console.error('Error submitting virtual classroom delivery:', error);
        feedbackEl.textContent = 'Error de conexión al enviar la entrega.';
        feedbackEl.className = 'small text-danger';
    } finally {
        if (btn && spinner && labelSpan) {
            btn.disabled = false;
            spinner.classList.add('d-none');
            labelSpan.classList.remove('d-none');
        }
    }
}

async function loadPublicStudents() {
    try {
        const response = await fetch(`${API_URL}/api/promotions/${promotionId}/public-students`);
        if (response.ok) {
            window.publicStudents = await response.json();
            //console.log('Public students loaded:', window.publicStudents.length);
        }
    } catch (error) {
        console.error('Error loading public students:', error);
    }
}

// ─── Competencias públicas ────────────────────────────────────────────────────
let _publicCompetencesAll = [];

function displayPublicCompetences(info) {
    const usedCompIds = new Set();
    if (Array.isArray(info.projectCompetences)) {
        info.projectCompetences.forEach(pc => {
            (pc.competenceIds || []).forEach(cid => usedCompIds.add(String(cid)));
        });
    }

    const competences = info.competences || [];
    _publicCompetencesAll = competences.filter(c => usedCompIds.has(String(c.id)));
    const section = document.getElementById('competences-section');
    if (!section) return;

    if (!_publicCompetencesAll.length) {
        section.classList.add('d-none');
        return;
    }

    section.classList.remove('d-none');

    // Build area filter options
    const areaFilter = document.getElementById('public-competences-area-filter');
    if (areaFilter) {
        const areas = [...new Set(_publicCompetencesAll.map(c => c.area).filter(Boolean))];
        const existingOptions = areaFilter.querySelectorAll('option:not([value=""])');
        existingOptions.forEach(o => o.remove());
        areas.forEach(area => {
            const opt = document.createElement('option');
            opt.value = area;
            opt.textContent = area;
            areaFilter.appendChild(opt);
        });
    }

    _renderPublicCompetences('');
}

function filterPublicCompetences() {
    const filterVal = document.getElementById('public-competences-area-filter')?.value || '';
    _renderPublicCompetences(filterVal);
}

function _renderPublicCompetences(filterArea) {
    const container = document.getElementById('public-competences-list');
    if (!container) return;

    const filtered = filterArea
        ? _publicCompetencesAll.filter(c => c.area === filterArea)
        : _publicCompetencesAll;

    if (!filtered.length) {
        container.innerHTML = '<p class="text-muted">No hay competencias en esta área.</p>';
        return;
    }

    const areaColorMap = {
        'web': 'primary', 'ai': 'dark', 'accessibility': 'info',
        'green': 'success', 'inmersivo': 'warning'
    };
    
    const LEVEL_COLORS = { 1: '#ffc107', 2: '#0d6efd', 3: '#198754' };
    const LEVEL_BG     = { 1: '#fff3cd', 2: '#cfe2ff', 3: '#d1e7dd' };
    const LEVEL_NAMES  = { 1: 'Básico',  2: 'Medio',   3: 'Avanzado' };

    const items = filtered.map((comp, i) => {
        const areaColor    = areaColorMap[comp.area] || 'secondary';
        const selectedCount = (comp.selectedTools || []).length;
        const allCount      = (comp.allTools || comp.selectedTools || []).length;
        const levelsCount   = (comp.levels || []).length;

        const toolBadges = (comp.selectedTools || []).map(t =>
            `<span class="badge bg-light text-dark border me-1 mb-1"><i class="bi bi-tools me-1 opacity-50"></i>${escapeHtml(t)}</span>`
        ).join('');

        const levelDescs = (comp.levels || []).reduce((acc, l) => { acc[l.level] = l.description; return acc; }, {});
        const levelCols = [1, 2, 3].map(lvl => {
            const levelObj = (comp.levels || []).find(l => l.level === lvl);
            const indNames = levelObj ? (levelObj.indicators || []) : [];
            const desc     = levelDescs[lvl] || LEVEL_NAMES[lvl];
            return `
            <div class="col-md-4 mb-2">
                <div class="p-2 h-100 rounded border" style="background:${LEVEL_BG[lvl]};border-color:${LEVEL_COLORS[lvl]} !important;">
                    <div class="fw-bold text-uppercase mb-1" style="color:${LEVEL_COLORS[lvl]};font-size:0.6rem;letter-spacing:0.05em;">
                        <i class="bi bi-award-fill me-1"></i>Nivel ${lvl}
                    </div>
                    <div class="fw-semibold mb-1" style="font-size:0.75rem;line-height:1.2;">${escapeHtml(desc)}</div>
                    ${indNames.length ? `<ul class="mb-0 ps-3 text-muted" style="font-size:0.7rem;line-height:1.2;">${indNames.map(n => `<li>${escapeHtml(n)}</li>`).join('')}</ul>` : '<div class="text-muted fst-italic" style="font-size:0.7rem;">Sin indicadores.</div>'}
                </div>
            </div>`;
        }).join('');

        return `
        <div class="accordion-item shadow-sm mb-2 border rounded overflow-hidden">
            <h2 class="accordion-header" id="pub-comp-header-${i}">
                <button class="accordion-button collapsed py-2 px-3" type="button"
                    data-bs-toggle="collapse" data-bs-target="#pub-comp-body-${i}"
                    aria-expanded="false" aria-controls="pub-comp-body-${i}">
                    <div class="d-flex align-items-center flex-wrap gap-2 w-100 me-3">
                        <span class="badge bg-${areaColor}" style="font-size:.65rem;">${escapeHtml(comp.area)}</span>
                        <strong class="small">${escapeHtml(comp.name)}</strong>
                        <span class="ms-auto d-flex gap-2 small text-muted">
                            <span title="Herramientas"><i class="bi bi-tools me-1"></i>${selectedCount}/${allCount}</span>
                            <span title="Niveles"><i class="bi bi-bar-chart-steps me-1"></i>${levelsCount}</span>
                        </span>
                    </div>
                </button>
            </h2>
            <div id="pub-comp-body-${i}" class="accordion-collapse collapse"
                aria-labelledby="pub-comp-header-${i}" data-bs-parent="#public-competences-accordion">
                <div class="accordion-body p-3">
                    ${comp.description ? `<p class="text-muted mb-3" style="font-size:0.8rem;line-height:1.3;">${escapeHtml(comp.description)}</p>` : ''}
                    <div class="row g-2 mb-3">${levelCols}</div>
                    ${toolBadges ? `
                    <div>
                        <div class="fw-bold text-uppercase text-muted mb-2" style="font-size:0.6rem;letter-spacing:0.05em;">
                            <i class="bi bi-tools me-1"></i>Herramientas
                        </div>
                        <div>${toolBadges}</div>
                    </div>` : ''}
                </div>
            </div>
        </div>`;
    }).join('');

    container.innerHTML = `<div class="accordion" id="public-competences-accordion">${items}</div>`;
}


// Display Program Info sections
function displayExtendedInfo(info) {
    // Store extended info globally for píldoras navigation
    window.publicPromotionExtendedInfo = info;

    // Apply employability visibility — default true if not explicitly set
    window._showEmployability = info.showEmployability !== false;

    // Regenerate gantt to apply showEmployability change
    if (window.publicPromotionData) {
        generateGanttChart(window.publicPromotionData);
    }

    // Clear existing extended info sections to avoid duplicates on reload
    ['#pildoras-wrapper', '#recursos-wrapper', '#horario-wrapper', '#evaluacion-wrapper', '#equipo-wrapper'].forEach(sel => {
        const el = document.querySelector(sel);
        if (el) el.innerHTML = '';
    });
    // Also remove any old IDs that may have been injected
    document.querySelectorAll('#pildoras, #horario, #equipo, #recursos, #evaluacion, #resources').forEach(el => {
        if (!['pildoras-wrapper','recursos-wrapper','horario-wrapper','evaluacion-wrapper','equipo-wrapper'].includes(el.id)) {
            el.remove();
        }
    });

    // Create Program Info sections
    const programInfoSections = createProgramInfoSections(info);

    programInfoSections.forEach(section => {
        const sectionId = section.id;

        if (sectionId === 'pildoras') {
            // Píldoras → "En progreso" tab
            const wrapper = document.getElementById('pildoras-wrapper');
            if (wrapper) wrapper.appendChild(section);
        } else if (sectionId === 'resources') {
            // Recursos → "En progreso" tab
            const wrapper = document.getElementById('recursos-wrapper');
            if (wrapper) wrapper.appendChild(section);
        } else if (sectionId === 'horario') {
            // Horario → "Info General" tab
            const wrapper = document.getElementById('horario-wrapper');
            if (wrapper) wrapper.appendChild(section);
        } else if (sectionId === 'evaluacion') {
            // Evaluación → "Info General" tab
            const wrapper = document.getElementById('evaluacion-wrapper');
            if (wrapper) wrapper.appendChild(section);
        } else if (sectionId === 'equipo') {
            // Equipo → "Info General" tab
            const wrapper = document.getElementById('equipo-wrapper');
            if (wrapper) wrapper.appendChild(section);
        } else {
            // Fallback: put into sections-container
            const container = document.getElementById('sections-container');
            if (container) container.appendChild(section);
        }
    });

    // Update sidebar to include the new sections
    updateSidebarWithExtendedInfo(info);

    // Populate next-pildora notice card
    _renderNextPildoraNotice(info);

    //console.log('Extended info sections displayed:', programInfoSections.length);
}

// Create Program Info sections HTML
function createProgramInfoSections(info) {
    const sections = [];

    // Check if we have module-based píldoras with actual content
    const modulesWithActualPildoras = Array.isArray(info.modulesPildoras) ?
        info.modulesPildoras.filter(mp => Array.isArray(mp.pildoras) && mp.pildoras.length > 0) : [];

    // Píldoras Section (Legacy format) - Show if legacy exists AND (no module data exists OR modules are empty)
    if (Array.isArray(info.pildoras) && info.pildoras.length > 0 && modulesWithActualPildoras.length === 0) {
        //console.log('Creating Legacy píldoras section (no module-based píldoras found)');
        const pildorasSection = document.createElement('div');
        pildorasSection.className = 'col-md-12';
        pildorasSection.id = 'pildoras';

        // Find the next upcoming date for legacy format
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let nextDateIndex = -1;
        let nextDate = null;

        for (let i = 0; i < info.pildoras.length; i++) {
            const pildora = info.pildoras[i];
            if (pildora.date && pildora.date.trim()) {
                const pildoraDate = new Date(pildora.date);
                pildoraDate.setHours(0, 0, 0, 0);

                // Check if this date is today or in the future
                if (pildoraDate >= today) {
                    if (!nextDate || pildoraDate < nextDate) {
                        nextDate = pildoraDate;
                        nextDateIndex = i;
                    }
                }
            }
        }

        const rows = info.pildoras.map((p, index) => {
            const mode = p.mode || '';
            const date = p.date || '';
            const title = p.title || '';
            const students = Array.isArray(p.students) ? p.students : [];
            const studentsText = students.length
                ? students.map(s => `${(s.name || '').trim()} ${(s.lastname || '').trim()}`.trim()).join(', ')
                : 'Desierta';
            const status = p.status || '';

            // Assignment UI for Legacy
            let assignmentCell = '';
            if (info.pildorasAssignmentOpen) {
                const studentOptions = (window.publicStudents || [])
                    .map(s => `<option value="${s.id}">${s.name} ${s.lastname}</option>`)
                    .join('');

                assignmentCell = `
                    <td style="width: 15%; border: 1px solid #dee2e6; text-align: center; vertical-align: middle; padding: 8px;">
                        <div class="d-flex flex-column gap-1">
                            <select class="form-select form-select-sm coder-select-legacy-${index}">
                                <option value="">Selecciona Coder...</option>
                                ${studentOptions}
                            </select>
                            <button class="btn btn-xs btn-primary py-0" style="font-size: 0.7rem;" onclick="window.selfAssignPildoraLegacy(${index})">
                                <i class="bi bi-person-plus"></i> Apuntarse
                            </button>
                        </div>
                    </td>
                `;
            }

            // Apply orange background for the next upcoming date
            const isNextDate = index === nextDateIndex;
            const maxVisible = 5;
            const isHidden = index >= maxVisible;
            const rowClass = isHidden ? 'pildora-table-row-hidden' : '';

            if (isNextDate) {
                const orangeStyle = 'border: 1px solid #dee2e6; text-align: center; vertical-align: middle; padding: 8px; background-color: #ff6600; color: white;';
                const orangeStyleLeft = 'border: 1px solid #dee2e6; text-align: left; vertical-align: middle; padding: 8px; background-color: #ff6600; color: white;';

                return `
                    <tr class="${rowClass}">
                        <td style="width: 15%; ${orangeStyle}">${escapeHtml(mode)}</td>
                        <td style="width: 15%; ${orangeStyle}">${escapeHtml(date)}</td>
                        <td style="width: 25%; ${orangeStyleLeft}">${escapeHtml(title)}</td>
                        <td style="width: 20%; ${orangeStyleLeft}">${escapeHtml(studentsText)}</td>
                        <td style="width: 10%; ${orangeStyle}">${escapeHtml(status)}</td>
                        ${assignmentCell}
                    </tr>
                `;
            } else {
                return `
                    <tr class="${rowClass}">
                        <td style="width: 15%; ${applyCellColors(mode, 'presentacion')}">${escapeHtml(mode)}</td>
                        <td style="width: 15%; border: 1px solid #dee2e6; text-align: center; vertical-align: middle; padding: 8px;">${escapeHtml(date)}</td>
                        <td style="width: 25%; border: 1px solid #dee2e6; text-align: left; vertical-align: middle; padding: 8px;">${escapeHtml(title)}</td>
                        <td style="width: 20%; border: 1px solid #dee2e6; text-align: left; vertical-align: middle; padding: 8px;">${escapeHtml(studentsText)}</td>
                        <td style="width: 10%; ${applyCellColors(status, 'estado')}">${escapeHtml(status)}</td>
                        ${assignmentCell}
                    </tr>
                `;
            }
        }).join('');

        const maxVisible = 5;
        const showExpandButton = info.pildoras.length > maxVisible;

        pildorasSection.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="card-title section-title mb-0">
                            <i class="bi bi-lightbulb me-2"></i>Píldoras (Formato Legacy)
                            ${info.pildorasAssignmentOpen ? '<span class="badge bg-success ms-2" style="font-size: 0.7rem;">Auto-asignación Abierta</span>' : ''}
                        </h5>
                        <div class="alert alert-info mb-0 py-2 px-3">
                            <small><i class="bi bi-info-circle me-1"></i>Para ver navegación por módulos, configure píldoras por módulo en el dashboard del profesor</small>
                        </div>
                    </div>
                    <div class="table-responsive mt-3">
                        <table class="table table-sm table-bordered" style="border-color: #dee2e6;">
                            <thead class="table-light">
                                <tr>
                                    <th style="width: 15%; border: 1px solid #dee2e6; text-align: center; vertical-align: middle;">Presentación</th>
                                    <th style="width: 15%; border: 1px solid #dee2e6; text-align: center; vertical-align: middle;">Fecha</th>
                                    <th style="width: 25%; border: 1px solid #dee2e6; text-align: center; vertical-align: middle;">Píldora</th>
                                    <th style="width: 20%; border: 1px solid #dee2e6; text-align: center; vertical-align: middle;">Coder</th>
                                    <th style="width: 10%; border: 1px solid #dee2e6; text-align: center; vertical-align: middle;">Estado</th>
                                    ${info.pildorasAssignmentOpen ? '<th style="width: 15%; border: 1px solid #dee2e6; text-align: center; vertical-align: middle;">Acción</th>' : ''}
                                </tr>
                            </thead>
                            <tbody>
                                ${rows}
                            </tbody>
                        </table>
                    </div>
                    ${showExpandButton ? `
                        <div class="pildora-table-expand-row">
                            <button class="btn btn-link" onclick="window.togglePildorasTableExpandLegacy()">
                                <span class="pildora-expand-text-legacy">Ver todas las píldoras</span>
                                <i class="bi bi-chevron-down pildora-expand-icon-legacy"></i>
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        sections.push(pildorasSection);
    }

    // Píldoras Section (Module-based format) - MOVED TO FIRST POSITION
    if (modulesWithActualPildoras.length > 0) {
        //console.log('Creating Module-based píldoras section with navigation arrows');
        //console.log('Modules with píldoras:', modulesWithActualPildoras);

        // Get promotion modules to match with module names
        const promotionModulesData = window.publicPromotionData?.modules || [];
        //console.log('Promotion modules:', promotionModulesData);

        // enrich with promotion module data
        const modulesWithPildoras = modulesWithActualPildoras
            .map(moduleData => {
                // Find matching promotion module to get correct name
                const promotionModule = promotionModulesData.find(pm => pm.id === moduleData.moduleId);
                return {
                    ...moduleData,
                    moduleName: promotionModule?.name || moduleData.moduleName || 'Unknown Module'
                };
            });

        //console.log('Filtered modules with píldoras:', modulesWithPildoras);

        if (modulesWithPildoras.length > 0) {
            const pildorasSection = document.createElement('div');
            pildorasSection.className = 'col-md-12';
            pildorasSection.id = 'pildoras';

            // Initialize with first module
            let currentModuleIndex = 0;

            function renderPildorasTable() {
                //console.log('Rendering píldoras table. Assignment open:', info.pildorasAssignmentOpen);
                //console.log('Public students available:', window.publicStudents?.length);
                const currentModule = modulesWithPildoras[currentModuleIndex];
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                // Find the next upcoming date (closest to today)
                let nextDateIndex = -1;
                let nextDate = null;

                for (let i = 0; i < currentModule.pildoras.length; i++) {
                    const pildora = currentModule.pildoras[i];
                    if (pildora.date && pildora.date.trim()) {
                        const pildoraDate = new Date(pildora.date);
                        pildoraDate.setHours(0, 0, 0, 0);

                        // Check if this date is today or in the future
                        if (pildoraDate >= today) {
                            if (!nextDate || pildoraDate < nextDate) {
                                nextDate = pildoraDate;
                                nextDateIndex = i;
                            }
                        }
                    }
                }

                const rows = currentModule.pildoras.map((p, index) => {
                    const mode = p.mode || '';
                    const date = p.date || '';
                    const title = p.title || '';
                    const students = Array.isArray(p.students) ? p.students : [];
                    const studentsText = students.length
                        ? students.map(s => `${(s.name || '').trim()} ${(s.lastname || '').trim()}`.trim()).join(', ')
                        : 'Desierta';
                    const status = p.status || '';

                    // Assignment UI
                    let assignmentCell = '';
                    if (info.pildorasAssignmentOpen) {
                        const studentOptions = (window.publicStudents || [])
                            .map(s => `<option value="${s.id}">${s.name} ${s.lastname}</option>`)
                            .join('');

                        assignmentCell = `
                            <td style="width: 15%; border: 1px solid #dee2e6; text-align: center; vertical-align: middle; padding: 8px;">
                                <div class="d-flex flex-column gap-1">
                                    <select class="form-select form-select-sm coder-select-${index}">
                                        <option value="">Selecciona Coder...</option>
                                        ${studentOptions}
                                    </select>
                                    <button class="btn btn-xs btn-primary py-0" style="font-size: 0.7rem;" onclick="window.selfAssignPildora('${currentModule.moduleId}', ${index})">
                                        <i class="bi bi-person-plus"></i> Apuntarse
                                    </button>
                                </div>
                            </td>
                        `;
                    }

                    // Apply orange background for the next upcoming date
                    const isNextDate = index === nextDateIndex;
                    const maxVisible = 5;
                    const isHidden = index >= maxVisible;
                    const rowClass = isHidden ? 'pildora-table-row-hidden' : '';

                    // If this is the next date row, apply orange background to all cells
                    if (isNextDate) {
                        const orangeStyle = 'border: 1px solid #dee2e6; text-align: center; vertical-align: middle; padding: 8px; background-color: #ff6600; color: white;';
                        const orangeStyleLeft = 'border: 1px solid #dee2e6; text-align: left; vertical-align: middle; padding: 8px; background-color: #ff6600; color: white;';

                        return `
                            <tr class="${rowClass}">
                                <td style="width: 15%; ${orangeStyle}">${escapeHtml(mode)}</td>
                                <td style="width: 15%; ${orangeStyle}">${escapeHtml(date)}</td>
                                <td style="width: 30%; ${orangeStyleLeft}">${escapeHtml(title)}</td>
                                <td style="width: 20%; ${orangeStyleLeft}">${escapeHtml(studentsText)}</td>
                                <td style="width: 10%; ${orangeStyle}">${escapeHtml(status)}</td>
                                ${assignmentCell}
                            </tr>
                        `;
                    } else {
                        // Normal row with color coding for specific cells
                        return `
                            <tr class="${rowClass}">
                                <td style="width: 15%; ${applyCellColors(mode, 'presentacion')}">${escapeHtml(mode)}</td>
                                <td style="width: 15%; border: 1px solid #dee2e6; text-align: center; vertical-align: middle; padding: 8px;">${escapeHtml(date)}</td>
                                <td style="width: 30%; border: 1px solid #dee2e6; text-align: left; vertical-align: middle; padding: 8px;">${escapeHtml(title)}</td>
                                <td style="width: 20%; border: 1px solid #dee2e6; text-align: left; vertical-align: middle; padding: 8px;">${escapeHtml(studentsText)}</td>
                                <td style="width: 10%; ${applyCellColors(status, 'estado')}">${escapeHtml(status)}</td>
                                ${assignmentCell}
                            </tr>
                        `;
                    }
                }).join('');

                const tableContainer = pildorasSection.querySelector('.pildoras-table-container');
                if (tableContainer) {
                    const actionHeader = info.pildorasAssignmentOpen ? '<th style="width: 15%; border: 1px solid #dee2e6; text-align: center; vertical-align: middle;">Acción</th>' : '';
                    const maxVisible = 5;
                    const showExpandButton = currentModule.pildoras.length > maxVisible;

                    tableContainer.innerHTML = `
                        <table class="table table-sm table-bordered" style="border-color: #dee2e6;">
                            <thead class="table-light">
                                <tr>
                                    <th style="width: 15%; border: 1px solid #dee2e6; text-align: center; vertical-align: middle;">Presentación</th>
                                    <th style="width: 15%; border: 1px solid #dee2e6; text-align: center; vertical-align: middle;">Fecha</th>
                                    <th style="width: 30%; border: 1px solid #dee2e6; text-align: center; vertical-align: middle;">Píldora</th>
                                    <th style="width: 20%; border: 1px solid #dee2e6; text-align: center; vertical-align: middle;">Coder</th>
                                    <th style="width: 10%; border: 1px solid #dee2e6; text-align: center; vertical-align: middle;">Estado</th>
                                    ${actionHeader}
                                </tr>
                            </thead>
                            <tbody>
                                ${rows}
                            </tbody>
                        </table>
                        ${showExpandButton ? `
                            <div class="pildora-table-expand-row">
                                <button class="btn btn-link pildora-expand-btn-${currentModule.moduleId}" onclick="window.togglePildorasTableExpand('${currentModule.moduleId}')">
                                    <span class="pildora-expand-text-${currentModule.moduleId}">Ver todas las píldoras</span>
                                    <i class="bi bi-chevron-down pildora-expand-icon-${currentModule.moduleId}"></i>
                                </button>
                            </div>
                        ` : ''}`
                        ;
                } else {
                    console.error('Table container not found!');
                }

                // Update navigation controls - Update button styles
                const countBadge = pildorasSection.querySelector('.module-pildoras-count');

                // Update all module buttons
                for (let i = 0; i < modulesWithPildoras.length; i++) {
                    const btn = pildorasSection.querySelector(`.module-selector-btn-${i}`);
                    if (btn) {
                        if (i === currentModuleIndex) {
                            btn.className = 'btn btn-sm module-selector-btn-' + i;
                            btn.classList.add('btn-primary');
                            btn.classList.remove('btn-outline-secondary');
                            btn.style.backgroundColor = '#ff6600';
                            btn.style.borderColor = '#ff6600';
                            btn.style.color = 'white';
                        } else {
                            btn.className = 'btn btn-sm module-selector-btn-' + i;
                            btn.classList.add('btn-outline-secondary');
                            btn.classList.remove('btn-primary');
                            btn.style.backgroundColor = '';
                            btn.style.borderColor = '';
                            btn.style.color = '';
                        }
                    }
                }

                if (countBadge) countBadge.textContent = currentModule.pildoras.length;

                //console.log('Navigation controls updated successfully');
            }

            // Navigate to specific píldoras module
            window.navigateToPildorasModule = function (moduleIdx) {
                currentModuleIndex = moduleIdx;
                renderPildorasTable();
            };

            // Create the HTML structure with enhanced navigation - FORCE VISIBILITY
            pildorasSection.innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h5 class="card-title section-title mb-0">
                                <i class="bi bi-lightbulb me-2"></i>Píldoras
                                ${info.pildorasAssignmentOpen ? '<span class="badge bg-success ms-2" style="font-size: 0.7rem;">Auto-asignación Abierta</span>' : ''}
                            </h5>
                            <div class="d-flex align-items-center gap-2">
                                <!-- Module buttons navigation -->
                                <div class="d-flex gap-2 flex-wrap">
                                    ${modulesWithPildoras.map((mod, idx) => `
                                        <button class="btn btn-sm module-selector-btn-${idx} ${idx === currentModuleIndex ? 'btn-primary' : 'btn-outline-secondary'}" 
                                                onclick="window.navigateToPildorasModule(${idx})"
                                                style="${idx === currentModuleIndex ? 'background-color: #ff6600; border-color: #ff6600; color: white;' : ''}">
                                            ${mod.moduleName}
                                        </button>
                                    `).join('')}
                                </div>
                                <div class="badge text-dark" style="font-size: 0.9rem;">
                                    <i class="bi bi-lightbulb-fill me-1"></i>
                                    <span class="module-pildoras-count">0</span> píldoras
                                </div>
                            </div>
                        </div>
                        <div class="table-responsive pildoras-table-container">
                            <!-- Table will be populated here -->
                        </div>
                    </div>
                </div>
            `;

            //console.log('HTML structure created for module navigation');

            // Add navigation functions to window object to ensure global access
            window.navigatePildorasPrevious = function () {
                //console.log('Navigate previous clicked, current index:', currentModuleIndex);
                if (currentModuleIndex > 0) {
                    currentModuleIndex--;
                    //console.log('Moving to module index:', currentModuleIndex);
                    renderPildorasTable();
                }
            };

            window.selfAssignPildora = async function (mId, pIdx) {
                const selectEl = document.querySelector(`.coder-select-${pIdx}`);
                const sId = selectEl.value;
                if (!sId) {
                    alert('Por favor selecciona un Coder');
                    return;
                }

                try {
                    const response = await fetch(`${API_URL}/api/promotions/${promotionId}/pildoras-self-assign`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ moduleId: mId, pildoraIndex: pIdx, studentId: sId, action: 'add' })
                    });

                    if (response.ok) {
                        // Refresh data
                        const infoResponse = await fetch(`${API_URL}/api/promotions/${promotionId}/extended-info`);
                        if (infoResponse.ok) {
                            const newInfo = await infoResponse.json();
                            window.publicPromotionExtendedInfo = newInfo;

                            // Re-calculate modulesWithPildoras and update table
                            // (Actually it's better to just call loadExtendedInfo again to keep everything in sync)
                            loadExtendedInfo();
                        }
                    } else {
                        const error = await response.json();
                        alert(`Error: ${error.error}`);
                    }
                } catch (error) {
                    console.error('Error assigning píldora:', error);
                    alert('Error de conexión');
                }
            };

            window.selfAssignPildoraLegacy = async function (pIdx) {
                const selectEl = document.querySelector(`.coder-select-legacy-${pIdx}`);
                const sId = selectEl.value;
                if (!sId) {
                    alert('Por favor selecciona un Coder');
                    return;
                }

                try {
                    const response = await fetch(`${API_URL}/api/promotions/${promotionId}/pildoras-self-assign`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ pildoraIndex: pIdx, studentId: sId, action: 'add', isLegacy: true })
                    });

                    if (response.ok) {
                        loadExtendedInfo();
                    } else {
                        const error = await response.json();
                        alert(`Error: ${error.error}`);
                    }
                } catch (error) {
                    console.error('Error assigning píldora (legacy):', error);
                    alert('Error de conexión');
                }
            };

            window.navigatePildorasNext = function () {
                //console.log('Navigate next clicked, current index:', currentModuleIndex);
                if (currentModuleIndex < modulesWithPildoras.length - 1) {
                    currentModuleIndex++;
                    //console.log('Moving to module index:', currentModuleIndex);
                    renderPildorasTable();
                }
            };

            // Toggle expand/collapse for píldoras table
            window.togglePildorasTableExpand = function (moduleId) {
                const hiddenRows = document.querySelectorAll('.pildora-table-row-hidden');
                const btn = document.querySelector(`.pildora-expand-btn-${moduleId}`);
                const text = document.querySelector(`.pildora-expand-text-${moduleId}`);
                const icon = document.querySelector(`.pildora-expand-icon-${moduleId}`);

                if (!hiddenRows.length) return;

                const isCollapsed = hiddenRows[0].style.display !== 'table-row';
                hiddenRows.forEach(row => {
                    row.style.display = isCollapsed ? 'table-row' : 'none';
                });

                if (isCollapsed) {
                    text.textContent = 'Ver menos';
                    icon.classList.remove('bi-chevron-down');
                    icon.classList.add('bi-chevron-up');
                } else {
                    text.textContent = 'Ver todas las píldoras';
                    icon.classList.remove('bi-chevron-up');
                    icon.classList.add('bi-chevron-down');
                }
            };

            // Toggle expand/collapse for legacy píldoras table
            window.togglePildorasTableExpandLegacy = function () {
                const hiddenRows = document.querySelectorAll('.pildora-table-row-hidden');
                const text = document.querySelector('.pildora-expand-text-legacy');
                const icon = document.querySelector('.pildora-expand-icon-legacy');

                if (!hiddenRows.length) return;

                const isCollapsed = hiddenRows[0].style.display !== 'table-row';
                hiddenRows.forEach(row => {
                    row.style.display = isCollapsed ? 'table-row' : 'none';
                });

                if (isCollapsed) {
                    text.textContent = 'Ver menos';
                    icon.classList.remove('bi-chevron-down');
                    icon.classList.add('bi-chevron-up');
                } else {
                    text.textContent = 'Ver todas las píldoras';
                    icon.classList.remove('bi-chevron-up');
                    icon.classList.add('bi-chevron-down');
                }
            };

            // Store functions in the section for easier access
            pildorasSection._navigatePrevious = window.navigatePildorasPrevious;
            pildorasSection._navigateNext = window.navigatePildorasNext;
            pildorasSection._renderTable = renderPildorasTable;
            pildorasSection._modulesData = modulesWithPildoras;

            //console.log('Navigation functions assigned');

            // Initial render
            renderPildorasTable();

            //console.log('Initial table rendered');
            sections.push(pildorasSection);
        }
    }

    // Schedule Section
    if (info.schedule && hasScheduleData(info.schedule)) {
        const scheduleSection = document.createElement('div');
        scheduleSection.className = 'col-md-12';
        scheduleSection.id = 'horario';
        scheduleSection.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title section-title">
                        <i class="bi bi-clock me-2"></i>Horario
                    </h5>
                    ${generateScheduleHTML(info.schedule)}
                </div>
            </div>
        `;
        sections.push(scheduleSection);
    }

    // Team Section
    if (info.team && info.team.length > 0) {
        const teamSection = document.createElement('div');
        teamSection.className = 'col-md-12';
        teamSection.id = 'equipo';
        teamSection.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title section-title">
                        <i class="bi bi-people me-2"></i>Equipo
                    </h5>
                    ${generateTeamHTML(info.team)}
                </div>
            </div>
        `;
        sections.push(teamSection);
    }

    // Evaluation Section
    if (info.evaluation && info.evaluation.trim()) {
        const evaluationSection = document.createElement('div');
        evaluationSection.className = 'col-md-12';
        evaluationSection.id = 'evaluacion';
        // evaluation may be stored as HTML (rich text) or as plain text
        const evalHasHtml = /<(p|ul|ol|li|br|b|strong|em|i|u)\b/i.test(info.evaluation);
        const evalContent = evalHasHtml
            ? info.evaluation
            : escapeHtml(info.evaluation).replace(/\n/g, '<br>');
        evaluationSection.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title section-title">
                        <i class="bi bi-clipboard-check me-2"></i>Evaluación
                    </h5>
                    <div class="mt-3">
                        ${evalContent}
                    </div>
                </div>
            </div>
        `;
        sections.push(evaluationSection);
    }

    // Resources Section
    if (info.resources && info.resources.length > 0) {
        const resourcesSection = document.createElement('div');
        resourcesSection.className = 'col-md-12';
        resourcesSection.id = 'resources';
        resourcesSection.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title section-title">
                        <i class="bi bi-tools me-2"></i>Recursos
                    </h5>
                    ${generateResourcesHTML(info.resources)}
                </div>
            </div>
        `;
        sections.push(resourcesSection);
    }

    return sections;
}

// Helper function to check if schedule has data
function hasScheduleData(schedule) {
    if (!schedule) return false;

    const hasOnline = schedule.online && Object.values(schedule.online).some(v => v && v.trim());
    const hasPresential = schedule.presential && Object.values(schedule.presential).some(v => v && v.trim());
    const hasNotes = schedule.notes && schedule.notes.trim();

    return hasOnline || hasPresential || hasNotes;
}

// Generate Schedule HTML
function generateScheduleHTML(schedule) {
    let html = '';

    if (schedule.online && Object.values(schedule.online).some(v => v && v.trim())) {
        html += `
            <div class="mb-3">
                <h6 >Horario Clases Online:</h6>
                <ul>
                    ${schedule.online.entry ? `<li><strong>Inicio:</strong> ${escapeHtml(schedule.online.entry)}</li>` : ''}
                    ${schedule.online.start ? `<li><strong>Píldora:</strong> ${escapeHtml(schedule.online.start)}</li>` : ''}
                    ${schedule.online.break ? `<li><strong>Break:</strong> ${escapeHtml(schedule.online.break)}</li>` : ''}
                    ${schedule.online.lunch ? `<li><strong>Comida:</strong> ${escapeHtml(schedule.online.lunch)}</li>` : ''}
                    ${schedule.online.finish ? `<li><strong>Cierre:</strong> ${escapeHtml(schedule.online.finish)}</li>` : ''}
                </ul>
            </div>
        `;
    }

    if (schedule.presential && Object.values(schedule.presential).some(v => v && v.trim())) {
        html += `
            <div class="mb-3">
                <h6 >Horario Clases Presenciales:</h6>
                <ul>
                    ${schedule.presential.entry ? `<li><strong>Inicio:</strong> ${escapeHtml(schedule.presential.entry)}</li>` : ''}
                    ${schedule.presential.start ? `<li><strong>Píldora:</strong> ${escapeHtml(schedule.presential.start)}</li>` : ''}
                    ${schedule.presential.break ? `<li><strong>Break:</strong> ${escapeHtml(schedule.presential.break)}</li>` : ''}
                    ${schedule.presential.lunch ? `<li><strong>Comida:</strong> ${escapeHtml(schedule.presential.lunch)}</li>` : ''}
                    ${schedule.presential.finish ? `<li><strong>Cierre:</strong> ${escapeHtml(schedule.presential.finish)}</li>` : ''}
                </ul>
            </div>
        `;
    }

    if (schedule.notes && schedule.notes.trim()) {
        html += `<div class="alert alert-info"><strong>Notes:</strong> ${escapeHtml(schedule.notes)}</div>`;
    }

    return html;
}

// Generate Team HTML
function generateTeamHTML(team) {
    let html = '<div class="row">';

    team.forEach(member => {
        html += `
            <div class="col-md-6 mb-3">
                <div class="card">
                    <div class="card-body">
                        <h6 class="card-title">${escapeHtml(member.name || 'Unknown')}</h6>
                        ${member.role ? `<p class="card-text"><span><strong>${escapeHtml(member.role)}</strong></span></p>` : ''}
                        ${member.email ? `<p class="card-text"><i class="bi bi-envelope me-2"></i><a href="mailto:${escapeHtml(member.email)}">${escapeHtml(member.email)}</a></p>` : ''}
                        ${member.linkedin ? `<p class="card-text"><a href="${escapeHtml(member.linkedin)}" target="_blank" class="text-decoration-none"><i class="bi bi-linkedin me-2"></i>LinkedIn Profile</a></p>` : ''}
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    return html;
}

// Generate Resources HTML
function generateResourcesHTML(resources) {
    let html = '<div class="list-group">';

    resources.forEach(resource => {
        html += `
            <a href="${escapeHtml(resource.url || '#')}" target="_blank" class="list-group-item list-group-item-action">
                <div class="d-flex w-100 justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">${escapeHtml(resource.title || 'Untitled Resource')}</h6>
                        ${resource.url ? `<small class="text-muted">${escapeHtml(resource.url)}</small>` : ''}
                    </div>
                    ${resource.category ? `<span class="badge bg-primary">${escapeHtml(resource.category)}</span>` : ''}
                </div>
            </a>
        `;
    });

    html += '</div>';
    return html;
}