'use client';

/**
 * EvaluationCriteria.tsx — sub-tab "Criterios" (Criterio de Evaluación) de Contenido del Programa
 * (spec 0014 Fase C).
 *
 * 8º bloque extraído del orquestador. Reemplaza el editor rich-text #evaluation-text (toolbar +
 * contenteditable) que vivía en body.ts por un componente React montado por portal en
 * #program-details-evaluation.
 *
 * El #evaluation-text es un DIV contenteditable NO controlado por React: lo renderizamos sin hijos
 * y poblamos su innerHTML imperativamente (ref) desde window.__evaluationHtml (que calcula el
 * orquestador en loadExtendedInfo, con el texto por defecto + conversión de texto plano). El
 * orquestador dispara window.__refreshEvaluation() para (re)poblar. CONSERVAMOS el id legacy
 * `evaluation-text` porque saveExtendedInfo() lee su innerHTML al "guardar todo", y las funciones
 * insertEvalLink/insertEvalImage/saveEvaluationFeedback (que siguen en el orquestador y llamamos por
 * window.*) lo localizan por id. La toolbar usa document.execCommand (igual que el legacy).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function w(): any { return (typeof window !== 'undefined' ? window : {}) as unknown as any; }

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

export function EvaluationCriteriaHost() {
  const host = usePortalNode('program-details-evaluation');
  if (!host) return null;
  return createPortal(<EvaluationCriteria />, host);
}

function EvaluationCriteria() {
  const editorRef = useRef<HTMLDivElement>(null);

  const populate = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const html = w().__evaluationHtml;
    if (typeof html === 'string') el.innerHTML = html;
  }, []);

  useEffect(() => {
    w().__refreshEvaluation = () => populate();
    populate(); // pull inicial (el HTML puede estar ya calculado al montar)
    return () => { if (w().__refreshEvaluation) delete w().__refreshEvaluation; };
  }, [populate]);

  const exec = (cmd: string) => { document.execCommand(cmd); editorRef.current?.focus(); };
  const sepStyle: React.CSSProperties = { width: 1, background: '#ced4da', margin: '0 4px' };

  return (
    <div className="card">
      <div className="card-header bg-light">
        <h6 className="mb-0"><i className="bi bi-clipboard-check me-2" />Criterio de Evaluación</h6>
      </div>
      <div className="card-body p-0">
        <div
          id="eval-rte-toolbar"
          className="eval-toolbar-sticky"
          style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '8px 12px', background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}
        >
          <button type="button" className="btn btn-sm btn-outline-secondary" title="Negrita (Ctrl+B)" onClick={() => exec('bold')}><i className="bi bi-type-bold" /></button>
          <button type="button" className="btn btn-sm btn-outline-secondary" title="Cursiva (Ctrl+I)" onClick={() => exec('italic')}><i className="bi bi-type-italic" /></button>
          <button type="button" className="btn btn-sm btn-outline-secondary" title="Subrayado (Ctrl+U)" onClick={() => exec('underline')}><i className="bi bi-type-underline" /></button>
          <div style={sepStyle} />
          <button type="button" className="btn btn-sm btn-outline-secondary" title="Lista con viñetas" onClick={() => exec('insertUnorderedList')}><i className="bi bi-list-ul" /></button>
          <button type="button" className="btn btn-sm btn-outline-secondary" title="Lista numerada" onClick={() => exec('insertOrderedList')}><i className="bi bi-list-ol" /></button>
          <div style={sepStyle} />
          <button type="button" className="btn btn-sm btn-outline-secondary" title="Deshacer (Ctrl+Z)" onClick={() => exec('undo')}><i className="bi bi-arrow-counterclockwise" /></button>
          <button type="button" className="btn btn-sm btn-outline-secondary" title="Rehacer (Ctrl+Y)" onClick={() => exec('redo')}><i className="bi bi-arrow-clockwise" /></button>
          <div style={sepStyle} />
          <button type="button" className="btn btn-sm btn-outline-secondary" title="Insertar enlace" onClick={() => w().insertEvalLink?.()}><i className="bi bi-link-45deg" /></button>
          <button type="button" className="btn btn-sm btn-outline-secondary" title="Insertar imagen" onClick={() => w().insertEvalImage?.()}><i className="bi bi-image" /></button>
          <div style={sepStyle} />
          <button type="button" className="btn btn-sm btn-outline-primary" title="Guardar" onClick={() => w().saveEvaluationFeedback?.()}><i className="bi bi-floppy me-1" />Guardar</button>
        </div>
        <div
          id="evaluation-text"
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          data-placeholder="Describe los criterios de evaluación..."
          style={{ minHeight: 340, padding: '14px 16px', outline: 'none', fontSize: '0.92rem', lineHeight: 1.6, border: 'none' }}
        />
      </div>
    </div>
  );
}
