'use client';

import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { PPPromotion, ppName } from './types';

/**
 * Porta generateGanttChart (public-promotion.js) a JSX. Conserva los colores y
 * el comportamiento colapsable (empleabilidad + cada módulo), pero el colapso
 * se maneja con estado React en vez de `data-bs-toggle="collapse"`.
 */
export function PublicGanttTable({ promotion }: { promotion: PPPromotion }) {
  const weeks = promotion.weeks || 0;
  const modules = promotion.modules || [];
  const employability = promotion.employability || [];

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  if (modules.length === 0) {
    return (
      <table className="table table-sm table-bordered w-full" style={{ fontSize: '0.75rem' }}>
        <tbody>
          <tr>
            <td className="text-muted">No modules configured</td>
          </tr>
        </tbody>
      </table>
    );
  }

  const labelStyle: React.CSSProperties = { minWidth: 150, maxWidth: 200, padding: 4, textAlign: 'left' };
  const cell = (bg?: string, color?: string, height = 30): React.CSSProperties => ({
    textAlign: 'center',
    height,
    minWidth: 20,
    maxWidth: 25,
    padding: 1,
    fontSize: '0.7rem',
    backgroundColor: bg,
    color,
  });

  // Cabecera de meses
  const monthCells: { label: string; span: number }[] = [];
  let curMonth = 0;
  for (let i = 1; i <= weeks; i++) {
    const m = Math.ceil(i / 4);
    if (m !== curMonth) {
      monthCells.push({ label: `M${m}`, span: 1 });
      curMonth = m;
    } else {
      monthCells[monthCells.length - 1].span++;
    }
  }

  const range = (start: number, end: number, bg: string, height = 22) =>
    Array.from({ length: weeks }, (_, i) => (
      <td key={i} style={cell(i >= start && i < end ? bg : undefined, undefined, height)} />
    ));

  const rows: React.ReactNode[] = [];

  // ── Empleabilidad ──
  if (employability.length > 0) {
    const empId = 'employability-group';
    const open = !!expanded[empId];
    const starts = employability.map((e) => (e.startMonth - 1) * 4);
    const ends = employability.map((e) => (e.startMonth - 1) * 4 + e.duration * 4);
    const minStart = Math.min(...starts);
    const maxEnd = Math.min(Math.max(...ends), weeks);
    rows.push(
      <tr key="emp-head" style={{ cursor: 'pointer' }} onClick={() => toggle(empId)}>
        <td style={{ ...labelStyle }}>
          <div className="flex items-center">
            <ChevronRight className="h-3 w-3 mr-1 transition-transform" style={{ transform: open ? 'rotate(90deg)' : undefined }} />
            <strong style={{ fontSize: '0.7rem' }}>Sesiones Empleabilidad</strong>
            <span className="badge bg-warning text-dark ms-2" style={{ fontSize: '0.6rem' }}>{employability.length}</span>
          </div>
        </td>
        {Array.from({ length: weeks }, (_, i) => (
          <td key={i} style={cell(i >= minStart && i < maxEnd ? '#ffe082' : undefined, undefined, 28)} />
        ))}
      </tr>
    );
    if (open) {
      employability.forEach((item, ei) => {
        const start = (item.startMonth - 1) * 4;
        rows.push(
          <tr key={`emp-${ei}`}>
            <td style={{ ...labelStyle, padding: 2 }}>
              <small style={{ marginLeft: '1.5rem', fontSize: '0.6rem' }}>
                {item.url ? (
                  <a href={item.url} target="_blank" rel="noreferrer" className="no-underline">{item.name}</a>
                ) : (
                  item.name
                )}
              </small>
            </td>
            {range(start, start + item.duration * 4, '#fff3cd')}
          </tr>
        );
      });
    }
  }

  // ── Módulos ──
  let weekCounter = 0;
  modules.forEach((module, index) => {
    const modId = `module-${index}`;
    const hasSub = (module.courses?.length || 0) > 0 || (module.projects?.length || 0) > 0;
    const open = !!expanded[modId];
    const start = weekCounter;
    const end = weekCounter + module.duration;

    rows.push(
      <tr key={modId} style={hasSub ? { cursor: 'pointer' } : undefined} onClick={hasSub ? () => toggle(modId) : undefined}>
        <td style={labelStyle}>
          <div className="flex items-center">
            {hasSub && (
              <ChevronRight className="h-3 w-3 mr-1 transition-transform" style={{ transform: open ? 'rotate(90deg)' : undefined }} />
            )}
            <strong style={{ fontSize: '0.7rem' }}>M{index + 1}: {module.name}</strong>
          </div>
        </td>
        {Array.from({ length: weeks }, (_, i) => (
          <td key={i} style={cell(i >= start && i < end ? '#667eea' : undefined, i >= start && i < end ? 'white' : undefined, 30)} />
        ))}
      </tr>
    );

    if (hasSub && open) {
      (module.courses || []).forEach((c, ci) => {
        const { name, url, duration, offset } = ppName(c);
        const s = weekCounter + offset;
        rows.push(
          <tr key={`${modId}-c-${ci}`}>
            <td style={{ ...labelStyle, padding: 2 }}>
              <small style={{ marginLeft: '1.5rem', fontSize: '0.6rem' }}>
                {url ? <a href={url} target="_blank" rel="noreferrer" className="no-underline"> {name}</a> : <> {name}</>}
              </small>
            </td>
            {range(s, s + duration, '#d1e7dd', 20)}
          </tr>
        );
      });
      (module.projects || []).forEach((p, pi) => {
        const { name, duration, offset } = ppName(p);
        const s = weekCounter + offset;
        rows.push(
          <tr key={`${modId}-p-${pi}`}>
            <td style={{ ...labelStyle, padding: 2 }}>
              <small style={{ marginLeft: '1.5rem', fontSize: '0.6rem' }}> {name}</small>
            </td>
            {range(s, s + duration, '#fce4e4', 20)}
          </tr>
        );
      });
    }

    weekCounter += module.duration;
  });

  return (
    <table className="table table-sm table-bordered w-full" style={{ fontSize: '0.75rem' }}>
      <tbody>
        <tr>
          <th style={{ minWidth: 150, maxWidth: 200, fontSize: '0.7rem', textAlign: 'left' }}><strong>Meses</strong></th>
          {monthCells.map((m, i) => (
            <th key={i} colSpan={m.span} style={{ textAlign: 'center', fontSize: '0.65rem', minWidth: 20, padding: 2 }}>
              <strong>{m.label}</strong>
            </th>
          ))}
        </tr>
        <tr>
          <th style={{ minWidth: 150, maxWidth: 200, fontSize: '0.7rem', textAlign: 'left' }}>Semanas:</th>
          {Array.from({ length: weeks }, (_, i) => (
            <th key={i} style={{ textAlign: 'center', fontSize: '0.6rem', minWidth: 20, maxWidth: 25, padding: 2, writingMode: 'vertical-rl', textOrientation: 'mixed' }}>{i + 1}</th>
          ))}
        </tr>
        {rows}
      </tbody>
    </table>
  );
}
