'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Award, Plus, Pencil, Trash2, Wrench, FolderOpen, BarChartBig, Check, X } from 'lucide-react';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { apiFetch } from '@/lib/api';

// ── Tipos ──
interface Level { level: number; description: string; indicators: string[]; }
interface EvalModule { id: string; name: string; }
interface Comp {
  id: string;
  area: string;
  areas?: string[];
  name: string;
  description: string;
  levels: Level[];
  allTools: string[];
  selectedTools: string[];
  evalModules?: EvalModule[];
  startModule?: EvalModule;
}
interface CatalogComp { id: string; area: string; areas: string[]; name: string; description: string; levels: Level[]; allTools: string[]; }
interface PromotionModule { id: string; name?: string; title?: string; }

const LEVEL_COLORS: Record<number, string> = { 1: '#ffc107', 2: '#0d6efd', 3: '#198754' };
const LEVEL_BG: Record<number, string> = { 1: '#fff3cd', 2: '#cfe2ff', 3: '#d1e7dd' };
const LEVEL_NAMES: Record<number, string> = { 1: 'Básico', 2: 'Medio', 3: 'Avanzado' };
const AREA_BADGE = '#E85D26';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function w(): any { return window as any; }

// ── Hook: localizar un nodo del DOM (host de portal) mientras `active` ──
// Sondeo PERSISTENTE: el contenedor puede aparecer más tarde (lo crea
// promotion-detail.js al abrir la pestaña "Contenido del Programa") o
// recrearse al cambiar de pestaña; reenganchamos al nuevo nodo.
function usePortalNode(active: boolean, id: string): HTMLElement | null {
  const [node, setNode] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!active) { setNode(null); return; }
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
  }, [active, id]);
  return node;
}

export function ProgramCompetencesHost() {
  const [comps, setComps] = useState<Comp[]>([]);
  const [viewOnly, setViewOnly] = useState(false);
  const [catalog, setCatalog] = useState<CatalogComp[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [filterArea, setFilterArea] = useState('');
  const [catalogReady, setCatalogReady] = useState(false);

  // modales
  const [addOpen, setAddOpen] = useState(false);
  const [catalogFilter, setCatalogFilter] = useState('');
  const [toolsIdx, setToolsIdx] = useState<number | null>(null);
  const [toolsAll, setToolsAll] = useState<string[]>([]);
  const [toolsSel, setToolsSel] = useState<Set<string>>(new Set());
  const [customTool, setCustomTool] = useState('');

  // refs síncronos para el puente
  const compsRef = useRef<Comp[]>([]);
  const catalogReadyRef = useRef(false);
  const toolsAllRef = useRef<string[]>([]);
  const toolsSelRef = useRef<Set<string>>(new Set());
  useEffect(() => { compsRef.current = comps; }, [comps]);
  useEffect(() => { toolsAllRef.current = toolsAll; }, [toolsAll]);
  useEffect(() => { toolsSelRef.current = toolsSel; }, [toolsSel]);

  const listHost = usePortalNode(true, 'competences-list-container');
  const addHost = usePortalNode(addOpen, 'add-competence-host');
  const toolsHost = usePortalNode(toolsIdx !== null, 'tools-editor-host');

  const markUnsaved = () => { document.getElementById('competences-unsaved-badge')?.classList.remove('d-none'); };

  // ── Carga del catálogo (/api/competences + /api/areas) ──
  const loadCatalog = useCallback(async () => {
    if (catalogReadyRef.current) return;
    try {
      const [resC, resA] = await Promise.all([apiFetch('/api/competences'), apiFetch('/api/areas')]);
      const data = resC.ok ? await resC.json() : [];
      const allAreas = resA.ok ? await resA.json() : [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const norm: CatalogComp[] = (data as any[]).map((comp) => {
        const areaNames: string[] = (comp.areas || []).map((a: { name?: string }) => a.name).filter(Boolean);
        return {
          id: comp.id,
          area: comp.areas?.[0]?.name || 'Sin área',
          areas: areaNames,
          name: comp.name,
          description: comp.description || '',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          levels: (comp.levels || []).map((l: any) => ({ level: l.levelId, description: l.levelName || `Nivel ${l.levelId}`, indicators: (l.indicators || []).map((i: { name: string }) => i.name) })),
          allTools: (comp.tools || []).map((t: { name: string }) => t.name),
        };
      });
      setCatalog(norm);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const areaList: string[] = allAreas.length ? (allAreas as any[]).map((a) => a.name) : [...new Set(norm.map((c) => c.area))];
      setAreas(areaList);
      catalogReadyRef.current = true;
      setCatalogReady(true);
      // poblar el <select> legacy #competences-area-filter (vive en body.ts)
      const sel = document.getElementById('competences-area-filter') as HTMLSelectElement | null;
      if (sel) {
        sel.innerHTML = '<option value="">Todas las áreas</option>' + areaList.map((a) => `<option value="${a}">${a}</option>`).join('');
      }
      // refrescar levels/allTools de competencias ya cargadas
      setComps((prev) => prev.map((pc) => {
        const fresh = norm.find((c) => c.id === pc.id);
        if (!fresh) return pc;
        const allTools = [...fresh.allTools];
        return { ...pc, levels: JSON.parse(JSON.stringify(fresh.levels)), allTools, selectedTools: (pc.selectedTools || []).filter((t) => allTools.includes(t)) };
      }));
    } catch (e) {
      console.error('[ProgramCompetences] catálogo:', e);
    }
  }, []);

  // ── Puente window.ProgramCompetences (API que usa promotion-detail.js) ──
  useEffect(() => {
    const api = {
      __react: true,
      init: (saved: Comp[]) => { setViewOnly(false); setComps(Array.isArray(saved) ? JSON.parse(JSON.stringify(saved)) : []); loadCatalog(); },
      initViewOnly: (agg: Comp[]) => { setViewOnly(true); setComps(Array.isArray(agg) ? JSON.parse(JSON.stringify(agg)) : []); loadCatalog(); },
      getCompetences: () => JSON.parse(JSON.stringify(compsRef.current)),
      getEvalModulesSyncData: () => {
        const out: { moduleId: string; competenceId: string }[] = [];
        compsRef.current.forEach((c) => {
          const mods = c.evalModules || (c.startModule ? [c.startModule] : []);
          mods.forEach((m) => out.push({ moduleId: String(m.id), competenceId: String(c.id) }));
        });
        return out;
      },
      openAddCompetenceModal: () => { w()._openShadcnModal?.('addCompetenceModal'); setAddOpen(true); },
      filterByArea: () => { setFilterArea((document.getElementById('competences-area-filter') as HTMLSelectElement | null)?.value || ''); },
      _saveToolsSelection: (idx: number) => {
        setComps((prev) => prev.map((c, i) => (i === idx ? { ...c, allTools: toolsAllRef.current, selectedTools: [...toolsSelRef.current] } : c)));
        w()._closeShadcnModal?.('toolsEditorModal');
        setToolsIdx(null);
        markUnsaved();
      },
    };
    w().ProgramCompetences = api;
    return () => { if (w().ProgramCompetences === api) delete w().ProgramCompetences; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadCatalog]);

  // ── Acciones de edición ──
  const addFromCatalog = (cat: CatalogComp) => {
    if (comps.some((pc) => pc.id === cat.id)) return;
    setComps((prev) => [...prev, {
      id: cat.id, area: cat.area, name: cat.name, description: cat.description,
      levels: JSON.parse(JSON.stringify(cat.levels)), allTools: [...cat.allTools], selectedTools: [], evalModules: [],
    }]);
    markUnsaved();
  };
  const removeCompetence = (idx: number) => {
    if (!confirm(`¿Quitar la competencia "${comps[idx]?.name}" del programa?`)) return;
    setComps((prev) => prev.filter((_, i) => i !== idx));
    markUnsaved();
  };
  const toggleEvalModule = (idx: number, m: PromotionModule, checked: boolean) => {
    setComps((prev) => prev.map((c, i) => {
      if (i !== idx) return c;
      const mods = c.evalModules || [];
      const next = checked
        ? (mods.some((x) => String(x.id) === String(m.id)) ? mods : [...mods, { id: String(m.id), name: m.name || m.title || `Módulo ${m.id}` }])
        : mods.filter((x) => String(x.id) !== String(m.id));
      return { ...c, evalModules: next };
    }));
    markUnsaved();
  };
  const openToolsEditor = (idx: number) => {
    const c = comps[idx];
    if (!c) return;
    w()._toolsEditorIdx = idx;
    setToolsAll([...(c.allTools || [])]);
    setToolsSel(new Set(c.selectedTools || []));
    setCustomTool('');
    w()._openShadcnModal?.('toolsEditorModal');
    setToolsIdx(idx);
  };
  const addCustomTool = () => {
    const name = customTool.trim();
    if (!name) return;
    if (!toolsAll.some((t) => t.toLowerCase() === name.toLowerCase())) {
      setToolsAll((p) => [...p, name]);
      setToolsSel((p) => new Set(p).add(name));
    } else {
      setToolsSel((p) => new Set(p).add(toolsAll.find((t) => t.toLowerCase() === name.toLowerCase())!));
    }
    setCustomTool('');
  };
  const removeCustomTool = (tool: string) => {
    setToolsAll((p) => p.filter((t) => t !== tool));
    setToolsSel((p) => { const n = new Set(p); n.delete(tool); return n; });
  };

  const areaColor = AREA_BADGE;
  const modules: PromotionModule[] = (typeof window !== 'undefined' && (w().promotionModules as PromotionModule[])) || [];

  const filtered = filterArea ? comps.filter((c) => c.area === filterArea) : comps;

  // ── Render del acordeón (en #competences-list-container) ──
  const list = (() => {
    if (!comps.length) {
      return (
        <div className="text-center py-4 text-muted-foreground">
          <Award className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <span>{viewOnly ? 'Aún no hay competencias definidas. Defínelas en la sección Evaluación.' : 'No hay competencias añadidas al programa. Usa el botón "Añadir Competencia".'}</span>
        </div>
      );
    }
    if (!filtered.length) {
      return <div className="text-center py-3 text-muted-foreground">No hay competencias en el área seleccionada.</div>;
    }
    return (
      <Accordion type="single" collapsible className="w-full">
        {filtered.map((comp) => {
          const realIdx = comps.indexOf(comp);
          const levelDescs = (comp.levels || []).reduce<Record<number, string>>((a, l) => { a[l.level] = l.description; return a; }, {});
          const selCount = (comp.selectedTools || []).length;
          const allCount = (comp.allTools || []).length;
          const selModIds = new Set((comp.evalModules || []).map((m) => String(m.id)));
          return (
            <AccordionItem key={comp.id} value={comp.id} className="border-l-4 mb-1" style={{ borderLeftColor: areaColor }}>
              <AccordionTrigger>
                <span className="flex items-center flex-wrap gap-2 w-full mr-3">
                  <span className="badge" style={{ background: areaColor, color: '#fff' }}>{comp.area}</span>
                  <strong>{comp.name}</strong>
                  {(comp.evalModules || []).map((m) => (
                    <span key={m.id} className="badge" style={{ background: areaColor, color: '#fff', fontSize: '.7rem' }}><FolderOpen className="inline h-3 w-3 mr-1" />{m.name}</span>
                  ))}
                  <span className="ml-auto flex gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Wrench className="h-3 w-3" />{selCount}/{allCount}</span>
                    <span className="inline-flex items-center gap-1"><BarChartBig className="h-3 w-3" />{(comp.levels || []).length}</span>
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                {comp.description && <p className="text-muted-foreground text-sm mb-3">{comp.description}</p>}
                {!viewOnly && (
                  <div className="mb-3 p-3 rounded border" style={{ background: '#fff8f5', borderColor: areaColor }}>
                    <label className="text-sm font-semibold mb-2 block" style={{ color: areaColor }}><FolderOpen className="inline h-4 w-4 mr-1" />Módulos en los que se evalúa esta competencia</label>
                    {modules.length === 0 ? (
                      <small className="text-muted-foreground italic">Crea módulos en el Roadmap para poder asignarlos aquí.</small>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {modules.map((m) => (
                          <label key={m.id} className="form-check inline-flex items-center gap-1">
                            <input type="checkbox" className="form-check-input" checked={selModIds.has(String(m.id))} onChange={(e) => toggleEvalModule(realIdx, m, e.target.checked)} />
                            <span className="text-sm">{m.name || m.title || `Módulo ${m.id}`}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <h6 className="text-xs uppercase text-muted-foreground mb-2"><BarChartBig className="inline h-3 w-3 mr-1" />Niveles e indicadores</h6>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                  {[1, 2, 3].map((lvl) => {
                    const lo = (comp.levels || []).find((l) => l.level === lvl);
                    const inds = lo?.indicators || [];
                    return (
                      <div key={lvl} className="p-2 h-full rounded border" style={{ background: LEVEL_BG[lvl], borderColor: LEVEL_COLORS[lvl] }}>
                        <div className="font-bold uppercase mb-1" style={{ color: LEVEL_COLORS[lvl], fontSize: '0.6rem', letterSpacing: '0.05em' }}><Award className="inline h-3 w-3 mr-1" />Nivel {lvl}</div>
                        <div className="font-semibold mb-1" style={{ fontSize: '0.75rem' }}>{levelDescs[lvl] || LEVEL_NAMES[lvl]}</div>
                        {inds.length ? <ul className="mb-0 pl-3 list-disc text-muted-foreground" style={{ fontSize: '0.7rem' }}>{inds.map((n, k) => <li key={k}>{n}</li>)}</ul> : <div className="text-muted-foreground italic" style={{ fontSize: '0.7rem' }}>Sin indicadores.</div>}
                      </div>
                    );
                  })}
                </div>
                <h6 className="text-xs uppercase text-muted-foreground mb-2"><Wrench className="inline h-3 w-3 mr-1" />Herramientas seleccionadas</h6>
                <div className="mb-2 flex flex-wrap gap-1">
                  {(comp.selectedTools || []).length ? (comp.selectedTools || []).map((t, k) => (
                    <span key={k} className="badge bg-light text-dark border inline-flex items-center gap-1"><Wrench className="h-3 w-3 opacity-50" />{t}</span>
                  )) : <span className="text-muted-foreground text-sm italic">Sin herramientas seleccionadas.</span>}
                </div>
                {!viewOnly && (
                  <>
                    <button className="btn btn-sm btn-outline-secondary inline-flex items-center gap-1" onClick={() => openToolsEditor(realIdx)}><Pencil className="h-3 w-3" />Editar herramientas</button>
                    <div className="flex justify-end mt-3 pt-2 border-t">
                      <button className="btn btn-sm btn-outline-danger inline-flex items-center gap-1" onClick={() => removeCompetence(realIdx)}><Trash2 className="h-3 w-3" />Quitar competencia</button>
                    </div>
                  </>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    );
  })();

  // ── Cuerpo del modal "Añadir competencia" ──
  const addBody = (
    <>
      <div className="mb-3">
        <label className="form-label">Filtrar por área</label>
        <select className="form-select" value={catalogFilter} onChange={(e) => setCatalogFilter(e.target.value)}>
          <option value="">Todas las áreas</option>
          {areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        {(catalogFilter ? catalog.filter((c) => c.area === catalogFilter) : catalog).map((cat) => {
          const added = comps.some((pc) => pc.id === cat.id);
          return (
            <div key={cat.id} className={`card ${added ? 'border-success' : ''}`}>
              <div className="card-body py-2 px-3 flex justify-between items-center">
                <div>
                  <span className="badge me-2" style={{ background: areaColor, color: '#fff' }}>{cat.area}</span>
                  <strong>{cat.name}</strong>
                  <small className="text-muted-foreground ms-2 hidden md:inline">{cat.description}</small>
                </div>
                <button className={`btn btn-sm ${added ? 'btn-success' : 'btn-outline-primary'} inline-flex items-center gap-1`} disabled={added} onClick={() => addFromCatalog(cat)}>
                  {added ? <><Check className="h-3 w-3" />Añadida</> : <><Plus className="h-3 w-3" />Añadir</>}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  // ── Cuerpo del modal "Editor de herramientas" ──
  const catalogAllTools = toolsIdx !== null ? (catalog.find((c) => c.id === comps[toolsIdx]?.id)?.allTools || []) : [];
  const toolsBody = (
    <>
      <p className="text-muted-foreground text-sm mb-3">Selecciona las herramientas del catálogo y/o añade herramientas personalizadas.</p>
      <div className="mb-3 flex flex-col gap-1">
        {toolsAll.length ? toolsAll.map((tool) => {
          const isCustom = !catalogAllTools.includes(tool);
          return (
            <label key={tool} className="form-check flex items-center gap-2">
              <input type="checkbox" className="form-check-input" checked={toolsSel.has(tool)} onChange={(e) => setToolsSel((p) => { const n = new Set(p); if (e.target.checked) n.add(tool); else n.delete(tool); return n; })} />
              <span className="flex-grow">{tool}{isCustom && <span className="badge bg-primary ms-1" style={{ fontSize: '.65rem' }}>personalizada</span>}</span>
              {isCustom && <button type="button" className="text-red-600 ml-auto" title="Eliminar" onClick={() => removeCustomTool(tool)}><X className="h-4 w-4" /></button>}
            </label>
          );
        }) : <span className="text-muted-foreground text-sm italic">No hay herramientas en el catálogo para esta competencia.</span>}
      </div>
      <div className="border-t pt-3">
        <label className="form-label text-sm font-semibold"><Plus className="inline h-4 w-4 mr-1 text-crok" />Añadir herramienta personalizada</label>
        <div className="flex gap-2">
          <input type="text" className="form-control form-control-sm" placeholder="Ej: Figma, Storybook, Postman..." value={customTool} onChange={(e) => setCustomTool(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTool(); } }} />
          <button type="button" className="btn btn-sm btn-outline-primary inline-flex items-center gap-1 whitespace-nowrap" onClick={addCustomTool}><Plus className="h-4 w-4" />Añadir</button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {listHost && createPortal(list, listHost)}
      {addHost && createPortal(addBody, addHost)}
      {toolsHost && createPortal(toolsBody, toolsHost)}
    </>
  );
}
