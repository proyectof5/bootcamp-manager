'use client';

/**
 * QuickLinksManager.tsx — sub-tab "Quick Links" de Contenido del Programa (spec 0014 Fase C).
 *
 * 4º bloque extraído del orquestador. Reemplaza la lista #quick-links-list + el alta vía
 * quickLinkModal (opener/save en promotion-detail.js) por un componente React autocontenido
 * (lista + Dialog shadcn propio, ids ql-*). Monta por portal en #program-details-quicklinks
 * (vaciado en body.ts). Add + Delete (el legacy no tenía edición de quick-links).
 *
 * Acoplamiento con el overview: los quick-links alimentan el widget de Acciones Rápidas del
 * dashboard (refreshQuickActions) y window._githubQuickLinkUrl (lo usa Aula Virtual). Tras
 * cada alta/borrado refrescamos vía window.loadQuickLinks() + window.refreshQuickActions()
 * (el orquestador los expone; su displayQuickLinks tiene guard null-safe).
 */

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function w(): any { return window as unknown as any; }
function toast(message: string, type: 'success' | 'danger' | 'warning' = 'success') {
  const ww = w();
  if (typeof ww.showApiToast === 'function') ww.showApiToast(message, type);
}

interface PlatformInfo { name: string; icon: string; color: string; }
const PLATFORM_ICONS: Record<string, PlatformInfo> = {
  zoom: { name: 'Zoom', icon: 'bi-camera-video', color: '#2D8CFF' },
  discord: { name: 'Discord', icon: 'bi-discord', color: '#5865F2' },
  classroom: { name: 'Google Classroom', icon: 'bi-google', color: '#EA4335' },
  github: { name: 'GitHub', icon: 'bi-github', color: '#333' },
  custom: { name: 'Link', icon: 'bi-link', color: '#667eea' },
};

function usePortalNode(id: string): HTMLElement | null {
  const [node, setNode] = useState<HTMLElement | null>(null);
  useEffect(() => {
    let cancelled = false;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (cancelled) return;
      const n = document.getElementById(id);
      setNode((cur) => (n !== cur ? n : cur));
      t = setTimeout(tick, 300);
    };
    tick();
    return () => { cancelled = true; clearTimeout(t); };
  }, [id]);
  return node;
}

interface QuickLink { id: string; platform: string; name: string; url: string; }

export function QuickLinksManagerHost() {
  const [promotionId, setPromotionId] = useState<string | null>(null);
  useEffect(() => { setPromotionId(new URLSearchParams(window.location.search).get('id')); }, []);
  const host = usePortalNode('program-details-quicklinks');
  if (!host || !promotionId) return null;
  return createPortal(<QuickLinksManager promotionId={promotionId} />, host);
}

function QuickLinksManager({ promotionId }: { promotionId: string }) {
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ platform: '', name: '', url: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await apiFetch(`/api/promotions/${promotionId}/quick-links`);
      if (r.ok) setLinks(await r.json());
    } catch {
      /* noop */
    }
  }, [promotionId]);
  useEffect(() => { load(); }, [load]);

  // Refresca el widget del overview + _githubQuickLinkUrl (los gestiona el orquestador).
  const syncOverview = () => {
    w().loadQuickLinks?.();
    w().refreshQuickActions?.();
  };

  const openCreate = () => { setForm({ platform: '', name: '', url: '' }); setDialogOpen(true); };

  // Replica updateLinkName(): al elegir plataforma (no custom) autocompleta el nombre.
  const onPlatformChange = (platform: string) => {
    setForm((f) => {
      if (platform && platform !== 'custom' && PLATFORM_ICONS[platform]) return { ...f, platform, name: PLATFORM_ICONS[platform].name };
      if (platform === 'custom') return { ...f, platform, name: '' };
      return { ...f, platform };
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = form.url.trim();
    if (!url) { toast('La URL es obligatoria', 'warning'); return; }
    setBusy(true);
    try {
      const r = await apiFetch(`/api/promotions/${promotionId}/quick-links`, {
        method: 'POST',
        body: JSON.stringify({ name: form.name, url, platform: form.platform || 'custom' }),
      });
      if (r.ok) { setDialogOpen(false); await load(); syncOverview(); }
      else toast('Error al guardar el enlace', 'danger');
    } catch {
      toast('Error al guardar el enlace', 'danger');
    }
    setBusy(false);
  };

  const del = async (id: string) => {
    if (!confirm('¿Eliminar este enlace rápido?')) return;
    try {
      const r = await apiFetch(`/api/promotions/${promotionId}/quick-links/${id}`, { method: 'DELETE' });
      if (r.ok) { await load(); syncOverview(); }
      else toast('Error al eliminar el enlace', 'danger');
    } catch {
      toast('Error al eliminar el enlace', 'danger');
    }
  };

  return (
    <div className="card">
      <div className="card-header bg-light d-flex justify-content-between align-items-center">
        <h6 className="mb-0"><i className="bi bi-lightning me-2" />Quick Links</h6>
        <button type="button" className="btn btn-sm btn-primary" onClick={openCreate}>
          <i className="bi bi-plus-circle me-2" />Agregar Link
        </button>
      </div>
      <div className="card-body">
        <div className="row">
          {links.length === 0 ? (
            <div className="col-12"><p className="text-muted">No quick links yet</p></div>
          ) : (
            links.map((link) => {
              const info = PLATFORM_ICONS[link.platform || 'custom'] || PLATFORM_ICONS.custom;
              return (
                <div key={link.id} className="col-md-6 col-lg-3">
                  <div className="card">
                    <div className="card-body">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <i className={`bi ${info.icon}`} style={{ fontSize: '1.3rem', color: info.color }} />
                        <h5 className="card-title" style={{ margin: 0 }}>{link.name}</h5>
                      </div>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-primary">
                        <i className="bi bi-box-arrow-up-right me-1" />Open Link
                      </a>
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => del(link.id)}>
                        <i className="bi bi-trash" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Quick Link</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="ql-platform">Plataforma</Label>
              <select
                id="ql-platform"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={form.platform}
                onChange={(e) => onPlatformChange(e.target.value)}
              >
                <option value="">Selecciona una plataforma o customizala</option>
                <option value="zoom">Zoom</option>
                <option value="discord">Discord</option>
                <option value="classroom">Google Classroom</option>
                <option value="github">GitHub</option>
                <option value="custom">Link customizado</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ql-name">Nombre del Link</Label>
              <Input id="ql-name" placeholder="e.g., Zoom Class" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ql-url">URL</Label>
              <Input id="ql-url" type="url" required value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} />
            </div>
            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={busy} className="bg-crok hover:bg-crok-hover text-crok-on">Agregar Link</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
