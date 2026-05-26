'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { apiFetch, getApiUrl } from '@/lib/api';
import { showToast } from '@/lib/toast';
import Spinner from '@/components/Spinner';

// ── Types ────────────────────────────────────────────────────────────────────

interface Promotion {
  id: string;
  name: string;
  description?: string;
  weeks: number;
  totalHours?: number;
  startDate?: string;
  endDate?: string;
  teacherId?: string;
  modules?: unknown[];
}

interface Template {
  id: string;
  name: string;
  weeks?: number;
  hours?: number;
  totalHours?: number;
  description?: string;
  isCustom?: boolean;
}

interface Profile {
  name?: string;
  lastName?: string;
  email: string;
  location?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(text: string) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

const COMUNIDADES = [
  'Andalucía','Aragón','Asturias','Islas Baleares','Canarias','Cantabria',
  'Castilla-La Mancha','Castilla y León','Cataluña','Ceuta','Comunidad de Madrid',
  'Comunidad Foral de Navarra','Comunidad Valenciana','Extremadura','Galicia',
  'La Rioja','Melilla','País Vasco','Región de Murcia',
];

// ── Page component ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  // Promotions
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loadingPromotions, setLoadingPromotions] = useState(true);

  // Templates
  const [templates, setTemplates] = useState<Template[]>([]);

  // New / edit promotion modal
  const promotionModalRef = useRef<HTMLDivElement>(null);
  const [promotionModalOpen, setPromotionModalOpen] = useState(false);
  const [currentPromotionId, setCurrentPromotionId] = useState<string | null>(null);
  const [promoForm, setPromoForm] = useState({
    templateId: '', name: '', description: '', weeks: '', hours: '',
    startDate: '', endDate: '',
  });
  const [savingPromo, setSavingPromo] = useState(false);

  // Profile modal
  const profileModalRef = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileForm, setProfileForm] = useState({ name: '', lastName: '', location: '' });
  const [resetEmail, setResetEmail] = useState('');
  const [profileAlert, setProfileAlert] = useState<{ msg: string; type: string } | null>(null);
  const [passwordAlert, setPasswordAlert] = useState<{ msg: string; type: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadPromotions = useCallback(async () => {
    setLoadingPromotions(true);
    try {
      const res = await apiFetch('/api/my-promotions-all');
      if (res.status === 401) { router.replace('/login'); return; }
      if (!res.ok) throw new Error('fetch error');
      const data: Promotion[] = await res.json();
      setPromotions(data);
    } catch {
      showToast('Error cargando las promociones', 'danger');
    } finally {
      setLoadingPromotions(false);
    }
  }, [router]);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await apiFetch('/api/bootcamp-templates');
      if (res.ok) setTemplates(await res.json());
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    if (!isLoading && user) {
      loadPromotions();
      loadTemplates();
    }
  }, [isLoading, user, loadPromotions, loadTemplates]);

  // ── Bootstrap modal helpers ─────────────────────────────────────────────────

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

  // ── Promotion modal ─────────────────────────────────────────────────────────

  function openNewPromotion() {
    setCurrentPromotionId(null);
    setPromoForm({ templateId: '', name: '', description: '', weeks: '', hours: '', startDate: '', endDate: '' });
    setPromotionModalOpen(true);
    setTimeout(() => openBsModal(promotionModalRef), 50);
  }

  function applyTemplate(templateId: string) {
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) return;
    setPromoForm(f => ({
      ...f,
      templateId,
      name: tpl.name || f.name,
      description: tpl.description || f.description,
      weeks: tpl.weeks ? String(tpl.weeks) : f.weeks,
      hours: String(tpl.hours || tpl.totalHours || f.hours || ''),
    }));
  }

  async function handlePromoSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { name, description, weeks, hours, startDate, endDate, templateId } = promoForm;
    if (!name.trim()) { showToast('El nombre es obligatorio', 'warning'); return; }
    const weeksNum = parseInt(weeks);
    if (isNaN(weeksNum)) { showToast('El número de semanas es obligatorio', 'warning'); return; }

    setSavingPromo(true);
    try {
      const method = currentPromotionId ? 'PUT' : 'POST';
      const path = currentPromotionId
        ? `/api/promotions/${currentPromotionId}`
        : '/api/promotions';

      const res = await apiFetch(path, {
        method,
        body: JSON.stringify({
          name: name.trim(),
          description,
          weeks: weeksNum,
          totalHours: parseInt(hours) || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          templateId: !currentPromotionId ? (templateId || null) : null,
        }),
      });

      if (res.ok) {
        const saved: Promotion = await res.json();
        if (!currentPromotionId) {
          router.push(`/promotion?id=${saved.id}&openActa=1`);
        } else {
          closeBsModal(promotionModalRef);
          loadPromotions();
        }
      } else {
        const err = await res.json().catch(() => ({}));
        showToast((err as { error?: string }).error || 'Error al guardar', 'danger');
      }
    } catch {
      showToast('Error de conexión', 'danger');
    } finally {
      setSavingPromo(false);
    }
  }

  async function deletePromotion(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('¿Seguro que quieres eliminar esta promoción?')) return;
    try {
      const res = await apiFetch(`/api/promotions/${id}`, { method: 'DELETE' });
      if (res.ok) loadPromotions();
      else showToast('Error al eliminar', 'danger');
    } catch {
      showToast('Error de conexión', 'danger');
    }
  }

  // ── Profile modal ────────────────────────────────────────────────────────────

  async function openProfileModal() {
    setProfileAlert(null);
    setPasswordAlert(null);
    try {
      const res = await apiFetch('/api/profile');
      if (res.ok) {
        const p: Profile = await res.json();
        setProfile(p);
        setProfileForm({ name: p.name || '', lastName: p.lastName || '', location: p.location || '' });
        setResetEmail(p.email || '');
        openBsModal(profileModalRef);
      } else {
        showToast('Error cargando el perfil', 'danger');
      }
    } catch {
      showToast('Error de conexión', 'danger');
    }
  }

  async function saveProfileInfo() {
    setSavingProfile(true);
    setProfileAlert(null);
    try {
      const res = await apiFetch('/api/profile', {
        method: 'PUT',
        body: JSON.stringify(profileForm),
      });
      if (res.ok) {
        const data = await res.json();
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        stored.name = data.profile.name;
        localStorage.setItem('user', JSON.stringify(stored));
        setProfileAlert({ msg: 'Perfil actualizado correctamente', type: 'success' });
        setTimeout(() => setProfileAlert(null), 3000);
      } else {
        const d = await res.json().catch(() => ({}));
        setProfileAlert({ msg: (d as { error?: string }).error || 'Error actualizando el perfil', type: 'danger' });
      }
    } catch {
      setProfileAlert({ msg: 'Error de conexión', type: 'danger' });
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword() {
    if (!resetEmail.trim()) {
      setPasswordAlert({ msg: 'Por favor, introduce tu correo electrónico.', type: 'warning' });
      return;
    }
    setSendingReset(true);
    setPasswordAlert(null);
    try {
      const isLocal = typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const resetUrl = isLocal
        ? 'http://localhost:8000/reset-password/api-request-reset'
        : 'https://users.coderf5.es/reset-password/api-request-reset';

      const res = await fetch(resetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });
      let data: { message?: string; error?: string } = {};
      const text = await res.text();
      try { data = JSON.parse(text); } catch { /* no JSON */ }

      if (res.ok) {
        setPasswordAlert({
          msg: data.message || 'En breves recibirás un correo para cambiar tu contraseña.',
          type: 'success',
        });
      } else {
        setPasswordAlert({ msg: data.message || data.error || 'Error al enviar el correo.', type: 'danger' });
      }
    } catch {
      setPasswordAlert({ msg: 'Error de conexión.', type: 'danger' });
    } finally {
      setSendingReset(false);
    }
  }

  // ── Stats ────────────────────────────────────────────────────────────────────

  const totalModules = promotions.reduce((acc, p) => acc + (p.modules?.length ?? 0), 0);
  const isSuperAdmin = user?.role === 'superadmin';

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
      <nav className="navbar navbar-expand-lg navbar-light shadow-sm">
        <div className="container-fluid">
          <a className="navbar-brand" href="#">
            <Image
              className="page-title"
              src="/img/bootcamp_manager_logotype_bold.png"
              alt="Bootcamp Manager"
              width={200}
              height={60}
              style={{ height: 60, width: 'auto' }}
            />
          </a>

          <div className="container-sesion">
            <button
              className="navbar-toggler"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#navbarNav"
            >
              <span className="navbar-toggler-icon" />
            </button>

            <div className="collapse navbar-collapse" id="navbarNav">
              <ul className="navbar-nav ms-auto">
                <li className="nav-item dropdown">
                  <a
                    className="nav-link dropdown-toggle"
                    href="#"
                    id="userMenu"
                    role="button"
                    data-bs-toggle="dropdown"
                  >
                    <i className="bi bi-person-circle me-2" />
                    <span>{user?.name || 'Teacher'}</span>
                  </a>
                  <ul className="dropdown-menu dropdown-menu-end">
                    <li>
                      <button className="dropdown-item" onClick={openProfileModal}>
                        <i className="bi bi-person me-2" />Perfil
                      </button>
                    </li>
                    {isSuperAdmin && (
                      <>
                        <li><hr className="dropdown-divider" /></li>
                        <li>
                          <a className="dropdown-item" href="/admin">
                            <i className="bi bi-shield-lock me-2" />Panel de Admin
                          </a>
                        </li>
                      </>
                    )}
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          localStorage.clear();
                          router.replace('/login');
                        }}
                      >
                        <i className="bi bi-box-arrow-right me-2" />Cerrar Sesión
                      </button>
                    </li>
                  </ul>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Main ── */}
      <div className="container-promotions">
        <div className="row">
          <main className="ms-sm-auto">
            <div className="d-flex align-items-end justify-content-between my-4 w-100">
              <div className="d-flex align-items-end gap-3">
                <h1 className="page-title m-0">Mis Promociones</h1>
                <Image
                  src="/img/logo-factoria-b.svg"
                  alt="FactoriaF5"
                  width={50}
                  height={50}
                  style={{ height: 50, width: 'auto' }}
                  className="d-lg-block mb-1"
                />
              </div>
              <div className="d-flex align-items-center gap-3">
                <span className="text-muted small">
                  Promociones: <strong>{promotions.length}</strong>
                </span>
                <span className="text-muted small">
                  Módulos totales: <strong>{totalModules}</strong>
                </span>
                <button className="btn-new" onClick={openNewPromotion}>
                  <i className="bi bi-plus-circle me-2" />Añadir Promoción
                </button>
              </div>
            </div>

            {/* Promotions list */}
            <div className="row" id="promotions-list">
              {loadingPromotions ? (
                <div className="col-12 text-center py-5">
                  <Spinner />
                </div>
              ) : promotions.length === 0 ? (
                <div className="col-12">
                  <p className="text-muted text-center">
                    Aún no tienes promociones. ¡Crea una para empezar!
                  </p>
                </div>
              ) : (
                promotions.map(p => {
                  const isOwner = p.teacherId === user?.id;
                  return (
                    <div key={p.id} className="col-md-6 col-lg-4">
                      <div
                        className="card promotion-card"
                        style={{ cursor: 'pointer' }}
                        onClick={() => router.push(`/promotion?id=${p.id}`)}
                      >
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <h5
                              className="promotion-card-title"
                              dangerouslySetInnerHTML={{ __html: escapeHtml(p.name) }}
                            />
                            {!isOwner && (
                              <span className="badge bg-info">Collaborator</span>
                            )}
                          </div>
                          <p className="promotion-card-meta">
                            {p.description || 'Sin descripción'}
                          </p>
                          <div className="d-flex justify-content-between align-items-center mt-3">
                            <span className="badge-weeks">{p.weeks} weeks</span>
                            {isOwner && (
                              <button
                                className="btn btn-sm btn-outline-danger ms-2"
                                onClick={e => deletePromotion(p.id, e)}
                              >
                                <i className="bi bi-trash" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </main>
        </div>
      </div>

      {/* ── Profile Modal ── */}
      <div className="modal fade" id="profileModal" tabIndex={-1} ref={profileModalRef}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header bg-primary bg-opacity-10 border-primary">
              <h5 className="modal-title">Perfil</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              <ul className="nav nav-tabs mb-4" id="profileTabs" role="tablist">
                <li className="nav-item" role="presentation">
                  <button className="nav-link active" data-bs-toggle="tab" data-bs-target="#profile-content" type="button" role="tab">
                    Información general
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button className="nav-link" data-bs-toggle="tab" data-bs-target="#password-content" type="button" role="tab">
                    Cambiar contraseña
                  </button>
                </li>
              </ul>

              <div className="tab-content">
                {/* Profile tab */}
                <div className="tab-pane fade show active" id="profile-content" role="tabpanel">
                  <div className="mb-3">
                    <label htmlFor="profile-name" className="form-label">Nombre</label>
                    <input type="text" className="form-control" id="profile-name"
                      value={profileForm.name}
                      onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="profile-lastName" className="form-label">Apellido</label>
                    <input type="text" className="form-control" id="profile-lastName"
                      value={profileForm.lastName}
                      onChange={e => setProfileForm(f => ({ ...f, lastName: e.target.value }))} />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="profile-email" className="form-label">Email</label>
                    <input type="email" className="form-control" id="profile-email"
                      value={profile?.email || ''} disabled readOnly />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="profile-location" className="form-label">Comunidad Autónoma</label>
                    <select className="form-select" id="profile-location"
                      value={profileForm.location}
                      onChange={e => setProfileForm(f => ({ ...f, location: e.target.value }))}>
                      <option value="">-- Selecciona tu comunidad --</option>
                      {COMUNIDADES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  {profileAlert && (
                    <div className={`alert alert-${profileAlert.type}`}>{profileAlert.msg}</div>
                  )}
                </div>

                {/* Password tab */}
                <div className="tab-pane fade" id="password-content" role="tabpanel">
                  <div className="alert alert-info d-flex align-items-start gap-2 mb-4">
                    <i className="bi bi-info-circle-fill mt-1" />
                    <span>Te enviaremos un enlace a tu correo para que puedas cambiar tu contraseña de forma segura.</span>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="reset-email" className="form-label">Tu correo electrónico</label>
                    <input type="email" className="form-control" id="reset-email"
                      placeholder="ejemplo@correo.com"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)} />
                  </div>
                  {passwordAlert && (
                    <div className={`alert alert-${passwordAlert.type}`}>{passwordAlert.msg}</div>
                  )}
                  <div className="mt-3">
                    <button type="button" className="btn btn-primary w-100"
                      onClick={changePassword} disabled={sendingReset}>
                      {sendingReset
                        ? <Spinner size="sm" />
                        : <><i className="bi bi-envelope me-2" />Enviar enlace de cambio de contraseña</>
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
              <button type="button" className="btn btn-primary" onClick={saveProfileInfo} disabled={savingProfile}>
                {savingProfile ? <Spinner size="sm" /> : 'Guardar perfil'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── New / Edit Promotion Modal ── */}
      {promotionModalOpen && (
        <div className="modal fade" id="promotionModal" tabIndex={-1} ref={promotionModalRef}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {currentPromotionId ? 'Editar promoción' : 'Nueva promoción'}
                </h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" />
              </div>
              <form onSubmit={handlePromoSubmit}>
                <div className="modal-body">
                  {/* Template selector */}
                  <div className="mb-3">
                    <label htmlFor="promotion-template" className="form-label">
                      Plantilla de bootcamp (Opcional)
                    </label>
                    <select className="form-select" id="promotion-template"
                      value={promoForm.templateId}
                      onChange={e => applyTemplate(e.target.value)}>
                      <option value="">-- Selecciona una plantilla para empezar --</option>
                      {templates.filter(t => !t.isCustom).map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.weeks ? `${t.weeks}w` : '?w'}, {t.hours || t.totalHours ? `${t.hours || t.totalHours}h` : '?h'})
                        </option>
                      ))}
                      {templates.some(t => t.isCustom) && (
                        <optgroup label="Plantillas personalizadas">
                          {templates.filter(t => t.isCustom).map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.weeks ? `${t.weeks}w` : '?w'}, {t.hours || t.totalHours ? `${t.hours || t.totalHours}h` : '?h'})
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    <small className="form-text text-muted">
                      Seleccionar una plantilla te ayudará a acelerar el proceso.
                    </small>
                  </div>
                  <hr />
                  <div className="mb-3">
                    <label htmlFor="promotion-name" className="form-label">Nombre de la promoción</label>
                    <input type="text" className="form-control" id="promotion-name" required
                      value={promoForm.name}
                      onChange={e => setPromoForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="promotion-desc" className="form-label">Descripción</label>
                    <textarea className="form-control" id="promotion-desc" rows={3}
                      value={promoForm.description}
                      onChange={e => setPromoForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="promotion-weeks" className="form-label">Número de semanas</label>
                    <input type="number" className="form-control" id="promotion-weeks" min={1} required
                      value={promoForm.weeks}
                      onChange={e => setPromoForm(f => ({ ...f, weeks: e.target.value }))} />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="promotion-hours" className="form-label">Horas totales de formación</label>
                    <input type="number" className="form-control" id="promotion-hours" min={1} placeholder="ej. 900"
                      value={promoForm.hours}
                      onChange={e => setPromoForm(f => ({ ...f, hours: e.target.value }))} />
                    <small className="form-text text-muted">Número de horas lectivas totales del programa.</small>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="promotion-start" className="form-label">Fecha de inicio</label>
                    <input type="date" className="form-control" id="promotion-start"
                      value={promoForm.startDate}
                      onChange={e => setPromoForm(f => ({ ...f, startDate: e.target.value }))} />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="promotion-end" className="form-label">Fecha de fin</label>
                    <input type="date" className="form-control" id="promotion-end"
                      value={promoForm.endDate}
                      onChange={e => setPromoForm(f => ({ ...f, endDate: e.target.value }))} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={savingPromo}>
                    {savingPromo ? <Spinner size="sm" /> : 'Crear Promoción'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
