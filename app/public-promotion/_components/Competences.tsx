'use client';

import React, { useMemo, useState } from 'react';
import { Award, Wrench, BarChartBig } from 'lucide-react';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import type { PPExtendedInfo, PPCompetence } from './types';

const AREA_BG: Record<string, string> = {
  web: '#0d6efd', ai: '#212529', accessibility: '#0dcaf0', green: '#198754', inmersivo: '#ffc107',
};
const LEVEL_COLORS: Record<number, string> = { 1: '#ffc107', 2: '#0d6efd', 3: '#198754' };
const LEVEL_BG: Record<number, string> = { 1: '#fff3cd', 2: '#cfe2ff', 3: '#d1e7dd' };
const LEVEL_NAMES: Record<number, string> = { 1: 'Básico', 2: 'Medio', 3: 'Avanzado' };

export function CompetencesSection({ info }: { info: PPExtendedInfo }) {
  const all = useMemo(() => {
    const usedIds = new Set<string>();
    (info.projectCompetences || []).forEach((pc) => (pc.competenceIds || []).forEach((cid) => usedIds.add(String(cid))));
    return (info.competences || []).filter((c) => usedIds.has(String(c.id)));
  }, [info]);

  const areas = useMemo(() => [...new Set(all.map((c) => c.area).filter(Boolean))] as string[], [all]);
  const [area, setArea] = useState('');

  if (all.length === 0) return null;
  const filtered = area ? all.filter((c) => c.area === area) : all;

  return (
    <div className="pp-section-card mb-4">
      <div className="pp-section-header flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Award className="pp-section-header-icon h-5 w-5" />
          <h5 className="m-0">Competencias</h5>
        </div>
        <div className="flex items-center gap-2">
          <label className="m-0 text-xs font-semibold text-muted-foreground">Área:</label>
          <select className="h-8 text-sm rounded-md border border-input bg-transparent px-2" value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">Todas</option>
            {areas.map((a) => (<option key={a} value={a}>{a}</option>))}
          </select>
        </div>
      </div>
      <div className="pp-section-body">
        {filtered.length === 0 ? (
          <p className="text-muted-foreground">No hay competencias en esta área.</p>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {filtered.map((comp, i) => (
              <CompetenceItem key={i} comp={comp} idx={i} />
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
}

function CompetenceItem({ comp, idx }: { comp: PPCompetence; idx: number }) {
  const selectedCount = (comp.selectedTools || []).length;
  const allCount = (comp.allTools || comp.selectedTools || []).length;
  const levelsCount = (comp.levels || []).length;
  const areaBg = AREA_BG[comp.area || ''] || '#6c757d';

  return (
    <AccordionItem value={`comp-${idx}`} className="shadow-sm mb-2 border rounded overflow-hidden px-3">
      <AccordionTrigger>
        <span className="flex items-center flex-wrap gap-2 w-full mr-3">
          <span className="badge" style={{ backgroundColor: areaBg, color: '#fff', fontSize: '.65rem' }}>{comp.area}</span>
          <strong className="text-sm">{comp.name}</strong>
          <span className="ml-auto flex gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Wrench className="h-3 w-3" />{selectedCount}/{allCount}</span>
            <span className="inline-flex items-center gap-1"><BarChartBig className="h-3 w-3" />{levelsCount}</span>
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent>
        {comp.description && <p className="text-muted-foreground mb-3" style={{ fontSize: '0.8rem', lineHeight: 1.3 }}>{comp.description}</p>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
          {[1, 2, 3].map((lvl) => {
            const levelObj = (comp.levels || []).find((l) => l.level === lvl);
            const desc = levelObj?.description || LEVEL_NAMES[lvl];
            const inds = levelObj?.indicators || [];
            return (
              <div key={lvl} className="p-2 h-full rounded border" style={{ background: LEVEL_BG[lvl], borderColor: LEVEL_COLORS[lvl] }}>
                <div className="font-bold uppercase mb-1" style={{ color: LEVEL_COLORS[lvl], fontSize: '0.6rem', letterSpacing: '0.05em' }}>
                  <Award className="h-3 w-3 inline mr-1" />Nivel {lvl}
                </div>
                <div className="font-semibold mb-1" style={{ fontSize: '0.75rem', lineHeight: 1.2 }}>{desc}</div>
                {inds.length ? (
                  <ul className="mb-0 pl-3 list-disc text-muted-foreground" style={{ fontSize: '0.7rem', lineHeight: 1.2 }}>
                    {inds.map((n, k) => (<li key={k}>{n}</li>))}
                  </ul>
                ) : (
                  <div className="text-muted-foreground italic" style={{ fontSize: '0.7rem' }}>Sin indicadores.</div>
                )}
              </div>
            );
          })}
        </div>
        {selectedCount > 0 && (
          <div>
            <div className="font-bold uppercase text-muted-foreground mb-2" style={{ fontSize: '0.6rem', letterSpacing: '0.05em' }}>
              <Wrench className="h-3 w-3 inline mr-1" />Herramientas
            </div>
            <div className="flex flex-wrap gap-1">
              {(comp.selectedTools || []).map((t, k) => (
                <span key={k} className="badge bg-light text-dark border inline-flex items-center gap-1">
                  <Wrench className="h-3 w-3 opacity-50" />{t}
                </span>
              ))}
            </div>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
