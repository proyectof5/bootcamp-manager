'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { withBasePath } from '../_lib/basePath';
import {
  CircleUser,
  User,
  ShieldCheck,
  LogOut,
  PlusCircle,
  Trash2,
  Mail,
  Info,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import Spinner from '@/components/Spinner';

import { useAuth } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/api';
import { showToast } from '@/lib/toast';

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

const COMUNIDADES = [
  'Andalucía', 'Aragón', 'Asturias', 'Islas Baleares', 'Canarias', 'Cantabria',
  'Castilla-La Mancha', 'Castilla y León', 'Cataluña', 'Ceuta', 'Comunidad de Madrid',
  'Comunidad Foral de Navarra', 'Comunidad Valenciana', 'Extremadura', 'Galicia',
  'La Rioja', 'Melilla', 'País Vasco', 'Región de Murcia',
];

// ── Page component ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  // ── Promotions ──
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loadingPromotions, setLoadingPromotions] = useState(true);

  // ── Templates ──
  const [templates, setTemplates] = useState<Template[]>([]);

  // ── Promotion modal (shadcn Dialog controlado por useState) ──
  const [promoOpen, setPromoOpen] = useState(false);
  const [currentPromotionId, setCurrentPromotionId] = useState<string | null>(null);
  const [promoForm, setPromoForm] = useState({
    templateId: '', name: '', description: '', weeks: '', hours: '',
    startDate: '', endDate: '',
  });
  const [savingPromo, setSavingPromo] = useState(false);

  // ── Profile modal (shadcn Dialog controlado por useState) ──
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileForm, setProfileForm] = useState({ name: '', lastName: '', location: '' });
  const [resetEmail, setResetEmail] = useState('');
  const [profileAlert, setProfileAlert] = useState<{ msg: string; type: string } | null>(null);
  const [passwordAlert, setPasswordAlert] = useState<{ msg: string; type: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  // ── Data loading ──

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
      if (res.ok) {
        setTemplates(await res.json());
      } else {
        // Antes fallaba en silencio (el selector de plantillas quedaba vacío sin
        // ninguna pista de por qué) — un usuario reportó justo este síntoma sin
        // poder reproducirlo con una cuenta que sí funcionaba, así que ahora se
        // avisa explícitamente para poder diagnosticar la próxima vez.
        showToast(`No se pudieron cargar las plantillas de bootcamp (${res.status})`, 'danger');
      }
    } catch {
      showToast('Error de conexión al cargar las plantillas de bootcamp', 'danger');
    }
  }, []);

  useEffect(() => {
    if (!isLoading && user) {
      loadPromotions();
      loadTemplates();
    }
  }, [isLoading, user, loadPromotions, loadTemplates]);

  // ── Promotion modal handlers ──

  function openNewPromotion() {
    setCurrentPromotionId(null);
    setPromoForm({ templateId: '', name: '', description: '', weeks: '', hours: '', startDate: '', endDate: '' });
    setPromoOpen(true);
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
          setPromoOpen(false);
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

  // ── Profile modal handlers ──

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
        setProfileOpen(true);
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

  // ── Helpers ──

  function alertVariant(type: string): 'default' | 'destructive' {
    return type === 'danger' ? 'destructive' : 'default';
  }

  // ── Stats ──

  const totalModules = promotions.reduce((acc, p) => acc + (p.modules?.length ?? 0), 0);
  const isSuperAdmin = user?.role === 'superadmin';

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
    <div className="flex-1 w-full min-h-screen bg-[#f19976]">
      {/* ── Navbar siempre expandido (resuelve el bug de < 992px del v0.x) ── */}
      <nav
        className="bg-crok bg-repeat shadow-md flex items-center justify-between px-6 py-3"
        style={{
          backgroundImage: "url('/img/Fondo-factoria-f5-color.png')",
          backgroundSize: '150px 150px',
        }}
      >
        <a href="#" className="flex items-center gap-3 no-underline">
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="bg-transparent text-white border border-white/30 hover:bg-white hover:text-crok hover:border-white gap-2"
            >
              <CircleUser className="h-4 w-4" />
              <span>{user?.name || 'Teacher'}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={openProfileModal}>
              <User className="mr-2 h-4 w-4" /> Perfil
            </DropdownMenuItem>
            {isSuperAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href={withBasePath('/admin')}>
                    <ShieldCheck className="mr-2 h-4 w-4" /> Panel de Admin
                  </a>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                localStorage.clear();
                router.replace('/login');
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>

      {/* ── Main ── */}
      <main className="container mx-auto px-4 py-6">
        <div className="flex flex-wrap items-end justify-between mb-6 gap-3">
          <div className="flex items-end gap-3">
            <h1 className="text-3xl font-bold m-0 text-white drop-shadow">Mis Promociones</h1>
            <Image
              src={withBasePath('/img/logo-factoria-b.svg')}
              alt="Factoría F5"
              width={50}
              height={50}
              className="hidden lg:block w-auto mb-1"
              style={{ height: 'auto', maxHeight: 48 }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-white/90 text-sm">
              Promociones: <strong>{promotions.length}</strong>
            </span>
            <span className="text-white/90 text-sm">
              Módulos totales: <strong>{totalModules}</strong>
            </span>
            <Button
              className="bg-crok hover:bg-crok-hover text-crok-on"
              onClick={openNewPromotion}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Añadir Promoción
            </Button>
          </div>
        </div>

        {/* Lista de promociones */}
        {loadingPromotions ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : promotions.length === 0 ? (
          <p className="text-white/90 text-center py-12">
            Aún no tienes promociones. ¡Crea una para empezar!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {promotions.map(p => {
              const isOwner = p.teacherId === user?.id;
              return (
                <div
                  key={p.id}
                  onClick={() => router.push(`/promotion?id=${p.id}`)}
                  className="rounded-lg shadow-md cursor-pointer overflow-hidden bg-crok bg-repeat hover:shadow-lg hover:-translate-y-1 transition-all"
                  style={{
                    backgroundImage: "url('/img/Fondo-factoria-f5-color.png')",
                    backgroundSize: '150px 150px',
                  }}
                >
                  <div className="p-6 text-white">
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <h5 className="font-bold text-xl drop-shadow leading-tight m-0">
                        {p.name}
                      </h5>
                      {!isOwner && (
                        <Badge className="bg-cyan-500 hover:bg-cyan-500 text-white shrink-0">
                          Collaborator
                        </Badge>
                      )}
                    </div>
                    <p className="text-white/90 text-sm mb-3">
                      {p.description || 'Sin descripción'}
                    </p>
                    <div className="flex justify-between items-center mt-3">
                      <span className="bg-white/25 border border-white/50 px-3 py-1 rounded-full text-sm">
                        {p.weeks} weeks
                      </span>
                      {isOwner && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="bg-white/20 border-white/50 text-white hover:bg-white/30 hover:text-white h-8 w-8"
                          onClick={(e) => deletePromotion(p.id, e)}
                          aria-label="Eliminar promoción"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Profile Modal ── */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Perfil</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="profile" className="mt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">Información general</TabsTrigger>
              <TabsTrigger value="password">Cambiar contraseña</TabsTrigger>
            </TabsList>

            {/* Tab: Información general */}
            <TabsContent value="profile" className="space-y-3 pt-3">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Nombre</Label>
                <Input
                  id="profile-name"
                  value={profileForm.name}
                  onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-lastName">Apellido</Label>
                <Input
                  id="profile-lastName"
                  value={profileForm.lastName}
                  onChange={e => setProfileForm(f => ({ ...f, lastName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-location">Comunidad Autónoma</Label>
                <Select
                  value={profileForm.location || undefined}
                  onValueChange={(v) => setProfileForm(f => ({ ...f, location: v }))}
                >
                  <SelectTrigger id="profile-location">
                    <SelectValue placeholder="-- Selecciona tu comunidad --" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMUNIDADES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {profileAlert && (
                <Alert variant={alertVariant(profileAlert.type)}>
                  <AlertDescription>{profileAlert.msg}</AlertDescription>
                </Alert>
              )}
            </TabsContent>

            {/* Tab: Cambiar contraseña */}
            <TabsContent value="password" className="space-y-3 pt-3">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Te enviaremos un enlace a tu correo para que puedas cambiar tu contraseña de forma segura.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label htmlFor="reset-email">Tu correo electrónico</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                />
              </div>
              {passwordAlert && (
                <Alert variant={alertVariant(passwordAlert.type)}>
                  <AlertDescription>{passwordAlert.msg}</AlertDescription>
                </Alert>
              )}
              <Button
                type="button"
                className="w-full bg-crok hover:bg-crok-hover text-crok-on"
                onClick={changePassword}
                disabled={sendingReset}
              >
                {sendingReset
                  ? <Spinner size="sm" />
                  : <><Mail className="mr-2 h-4 w-4" />Enviar enlace de cambio de contraseña</>
                }
              </Button>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cerrar</Button>
            </DialogClose>
            <Button
              type="button"
              className="bg-crok hover:bg-crok-hover text-crok-on"
              onClick={saveProfileInfo}
              disabled={savingProfile}
            >
              {savingProfile ? <Spinner size="sm" /> : 'Guardar perfil'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── New / Edit Promotion Modal ── */}
      <Dialog open={promoOpen} onOpenChange={setPromoOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {currentPromotionId ? 'Editar promoción' : 'Nueva promoción'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handlePromoSubmit} className="space-y-3">
            {/* Template selector (solo si es creación) */}
            {!currentPromotionId && (
              <div className="space-y-2">
                <Label htmlFor="promotion-template">Plantilla de bootcamp (Opcional)</Label>
                <Select
                  value={promoForm.templateId || undefined}
                  onValueChange={applyTemplate}
                >
                  <SelectTrigger id="promotion-template">
                    <SelectValue placeholder="-- Selecciona una plantilla para empezar --" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.filter(t => !t.isCustom).length > 0 && (
                      <SelectGroup>
                        {templates.filter(t => !t.isCustom).map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name} ({t.weeks ? `${t.weeks}w` : '?w'}, {t.hours || t.totalHours ? `${t.hours || t.totalHours}h` : '?h'})
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    {templates.some(t => t.isCustom) && (
                      <SelectGroup>
                        <SelectLabel>Plantillas personalizadas</SelectLabel>
                        {templates.filter(t => t.isCustom).map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name} ({t.weeks ? `${t.weeks}w` : '?w'}, {t.hours || t.totalHours ? `${t.hours || t.totalHours}h` : '?h'})
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-text-muted">
                  Seleccionar una plantilla te ayudará a acelerar el proceso.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="promotion-name">Nombre de la promoción</Label>
              <Input
                id="promotion-name"
                required
                value={promoForm.name}
                onChange={e => setPromoForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="promotion-desc">Descripción</Label>
              <Textarea
                id="promotion-desc"
                rows={3}
                value={promoForm.description}
                onChange={e => setPromoForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="promotion-weeks">Número de semanas</Label>
              <Input
                id="promotion-weeks"
                type="number"
                min={1}
                required
                value={promoForm.weeks}
                onChange={e => setPromoForm(f => ({ ...f, weeks: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="promotion-hours">Horas totales de formación</Label>
              <Input
                id="promotion-hours"
                type="number"
                min={1}
                placeholder="ej. 900"
                value={promoForm.hours}
                onChange={e => setPromoForm(f => ({ ...f, hours: e.target.value }))}
              />
              <p className="text-xs text-text-muted">
                Número de horas lectivas totales del programa.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="promotion-start">Fecha de inicio</Label>
              <Input
                id="promotion-start"
                type="date"
                value={promoForm.startDate}
                onChange={e => setPromoForm(f => ({ ...f, startDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="promotion-end">Fecha de fin</Label>
              <Input
                id="promotion-end"
                type="date"
                value={promoForm.endDate}
                onChange={e => setPromoForm(f => ({ ...f, endDate: e.target.value }))}
              />
            </div>

            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button
                type="submit"
                className="bg-crok hover:bg-crok-hover text-crok-on"
                disabled={savingPromo}
              >
                {savingPromo ? <Spinner size="sm" /> : (currentPromotionId ? 'Guardar cambios' : 'Crear Promoción')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
