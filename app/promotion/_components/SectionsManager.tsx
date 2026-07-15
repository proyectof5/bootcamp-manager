'use client';

/**
 * SectionsManager.tsx — sub-tab "Secciones" de Contenido del Programa (spec 0014 Fase C).
 *
 * 3er bloque extraído del orquestador. Reemplaza la lista #sections-list + el alta vía
 * sectionModal (cuyo opener/save vivían en promotion-detail.js) por un componente React
 * autocontenido (lista + Dialog shadcn propio para alta/edición). Monta por createPortal
 * en #program-details-sections (vaciado en body.ts).
 *
 * CRUD completo contra /api/promotions/:id/sections (GET/POST/PUT/DELETE). Nota: el legacy
 * tenía el botón de editar ROTO (llamaba a editSection(), función inexistente) — aquí se
 * arregla con PUT (el backend ya lo soporta). Usa ids propios (sm-*) para no colisionar con
 * la delegación de #section-form que queda inerte en el orquestador.
 */

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function w(): any { return window as unknown as any; }
function toast(message: string, type: 'success' | 'danger' | 'warning' = 'success') {
  const ww = w();
  if (typeof ww.showApiToast === 'function') ww.showApiToast(message, type);
}

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

interface Section { id: string; title: string; content: string; }

export function SectionsManagerHost() {
  const [promotionId, setPromotionId] = useState<string | null>(null);
  useEffect(() => { setPromotionId(new URLSearchParams(window.location.search).get('id')); }, []);
  const host = usePortalNode('program-details-sections');
  if (!host || !promotionId) return null;
  return createPortal(<SectionsManager promotionId={promotionId} />, host);
}

function SectionsManager({ promotionId }: { promotionId: string }) {
  const [sections, setSections] = useState<Section[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Section | null>(null);
  const [form, setForm] = useState({ title: '', content: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await apiFetch(`/api/promotions/${promotionId}/sections`);
      if (r.ok) setSections(await r.json());
    } catch {
      /* noop */
    }
  }, [promotionId]);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ title: '', content: '' }); setDialogOpen(true); };
  const openEdit = (s: Section) => { setEditing(s); setForm({ title: s.title, content: s.content }); setDialogOpen(true); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) { toast('El título es obligatorio', 'warning'); return; }
    setBusy(true);
    try {
      const url = editing
        ? `/api/promotions/${promotionId}/sections/${editing.id}`
        : `/api/promotions/${promotionId}/sections`;
      const r = await apiFetch(url, { method: editing ? 'PUT' : 'POST', body: JSON.stringify({ title, content: form.content }) });
      if (r.ok) { setDialogOpen(false); await load(); }
      else toast('Error al guardar la sección', 'danger');
    } catch {
      toast('Error al guardar la sección', 'danger');
    }
    setBusy(false);
  };

  const del = async (id: string) => {
    if (!confirm('¿Eliminar esta sección?')) return;
    try {
      const r = await apiFetch(`/api/promotions/${promotionId}/sections/${id}`, { method: 'DELETE' });
      if (r.ok) await load();
      else toast('Error al eliminar la sección', 'danger');
    } catch {
      toast('Error al eliminar la sección', 'danger');
    }
  };

  return (
    <div className="card">
      <div className="card-header bg-light d-flex justify-content-between align-items-center">
        <h6 className="mb-0"><i className="bi bi-file-text me-2" />Secciones</h6>
        <button type="button" className="btn btn-sm btn-primary" onClick={openCreate}>
          <i className="bi bi-plus-circle me-2" />Agregar sección
        </button>
      </div>
      <div className="card-body">
        {sections.length === 0 ? (
          <p className="text-muted">No hay secciones aún</p>
        ) : (
          sections.map((s) => (
            <div key={s.id} className="card mb-3">
              <div className="card-header">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">{s.title}</h5>
                  <div>
                    <button type="button" className="btn btn-sm btn-warning" onClick={() => openEdit(s)} title="Editar">
                      <i className="bi bi-pencil" />
                    </button>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => del(s.id)} title="Eliminar">
                      <i className="bi bi-trash" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div style={{ whiteSpace: 'pre-wrap' }}>{s.content}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Sección' : 'Agregar Sección'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="sm-title">Título</Label>
              <Input id="sm-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sm-content">Contenido</Label>
              <Textarea id="sm-content" rows={8} value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} required />
            </div>
            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={busy} className="bg-crok hover:bg-crok-hover text-crok-on">
                <Save className="mr-1 h-4 w-4" />{editing ? 'Guardar cambios' : 'Agregar Sección'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
