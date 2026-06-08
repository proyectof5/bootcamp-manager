'use client';

import React, { useState } from 'react';
import { Lightbulb, UserPlus } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { PPExtendedInfo, PPPildora, PPModulePildoras, PPStudent, PPPromotion } from './types';

function nextDateIndex(pildoras: PPPildora[]): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let idx = -1;
  let next: Date | null = null;
  pildoras.forEach((p, i) => {
    if (p.date && p.date.trim()) {
      const d = new Date(p.date);
      d.setHours(0, 0, 0, 0);
      if (d >= today && (!next || d < next)) {
        next = d;
        idx = i;
      }
    }
  });
  return idx;
}

const TD = 'border border-[#dee2e6] align-middle p-2';

function PildoraTable({
  pildoras,
  moduleId,
  isLegacy,
  assignmentOpen,
  students,
  promotionId,
  onReload,
}: {
  pildoras: PPPildora[];
  moduleId?: string;
  isLegacy: boolean;
  assignmentOpen: boolean;
  students: PPStudent[];
  promotionId: string;
  onReload: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<Record<number, string>>({});
  const nIdx = nextDateIndex(pildoras);
  const maxVisible = 5;

  const assign = async (pIdx: number) => {
    const firstAssigned = pildoras[pIdx].students?.[0]?.id || '';
    const sId = selected[pIdx] ?? firstAssigned;
    if (!sId) {
      alert('Por favor selecciona un Coder antes de apuntarte');
      return;
    }
    try {
      const payload = isLegacy
        ? { pildoraIndex: pIdx, studentId: sId, action: 'add', isLegacy: true }
        : { moduleId, pildoraIndex: pIdx, studentId: sId, action: 'add', isLegacy: false };
      const res = await apiFetch(`/api/promotions/${promotionId}/pildoras-self-assign`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        alert('¡Te has apuntado correctamente a la píldora!');
        onReload();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 403) alert('La autoasignación está cerrada. El profesor ha deshabilitado esta funcionalidad.');
      else if (res.status === 404) alert('No se encontró la píldora o el estudiante. Recarga la página e intenta de nuevo.');
      else if (res.status === 400) alert(`Solicitud inválida: ${data.error || ''}`);
      else alert(`Error: ${data.error || res.status}`);
    } catch {
      alert('Error de conexión. Por favor intenta de nuevo.');
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="table table-sm table-bordered" style={{ borderColor: '#dee2e6' }}>
        <thead className="table-light">
          <tr>
            <th className={`${TD} text-center`} style={{ width: '15%' }}>Presentación</th>
            <th className={`${TD} text-center`} style={{ width: '15%' }}>Fecha</th>
            <th className={`${TD} text-center`} style={{ width: '30%' }}>Píldora</th>
            <th className={`${TD} text-center`} style={{ width: '20%' }}>Coder</th>
            <th className={`${TD} text-center`} style={{ width: '10%' }}>Estado</th>
            {assignmentOpen && <th className={`${TD} text-center`} style={{ width: '15%' }}>Acción</th>}
          </tr>
        </thead>
        <tbody>
          {pildoras.map((p, i) => {
            if (i >= maxVisible && !expanded) return null;
            const students_ = p.students || [];
            const studentsText = students_.length
              ? students_.map((s) => `${(s.name || '').trim()} ${(s.lastname || '').trim()}`.trim()).join(', ')
              : 'Desierta';
            const isNext = i === nIdx;
            const orange: React.CSSProperties = isNext ? { backgroundColor: '#ff6600', color: 'white' } : {};
            const firstAssigned = students_[0]?.id || '';
            return (
              <tr key={i}>
                <td className={`${TD} text-center`} style={orange}>{p.mode || ''}</td>
                <td className={`${TD} text-center`} style={orange}>{p.date || ''}</td>
                <td className={`${TD} text-left`} style={orange}>{p.title || ''}</td>
                <td className={`${TD} text-left`} style={orange}>{studentsText}</td>
                <td className={`${TD} text-center`} style={orange}>{p.status || ''}</td>
                {assignmentOpen && (
                  <td className={`${TD} text-center`}>
                    <div className="flex flex-col gap-1">
                      <select
                        className="form-select form-select-sm"
                        value={selected[i] ?? firstAssigned}
                        onChange={(e) => setSelected((s) => ({ ...s, [i]: e.target.value }))}
                      >
                        <option value="">Selecciona Coder...</option>
                        {students.map((s) => (
                          <option key={s.id} value={s.id}>{s.name} {s.lastname}</option>
                        ))}
                      </select>
                      <button className="btn btn-xs btn-primary py-0 inline-flex items-center justify-center gap-1" style={{ fontSize: '0.7rem' }} onClick={() => assign(i)}>
                        <UserPlus className="h-3 w-3" /> Apuntarse
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {pildoras.length > maxVisible && (
        <div className="text-center">
          <button className="btn btn-link" onClick={() => setExpanded((e) => !e)}>
            {expanded ? 'Ver menos' : 'Ver todas las píldoras'}
          </button>
        </div>
      )}
    </div>
  );
}

export function PildorasSection({
  info,
  students,
  promotion,
  promotionId,
  onReload,
}: {
  info: PPExtendedInfo;
  students: PPStudent[];
  promotion: PPPromotion | null;
  promotionId: string;
  onReload: () => void;
}) {
  const assignmentOpen = !!info.pildorasAssignmentOpen;

  // Módulos con píldoras reales
  const modulesWithPildoras: PPModulePildoras[] = (info.modulesPildoras || [])
    .filter((mp) => Array.isArray(mp.pildoras) && mp.pildoras.length > 0)
    .map((mp) => {
      const pm = (promotion?.modules || []).find((m) => (m as { id?: string }).id === mp.moduleId);
      return { ...mp, moduleName: pm?.name || mp.moduleName || 'Unknown Module' };
    });

  const [current, setCurrent] = useState(0);

  const Card = ({ children, badge }: { children: React.ReactNode; badge?: React.ReactNode }) => (
    <div className="pp-section-card mb-4">
      <div className="pp-section-header flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="pp-section-header-icon h-5 w-5" />
          <h5 className="m-0">Píldoras</h5>
          {assignmentOpen && <span className="badge bg-success" style={{ fontSize: '0.7rem' }}>Auto-asignación Abierta</span>}
        </div>
        {badge}
      </div>
      <div className="pp-section-body">{children}</div>
    </div>
  );

  if (modulesWithPildoras.length > 0) {
    const mod = modulesWithPildoras[Math.min(current, modulesWithPildoras.length - 1)];
    return (
      <Card
        badge={
          <div className="flex gap-2 flex-wrap items-center">
            {modulesWithPildoras.map((m, idx) => (
              <button
                key={idx}
                className={`btn btn-sm ${idx === current ? 'btn-primary' : 'btn-outline-secondary'}`}
                style={idx === current ? { backgroundColor: '#ff6600', borderColor: '#ff6600', color: 'white' } : undefined}
                onClick={() => setCurrent(idx)}
              >
                {m.moduleName}
              </button>
            ))}
            <span className="badge text-dark" style={{ fontSize: '0.9rem' }}>{mod.pildoras?.length || 0} píldoras</span>
          </div>
        }
      >
        <PildoraTable
          pildoras={mod.pildoras || []}
          moduleId={mod.moduleId}
          isLegacy={false}
          assignmentOpen={assignmentOpen}
          students={students}
          promotionId={promotionId}
          onReload={onReload}
        />
      </Card>
    );
  }

  if (Array.isArray(info.pildoras) && info.pildoras.length > 0) {
    return (
      <Card>
        <PildoraTable
          pildoras={info.pildoras}
          isLegacy
          assignmentOpen={assignmentOpen}
          students={students}
          promotionId={promotionId}
          onReload={onReload}
        />
      </Card>
    );
  }

  return null;
}
