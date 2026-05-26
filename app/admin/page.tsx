'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/api';
import { showToast } from '@/lib/toast';
import Spinner from '@/components/Spinner';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Teacher {
  id: string;
  name: string;
  email: string;
  userRole?: string;
  createdAt: string;
}

interface Template {
  id: string;
  name: string;
  description?: string;
  weeks?: number;
  hours?: number;
  isCustom?: boolean;
  modules?: unknown[];
  competences?: unknown[];
  modulesPildoras?: Array<{ pildoras?: unknown[] }>;
}

interface Promotion {
  id: string;
  name: string;
  weeks?: number;
}

interface CreateResult {
  provisionalPassword?: string;
  externalRegistered?: boolean;
  warning?: string;
  emailWarning?: string;
}

type Section = 'users' | 'templates';
type AlertState = { msg: string; type: string } | null;

const USER_ROLES = ['Formador/a', 'CoFormador/a', 'Coordinador/a'] as const;
const ROLE_BADGE: Record<string, string> = {
  'Formador/a': 'primary',
  'CoFormador/a': 'success',
  'Coordinador/a': 'warning',
};

function escapeHtml(text: string) {
  if (typeof document === 'undefined') return text;
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  // Guard: superadmin only
  useEffect(() => {
    if (!isLoading && user && user.role !== 'superadmin') {
      router.replace('/dashboard');
    }
  }, [isLoading, user, router]);

  const [section, setSection] = useState<Section>('users');

  // ── Users state ──────────────────────────────────────────────────────────────
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);

  // Create modal
  const createModalRef = useRef<HTMLDivElement>(null);
  const [createForm, setCreateForm] = useState({ name: '', email: '', userRole: 'Formador/a' });
  const [creating, setCreating] = useState(false);

  // Edit modal
  const editModalRef = useRef<HTMLDivElement>(null);
  const [editForm, setEditForm] = useState({ id: '', name: '', email: '', userRole: 'Formador/a' });
  const [saving, setSaving] = useState(false);

  // Success modal
  const successModalRef = useRef<HTMLDivElement>(null);
  const [createResult, setCreateResult] = useState<CreateResult & { email?: string } | null>(null);

  // ── Templates state ──────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [tplForm, setTplForm] = useState({ promotionId: '', name: '', description: '' });
  const [tplFeedback, setTplFeedback] = useState<AlertState>(null);
  const [creatingTpl, setCreatingTpl] = useState(false);

  // Edit template modal
  const editTplModalRef = useRef<HTMLDivElement>(null);
  const [editTplForm, setEditTplForm] = useState({ id: '', name: '', description: '', weeks: '', hours: '' });
  const [editTplAlert, setEditTplAlert] = useState<string | null>(null);
  const [savingTpl, setSavingTpl] = useState(false);

  // ── Bootstrap helpers ─────────────────────────────────────────────────────────
  function openBsModal(ref: React.RefObject<HTMLDivElement | null>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bs = (window as any).bootstrap;
    if (bs?.Modal && ref.current) new bs.Modal(ref.current).show();
  }
  function closeBsModal(ref: React.RefObject<HTMLDivElement | null>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bs = (window as any).bootstrap;
    if (bs?.Modal && ref.current) bs.Modal.getInstance(ref.current)?.hide();
  }

  // ── Load data ─────────────────────────────────────────────────────────────────
  const loadTeachers = useCallback(async () => {
    setLoadingTeachers(true);
    try {
      const res = await apiFetch('/api/admin/teachers');
      if (res.ok) setTeachers(await res.json());
      else showToast('Error cargando usuarios', 'danger');
    } catch {
      showToast('Error de conexión', 'danger');
    } finally {
      setLoadingTeachers(false);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await apiFetch('/api/bootcamp-templates');
      if (res.ok) setTemplates(await res.json());
    } catch { /* non-critical */ }
    finally { setLoadingTemplates(false); }
  }, []);

  const loadPromotionsForSelect = useCallback(async () => {
    try {
      const res = await apiFetch('/api/admin/all-promotions');
      if (res.ok) setPromotions(await res.json());
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    if (!isLoading && user) loadTeachers();
  }, [isLoading, user, loadTeachers]);

  useEffect(() => {
    if (section === 'templates') {
      loadTemplates();
      loadPromotionsForSelect();
    }
  }, [section, loadTemplates, loadPromotionsForSelect]);

  // ── Users CRUD ────────────────────────────────────────────────────────────────
  async function handleCreateTeacher(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await apiFetch('/api/admin/teachers', {
        method: 'POST',
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (res.ok) {
        closeBsModal(createModalRef);
        setCreateForm({ name: '', email: '', userRole: 'Formador/a' });
        setCreateResult({ ...data, email: createForm.email });
        setTimeout(() => openBsModal(successModalRef), 300);
        loadTeachers();
      } else {
        showToast(data.error || data.message || 'Error al crear usuario', 'danger');
      }
    } catch {
      showToast('Error de conexión', 'danger');
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdateTeacher(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { id, ...body } = editForm;
      const res = await apiFetch(`/api/admin/teachers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      if (res.ok) {
        closeBsModal(editModalRef);
        loadTeachers();
      } else {
        const d = await res.json().catch(() => ({}));
        showToast((d as { error?: string }).error || 'Error al actualizar', 'danger');
      }
    } catch {
      showToast('Error de conexión', 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function deleteTeacher(id: string) {
    if (!confirm('¿Eliminar este usuario? Esta acción no se puede deshacer.')) return;
    try {
      const res = await apiFetch(`/api/admin/teachers/${id}`, { method: 'DELETE' });
      if (res.ok) loadTeachers();
      else showToast('Error al eliminar', 'danger');
    } catch {
      showToast('Error de conexión', 'danger');
    }
  }

  // ── Templates CRUD ────────────────────────────────────────────────────────────
  async function handleCreateTemplateFromPromotion(e: React.FormEvent) {
    e.preventDefault();
    if (!tplForm.promotionId || !tplForm.name.trim()) return;
    setCreatingTpl(true);
    setTplFeedback(null);
    try {
      const res = await apiFetch('/api/admin/templates-from-promotion', {
        method: 'POST',
        body: JSON.stringify({
          promotionId: tplForm.promotionId,
          templateName: tplForm.name.trim(),
          templateDescription: tplForm.description.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTplFeedback({
          msg: `Template "${(data as { name?: string }).name || ''}" creado con ${((data as { modules?: unknown[] }).modules || []).length} módulos.`,
          type: 'success',
        });
        setTplForm({ promotionId: '', name: '', description: '' });
        loadTemplates();
      } else {
        setTplFeedback({ msg: (data as { error?: string }).error || 'Error al crear', type: 'danger' });
      }
    } catch {
      setTplFeedback({ msg: 'Error de conexión', type: 'danger' });
    } finally {
      setCreatingTpl(false);
    }
  }

  async function deleteTemplate(id: string, name: string) {
    if (!confirm(`¿Eliminar la plantilla "${name}"? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await apiFetch(`/api/bootcamp-templates/${id}`, { method: 'DELETE' });
      if (res.ok) loadTemplates();
      else showToast('Error al eliminar', 'danger');
    } catch {
      showToast('Error de conexión', 'danger');
    }
  }

  function openEditTemplateModal(t: Template) {
    setEditTplForm({
      id: t.id,
      name: t.name,
      description: t.description || '',
      weeks: t.weeks ? String(t.weeks) : '',
      hours: t.hours ? String(t.hours) : '',
    });
    setEditTplAlert(null);
    setTimeout(() => openBsModal(editTplModalRef), 50);
  }

  async function handleEditTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!editTplForm.name.trim()) { setEditTplAlert('El nombre es obligatorio.'); return; }
    setSavingTpl(true);
    setEditTplAlert(null);
    try {
      const res = await apiFetch(`/api/bootcamp-templates/${editTplForm.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editTplForm.name.trim(),
          description: editTplForm.description.trim(),
          weeks: parseInt(editTplForm.weeks) || undefined,
          hours: parseInt(editTplForm.hours) || undefined,
        }),
      });
      if (res.ok) {
        closeBsModal(editTplModalRef);
        loadTemplates();
      } else {
        const d = await res.json().catch(() => ({}));
        setEditTplAlert((d as { error?: string }).error || 'Error al guardar.');
      }
    } catch {
      setEditTplAlert('Error de conexión.');
    } finally {
      setSavingTpl(false);
    }
  }

  // ── Loading guard ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Navbar ── */}
      <nav className="navbar navbar-expand-lg navbar-light bg-light shadow-sm">
        <div className="container-fluid">
          <button
            className="navbar-toggler d-md-none me-2"
            type="button"
            data-bs-toggle="offcanvas"
            data-bs-target="#adminSidebarOffcanvas"
          >
            <span className="navbar-toggler-icon" />
          </button>
          <a className="navbar-brand" href="/dashboard">
            <Image
              src="/img/crok_manager_logotype_bold.png"
              alt="Bootcamp Manager"
              width={160}
              height={60}
              style={{ height: 60, width: 'auto' }}
            />
          </a>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto align-items-center">
              <li className="nav-item dropdown">
                <a className="nav-link dropdown-toggle" href="#" id="userMenu" role="button" data-bs-toggle="dropdown">
                  <i className="bi bi-person-circle me-2" />
                  <span>{user?.name || 'Admin'}</span>
                </a>
                <ul className="dropdown-menu dropdown-menu-end">
                  <li>
                    <button className="dropdown-item" onClick={() => { localStorage.clear(); router.replace('/login'); }}>
                      <i className="bi bi-box-arrow-right me-2" />Logout
                    </button>
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <div className="container-fluid">
        <div className="row">
          {/* ── Sidebar ── */}
          <nav
            className="col-md-3 col-lg-2 admin-sidebar px-0 offcanvas-md offcanvas-start"
            tabIndex={-1}
            id="adminSidebarOffcanvas"
          >
            <div className="offcanvas-header d-md-none">
              <h5 className="offcanvas-title">Admin</h5>
              <button type="button" className="btn-close" data-bs-dismiss="offcanvas" data-bs-target="#adminSidebarOffcanvas" />
            </div>
            <div className="offcanvas-body admin-sidebar-sticky">
              <Image
                src="/img/logo-factoria-b.svg"
                alt="FactoriaF5"
                width={80}
                height={40}
                className="mt-4 mb-2 ms-2 d-none d-md-inline"
                style={{ height: 40, width: 'auto' }}
              />
              <ul className="nav flex-column">
                <li className="nav-item">
                  <a className="nav-link nav-link-back" href="/dashboard">
                    <i className="bi bi-arrow-left me-2" />Dashboard
                  </a>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link w-100 text-start${section === 'users' ? ' active' : ''}`}
                    onClick={() => setSection('users')}
                  >
                    <i className="bi bi-people me-2" />Gestión de Usuarios
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link w-100 text-start${section === 'templates' ? ' active' : ''}`}
                    onClick={() => setSection('templates')}
                  >
                    <i className="bi bi-layout-text-window me-2" />Plantillas de Bootcamp
                  </button>
                </li>
                <li className="nav-item mt-3">
                  <button
                    className="nav-link w-100 text-start text-danger fw-semibold"
                    onClick={() => { localStorage.clear(); router.replace('/login'); }}
                  >
                    <i className="bi bi-box-arrow-right me-2" />Cerrar sesión
                  </button>
                </li>
              </ul>
            </div>
          </nav>

          {/* ── Main ── */}
          <main className="col-md-9 ms-sm-auto col-lg-10 px-md-4">

            {/* ── Users section ── */}
            {section === 'users' && (
              <div>
                <div className="d-flex justify-content-between flex-wrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                  <h1 className="h2">Cuentas de Usuario</h1>
                  <button className="btn btn-primary" onClick={() => openBsModal(createModalRef)}>
                    <i className="bi bi-person-plus me-2" />Crear Usuario
                  </button>
                </div>

                <div className="row" id="teachers-list">
                  {loadingTeachers ? (
                    <div className="col-12 text-center py-5"><Spinner /></div>
                  ) : teachers.length === 0 ? (
                    <div className="col-12 text-center text-muted py-5">No hay usuarios.</div>
                  ) : (
                    teachers.map(t => {
                      const role = t.userRole || 'Formador/a';
                      const badge = ROLE_BADGE[role] || 'secondary';
                      return (
                        <div key={t.id} className="col-md-6 col-lg-4 mb-4">
                          <div className="card teacher-card shadow-sm h-100">
                            <div className="card-body">
                              <div className="d-flex align-items-center mb-3">
                                <div className="bg-primary bg-opacity-10 text-primary rounded-circle p-3 me-3">
                                  <i className="bi bi-person-badge fs-4" />
                                </div>
                                <div>
                                  <h5 className="card-title mb-0">{t.name}</h5>
                                  <span className={`badge bg-${badge} mt-1`}>{role}</span>
                                </div>
                              </div>
                              <p className="card-text">
                                <i className="bi bi-envelope me-2 text-primary" />{t.email}
                              </p>
                              <div className="d-flex gap-2 mt-4">
                                <button
                                  className="btn btn-sm btn-outline-warning w-100"
                                  onClick={() => {
                                    setEditForm({ id: t.id, name: t.name, email: t.email, userRole: role });
                                    setTimeout(() => openBsModal(editModalRef), 50);
                                  }}
                                >
                                  <i className="bi bi-pencil me-1" /> Editar
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger w-100"
                                  onClick={() => deleteTeacher(t.id)}
                                >
                                  <i className="bi bi-trash me-1" /> Eliminar
                                </button>
                              </div>
                            </div>
                            <div className="card-footer bg-transparent border-0 text-muted small pb-3">
                              Creado: {new Date(t.createdAt).toLocaleDateString('es-ES')}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ── Templates section ── */}
            {section === 'templates' && (
              <div>
                <div className="d-flex justify-content-between align-items-center pt-3 pb-2 mb-3 border-bottom">
                  <h1 className="h2"><i className="bi bi-layout-text-window me-2" />Plantillas de bootcamp</h1>
                </div>

                {/* Create from promotion */}
                <div className="card shadow-sm mb-4 border-0" style={{ borderLeft: '4px solid var(--app-color-primary)' }}>
                  <div className="card-body p-4">
                    <h5 className="fw-bold mb-1">
                      <i className="bi bi-magic me-2 text-primary" />Crea una plantilla de una promoción
                    </h5>
                    <p className="text-muted small mb-3">
                      Elige una promoción existente y guarda todo su contenido para que sea reusable como plantilla.
                    </p>
                    <form onSubmit={handleCreateTemplateFromPromotion} className="row g-3 align-items-end">
                      <div className="col-md-4">
                        <label className="form-label fw-semibold">Promoción</label>
                        <select
                          className="form-select"
                          value={tplForm.promotionId}
                          required
                          onChange={e => {
                            const id = e.target.value;
                            const promo = promotions.find(p => p.id === id);
                            setTplForm(f => ({ ...f, promotionId: id, name: f.name || promo?.name || '' }));
                          }}
                        >
                          <option value="">— Selecciona promoción —</option>
                          {promotions.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name}{p.weeks ? ` (${p.weeks}w)` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fw-semibold">Nombre de la plantilla</label>
                        <input
                          type="text" className="form-control" required placeholder="e.g. IA Bootcamp P6"
                          value={tplForm.name}
                          onChange={e => setTplForm(f => ({ ...f, name: e.target.value }))}
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label fw-semibold">
                          Descripción <span className="text-muted">(Opcional)</span>
                        </label>
                        <input
                          type="text" className="form-control" placeholder="Descripción breve"
                          value={tplForm.description}
                          onChange={e => setTplForm(f => ({ ...f, description: e.target.value }))}
                        />
                      </div>
                      <div className="col-md-1 d-flex">
                        <button type="submit" className="btn btn-primary w-100" disabled={creatingTpl}>
                          {creatingTpl ? <Spinner size="sm" /> : <i className="bi bi-plus-lg" />}
                        </button>
                      </div>
                    </form>
                    {tplFeedback && (
                      <div className={`alert alert-${tplFeedback.type} py-2 mb-0 mt-2`}
                        dangerouslySetInnerHTML={{ __html: tplFeedback.msg }} />
                    )}
                  </div>
                </div>

                {/* Templates list */}
                <h5 className="fw-bold mb-3">Plantillas existentes</h5>
                <div className="row g-3">
                  {loadingTemplates ? (
                    <div className="col-12 text-center py-4"><Spinner /></div>
                  ) : templates.length === 0 ? (
                    <div className="col-12 text-muted text-center py-4">No hay plantillas.</div>
                  ) : (
                    templates.map(t => {
                      const modulesCount = (t.modules || []).length;
                      const competencesCount = (t.competences || []).length;
                      const pildorasCount = (t.modulesPildoras || []).reduce(
                        (acc, mp) => acc + (mp.pildoras?.length ?? 0), 0
                      );
                      return (
                        <div key={t.id} className="col-md-6 col-lg-4">
                          <div
                            className="card h-100 shadow-sm border-0"
                            style={{ borderLeft: `4px solid ${t.isCustom ? '#28a745' : '#ff4700'}` }}
                          >
                            <div className="card-body">
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <h6 className="fw-bold mb-0">{t.name}</h6>
                                <span className={`badge ${t.isCustom ? 'bg-success' : 'bg-primary'} ms-2`}>
                                  {t.isCustom ? 'Personalizada' : 'Sistema'}
                                </span>
                              </div>
                              <p className="text-muted small mb-2">{t.description || '—'}</p>
                              <div className="d-flex flex-wrap gap-2 mb-3">
                                <span className="badge bg-light text-dark border">
                                  <i className="bi bi-calendar3 me-1" />{t.weeks || '?'}w
                                </span>
                                <span className="badge bg-light text-dark border">
                                  <i className="bi bi-clock me-1" />{t.hours || '?'}h
                                </span>
                                <span className="badge bg-light text-dark border">
                                  <i className="bi bi-grid me-1" />{modulesCount} módulos
                                </span>
                                <span className="badge bg-light text-dark border">
                                  <i className="bi bi-stars me-1" />{competencesCount} competencias
                                </span>
                                <span className="badge bg-light text-dark border">
                                  <i className="bi bi-lightbulb me-1" />{pildorasCount} píldoras
                                </span>
                              </div>
                              <div className="d-flex gap-2 flex-wrap">
                                <button
                                  className="btn btn-sm btn-outline-warning flex-fill"
                                  onClick={() => openEditTemplateModal(t)}
                                >
                                  <i className="bi bi-pencil me-1" />Editar
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger flex-fill"
                                  onClick={() => deleteTemplate(t.id, t.name)}
                                >
                                  <i className="bi bi-trash me-1" />Eliminar
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ── Create User Modal ── */}
      <div className="modal fade" id="createTeacherModal" tabIndex={-1} ref={createModalRef}>
        <div className="modal-dialog">
          <div className="modal-content border-0 shadow">
            <div className="modal-header border-0 bg-primary text-white">
              <h5 className="modal-title"><i className="bi bi-person-plus me-2" />Crear nuevo usuario</h5>
              <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" />
            </div>
            <form onSubmit={handleCreateTeacher}>
              <div className="modal-body p-4">
                <div className="alert alert-light border small mb-3 py-2">
                  <i className="bi bi-info-circle me-1 text-primary" />
                  Se generará una contraseña provisional y se registrará automáticamente en <strong>users.coderf5.es</strong>.
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Nombre completo</label>
                  <input type="text" className="form-control" required placeholder="Ej: Ana García"
                    value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Correo electrónico</label>
                  <input type="email" className="form-control" required placeholder="ana@factoriaf5.org"
                    value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} />
                  <div className="form-text">Se enviará la contraseña provisional a este correo.</div>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Rol</label>
                  <select className="form-select" required value={createForm.userRole}
                    onChange={e => setCreateForm(f => ({ ...f, userRole: e.target.value }))}>
                    {USER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer border-0">
                <button type="button" className="btn btn-light" data-bs-dismiss="modal">Cancelar</button>
                <button type="submit" className="btn btn-primary px-4" disabled={creating}>
                  {creating ? <Spinner size="sm" /> : <><i className="bi bi-person-plus me-1" />Crear cuenta</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ── Edit User Modal ── */}
      <div className="modal fade" id="editTeacherModal" tabIndex={-1} ref={editModalRef}>
        <div className="modal-dialog">
          <div className="modal-content border-0 shadow">
            <div className="modal-header border-0 bg-primary text-white">
              <h5 className="modal-title"><i className="bi bi-pencil me-2" />Editar usuario</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" />
            </div>
            <form onSubmit={handleUpdateTeacher}>
              <div className="modal-body p-4">
                <div className="mb-3">
                  <label className="form-label fw-semibold">Nombre completo</label>
                  <input type="text" className="form-control" required
                    value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Correo electrónico</label>
                  <input type="email" className="form-control" required
                    value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Rol</label>
                  <select className="form-select" value={editForm.userRole}
                    onChange={e => setEditForm(f => ({ ...f, userRole: e.target.value }))}>
                    {USER_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer border-0">
                <button type="button" className="btn btn-light" data-bs-dismiss="modal">Cancelar</button>
                <button type="submit" className="btn btn-primary px-4" disabled={saving}>
                  {saving ? <Spinner size="sm" /> : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ── Success Modal (provisional password) ── */}
      <div className="modal fade" id="successModal" tabIndex={-1} ref={successModalRef}>
        <div className="modal-dialog">
          <div className="modal-content border-0 shadow">
            <div className="modal-header border-0 bg-success text-white">
              <h5 className="modal-title"><i className="bi bi-check-circle me-2" />Cuenta creada</h5>
              <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body p-4">
              <div className="text-center mb-3">
                <i className="bi bi-person-check text-success" style={{ fontSize: '3rem' }} />
              </div>
              <p className="text-center">
                La cuenta para <strong>{createResult?.email}</strong> ha sido creada.
              </p>
              <div className="alert alert-info py-3 shadow-sm border-0 mb-3">
                <p className="mb-1 fw-semibold small text-muted">Contraseña provisional:</p>
                <div className="d-flex align-items-center gap-2">
                  <h3 className="mb-0 user-select-all font-monospace flex-grow-1" id="provisional-password">
                    {createResult?.provisionalPassword || '—'}
                  </h3>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => navigator.clipboard.writeText(createResult?.provisionalPassword || '')}
                  >
                    <i className="bi bi-clipboard" />
                  </button>
                </div>
              </div>
              {createResult?.externalRegistered ? (
                <div className="text-success small">
                  <i className="bi bi-check-circle me-1" />Registrado en el sistema de autenticación externo.
                </div>
              ) : (
                <div className="text-warning small">
                  <i className="bi bi-exclamation-triangle me-1" />
                  {createResult?.warning || 'No se pudo registrar en el sistema externo.'}
                </div>
              )}
              {createResult?.emailWarning && (
                <div className="text-warning small mt-1">{createResult.emailWarning}</div>
              )}
              <div className="alert alert-light border py-2 small mb-0 mt-3">
                <i className="bi bi-info-circle me-1 text-primary" />
                El usuario debe iniciar sesión con estas credenciales.
                La contraseña ha sido registrada en <code>users.coderf5.es</code>.
              </div>
            </div>
            <div className="modal-footer border-0">
              <button type="button" className="btn btn-success w-100" data-bs-dismiss="modal">
                <i className="bi bi-check-lg me-1" />Entendido
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Edit Template Modal ── */}
      <div className="modal fade" tabIndex={-1} ref={editTplModalRef}>
        <div className="modal-dialog">
          <div className="modal-content border-0 shadow">
            <div className="modal-header border-0" style={{ background: 'var(--app-color-primary)' }}>
              <h5 className="modal-title text-white">
                <i className="bi bi-pencil-square me-2" />Editar plantilla
              </h5>
              <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" />
            </div>
            <form onSubmit={handleEditTemplate}>
              <div className="modal-body p-4">
                <div className="mb-3">
                  <label className="form-label fw-semibold">Nombre <span className="text-danger">*</span></label>
                  <input type="text" className="form-control" required placeholder="Nombre de la plantilla"
                    value={editTplForm.name} onChange={e => setEditTplForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Descripción</label>
                  <input type="text" className="form-control" placeholder="Descripción breve"
                    value={editTplForm.description} onChange={e => setEditTplForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="row g-3">
                  <div className="col-6">
                    <label className="form-label fw-semibold">Semanas</label>
                    <input type="number" className="form-control" min={1} placeholder="Ej: 24"
                      value={editTplForm.weeks} onChange={e => setEditTplForm(f => ({ ...f, weeks: e.target.value }))} />
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-semibold">Horas totales</label>
                    <input type="number" className="form-control" min={1} placeholder="Ej: 840"
                      value={editTplForm.hours} onChange={e => setEditTplForm(f => ({ ...f, hours: e.target.value }))} />
                  </div>
                </div>
                {editTplAlert && (
                  <div className="alert alert-danger mt-3">{editTplAlert}</div>
                )}
              </div>
              <div className="modal-footer border-0">
                <button type="button" className="btn btn-light" data-bs-dismiss="modal">Cancelar</button>
                <button type="submit" className="btn btn-primary px-4" disabled={savingTpl}>
                  {savingTpl ? <Spinner size="sm" /> : <><i className="bi bi-save me-1" />Guardar cambios</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Admin layout styles (scoped to this page) */}
      <style>{`
        .admin-sidebar {
          background-image: url("/img/Fondo-factoria-f5-color.png");
          background-size: 150px 150px;
          background-repeat: repeat;
          overflow-y: auto;
        }
        @media (min-width: 768px) {
          .admin-sidebar {
            position: fixed;
            top: 80px;
            bottom: 0;
            left: 0;
            z-index: 100;
            padding: 20px 0;
            border-right: 2px solid var(--app-color-primary);
          }
          main { margin-top: 80px; }
        }
        @media (max-width: 767.98px) {
          main { margin-top: 0; }
        }
        .admin-sidebar-sticky { padding: 0 20px; }
        .admin-sidebar .nav-link {
          background-color: #ffffffbe;
          color: #333;
          padding: 10px 15px;
          border-radius: 5px;
          margin: 0.2rem;
          transition: all 0.3s ease;
          border: none;
          cursor: pointer;
        }
        .admin-sidebar .nav-link:hover {
          background-color: #fff;
          color: var(--app-color-primary);
          border-left: 3px solid var(--app-color-primary);
        }
        .admin-sidebar .nav-link.active {
          background-color: #fff;
          color: var(--app-color-primary);
        }
        .nav-link-back {
          background-color: var(--app-color-primary) !important;
          color: white !important;
          box-shadow: rgba(62,25,1,0.29) 2px 2px 6px;
          text-decoration: none;
          display: block;
        }
        .nav-link-back:hover {
          background-color: #e63a00 !important;
          color: white !important;
          border-left: none !important;
        }
        .teacher-card {
          border: 2px solid var(--app-color-primary);
          border-radius: 12px;
          background-color: #fff;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .teacher-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(255,71,0,0.15);
        }
      `}</style>
    </>
  );
}
