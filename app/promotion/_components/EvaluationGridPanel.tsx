'use client';

/**
 * EvaluationGridPanel.tsx — sub-tab "Evaluación" de la Teacher-Area (spec 0014 Fase C).
 *
 * 18º y ÚLTIMO bloque del orquestador. Reemplaza el contenido del pane #teacher-area-evaluation
 * (el grid de Evaluación de Proyectos: la pieza MÁS PESADA) por un componente React montado por
 * portal. Con esto promotion-detail.js deja de ser dueño de ninguna sección de body.ts.
 *
 * Patrón "markup en React, lógica legacy por id": React renderiza SOLO el MARKUP de las 4 sub-vistas
 * conservando TODOS los ids legacy; el orquestador las puebla/togglea por id:
 *   - #evaluation-tab-view + #evaluation-content → loadEvaluation()/renderEvaluationTab() (null-safe)
 *     pintan el accordion de módulos/proyectos. window._evalState guarda los datos.
 *   - #team-history-panel (+ #team-history-panel-body) → openTeamHistoryView/closeTeamHistoryView
 *     togglean la clase `hidden`.
 *   - #eval-project-view (split-view: #eval-targets-list sidebar + #eval-right-panel con
 *     #eval-right-empty/#eval-right-content/#eval-right-header/#eval-right-body) → el flujo de
 *     evaluación individual lo abre/cierra togglando `hidden`/`d-none` y poblando por innerHTML.
 *   - #student-eval-panel (+ #student-eval-panel-body) → panel legacy de evaluación individual.
 * Los editores rich-text `.eval-feedback-rte` (contenteditable) se inyectan dinámicamente por JS en
 * #eval-right-body y #student-eval-panel-body; el keydown handler se ancla por DELEGACIÓN a
 * #teacher-area-evaluation (el contenedor del portal, persistente en body.ts) vía
 * _initEvalFeedbackRteKeyHandler → cubre los RTEs aunque vivan dentro del portal.
 *
 * CERO cambios en el orquestador: loadEvaluation/renderEvaluationTab/closeEvaluationView/etc. ya son
 * null-safe (early-return) y pueblan/togglean por id; switchTeacherAreaSubTab('evaluation') las
 * dispara al abrir. Los controles inline llaman a window.* (closeTeamHistoryView/closeEvaluationView/
 * saveIndividualStudentEval/previewStudentEvalReport/sendEvaluationByEmail/sendEvaluationToAllInProject/
 * cancelStudentEvalPanel). El componente NO tiene estado → no re-renderiza → el innerHTML/clases que
 * pone el legacy sobreviven.
 *
 * Red de seguridad: si el portal monta DESPUÉS de que switchTeacherAreaSubTab('evaluation') corriera
 * (p.ej. tab-restore inicial a evaluación), React dispara loadEvaluation() tras montar — pero SOLO si
 * el pane está activo en ese momento (evita las 4 fetches de loadEvaluation cuando la pestaña no se ve).
 */

import { useEffect, useState } from 'react';
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

export function EvaluationGridPanelHost() {
  const host = usePortalNode('teacher-area-evaluation');
  if (!host) return null;
  return createPortal(<EvaluationGridPanel />, host);
}

const EVAL_TOPBAR_COLLAPSED_KEY = 'evalTopbarCollapsedState';

function EvaluationGridPanel() {
  // Toggle abrir/cerrar de .eval-view-topbar (Volver/título/Guardar/Preview/Enviar): al entrar al
  // evaluador de un proyecto la cabecera de "Área de administración" ya se oculta sola (CSS
  // #teacher-area-tab:has(#eval-project-view:not(.hidden)) en promotion-detail.css); este toggle
  // deja además ocultar/mostrar esta barra a voluntad para ganar aún más espacio vertical. Estado
  // persistido en localStorage, igual que el resto de toggles de la vista.
  const [topbarCollapsed, setTopbarCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(EVAL_TOPBAR_COLLAPSED_KEY) || 'null');
      if (saved?.collapsed) setTopbarCollapsed(true);
    } catch { /* noop */ }
  }, []);

  const toggleEvalTopbar = () => {
    setTopbarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(EVAL_TOPBAR_COLLAPSED_KEY, JSON.stringify({ collapsed: next }));
      return next;
    });
  };

  // Toggle de .eval-targets-sidebar (lista de grupos/estudiantes). A DIFERENCIA de la topbar, NO se
  // persiste ni se lee de localStorage: la lista es ESENCIAL para evaluar, así que el evaluador
  // SIEMPRE abre con ella visible; el toggle solo la oculta dentro de la sesión actual (para ganar
  // espacio). FIX (bugfix/eval-sidebar-oculta): antes persistía en localStorage de forma global →
  // una vez colapsada, dejaba la lista oculta (display:none vía .d-none) en TODAS las evaluaciones,
  // haciendo imposible ver/seleccionar grupos o estudiantes. Parecía "roto".
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const toggleEvalSidebar = () => setSidebarCollapsed((prev) => !prev);

  useEffect(() => {
    let tries = 0;
    const iv = setInterval(() => {
      tries += 1;
      if (typeof w().loadEvaluation === 'function') {
        // Solo si el pane de evaluación está activo en este momento (tab-restore a evaluación o el
        // usuario lo abrió antes de montar el portal). Si no, no disparamos las fetches: el click
        // normal en la pestaña llamará a loadEvaluation por su cuenta.
        const pane = document.getElementById('teacher-area-evaluation');
        const isActive = !!pane && (pane.classList.contains('active') || pane.style.display === 'block');
        if (isActive) w().loadEvaluation();
        clearInterval(iv);
      } else if (tries > 60) {
        clearInterval(iv);
      }
    }, 100);
    return () => clearInterval(iv);
  }, []);

  return (
    <div id="evaluation-tab">
      {/* ── Vista lista: accordion de módulos/proyectos ───────────────────── */}
      <div id="evaluation-tab-view">
        <div className="d-flex justify-content-between align-items-center my-4">
          <div>
            <h2 className="subtitle-page">
              <i className="bi bi-clipboard-check me-2 text-primary" />Evaluación de Proyectos
            </h2>
          </div>
        </div>
        <div id="evaluation-content">
          {/* populated by JS (renderEvaluationTab) */}
        </div>
      </div>

      {/* ── Histórico de equipos ──────────────────────────────────────────── */}
      <div id="team-history-panel" className="hidden">
        <div className="d-flex align-items-center gap-3 my-4">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => w().closeTeamHistoryView?.()}>
            <i className="bi bi-arrow-left me-1" />Volver
          </button>
          <h4 className="mb-0 fw-bold">Histórico de equipos</h4>
        </div>
        <div id="team-history-panel-body" className="pb-4" />
      </div>

      {/* ── Split-view de evaluación individual (sidebar + panel derecho) ──── */}
      <div id="eval-project-view" className="hidden">
        <div className={`eval-view-topbar d-flex align-items-center gap-3 mb-0 ${topbarCollapsed ? 'py-1' : 'py-3'}`}>
          {/* Contenido de la barra: se oculta con .d-none (no se desmonta) para que el legacy
              (openEvaluationView/selectEvalTarget) pueda seguir poblando #eval-view-title/
              #eval-view-subtitle por id aunque esté colapsada. */}
          {/* .d-flex y .d-none son ambas !important con la misma especificidad en
              bootstrap-compat.css, y .d-flex está declarada después → gana siempre que
              ambas convivan en el mismo elemento. Por eso se aplica una sola clase u otra,
              nunca las dos a la vez. */}
          <div className={topbarCollapsed ? 'd-none' : 'd-flex align-items-center gap-3 flex-grow-1 min-w-0'}>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => w().closeEvaluationView?.()}>
              <i className="bi bi-arrow-left me-1" />Volver
            </button>
            <div className="flex-grow-1 min-w-0">
              <h5 className="mb-0 fw-bold text-truncate" id="eval-view-title">Evaluación</h5>
              <p className="mb-0 text-muted small" id="eval-view-subtitle" />
            </div>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => w().saveIndividualStudentEval?.()}>
              <i className="bi bi-save me-1" />Guardar
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              id="preview-eval-splitview-btn"
              onClick={() => w().previewStudentEvalReport?.(document.getElementById('eval-project-view')?.dataset.targetStudentId)}
              title="Ver preview del informe de evaluación PDF"
            >
              <i className="bi bi-eye me-1" />Preview informe
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-success"
              id="send-eval-splitview-btn"
              onClick={() => w().sendEvaluationByEmail?.()}
              title="Guardar y enviar informe PDF al correo del estudiante"
            >
              <i className="bi bi-envelope-arrow-up me-1" />Enviar evaluación
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              id="send-eval-all-splitview-btn"
              onClick={() => w().sendEvaluationToAllInProject?.()}
              title="Guardar y enviar la evaluación individual a todos los estudiantes evaluados en este proyecto"
            >
              <i className="bi bi-send me-1" />Enviar a todos
            </button>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary flex-shrink-0 ms-auto"
            id="eval-sidebar-toggle"
            onClick={toggleEvalSidebar}
            title={sidebarCollapsed ? 'Mostrar lista' : 'Ocultar lista'}
          >
            <i className={sidebarCollapsed ? 'bi bi-chevron-right' : 'bi bi-chevron-left'} />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary flex-shrink-0"
            id="eval-topbar-toggle"
            onClick={toggleEvalTopbar}
            title={topbarCollapsed ? 'Mostrar barra' : 'Ocultar barra'}
          >
            <i className={topbarCollapsed ? 'bi bi-chevron-down' : 'bi bi-chevron-up'} />
          </button>
        </div>
        <div className="eval-split-layout">
          {/* .eval-targets-sidebar no tiene !important en su display:flex, así que combinarla
              con .d-none (!important) la oculta sin conflicto — a diferencia del caso
              .d-flex/.d-none de arriba, aquí solo un lado es !important. */}
          <aside className={sidebarCollapsed ? 'eval-targets-sidebar d-none' : 'eval-targets-sidebar'}>
            {/* Cabecera de la lista: el legacy (_renderEvalTargetsList) puebla por id
                #eval-targets-label ('Grupos'/'Estudiantes') y #eval-targets-count (nº). Se
                renderizan vacíos para que el legacy los rellene sin pelear con el re-render. */}
            <div className="eval-targets-header d-flex align-items-center justify-content-between">
              <span id="eval-targets-label" className="fw-bold small text-uppercase text-muted" />
              <span className="badge bg-secondary" id="eval-targets-count" />
            </div>
            <ul className="eval-targets-list list-unstyled mb-0" id="eval-targets-list" />
          </aside>
          {/* Los editores .eval-feedback-rte (contenteditable) los inyecta el legacy en #eval-right-body
              / #student-eval-panel-body; el keydown handler se delega en #teacher-area-evaluation. */}
          <main className="eval-right-panel" id="eval-right-panel">
            <div id="eval-right-empty" className="text-center py-5">Selecciona un alumno</div>
            <div id="eval-right-content" className="d-none">
              <div id="eval-right-header" className="p-3 border-bottom" />
              <div id="eval-right-body" className="p-3" />
            </div>
          </main>
        </div>
      </div>

      {/* ── Panel legacy de evaluación individual ─────────────────────────── */}
      <div id="student-eval-panel" className="hidden">
        <div className="d-flex align-items-center gap-3 my-4">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => w().cancelStudentEvalPanel?.()}>
            <i className="bi bi-arrow-left me-1" />Volver
          </button>
          <h4 className="mb-0 fw-bold">Evaluación Individual</h4>
        </div>
        <div id="student-eval-panel-body" />
        <div className="d-flex gap-2 mt-4 mb-4">
          <button type="button" className="btn btn-primary" id="save-eval-panel-btn" onClick={() => w().saveIndividualStudentEval?.()}>
            <i className="bi bi-save me-1" />Guardar evaluación
          </button>
          <button
            type="button"
            className="btn btn-outline-success"
            id="send-eval-panel-btn"
            onClick={() => w().sendEvaluationByEmail?.()}
            title="Guardar y enviar informe PDF al correo del estudiante"
          >
            <i className="bi bi-envelope-arrow-up me-1" />Enviar evaluación
          </button>
        </div>
      </div>
    </div>
  );
}
