'use client';

import React from 'react';
import { Promotion, asTimedItem } from './types';

/**
 * Porta `generateGantt` (student-dashboard.js legacy) a JSX, reutilizando las
 * mismas clases CSS del gantt (.month-header/.label/.block.tema/.proyecto/
 * .transicion/.empty) que ya define promotion-detail.css / style.css.
 *
 * Modelo: cada mes = 4 semanas. Filas: módulos (tema), sus cursos (tema) y
 * proyectos (proyecto), y al final empleabilidad (transicion) por meses.
 */
export function GanttTable({ promotion }: { promotion: Promotion }) {
  const weeks = promotion.weeks || 24;
  const modules = promotion.modules || [];
  const employability = promotion.employability || [];

  if (modules.length === 0) {
    return (
      <table id="gantt-table" className="w-full">
        <tbody>
          <tr>
            <td className="text-center p-3">No modules defined</td>
          </tr>
        </tbody>
      </table>
    );
  }

  // Genera las celdas de una fila: `block <blockClass>` dentro de [start,end), `empty` fuera.
  const cells = (start: number, end: number, blockClass: string, title?: string) =>
    Array.from({ length: weeks }, (_, i) => {
      const on = i >= start && i < end;
      return (
        <td
          key={i}
          className={on ? `block ${blockClass}` : 'empty'}
          title={on && title ? title : undefined}
        />
      );
    });

  // ── Cabecera de meses (colSpan por mes) ──
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

  const rows: React.ReactNode[] = [];
  let weekCounter = 0;

  modules.forEach((module, index) => {
    const moduleStart = weekCounter;
    const moduleEnd = weekCounter + module.duration;

    // Fila de módulo (tema)
    rows.push(
      <tr key={`mod-${index}`}>
        <td className="label">
          <strong>
            Module {index + 1}: {module.name}
          </strong>
        </td>
        {cells(moduleStart, moduleEnd, 'tema', module.name)}
      </tr>
    );

    // Cursos (tema)
    (module.courses || []).forEach((c, ci) => {
      const { name, url, duration, offset } = asTimedItem(c);
      const start = weekCounter + offset;
      rows.push(
        <tr key={`mod-${index}-course-${ci}`}>
          <td className="label">
            {url ? (
              <a href={url} target="_blank" rel="noreferrer" className="no-underline">
                📖 {name}
              </a>
            ) : (
              <>📖 {name}</>
            )}
          </td>
          {cells(start, start + duration, 'tema')}
        </tr>
      );
    });

    // Proyectos (proyecto)
    (module.projects || []).forEach((p, pi) => {
      const { name, url, duration, offset } = asTimedItem(p);
      const start = weekCounter + offset;
      rows.push(
        <tr key={`mod-${index}-proj-${pi}`}>
          <td className="label">
            {url ? (
              <a href={url} target="_blank" rel="noreferrer" className="no-underline">
                🎯 {name}
              </a>
            ) : (
              <>🎯 {name}</>
            )}
          </td>
          {cells(start, start + duration, 'proyecto')}
        </tr>
      );
    });

    weekCounter += module.duration;
  });

  // ── Empleabilidad (transicion), por meses ──
  if (employability.length > 0) {
    rows.push(
      <tr key="emp-sep" style={{ height: '10px' }}>
        <td colSpan={weeks + 1} />
      </tr>
    );
    rows.push(
      <tr key="emp-header">
        <td className="label" colSpan={weeks + 1}>
          <strong>💼 Empleabilidad</strong>
        </td>
      </tr>
    );
    employability.forEach((item, ei) => {
      const startWeek = (item.startMonth - 1) * 4;
      const endWeek = startWeek + item.duration * 4;
      rows.push(
        <tr key={`emp-${ei}`}>
          <td className="label">
            <small>
              {item.url ? (
                <a href={item.url} target="_blank" rel="noreferrer" className="no-underline">
                  {item.name}
                </a>
              ) : (
                item.name
              )}
            </small>
          </td>
          {cells(startWeek, endWeek, 'transicion')}
        </tr>
      );
    });
  }

  return (
    <table id="gantt-table" className="w-full">
      <tbody>
        <tr className="month-header">
          <th className="label">Months</th>
          {monthCells.map((m, i) => (
            <th key={i} colSpan={m.span} style={{ textAlign: 'center' }}>
              {m.label}
            </th>
          ))}
        </tr>
        <tr>
          <th className="label">Módulos / Semanas</th>
          {Array.from({ length: weeks }, (_, i) => (
            <th key={i}>{i + 1}</th>
          ))}
        </tr>
        {rows}
      </tbody>
    </table>
  );
}
