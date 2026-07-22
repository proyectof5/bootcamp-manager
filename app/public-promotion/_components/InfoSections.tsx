'use client';

import React from 'react';
import { Clock, Users, ClipboardCheck, FileText, Library, FolderOpen, ExternalLink, Mail, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import {
  PPSection,
  PPSchedule,
  PPTeamMember,
  PPResource,
  PPPromoResource,
  PROMO_RES_META,
  hasScheduleData,
} from './types';

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="pp-section-card mb-4">
      <div className="pp-section-header flex items-center gap-2">
        <span className="pp-section-header-icon">{icon}</span>
        <h5>{title}</h5>
      </div>
      <div className="pp-section-body">{children}</div>
    </div>
  );
}

/* Secciones genéricas de contenido (endpoint /sections) */
export function GenericSections({ sections }: { sections: PPSection[] }) {
  if (!sections.length) return null;
  return (
    <>
      {sections.map((s) => (
        <SectionCard key={s.id} icon={<FileText className="h-5 w-5" />} title={s.title}>
          <p className="whitespace-pre-line m-0">{s.content}</p>
        </SectionCard>
      ))}
    </>
  );
}

function ScheduleColumn({ title, block }: { title: string; block?: PPSchedule['online'] }) {
  if (!block) return null;
  const rows: [string, string | undefined][] = [
    ['Inicio', block.entry], ['Píldora', block.start], ['Break', block.break], ['Comida', block.lunch], ['Cierre', block.finish],
  ];
  if (!rows.some(([, v]) => v)) return null;
  return (
    <div className="flex-1 min-w-[220px]">
      <h6 className="mb-2 font-semibold">{title}</h6>
      <ul className="mb-0 pl-5 list-disc">
        {rows.map(([label, v]) => (v ? <li key={label}><strong>{label}:</strong> {v}</li> : null))}
      </ul>
    </div>
  );
}

export function ScheduleSection({ schedule }: { schedule?: PPSchedule | null }) {
  if (!hasScheduleData(schedule)) return null;
  return (
    <SectionCard icon={<Clock className="h-5 w-5" />} title="Horario">
      <div className="flex flex-wrap gap-4 items-start">
        <ScheduleColumn title="Horario de clases Online" block={schedule!.online} />
        <ScheduleColumn title="Horario de clases presenciales" block={schedule!.presential} />
      </div>
      {schedule!.notes && schedule!.notes.trim() && (
        <div className="rounded border border-sky-200 bg-sky-50 text-sky-800 p-3 mt-3 mb-0">
          <strong>Notas:</strong> {schedule!.notes}
        </div>
      )}
    </SectionCard>
  );
}

export function TeamSection({ team }: { team?: PPTeamMember[] | null }) {
  if (!team || team.length === 0) return null;
  return (
    <SectionCard icon={<Users className="h-5 w-5" />} title="Equipo">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {team.map((m, i) => (
          <div key={i} className="card">
            <div className="card-body">
              <h6 className="card-title font-semibold">{m.name || 'Unknown'}</h6>
              {m.role && <p className="card-text mb-1"><strong>{m.role}</strong></p>}
              {m.email && (
                <p className="card-text mb-1">
                  <a href={`mailto:${m.email}`} className="inline-flex items-center gap-1 text-crok hover:underline">
                    <Mail className="h-3.5 w-3.5" />{m.email}
                  </a>
                </p>
              )}
              {m.linkedin && (
                <p className="card-text mb-0">
                  <a href={m.linkedin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-crok hover:underline">
                    <ExternalLink className="h-3.5 w-3.5" />LinkedIn Profile
                  </a>
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export function EvaluationSection({ evaluation }: { evaluation?: string | null }) {
  if (!evaluation || !evaluation.trim()) return null;
  const isHtml = /<[a-z]/i.test(evaluation);
  return (
    <SectionCard icon={<ClipboardCheck className="h-5 w-5" />} title="Evaluación">
      {isHtml ? (
        <div dangerouslySetInnerHTML={{ __html: evaluation }} />
      ) : (
        <div className="whitespace-pre-line">{evaluation}</div>
      )}
    </SectionCard>
  );
}

/* Recursos del programa (extended-info.resources) — list-group */
export function ProgramResourcesSection({ resources }: { resources?: PPResource[] | null }) {
  if (!resources || resources.length === 0) return null;
  return (
    <SectionCard icon={<Library className="h-5 w-5" />} title="Recursos">
      <div className="flex flex-col rounded-md border border-border overflow-hidden">
        {resources.map((r, i) => (
          <a key={i} href={r.url || '#'} target="_blank" rel="noreferrer"
            className="flex justify-between items-center gap-2 p-3 border-b border-border last:border-b-0 hover:bg-gray-50 transition-colors">
            <div>
              <h6 className="mb-1 font-semibold">{r.title || 'Untitled Resource'}</h6>
              {r.url && <small className="text-muted-foreground break-all">{r.url}</small>}
            </div>
            {r.category && <Badge variant="secondary">{r.category}</Badge>}
          </a>
        ))}
      </div>
    </SectionCard>
  );
}

/* Recursos internos (endpoint /promotion-resources) — accordion anidado por módulo */
export function InternalResourcesSection({ resources }: { resources: PPPromoResource[] }) {
  if (!resources || resources.length === 0) return null;

  const grouped = new Map<string, PPPromoResource[]>();
  resources.forEach((r) => {
    const key = r.module || '__sin_modulo__';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  });

  return (
    <SectionCard icon={<Library className="h-5 w-5" />} title="Recursos Internos">
      <Accordion type="single" collapsible className="w-full">
        {[...grouped.entries()].map(([moduleName, items], modIdx) => (
          <AccordionItem key={modIdx} value={`mod-${modIdx}`}>
            <AccordionTrigger>
              <span className="flex items-center gap-2 text-crok font-semibold">
                <FolderOpen className="h-4 w-4" />
                {moduleName === '__sin_modulo__' ? 'Sin módulo' : moduleName}
                <Badge variant="secondary">{items.length}</Badge>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <Accordion type="single" collapsible className="w-full">
                {items.map((r, rIdx) => {
                  const meta = PROMO_RES_META[r.type || 'other'] || PROMO_RES_META.other;
                  return (
                    <AccordionItem key={rIdx} value={`res-${modIdx}-${rIdx}`} className="border rounded mb-2 px-3">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2 w-full flex-wrap">
                          <Award className="h-4 w-4" style={{ color: meta.color }} />
                          <span className="font-semibold flex-grow">{r.title}</span>
                          <Badge variant="secondary">{meta.label}</Badge>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        {r.description && <p className="text-muted-foreground text-sm mb-2">{r.description}</p>}
                        <a href={r.url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 bg-crok hover:bg-crok-hover text-crok-on text-sm rounded px-3 py-1.5">
                          <ExternalLink className="h-3.5 w-3.5" />Abrir recurso
                        </a>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </SectionCard>
  );
}
