'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Pencil, Trash2, Clock, StickyNote } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface Note {
  id: string;
  text: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  authorName?: string;
}

function formatRelative(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const mins = Math.floor((now.getTime() - date.getTime()) / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return 'Justo ahora';
  if (mins < 60) return `hace ${mins}m`;
  if (hours < 24) return `hace ${hours}h`;
  if (days < 7) return `hace ${days}d`;
  return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
}

/**
 * Host con React Portal hacia #notes-container (que vive dentro del HTML legacy
 * inyectado por <LegacyBody>). Sustituye a la antigua NotesManager/NotesUI
 * (public/js/notes.js) sin sacar el contenedor del body.ts.
 */
export function NotesPanelHost() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [promotionId, setPromotionId] = useState<string | null>(null);

  useEffect(() => {
    setPromotionId(new URLSearchParams(window.location.search).get('id'));
    let tries = 150;
    let t: ReturnType<typeof setTimeout> | undefined;
    const find = () => {
      const n = document.getElementById('notes-container');
      if (n) { setHost(n); return; }
      if (--tries > 0) t = setTimeout(find, 16);
    };
    find();
    return () => { if (t) clearTimeout(t); };
  }, []);

  if (!host || !promotionId) return null;
  return createPortal(<NotesPanel promotionId={promotionId} />, host);
}

function NotesPanel({ promotionId }: { promotionId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState('');
  const [category, setCategory] = useState('note');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await apiFetch(`/api/promotions/${promotionId}/shared-notes`);
      if (r.ok) {
        const d = await r.json();
        setNotes(Array.isArray(d.sharedNotes) ? d.sharedNotes : []);
      }
    } catch {
      /* noop */
    }
  }, [promotionId]);

  useEffect(() => { load(); }, [load]);

  const persist = async (next: Note[]) => {
    setNotes(next);
    try {
      await apiFetch(`/api/promotions/${promotionId}/shared-notes`, {
        method: 'PUT',
        body: JSON.stringify({ sharedNotes: next }),
      });
    } catch {
      /* noop */
    }
  };

  const add = async () => {
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    const note: Note = {
      id: Date.now().toString(),
      text: t,
      category,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      authorName: (window as any)._currentUserName || '',
    };
    await persist([...notes, note]);
    setText('');
    setCategory('note');
    setBusy(false);
  };

  const editNote = async (id: string) => {
    const n = notes.find((x) => x.id === id);
    if (!n) return;
    const nt = prompt('Editar nota:', n.text);
    if (nt && nt.trim()) {
      await persist(notes.map((x) => (x.id === id ? { ...x, text: nt.trim(), updatedAt: new Date().toISOString() } : x)));
    }
  };

  const del = async (id: string) => {
    if (!confirm('¿Eliminar esta nota?')) return;
    await persist(notes.filter((x) => x.id !== id));
  };

  return (
    <div className="notes-wrapper">
      <div className="notes-controls mb-3">
        <div className="d-flex gap-2 flex-wrap align-items-center">
          <input
            type="text"
            className="form-control notes-input"
            placeholder="Añade una anotación…"
            style={{ flex: 1, minWidth: 200 }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
          />
          <select className="form-select notes-category" style={{ minWidth: 130 }} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="note">📝 Nota</option>
            <option value="reminder">⏰ Recordatorio</option>
          </select>
          <button className="btn btn-sm btn-primary inline-flex items-center gap-1" disabled={busy} onClick={add}>
            <Plus className="h-4 w-4" /> Añadir
          </button>
        </div>
      </div>
      <div className="notes-list">
        {notes.length === 0 ? (
          <div className="text-center py-4 text-muted">
            <StickyNote className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p className="mb-0">Sin notas por el momento. ¡Añade la primera!</p>
          </div>
        ) : (
          notes.map((note) => {
            const icon = note.category === 'reminder' ? '⏰' : '📝';
            const label = note.category === 'reminder' ? 'Recordatorio' : 'Nota';
            return (
              <div key={note.id} className="note-card" data-note-id={note.id}>
                <div className="note-header">
                  <div className="note-category">
                    <span className="note-category-badge">{icon} {label}</span>
                    {note.authorName && <span className="ms-2 text-muted" style={{ fontSize: '0.7rem' }}>· {note.authorName}</span>}
                  </div>
                  <div className="note-actions">
                    <button className="note-action-btn note-edit-btn" title="Editar" onClick={() => editNote(note.id)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button className="note-action-btn note-delete-btn" title="Eliminar" onClick={() => del(note.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="note-content"><p className="note-text">{note.text}</p></div>
                <div className="note-footer">
                  <small className="note-date inline-flex items-center gap-1"><Clock className="h-3 w-3" />{formatRelative(note.createdAt)}</small>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
