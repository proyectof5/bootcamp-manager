const API_URL = window.APP_CONFIG?.API_URL || window.location.origin;
let createModal, editModal, successModal, editTemplateModal;

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();

    // Initialize Modals
    createModal = new bootstrap.Modal(document.getElementById('createTeacherModal'));
    editModal = new bootstrap.Modal(document.getElementById('editTeacherModal'));
    successModal = new bootstrap.Modal(document.getElementById('successModal'));
    editTemplateModal = new bootstrap.Modal(document.getElementById('editTemplateModal'));

    // Forms
    document.getElementById('create-teacher-form').addEventListener('submit', handleCreateTeacher);
    document.getElementById('edit-teacher-form').addEventListener('submit', handleUpdateTeacher);

    // Delegated click for edit buttons (avoids inline onclick encoding issues)
    document.getElementById('teachers-list').addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-edit-user');
        if (btn) {
            openEditModal(btn.dataset.id, btn.dataset.name, btn.dataset.email, btn.dataset.userrole);
        }
    });

    // Template from promotion form
    document.getElementById('form-template-from-promo').addEventListener('submit', handleCreateTemplateFromPromotion);

    // Edit template form
    document.getElementById('edit-template-form').addEventListener('submit', handleEditTemplate);

    loadTeachers();
    showSection('users');
});

function checkAuth() {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token || (role !== 'admin' && role !== 'superadmin')) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const userJson = localStorage.getItem('user');
        if (userJson && userJson !== 'undefined') {
            const user = JSON.parse(userJson);
            const nameEl = document.getElementById('admin-name');
            if (nameEl && user?.name) nameEl.textContent = user.name;
        }
    } catch (e) {
        console.error('Error parsing admin data', e);
    }
}

async function loadTeachers() {
    const token = localStorage.getItem('token');
    const listElement = document.getElementById('teachers-list');

    try {
        const response = await fetch(`${API_URL}/api/admin/teachers`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const teachers = await response.json();
            displayTeachers(teachers);
        } else {
            listElement.innerHTML = `<div class="col-12 alert alert-danger">Error loading teachers: ${response.statusText}</div>`;
        }
    } catch (error) {
        listElement.innerHTML = `<div class="col-12 alert alert-danger">Connection error.</div>`;
    }
}

function displayTeachers(teachers) {
    const listElement = document.getElementById('teachers-list');
    listElement.innerHTML = '';

    if (teachers.length === 0) {
        listElement.innerHTML = '<div class="col-12 text-center text-muted py-5">No users found.</div>';
        return;
    }

    const roleColors = {
        'Formador/a': 'primary',
        'CoFormador/a': 'success',
        'Coordinador/a': 'warning'
    };

    teachers.forEach(teacher => {
        const userRole = teacher.userRole || 'Formador/a';
        const badgeColor = roleColors[userRole] || 'secondary';
        const card = document.createElement('div');
        card.className = 'col-md-6 col-lg-4 mb-4';
        card.innerHTML = `
            <div class="card teacher-card shadow-sm h-100">
                <div class="card-body">
                    <div class="d-flex align-items-center mb-3">
                        <div class="bg-primary bg-opacity-10 text-primary rounded-circle p-3 me-3">
                            <i class="bi bi-person-badge fs-4"></i>
                        </div>
                        <div>
                            <h5 class="card-title mb-0">${escapeHtml(teacher.name)}</h5>
                            <span class="badge bg-${badgeColor} mt-1">${escapeHtml(userRole)}</span>
                        </div>
                    </div>
                    <p class="card-text">
                        <i class="bi bi-envelope me-2 text-primary"></i>${escapeHtml(teacher.email)}
                    </p>
                    <div class="d-flex gap-2 mt-4">
                        <button class="btn btn-sm btn-outline-warning w-100 btn-edit-user"
                            data-id="${teacher.id}"
                            data-name="${escapeHtml(teacher.name)}"
                            data-email="${escapeHtml(teacher.email)}"
                            data-userrole="${escapeHtml(userRole)}">
                            <i class="bi bi-pencil me-1"></i> Editar
                        </button>
                        <button class="btn btn-sm btn-outline-danger w-100" onclick="deleteTeacher('${teacher.id}')">
                            <i class="bi bi-trash me-1"></i> Eliminar
                        </button>
                    </div>
                </div>
                <div class="card-footer bg-transparent border-0 text-muted small pb-3">
                    Created: ${new Date(teacher.createdAt).toLocaleDateString()}
                </div>
            </div>
        `;
        listElement.appendChild(card);
    });
}

function openCreateTeacherModal() {
    document.getElementById('create-teacher-form').reset();
    createModal.show();
}

async function handleCreateTeacher(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const name = document.getElementById('teacher-name').value;
    const email = document.getElementById('teacher-email').value;
    const userRole = document.getElementById('teacher-userrole').value;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Creating…';

    try {
        const response = await fetch(`${API_URL}/api/admin/teachers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, email, userRole })
        });

        const data = await response.json();

        if (response.ok) {
            createModal.hide();
            e.target.reset();

            // Show success modal with password and status
            document.getElementById('success-email').textContent = email;
            document.getElementById('provisional-password').textContent = data.provisionalPassword || '—';

            const statusEl = document.getElementById('success-external-status');
            if (statusEl) {
                if (data.externalRegistered) {
                    statusEl.innerHTML = '<span class="text-success"><i class="bi bi-check-circle me-1"></i>Registrado en el sistema de autenticación externo.</span>';
                } else {
                    statusEl.innerHTML = `<span class="text-warning"><i class="bi bi-exclamation-triangle me-1"></i>${data.warning || 'No se pudo registrar en el sistema externo.'}</span>`;
                }
            }
            if (data.emailWarning) {
                const emailWarnEl = document.getElementById('success-email-warning');
                if (emailWarnEl) emailWarnEl.textContent = data.emailWarning;
            }

            successModal.show();
            loadTeachers();
        } else {
            alert(data.error || data.message || 'Failed to create user');
        }
    } catch (error) {
        alert('Error creating user');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Create Account';
    }
}

function openEditModal(id, name, email, userRole) {
    document.getElementById('edit-teacher-id').value = id;
    document.getElementById('edit-teacher-name').value = name;
    document.getElementById('edit-teacher-email').value = email;
    document.getElementById('edit-teacher-userrole').value = userRole || 'Formador/a';
    editModal.show();
}

async function handleUpdateTeacher(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const id = document.getElementById('edit-teacher-id').value;
    const name = document.getElementById('edit-teacher-name').value;
    const email = document.getElementById('edit-teacher-email').value;
    const userRole = document.getElementById('edit-teacher-userrole').value;

    try {
        const response = await fetch(`${API_URL}/api/admin/teachers/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, email, userRole })
        });

        if (response.ok) {
            editModal.hide();
            loadTeachers();
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to update user');
        }
    } catch (error) {
        alert('Error updating user');
    }
}

async function deleteTeacher(id) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_URL}/api/admin/teachers/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            loadTeachers();
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to delete teacher');
        }
    } catch (error) {
        alert('Error deleting teacher');
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    window.location.href = 'login.html';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== SECTION NAVIGATION ====================

function showSection(section) {
    document.getElementById('section-users').style.display     = section === 'users'     ? '' : 'none';
    document.getElementById('section-templates').style.display = section === 'templates' ? '' : 'none';
    document.getElementById('nav-users').classList.toggle('active',     section === 'users');
    document.getElementById('nav-templates').classList.toggle('active', section === 'templates');

    if (section === 'templates') {
        loadPromotionsForTemplateSelect();
        loadTemplates();
    }
}

// ==================== TEMPLATES ====================

async function loadPromotionsForTemplateSelect() {
    const token = localStorage.getItem('token');
    const select = document.getElementById('tpl-promotion-select');
    try {
        const res = await fetch(`${API_URL}/api/admin/all-promotions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const promotions = await res.json();
            select.innerHTML = '<option value="">— Select promotion —</option>';
            promotions.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = `${escapeHtml(p.name)}${p.weeks ? ` (${p.weeks}w)` : ''}`;
                // Auto-fill template name when selected
                opt.dataset.name = p.name;
                select.appendChild(opt);
            });
            select.addEventListener('change', () => {
                const selected = select.options[select.selectedIndex];
                if (selected && selected.value) {
                    const nameInput = document.getElementById('tpl-name');
                    if (!nameInput.value) nameInput.value = selected.dataset.name || '';
                }
            });
        }
    } catch (e) {
        console.error('Error loading promotions for template select', e);
    }
}

async function loadTemplates() {
    const token = localStorage.getItem('token');
    const container = document.getElementById('templates-list');
    container.innerHTML = '<div class="col-12 text-center py-4"><div class="spinner-border text-primary" role="status"></div></div>';
    try {
        const res = await fetch(`${API_URL}/api/bootcamp-templates`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const templates = await res.json();
            renderTemplates(templates);
        } else {
            container.innerHTML = '<div class="col-12 alert alert-danger">Error loading templates.</div>';
        }
    } catch (e) {
        container.innerHTML = '<div class="col-12 alert alert-danger">Connection error.</div>';
    }
}

function renderTemplates(templates) {
    const container = document.getElementById('templates-list');
    if (!templates.length) {
        container.innerHTML = '<div class="col-12 text-muted text-center py-4">No hay plantillas.</div>';
        return;
    }
    container.innerHTML = '';
    templates.forEach(t => {
        const isCustom = t.isCustom;
        const modulesCount = (t.modules || []).length;
        const competencesCount = (t.competences || []).length;
        const pildorasCount = (t.modulesPildoras || []).reduce((acc, mp) => acc + (mp.pildoras || []).length, 0);
        const card = document.createElement('div');
        card.className = 'col-md-6 col-lg-4';
        card.innerHTML = `
            <div class="card h-100 shadow-sm border-0" style="border-left: 4px solid ${isCustom ? '#28a745' : '#ff4700'} !important;">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="fw-bold mb-0">${escapeHtml(t.name)}</h6>
                        <span class="badge ${isCustom ? 'bg-success' : 'bg-primary'} ms-2">${isCustom ? 'Personalizada' : 'Sistema'}</span>
                    </div>
                    <p class="text-muted small mb-2">${escapeHtml(t.description || '—')}</p>
                    <div class="d-flex flex-wrap gap-2 mb-3">
                        <span class="badge bg-light text-dark border"><i class="bi bi-calendar3 me-1"></i>${t.weeks || '?'}w</span>
                        <span class="badge bg-light text-dark border"><i class="bi bi-clock me-1"></i>${t.hours || '?'}h</span>
                        <span class="badge bg-light text-dark border"><i class="bi bi-grid me-1"></i>${modulesCount} módulos</span>
                        <span class="badge bg-light text-dark border"><i class="bi bi-stars me-1"></i>${competencesCount} competencias</span>
                        <span class="badge bg-light text-dark border"><i class="bi bi-lightbulb me-1"></i>${pildorasCount} píldoras</span>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-warning flex-fill"
                                onclick="openEditTemplateModal('${escapeHtml(t.id)}', '${escapeHtml(t.name)}', '${escapeHtml(t.description || '')}', ${t.weeks || 0}, ${t.hours || 0})">
                            <i class="bi bi-pencil me-1"></i>Editar
                        </button>
                        <button class="btn btn-sm btn-outline-danger flex-fill"
                                onclick="deleteTemplate('${escapeHtml(t.id)}', '${escapeHtml(t.name)}')">
                            <i class="bi bi-trash me-1"></i>Eliminar
                        </button>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

async function handleCreateTemplateFromPromotion(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const promotionId = document.getElementById('tpl-promotion-select').value;
    const templateName = document.getElementById('tpl-name').value.trim();
    const templateDescription = document.getElementById('tpl-description').value.trim();
    const feedback = document.getElementById('tpl-create-feedback');

    if (!promotionId || !templateName) return;

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
    feedback.innerHTML = '';

    try {
        const res = await fetch(`${API_URL}/api/admin/templates-from-promotion`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ promotionId, templateName, templateDescription })
        });

        const data = await res.json();

        if (res.ok) {
            feedback.innerHTML = `<div class="alert alert-success py-2 mb-0"><i class="bi bi-check-circle me-2"></i>Template "<strong>${escapeHtml(data.name)}</strong>" created successfully with ${(data.modules || []).length} modules.</div>`;
            document.getElementById('form-template-from-promo').reset();
            loadTemplates();
        } else {
            feedback.innerHTML = `<div class="alert alert-danger py-2 mb-0">${escapeHtml(data.error || 'Error creating template')}</div>`;
        }
    } catch (err) {
        feedback.innerHTML = `<div class="alert alert-danger py-2 mb-0">Connection error.</div>`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-plus-lg"></i>';
    }
}

async function deleteTemplate(templateId, templateName) {
    if (!confirm(`¿Eliminar la plantilla "${templateName}"? Esta acción no se puede deshacer.`)) return;
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/api/bootcamp-templates/${templateId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            loadTemplates();
        } else {
            const data = await res.json();
            alert(data.error || 'Error al eliminar la plantilla');
        }
    } catch (e) {
        alert('Error de conexión');
    }
}

// ==================== EDIT TEMPLATE ====================

function openEditTemplateModal(id, name, description, weeks, hours) {
    document.getElementById('edit-tpl-id').value          = id;
    document.getElementById('edit-tpl-name').value        = name;
    document.getElementById('edit-tpl-description').value = description;
    document.getElementById('edit-tpl-weeks').value       = weeks || '';
    document.getElementById('edit-tpl-hours').value       = hours || '';
    const alertEl = document.getElementById('edit-tpl-alert');
    if (alertEl) alertEl.classList.add('d-none');
    editTemplateModal.show();
}

async function handleEditTemplate(e) {
    e.preventDefault();
    const token  = localStorage.getItem('token');
    const id     = document.getElementById('edit-tpl-id').value;
    const name   = document.getElementById('edit-tpl-name').value.trim();
    const desc   = document.getElementById('edit-tpl-description').value.trim();
    const weeks  = parseInt(document.getElementById('edit-tpl-weeks').value, 10) || undefined;
    const hours  = parseInt(document.getElementById('edit-tpl-hours').value, 10) || undefined;
    const alertEl = document.getElementById('edit-tpl-alert');

    if (!name) {
        if (alertEl) { alertEl.textContent = 'El nombre es obligatorio.'; alertEl.classList.remove('d-none'); }
        return;
    }

    const btn     = e.target.querySelector('button[type="submit"]');
    const spinner = btn?.querySelector('.spinner-border');
    const label   = btn?.querySelector('.btn-label');

    if (btn)     btn.disabled = true;
    if (spinner) spinner.classList.remove('d-none');
    if (label)   label.classList.add('d-none');
    if (alertEl) alertEl.classList.add('d-none');

    try {
        const res = await fetch(`${API_URL}/api/bootcamp-templates/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, description: desc, weeks, hours })
        });

        const data = await res.json();

        if (res.ok) {
            editTemplateModal.hide();
            loadTemplates();
        } else {
            if (alertEl) { alertEl.textContent = data.error || 'Error al guardar.'; alertEl.classList.remove('d-none'); }
        }
    } catch (err) {
        if (alertEl) { alertEl.textContent = 'Error de conexión.'; alertEl.classList.remove('d-none'); }
    } finally {
        if (btn)     btn.disabled = false;
        if (spinner) spinner.classList.add('d-none');
        if (label)   label.classList.remove('d-none');
    }
}
