'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { withBasePath } from '../_lib/basePath';
import {
  CircleUser,
  LogOut,
  Menu,
  ArrowLeft,
  Users,
  LayoutPanelLeft,
  UserPlus,
  Pencil,
  PencilLine,
  Trash2,
  Save,
  Plus,
  Check,
  Clipboard,
  Mail,
  Calendar,
  Clock,
  AlertTriangle,
  Info,
  CheckCircle2,
  Lightbulb,
  Sparkles,
  UserCheck,
  BadgeCheck,
  Grid3x3,
  Wand2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet';
import Spinner from '@/components/Spinner';

import { useAuth } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/api';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';

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

// Mapping de rol a clases de color (Tailwind)
const ROLE_BADGE_CLASS: Record<string, string> = {
  'Formador/a': 'bg-blue-500 text-white hover:bg-blue-500',
  'CoFormador/a': 'bg-green-500 text-white hover:bg-green-500',
  'Coordinador/a': 'bg-yellow-500 text-white hover:bg-yellow-500',
};

// ── Sidebar content (reusable: Sheet mobile + aside desktop) ─────────────────

function AdminSidebarContent({
  section,
  setSection,
  onItemClick,
  onLogout,
}: {
  section: Section;
  setSection: (s: Section) => void;
  onItemClick?: () => void;
  onLogout: () => void;
}) {
  const handleClick = (s: Section) => {
    setSection(s);
    onItemClick?.();
  };

  return (
    <div className="flex flex-col h-full">
      <nav className="flex flex-col gap-1">
        <a
          href="/dashboard"
          className="flex items-center gap-2 px-3 py-2 rounded-md text-white bg-crok hover:bg-crok-hover transition-colors no-underline shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </a>

        <button
          type="button"
          onClick={() => handleClick('users')}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors',
            section === 'users'
              ? 'bg-white text-crok font-semibold border-l-4 border-crok'
              : 'bg-white/70 text-text hover:bg-white hover:text-crok'
          )}
        >
          <Users className="h-4 w-4" /> Gestión de Usuarios
        </button>

        <button
          type="button"
          onClick={() => handleClick('templates')}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors',
            section === 'templates'
              ? 'bg-white text-crok font-semibold border-l-4 border-crok'
              : 'bg-white/70 text-text hover:bg-white hover:text-crok'
          )}
        >
          <LayoutPanelLeft className="h-4 w-4" /> Plantillas Bootcamp
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-md text-left text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold mt-3"
        >
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>
      </nav>
    </div>
  );
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

  // ── Sheet (sidebar mobile) ──
  const [sheetOpen, setSheetOpen] = useState(false);

  // ── Users state ──
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);

  // Create user modal (controlled)
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '', userRole: 'Formador/a' });
  const [creating, setCreating] = useState(false);

  // Edit user modal (controlled)
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ id: '', name: '', email: '', userRole: 'Formador/a' });
  const [saving, setSaving] = useState(false);

  // Success modal (provisional password)
  const [successOpen, setSuccessOpen] = useState(false);
  const [createResult, setCreateResult] = useState<CreateResult & { email?: string } | null>(null);

  // ── Templates state ──
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [tplForm, setTplForm] = useState({ promotionId: '', name: '', description: '' });
  const [tplFeedback, setTplFeedback] = useState<AlertState>(null);
  const [creatingTpl, setCreatingTpl] = useState(false);

  // Edit template modal (controlled)
  const [editTplOpen, setEditTplOpen] = useState(false);
  const [editTplForm, setEditTplForm] = useState({ id: '', name: '', description: '', weeks: '', hours: '' });
  const [editTplAlert, setEditTplAlert] = useState<string | null>(null);
  const [savingTpl, setSavingTpl] = useState(false);

  // ── Load data ──

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

  // ── Users CRUD ──

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
        setCreateOpen(false);
        setCreateForm({ name: '', email: '', userRole: 'Formador/a' });
        setCreateResult({ ...data, email: createForm.email });
        setTimeout(() => setSuccessOpen(true), 300);
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
        setEditOpen(false);
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

  // ── Templates CRUD ──

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
    setEditTplOpen(true);
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
        setEditTplOpen(false);
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

  function logout() {
    localStorage.clear();
    router.replace('/login');
  }

  // ── Loading guard ──
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner />
      </div>
    );
  }

  // ── Render ──
  return (
    <div className="min-h-screen flex-1 w-full bg-[#f19976]">
      {/* ── Navbar (idéntico al dashboard) ── */}
      <nav
        className="bg-crok bg-repeat shadow-md flex items-center justify-between px-4 md:px-6 py-3"
        style={{
          backgroundImage: "url('/img/Fondo-factoria-f5-color.png')",
          backgroundSize: '150px 150px',
        }}
      >
        <div className="flex items-center gap-2">
          {/* Hamburger mobile */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden bg-transparent text-white border border-white/30 hover:bg-white hover:text-crok hover:border-white"
                aria-label="Abrir menú"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-4 bg-[#f19976]">
              <AdminSidebarContent
                section={section}
                setSection={setSection}
                onItemClick={() => setSheetOpen(false)}
                onLogout={logout}
              />
            </SheetContent>
          </Sheet>

          <a href="/dashboard" className="flex items-center gap-3 no-underline">
            <Image
              src={withBasePath('/img/logo-factoria-b.svg')}
              alt="Factoría F5"
              width={120}
              height={44}
              className="w-auto"
              style={{ height: 'auto', maxHeight: 44 }}
              priority
            />
            <span className="text-white font-bold text-xl leading-tight tracking-tight">
              Bootcamp<br />Manager
            </span>
          </a>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="bg-transparent text-white border border-white/30 hover:bg-white hover:text-crok hover:border-white gap-2"
            >
              <CircleUser className="h-4 w-4" />
              <span>{user?.name || 'Admin'}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>

      {/* ── Layout: sidebar desktop + main ── */}
      <div className="flex">
        {/* Sidebar desktop (hidden < md) */}
        <aside
          className="hidden md:block w-64 shrink-0 p-4 bg-repeat min-h-[calc(100vh-72px)] border-r-2 border-crok"
          style={{
            backgroundImage: "url('/img/Fondo-factoria-f5-color.png')",
            backgroundSize: '150px 150px',
          }}
        >
          <AdminSidebarContent
            section={section}
            setSection={setSection}
            onLogout={logout}
          />
        </aside>

        {/* Main */}
        <main className="flex-1 p-4 md:p-6">
          {/* ── Users section ── */}
          {section === 'users' && (
            <div>
              <div className="flex flex-wrap justify-between items-center gap-3 pb-3 mb-4 border-b border-white/40">
                <h1 className="text-3xl font-bold text-white drop-shadow m-0">Cuentas de Usuario</h1>
                <Button
                  onClick={() => setCreateOpen(true)}
                  className="bg-crok hover:bg-crok-hover text-crok-on"
                >
                  <UserPlus className="mr-2 h-4 w-4" /> Crear Usuario
                </Button>
              </div>

              {loadingTeachers ? (
                <div className="flex justify-center py-12"><Spinner /></div>
              ) : teachers.length === 0 ? (
                <div className="text-white/90 text-center py-12">No hay usuarios.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teachers.map(t => {
                    const role = t.userRole || 'Formador/a';
                    const badgeClass = ROLE_BADGE_CLASS[role] || 'bg-gray-500 text-white';
                    return (
                      <div
                        key={t.id}
                        className="bg-white rounded-xl shadow-md border-2 border-crok p-4 hover:-translate-y-1 hover:shadow-lg transition-all flex flex-col"
                      >
                        <div className="flex items-center mb-3 gap-3">
                          <div className="bg-crok-soft text-crok rounded-full p-3 shrink-0">
                            <BadgeCheck className="h-6 w-6" />
                          </div>
                          <div className="min-w-0">
                            <h5 className="font-bold text-lg m-0 truncate">{t.name}</h5>
                            <Badge className={cn('mt-1', badgeClass)}>{role}</Badge>
                          </div>
                        </div>
                        <p className="flex items-center gap-2 text-sm text-text-muted mb-4 truncate">
                          <Mail className="h-4 w-4 text-crok shrink-0" />{t.email}
                        </p>
                        <div className="flex gap-2 mt-auto">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 border-yellow-500 text-yellow-600 hover:bg-yellow-500 hover:text-white"
                            onClick={() => {
                              setEditForm({ id: t.id, name: t.name, email: t.email, userRole: role });
                              setEditOpen(true);
                            }}
                          >
                            <Pencil className="mr-1 h-3 w-3" /> Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 border-red-500 text-red-600 hover:bg-red-500 hover:text-white"
                            onClick={() => deleteTeacher(t.id)}
                          >
                            <Trash2 className="mr-1 h-3 w-3" /> Eliminar
                          </Button>
                        </div>
                        <div className="text-xs text-text-muted mt-3 pt-2 border-t">
                          Creado: {new Date(t.createdAt).toLocaleDateString('es-ES')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Templates section ── */}
          {section === 'templates' && (
            <div>
              <div className="flex flex-wrap justify-between items-center gap-3 pb-3 mb-4 border-b border-white/40">
                <h1 className="text-3xl font-bold text-white drop-shadow m-0 flex items-center gap-2">
                  <LayoutPanelLeft className="h-7 w-7" /> Plantillas de bootcamp
                </h1>
              </div>

              {/* Crear plantilla desde promoción */}
              <div className="bg-white rounded-xl shadow-md border-l-4 border-crok p-5 mb-5">
                <h5 className="font-bold flex items-center gap-2 m-0 mb-1">
                  <Wand2 className="h-4 w-4 text-crok" />
                  Crea una plantilla de una promoción
                </h5>
                <p className="text-sm text-text-muted mb-3">
                  Elige una promoción existente y guarda todo su contenido para que sea reusable como plantilla.
                </p>
                <form
                  onSubmit={handleCreateTemplateFromPromotion}
                  className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end"
                >
                  <div className="space-y-1">
                    <Label className="font-semibold">Promoción</Label>
                    <Select
                      value={tplForm.promotionId || undefined}
                      onValueChange={(id) => {
                        const promo = promotions.find(p => p.id === id);
                        setTplForm(f => ({ ...f, promotionId: id, name: f.name || promo?.name || '' }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="— Selecciona promoción —" />
                      </SelectTrigger>
                      <SelectContent>
                        {promotions.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}{p.weeks ? ` (${p.weeks}w)` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="font-semibold">Nombre de la plantilla</Label>
                    <Input
                      required
                      placeholder="e.g. IA Bootcamp P6"
                      value={tplForm.name}
                      onChange={e => setTplForm(f => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-semibold">
                      Descripción <span className="text-text-muted">(Opcional)</span>
                    </Label>
                    <Input
                      placeholder="Descripción breve"
                      value={tplForm.description}
                      onChange={e => setTplForm(f => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Button
                      type="submit"
                      className="bg-crok hover:bg-crok-hover text-crok-on w-full md:w-auto"
                      disabled={creatingTpl}
                      aria-label="Crear plantilla"
                    >
                      {creatingTpl ? <Spinner size="sm" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </div>
                </form>
                {tplFeedback && (
                  <Alert variant={tplFeedback.type === 'danger' ? 'destructive' : 'default'} className="mt-3">
                    <AlertDescription>{tplFeedback.msg}</AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Lista de plantillas */}
              <h5 className="font-bold text-white drop-shadow mb-3">Plantillas existentes</h5>
              {loadingTemplates ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : templates.length === 0 ? (
                <div className="text-white/90 text-center py-8">No hay plantillas.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map(t => {
                    const modulesCount = (t.modules || []).length;
                    const competencesCount = (t.competences || []).length;
                    const pildorasCount = (t.modulesPildoras || []).reduce(
                      (acc, mp) => acc + (mp.pildoras?.length ?? 0), 0
                    );
                    return (
                      <div
                        key={t.id}
                        className={cn(
                          'bg-white rounded-xl shadow-md p-4 flex flex-col border-l-4',
                          t.isCustom ? 'border-green-500' : 'border-crok'
                        )}
                      >
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <h6 className="font-bold m-0">{t.name}</h6>
                          <Badge
                            className={cn(
                              'shrink-0',
                              t.isCustom
                                ? 'bg-green-500 text-white hover:bg-green-500'
                                : 'bg-crok text-crok-on hover:bg-crok'
                            )}
                          >
                            {t.isCustom ? 'Personalizada' : 'Sistema'}
                          </Badge>
                        </div>
                        <p className="text-sm text-text-muted mb-2 min-h-[1.25rem]">{t.description || '—'}</p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="inline-flex items-center gap-1 text-xs bg-gray-100 border border-gray-300 rounded px-2 py-0.5">
                            <Calendar className="h-3 w-3" />{t.weeks || '?'}w
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs bg-gray-100 border border-gray-300 rounded px-2 py-0.5">
                            <Clock className="h-3 w-3" />{t.hours || '?'}h
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs bg-gray-100 border border-gray-300 rounded px-2 py-0.5">
                            <Grid3x3 className="h-3 w-3" />{modulesCount} módulos
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs bg-gray-100 border border-gray-300 rounded px-2 py-0.5">
                            <Sparkles className="h-3 w-3" />{competencesCount} competencias
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs bg-gray-100 border border-gray-300 rounded px-2 py-0.5">
                            <Lightbulb className="h-3 w-3" />{pildorasCount} píldoras
                          </span>
                        </div>
                        <div className="flex gap-2 flex-wrap mt-auto">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 border-yellow-500 text-yellow-600 hover:bg-yellow-500 hover:text-white"
                            onClick={() => openEditTemplateModal(t)}
                          >
                            <Pencil className="mr-1 h-3 w-3" /> Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 border-red-500 text-red-600 hover:bg-red-500 hover:text-white"
                            onClick={() => deleteTemplate(t.id, t.name)}
                          >
                            <Trash2 className="mr-1 h-3 w-3" /> Eliminar
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ── Create User Modal ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-crok" /> Crear nuevo usuario
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTeacher} className="space-y-3">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Se generará una contraseña provisional y se registrará automáticamente en <strong>users.coderf5.es</strong>.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label htmlFor="create-name" className="font-semibold">Nombre completo</Label>
              <Input
                id="create-name"
                required
                placeholder="Ej: Ana García"
                value={createForm.name}
                onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email" className="font-semibold">Correo electrónico</Label>
              <Input
                id="create-email"
                type="email"
                required
                placeholder="ana@factoriaf5.org"
                value={createForm.email}
                onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
              />
              <p className="text-xs text-text-muted">Se enviará la contraseña provisional a este correo.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-role" className="font-semibold">Rol</Label>
              <Select
                value={createForm.userRole}
                onValueChange={(v) => setCreateForm(f => ({ ...f, userRole: v }))}
              >
                <SelectTrigger id="create-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button
                type="submit"
                className="bg-crok hover:bg-crok-hover text-crok-on"
                disabled={creating}
              >
                {creating ? <Spinner size="sm" /> : <><UserPlus className="mr-1 h-4 w-4" />Crear cuenta</>}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit User Modal ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-crok" /> Editar usuario
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateTeacher} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="font-semibold">Nombre completo</Label>
              <Input
                id="edit-name"
                required
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email" className="font-semibold">Correo electrónico</Label>
              <Input
                id="edit-email"
                type="email"
                required
                value={editForm.email}
                onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role" className="font-semibold">Rol</Label>
              <Select
                value={editForm.userRole}
                onValueChange={(v) => setEditForm(f => ({ ...f, userRole: v }))}
              >
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button
                type="submit"
                className="bg-crok hover:bg-crok-hover text-crok-on"
                disabled={saving}
              >
                {saving ? <Spinner size="sm" /> : 'Guardar cambios'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Success Modal (provisional password) ── */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" /> Cuenta creada
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-center">
              <UserCheck className="text-green-500 mx-auto" style={{ height: '3rem', width: '3rem' }} />
            </div>
            <p className="text-center">
              La cuenta para <strong>{createResult?.email}</strong> ha sido creada.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-text-muted mb-1">Contraseña provisional:</p>
              <div className="flex items-center gap-2">
                <h3 className="font-mono select-all flex-1 m-0 break-all text-lg">
                  {createResult?.provisionalPassword || '—'}
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(createResult?.provisionalPassword || '')}
                  aria-label="Copiar contraseña"
                >
                  <Clipboard className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {createResult?.externalRegistered ? (
              <p className="flex items-center gap-1 text-sm text-green-600 m-0">
                <CheckCircle2 className="h-4 w-4" />Registrado en el sistema de autenticación externo.
              </p>
            ) : (
              <p className="flex items-center gap-1 text-sm text-yellow-600 m-0">
                <AlertTriangle className="h-4 w-4" />
                {createResult?.warning || 'No se pudo registrar en el sistema externo.'}
              </p>
            )}
            {createResult?.emailWarning && (
              <p className="text-sm text-yellow-600 m-0">{createResult.emailWarning}</p>
            )}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                El usuario debe iniciar sesión con estas credenciales.
                La contraseña ha sido registrada en <code className="bg-gray-100 px-1 rounded text-xs">users.coderf5.es</code>.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" className="w-full bg-green-500 hover:bg-green-600 text-white">
                <Check className="mr-1 h-4 w-4" />Entendido
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Template Modal ── */}
      <Dialog open={editTplOpen} onOpenChange={setEditTplOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PencilLine className="h-5 w-5 text-crok" /> Editar plantilla
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditTemplate} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="edittpl-name" className="font-semibold">
                Nombre <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edittpl-name"
                required
                placeholder="Nombre de la plantilla"
                value={editTplForm.name}
                onChange={e => setEditTplForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edittpl-desc" className="font-semibold">Descripción</Label>
              <Input
                id="edittpl-desc"
                placeholder="Descripción breve"
                value={editTplForm.description}
                onChange={e => setEditTplForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edittpl-weeks" className="font-semibold">Semanas</Label>
                <Input
                  id="edittpl-weeks"
                  type="number"
                  min={1}
                  placeholder="Ej: 24"
                  value={editTplForm.weeks}
                  onChange={e => setEditTplForm(f => ({ ...f, weeks: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edittpl-hours" className="font-semibold">Horas totales</Label>
                <Input
                  id="edittpl-hours"
                  type="number"
                  min={1}
                  placeholder="Ej: 840"
                  value={editTplForm.hours}
                  onChange={e => setEditTplForm(f => ({ ...f, hours: e.target.value }))}
                />
              </div>
            </div>
            {editTplAlert && (
              <Alert variant="destructive">
                <AlertDescription>{editTplAlert}</AlertDescription>
              </Alert>
            )}
            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button
                type="submit"
                className="bg-crok hover:bg-crok-hover text-crok-on"
                disabled={savingTpl}
              >
                {savingTpl ? <Spinner size="sm" /> : <><Save className="mr-1 h-4 w-4" />Guardar cambios</>}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
