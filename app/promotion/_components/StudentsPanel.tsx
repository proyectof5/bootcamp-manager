'use client';

/**
 * StudentsPanel.tsx — sub-tab "Lista de estudiantes" de la Teacher-Area (spec 0014 Fase C).
 *
 * 13º bloque extraído del orquestador. Reemplaza el contenido del pane #teacher-area-students
 * (cabecera con botones + buscador + tabla #students-list) que vivía en body.ts por un componente
 * React montado por portal.
 *
 * Patrón "markup en React, lógica legacy por id": React solo renderiza el MARKUP conservando TODOS
 * los ids legacy; el orquestador puebla: loadStudents() (null-safe, setea window.currentStudents y
 * llama displayStudents() también null-safe) rellena #students-list. Lo dispara
 * switchTeacherAreaSubTab('students') al abrir + la carga inicial + el CRUD. Los controles llaman a
 * window.* (openStudentModal, exportAllStudentsExcel, exportSelectedStudentsExcel,
 * deleteSelectedStudents, importStudentsFromExcel, downloadStudentsExcelTemplate, toggleAllStudents,
 * filterStudents). Las filas (que crea displayStudents) abren la ficha (StudentTracking, ya React).
 * React dispara loadStudents() tras montar (poll) como red de seguridad. CERO cambios en el orquestador.
 *
 * Los botones export-selected/delete-selected/bulk-reports arrancan con display:none y el legacy los
 * muestra por id según la selección; el dropdown PDF usa data-bs-toggle (lo cubre el shim de shared.js).
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

export function StudentsPanelHost() {
  const host = usePortalNode('teacher-area-students');
  if (!host) return null;
  return createPortal(<StudentsPanel />, host);
}

function StudentsPanel() {
  // switchTeacherAreaSubTab('students') ya llama loadStudents al abrir; red de seguridad para el
  // primer pintado si el portal monta después de la carga inicial.
  useEffect(() => {
    let tries = 0;
    const iv = setInterval(() => {
      tries += 1;
      if (typeof w().loadStudents === 'function') { w().loadStudents(); clearInterval(iv); }
      else if (tries > 40) clearInterval(iv);
    }, 100);
    return () => clearInterval(iv);
  }, []);

  return (
    <div id="students-tab">
      <div className="d-flex justify-content-between align-items-center my-4">
        <h2 className="subtitle-page">Estudiantes</h2>
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" id="create-student-btn" onClick={() => w().openStudentModal?.()}>
            <i className="bi bi-person-plus me-2" />Crear Estudiante
          </button>
          <button type="button" className="btn btn-outline-secondary" id="export-all-students-btn" onClick={() => w().exportAllStudentsExcel?.()}>
            <i className="bi bi-file-earmark-excel me-2" />Descarga Excel
          </button>
          <button type="button" className="btn btn-outline-success" id="export-selected-btn" style={{ display: 'none' }} onClick={() => w().exportSelectedStudentsExcel?.()}>
            <i className="bi bi-file-earmark-excel me-2" />Descarga Seleccionados Excel
          </button>
          <button type="button" className="btn btn-outline-danger" id="delete-selected-btn" style={{ display: 'none' }} onClick={() => w().deleteSelectedStudents?.()}>
            <i className="bi bi-trash me-2" />Borrar Estudiante(s)
          </button>

          <button type="button" className="btn btn-outline-primary" id="import-students-excel-btn" title="Importar estudiantes desde un archivo Excel o CSV" onClick={() => document.getElementById('students-excel-input')?.click()}>
            <i className="bi bi-upload me-2" />Importar Excel
          </button>
          <input type="file" id="students-excel-input" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={(e) => w().importStudentsFromExcel?.(e.target)} />

          <button type="button" className="btn btn-outline-secondary" id="download-students-template-btn" title="Descarga la plantilla Excel con las columnas necesarias" onClick={() => w().downloadStudentsExcelTemplate?.()}>
            <i className="bi bi-file-earmark-arrow-down me-2" />Plantilla Excel
          </button>

          <div className="dropdown" id="bulk-reports-dropdown" style={{ display: 'none' }}>
            <button className="btn btn-outline-warning dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
              <i className="bi bi-file-earmark-pdf me-1" />PDF Informes
            </button>
            <ul className="dropdown-menu dropdown-menu-end shadow" />
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="input-group">
          <span className="input-group-text bg-white"><i className="bi bi-search" /></span>
          <input type="text" id="student-search-input" className="form-control" placeholder="Buscar por nombre, email, nacionalidad o profesión..." onKeyUp={(e) => w().filterStudents?.((e.target as HTMLInputElement).value)} />
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th style={{ width: 40 }}>
                <input type="checkbox" className="form-check-input" id="select-all-students" onClick={(e) => w().toggleAllStudents?.(e.currentTarget)} />
              </th>
              <th>Nombre</th>
              <th>Email</th>
              <th className="text-end">Acciones</th>
            </tr>
          </thead>
          <tbody id="students-list">
            {/* Lo puebla el legacy (displayStudents) por innerHTML. */}
          </tbody>
        </table>
      </div>
    </div>
  );
}
