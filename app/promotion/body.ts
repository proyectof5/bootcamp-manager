// Auto-generated from promotion-detail.html
// Spec 0013-a: navbar + sidebar overlay + sidebar desktop migrados a JSX
// en app/promotion/page.tsx. Este string ahora empieza directamente con
// <main id="main-content"> y termina con los 23 modales.
const promotionDetailBody = `
    <!-- Main Content -->
    <main id="main-content" class="px-md-4">
                <!-- Overview Tab -->
                <div id="overview-tab" class="section-content">

                    <div class="my-4">
                        <p id="promo-subtitle" class="promo-subtitle mb-2"></p>
                        <h1 id="promotion-title" class="promotion-title-styled">Loading...</h1>
                        <p id="promotion-desc" class="text-muted"></p>
                    </div>
                    
                    <!-- Quick Actions Widget -->
                    <div class="mb-4">
                        <h6 class="mb-3 text-dark">
                            <i class="bi bi-lightning-charge text-warning me-2"></i>Acciones Rápidas
                        </h6>
                        <div id="quick-actions-container">
                            <!-- Las tarjetas de acción rápida se cargarán aquí -->
                        </div>
                    </div>
                    <!-- Dynamic Greeting -->
                    <!-- <div id="greeting-container" class="greeting-section mb-3"> -->
                        <!-- Greeting will be loaded dynamically here -->
                    <!-- </div> -->


                    <!-- Course Progress Bar -->
                    <div class="mb-4">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <div class="d-flex align-items-center gap-3">
                                <h6 class="mb-0 text-dark">
                                    <i class="bi bi-graph-up me-2 text-warning"></i>Progreso del Curso
                                </h6>
                                <div class="d-flex align-items-center gap-2 px-3 py-1 bg-light rounded">
                                    <i class="bi bi-people-fill text-warning"></i>
                                    <small class="fw-bold text-dark" id="active-students-count">-</small>
                                </div>
                                <!-- Withdrawn Students Block -->
                                <div id="withdrawn-students-container"
                                    class="d-flex align-items-center gap-2 px-3 py-1 bg-withdrawn rounded">
                                    <i class="bi bi-person-x text-withdrawn"></i>
                                    <small class="fw-bold text-withdrawn" id="withdrawn-students-count">-</small>
                                </div>
                            </div>
                        </div>
                        <div class="progress"
                            style="height: 28px; border-radius: 8px; background-color: #f0f0f0; position: relative;">
                            <div id="progress-bar" class="progress-bar progress-bar-striped" role="progressbar"
                                aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"
                                style="display: flex; align-items: center; justify-content: flex-end; padding-right: 12px;">
                            </div>
                            <div id="progress-label"
                                style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 0.85rem; font-weight: 600; color: #666; white-space: nowrap; pointer-events: none;">
                            </div>
                        </div>
                        <div class="d-flex justify-content-between mt-2" style="font-size: 0.85rem;">
                            <small class="text-muted" id="progress-start-info">-</small>
                            <small class="text-muted" id="progress-end-info">-</small>
                        </div>
                    </div>
                    <!-- End Quick Actions Widget -->

                    <!-- Overview Dashboard Section -->
                    <div class="row g-3">
                        <!-- Left Column: Agenda -->
                        <div class="col-lg-7">
                            <div class="card border-0 shadow-sm h-100">
                                <div class="card-header border-0 bg-light d-flex align-items-center gap-2">
                                    <i class="bi bi-calendar3 text-primary"></i>
                                    <h6 class="mb-0">Agenda del Día</h6>
                                </div>
                                <div class="card-body p-0 d-flex flex-column">
                                    <div class="agenda-container flex-grow-1">
                                        <div class="ratio ratio-16x9">
                                            <iframe id="calendar-preview-iframe" src="" style="border:0;"
                                                loading="lazy"></iframe>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Right Column: Alerts -->
                        <div class="col-lg-5">
                            <div class="card border-0 shadow-sm h-100">
                                <div class="card-header border-0 bg-light d-flex align-items-center gap-2">
                                    <i class="bi bi-lightning text-warning"></i>
                                    <h6 class="mb-0">Avisos</h6>
                                </div>
                                <div class="card-body p-0 d-flex flex-column">
                                    <!-- Próxima Píldora -->
                                    <div class="aviso-item border-bottom">
                                        <div class="d-flex align-items-center gap-2">
                                            <div class="aviso-icon">
                                                <i class="bi bi-lightbulb"></i>
                                            </div>
                                            <div class="aviso-content">
                                                <h6 class="mb-1 text-warning">Próxima Píldora</h6>
                                                <div id="next-pildora-content" class="aviso-text">
                                                    <p class="text-muted small mb-0">
                                                        <i class="bi bi-hourglass-split me-1"></i>Cargando...
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Recuento de Asistencias -->
                                    <div class="aviso-item">
                                        <div class="d-flex align-items-center gap-2">
                                            <div class="aviso-icon">
                                                <i class="bi bi-check-circle"></i>
                                            </div>
                                            <div class="aviso-content">
                                                <h6 class="mb-1 text-info">Asistencia</h6>
                                                <div id="attendance-alert-content" class="aviso-text">
                                                    <p class="text-muted small mb-0">
                                                        <i class="bi bi-hourglass-split me-1"></i>Cargando...
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Bloc de Notas Docente -->
                                    <div class="aviso-item border-top pt-3 mt-3">
                                        <div class="d-flex align-items-center gap-2 mb-3">
                                            <div class="aviso-icon">
                                                <i class="bi bi-sticky"></i>
                                            </div>
                                            <div class="aviso-content">
                                                <h6 class="mb-0">Anotaciones</h6>
                                            </div>
                                        </div>
                                        <div id="notes-container" class="notes-section">
                                            <!-- Bloc de notas se renderiza aquí -->
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Área del Docente Tab -->
                <div id="teacher-area-tab" class="section-content hidden">
                    <div class="my-4">
                        <h1 id="teacher-area-title">Área de Administración</h1>
                        <p id="teacher-area-desc" class="text-muted">Gestión integral del grupo y herramientas de
                            seguimiento</p>
                    </div>

                    <!-- Teacher Area Sub-sections Navigation -->
                    <div class="mt-4">
                        <nav class="nav nav-tabs mb-4" id="teacher-area-subtabs" role="tablist">
                            <button class="nav-link active" id="teacher-area-overview-tab" type="button" role="tab"
                                aria-selected="true" onclick="switchTeacherAreaSubTab('overview')">
                                <i class="bi bi-grid me-2"></i>Accesos Rápidos
                            </button>
                            <button class="nav-link" id="teacher-area-students-tab" type="button" role="tab"
                                aria-selected="false" onclick="switchTeacherAreaSubTab('students')">
                                <i class="bi bi-people me-2"></i>Lista de estudiantes
                            </button>
                            <button class="nav-link" id="teacher-area-attendance-tab" type="button" role="tab"
                                aria-selected="false" onclick="switchTeacherAreaSubTab('attendance')">
                                <i class="bi bi-calendar-check me-2"></i>Asistencia
                            </button>
                            <button class="nav-link" id="teacher-area-evaluation-tab" type="button" role="tab"
                                aria-selected="false" onclick="switchTeacherAreaSubTab('evaluation')">
                                <i class="bi bi-clipboard-check me-2"></i>Evaluación
                            </button>
                            <button class="nav-link" id="teacher-area-accesos-tab" type="button" role="tab"
                                aria-selected="false" onclick="switchTeacherAreaSubTab('accesos')">
                                <i class="bi bi-lock me-2"></i>Accesos
                            </button>
                        </nav>

                        <!-- Sub-sections Content -->
                        <div class="tab-content" id="teacher-area-subtabs-content">
                            <!-- Overview Tab -->
                            <div class="tab-pane fade show active" id="teacher-area-overview" role="tabpanel"
                                aria-labelledby="teacher-area-overview-tab">
                                <!-- spec 0014 Fase C: contenido portado a React. El componente
                                     TeacherOverviewPanelHost (_components/TeacherOverviewPanel.tsx) monta aquí
                                     por portal el #teacher-area-quick-actions. La lógica sigue en el
                                     orquestador: loadTeacherAreaOverview/displayTeacherAreaQuickActions
                                     (null-safe, lo llama switchTeacherAreaSubTab('overview')) puebla por id. -->
                            </div>

                            <!-- Students Tab -->
                            <div class="tab-pane fade" id="teacher-area-students" role="tabpanel"
                                aria-labelledby="teacher-area-students-tab">
                                <!-- spec 0014 Fase C: contenido portado a React. El componente
                                     StudentsPanelHost (_components/StudentsPanel.tsx) monta aquí por portal el
                                     #students-tab (cabecera + buscador + tabla #students-list) conservando los
                                     ids legacy. La lógica sigue en el orquestador: loadStudents/displayStudents
                                     (null-safe, lo llama switchTeacherAreaSubTab('students')) puebla por id; los
                                     controles llaman a window.openStudentModal/exportAllStudentsExcel/
                                     exportSelectedStudentsExcel/deleteSelectedStudents/importStudentsFromExcel/
                                     downloadStudentsExcelTemplate/toggleAllStudents/filterStudents. -->
                            </div>

                            <!-- Attendance Tab -->
                            <div class="tab-pane fade" id="teacher-area-attendance" role="tabpanel"
                                aria-labelledby="teacher-area-attendance-tab">
                                <div id="attendance-tab">
                                    <div class="d-flex justify-content-between align-items-center my-4 flex-wrap gap-3">
                                        <h2 class="mb-0 subtitle-page"> Control de Asistencia</h2>
                                        <div
                                            class="d-flex align-items-center gap-3 flex-wrap w-100 justify-content-end">
                                            <button class="btn" onclick="exportAttendanceToExcel()"
                                                style="background-color: var(--green-f5); color: var(--principal-2); border: none; font-weight: 500;">
                                                <i class="bi bi-file-earmark-spreadsheet me-2"></i>Exportar en Excel
                                            </button>
                                            <button class="btn" onclick="window.Reports.printWeeklyAttendance(promotionId, currentAttendanceMonth)"
                                                style="background-color: var(--principal-1); color: #fff; border: none; font-weight: 500;">
                                                Informe de asistencia semanal
                                            </button>
                                            <div class="d-flex align-items-center gap-2" id="month-selector">
                                                <button class="btn" onclick="prevAttendanceMonth()"
                                                    style="color: var(--principal-1); border: 1px solid var(--principal-1);">
                                                    <i class="bi bi-chevron-left"></i>
                                                </button>
                                                <h4 class="mb-0" id="current-attendance-month-display"
                                                    style="color: var(--principal-1); font-weight: 600; min-width: 140px; text-align: center;">
                                                    Month Year</h4>
                                                <button class="btn" onclick="nextAttendanceMonth()"
                                                    style="color: var(--principal-1); border: 1px solid var(--principal-1);">
                                                    <i class="bi bi-chevron-right"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                    

                                    <!-- Attendance Stats Row -->
                                    <div class="row mb-4 g-2" id="attendance-stats-container">
                                        <div class="col-auto d-flex">
                                            <div class="card"
                                                style="background-color: var(--green-f5); color: var(--principal-2); border: none;">
                                                <div class="card-body text-center py-2">
                                                    <h6 class="mb-0">Presente</h6>
                                                    <h3 class="mb-0" id="stat-present-total">0</h3>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-auto d-flex">
                                            <div class="card"
                                                style="background-color: var(--principal-1); color: var(--principal-3); border: none;">
                                                <div class="card-body text-center py-2">
                                                    <h6 class="mb-0">Ausente</h6>
                                                    <h3 class="mb-0" id="stat-absent-total">0</h3>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-auto d-flex">
                                            <div class="card"
                                                style="background-color: var(--complementario-2); color: var(--principal-2); border: none;">
                                                <div class="card-body text-center py-2">
                                                    <h6 class="mb-0">Retraso</h6>
                                                    <h3 class="mb-0" id="stat-late-total">0</h3>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-auto d-flex">
                                            <div class="card"
                                                style="background-color: var(--blue-light-f5); color: var(--principal-2); border: none;">
                                                <div class="card-body text-center py-2">
                                                    <h6 class="mb-0">Justificado</h6>
                                                    <h3 class="mb-0" id="stat-justified-total">0</h3>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-auto d-flex">
                                            <div class="card"
                                                style="background-color: #e9d8fd; color: #5b21b6; border: none;">
                                                <div class="card-body text-center py-2">
                                                    <h6 class="mb-0">Sale antes</h6>
                                                    <h3 class="mb-0" id="stat-early-leave-total">0</h3>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-auto d-flex">
                                            <div class="card"
                                                style="background-color: #e2e8f0; color: #475569; border: none;">
                                                <div class="card-body text-center py-2">
                                                    <h6 class="mb-0"><i class="bi bi-camera-video-off me-1"></i>Cámara apagada</h6>
                                                    <h3 class="mb-0" id="stat-camera-off-total">0</h3>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-auto d-flex">
                                            <div class="card"
                                                style="background-color: var(--complementario-1-extra-light); color: var(--principal-2); border: 1px solid var(--grey-light-f5);">
                                                <div class="card-body text-center py-2">
                                                    <h6 class="mb-0">Media Asistencia</h6>
                                                    <h3 class="mb-0" id="stat-attendance-avg">0%</h3>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="ins-attendance">
                                            <div class="d-flex flex-wrap gap-4 small"
                                                style="color: var(--principal-2);">
                                                <div class="d-flex align-items-center"><span class="attendance-dot me-2"
                                                        style="background-color: var(--green-f5);"></span> Presente
                                                </div>
                                                <div class="d-flex align-items-center"><span class="attendance-dot me-2"
                                                        style="background-color: var(--principal-1);"></span> Ausente
                                                </div>
                                                <div class="d-flex align-items-center"><span class="attendance-dot me-2"
                                                        style="background-color: var(--complementario-2);"></span> Con
                                                    retraso</div>
                                                <div class="d-flex align-items-center"><span class="attendance-dot me-2"
                                                        style="background-color: var(--blue-light-f5);"></span>
                                                    Justificado</div>
                                                <div class="d-flex align-items-center"><span class="attendance-dot me-2"
                                                        style="background-color: #e9d8fd;"></span> Sale antes</div>
                                                <div class="d-flex align-items-center"><i class="bi bi-camera-video-off me-2 text-secondary"></i> Cámara apagada</div>
                                                <div class="ms-auto"><i class="bi bi-info-circle me-1"></i>
                                                    <strong>Click</strong> para marcar | <strong>Clic derecho</strong>
                                                    para comentario
                                                </div>
                                            </div>
                                    </div>

                                    <div class="card mb-4">
                                        <div class="card-body p-0">
                                            <div class="table-responsive attendance-table-wrapper">
                                                <table class="table table-bordered mb-0" id="attendance-table">
                                                    <thead
                                                        style="background-color: var(--complementario-1-extra-light);">
                                                        <tr id="attendance-weekday-row">
                                                            <th class="sticky-column"
                                                                style="min-width: 250px; z-index: 10; background-color: var(--complementario-1-extra-light);">
                                                            </th>
                                                        </tr>
                                                        <tr id="attendance-header-row">
                                                            <th class="sticky-column"
                                                                style="min-width: 250px; z-index: 10; background-color: var(--complementario-1-extra-light); color: var(--principal-1); font-weight: 600;">
                                                                Estudiante</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody id="attendance-body">
                                                        <!-- Attendance data will be loaded here -->
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Evaluation Tab -->
                            <div class="tab-pane fade" id="teacher-area-evaluation" role="tabpanel"
                                aria-labelledby="teacher-area-evaluation-tab">
                                <div id="evaluation-tab">
                                    <div id="evaluation-tab-view">
                                        <div class="d-flex justify-content-between align-items-center my-4">
                                            <div>
                                                <h2 class="subtitle-page"><i class="bi bi-clipboard-check me-2 text-primary"></i>Evaluación de
                                                    Proyectos</h2>
                                            </div>
                                        </div>
                                        <div id="evaluation-content">
                                            <!-- populated by JS -->
                                        </div>
                                    </div>

                                    <div id="team-history-panel" class="hidden">
                                        <div class="d-flex align-items-center gap-3 my-4">
                                            <button type="button" class="btn btn-outline-secondary btn-sm"
                                                onclick="closeTeamHistoryView()"><i
                                                    class="bi bi-arrow-left me-1"></i>Volver</button>
                                            <h4 class="mb-0 fw-bold">Histórico de equipos</h4>
                                        </div>
                                        <div id="team-history-panel-body" class="pb-4"></div>
                                    </div>

                                    <div id="eval-project-view" class="hidden">
                                        <!-- Split view content (header, sidebar, right panel) -->
                                        <div class="eval-view-topbar d-flex align-items-center gap-3 py-3 mb-0">
                                            <button type="button" class="btn btn-outline-secondary btn-sm"
                                                onclick="closeEvaluationView()"><i
                                                    class="bi bi-arrow-left me-1"></i>Volver</button>
                                            <div class="flex-grow-1 min-w-0">
                                                <h5 class="mb-0 fw-bold text-truncate" id="eval-view-title">Evaluación
                                                </h5>
                                                <p class="mb-0 text-muted small" id="eval-view-subtitle"></p>
                                            </div>
                                            <button type="button" class="btn btn-sm btn-primary"
                                                onclick="saveIndividualStudentEval()"><i
                                                    class="bi bi-save me-1"></i>Guardar</button>
                                            <button type="button" class="btn btn-sm btn-outline-secondary" id="preview-eval-splitview-btn"
                                                onclick="previewStudentEvalReport(document.getElementById('eval-project-view').dataset.targetStudentId)" title="Ver preview del informe de evaluación PDF"><i
                                                    class="bi bi-eye me-1"></i>Preview informe</button>
                                            <button type="button" class="btn btn-sm btn-outline-success" id="send-eval-splitview-btn"
                                                onclick="sendEvaluationByEmail()" title="Guardar y enviar informe PDF al correo del estudiante"><i
                                                    class="bi bi-envelope-arrow-up me-1"></i>Enviar evaluación</button>
                                            <button type="button" class="btn btn-sm btn-outline-primary" id="send-eval-all-splitview-btn"
                                                onclick="sendEvaluationToAllInProject()" title="Guardar y enviar la evaluación individual a todos los estudiantes evaluados en este proyecto"><i
                                                    class="bi bi-send me-1"></i>Enviar a todos</button>
                                        </div>
                                        <div class="eval-split-layout">
                                            <aside class="eval-targets-sidebar">
                                                <ul class="eval-targets-list list-unstyled mb-0" id="eval-targets-list">
                                                </ul>
                                            </aside>
                                            <!-- AUDITORÍA TASK-EVAL-05 — Comportamiento de Enter en .eval-feedback-rte:
                                                 Los editores .eval-feedback-rte se generan dinámicamente por JS e inyectan
                                                 en #eval-right-body y #student-eval-panel-body, ambos son <div> simples.
                                                 ✅ NO están dentro de ningún <form>, por lo que Enter es libre por diseño:
                                                    el navegador nunca interceptará la tecla como "submit".
                                                 ✅ Comportamiento estándar de contenteditable en browsers modernos:
                                                    - Enter simple     → nuevo bloque <div> (Chrome/Edge) o <p> (Firefox).
                                                    - Shift+Enter      → <br> (salto de línea suave) en todos los browsers.
                                                 ✅ Se registra un listener keydown con delegación en #teacher-area-evaluation
                                                    (ver promotion-detail.js, función _initEvalFeedbackRteKeyHandler) que
                                                    normaliza Shift+Enter a <br> para garantizar consistencia cross-browser.
                                            -->
                                            <main class="eval-right-panel" id="eval-right-panel">
                                                <div id="eval-right-empty" class="text-center py-5">Selecciona un alumno
                                                </div>
                                                <div id="eval-right-content" class="d-none">
                                                    <div id="eval-right-header" class="p-3 border-bottom"></div>
                                                    <div id="eval-right-body" class="p-3"></div>
                                                </div>
                                            </main>
                                        </div>
                                    </div>

                                    <div id="student-eval-panel" class="hidden">
                                        <div class="d-flex align-items-center gap-3 my-4">
                                            <button type="button" class="btn btn-outline-secondary btn-sm"
                                                onclick="cancelStudentEvalPanel()"><i
                                                    class="bi bi-arrow-left me-1"></i>Volver</button>
                                            <h4 class="mb-0 fw-bold">Evaluación Individual</h4>
                                        </div>
                                        <div id="student-eval-panel-body"></div>
                                        <div class="d-flex gap-2 mt-4 mb-4">
                                            <button type="button" class="btn btn-primary" id="save-eval-panel-btn"
                                                onclick="saveIndividualStudentEval()">
                                                <i class="bi bi-save me-1"></i>Guardar evaluación
                                            </button>
                                            <button type="button" class="btn btn-outline-success" id="send-eval-panel-btn"
                                                onclick="sendEvaluationByEmail()" title="Guardar y enviar informe PDF al correo del estudiante">
                                                <i class="bi bi-envelope-arrow-up me-1"></i>Enviar evaluación
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Accesos Tab (Área del Docente) -->
                            <div class="tab-pane fade" id="teacher-area-accesos" role="tabpanel"
                                aria-labelledby="teacher-area-accesos-tab">
                                <div id="teacher-area-accesos-content">
                                    <div class="d-flex justify-content-between align-items-center my-4">
                                        <h2 class="subtitle-page">Configuración de los Accesos</h2>
                                    </div>

                                    <div class="row g-4">
                                        <!-- Student Access Password Card -->
                                        <div class="col-lg-6">
                                            <div class="card h-100 border-0 shadow-sm">
                                                <div class="card-header bg-gradient"
                                                    style="background: linear-gradient(135deg, var(--principal-1) 0%, var(--complementario-2) 100%);">
                                                    <h6 class="mb-0 text-dark"><i class="bi bi-key me-2"></i>Acceso del estudiante</h6>
                                                </div>
                                                <div class="card-body">
                                                    <div class="mb-3">
                                                        <label for="teacher-area-access-password-input"
                                                            class="form-label small fw-bold">Contraseña</label>
                                                        <div class="password-input-group">
                                                            <input type="password" class="form-control form-control-sm"
                                                                id="teacher-area-access-password-input" placeholder="Enter password">
                                                            <button type="button" class="password-toggle"
                                                                onclick="togglePasswordVisibility('teacher-area-access-password-input')">
                                                                <i class="bi bi-eye"></i>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <button class="btn btn-sm w-100"
                                                        style="background-color: var(--green-f5); color: var(--principal-2); border: none; font-weight: 600;"
                                                        onclick="updateAccessPassword('teacher-area')">
                                                        <i class="bi bi-save me-1"></i>Actualizar
                                                    </button>

                                                    <div id="teacher-area-password-alert" class="alert alert-sm mt-2 mb-0 hidden p-2" role="alert"
                                                        style="font-size: 0.85rem;">
                                                    </div>
                                                </div>
                                                <div class="card-footer bg-light border-top p-2">
                                                    <small class="text-muted d-block mb-2">Link generado:</small>
                                                    <div class="input-group input-group-sm">
                                                        <input type="text" class="form-control form-control-sm" id="teacher-area-student-access-link"
                                                            readonly>
                                                        <button class="btn btn-outline-secondary btn-sm" type="button"
                                                            onclick="copyAccessLink('teacher-area')">
                                                            <i class="bi bi-clipboard"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Teaching Content Card -->
                                        <div class="col-lg-6">
                                            <div class="card h-100 border-0 shadow-sm">
                                                <div class="card-header bg-gradient"
                                                    style="background: linear-gradient(135deg, var(--blue-light-f5) 0%, var(--green-f5) 100%);">
                                                    <h6 class="mb-0 text-dark"><i class="bi bi-book me-2"></i>Planificador / Refactor</h6>
                                                </div>
                                                <div class="card-body">
                                                    <div class="mb-3">
                                                        <label for="teacher-area-teaching-content-url" class="form-label small fw-bold">URL del contenido</label>
                                                        <input type="url" class="form-control form-control-sm" id="teacher-area-teaching-content-url"
                                                            placeholder="https://example.com" />
                                                    </div>
                                                    <button class="btn btn-sm w-100"
                                                        style="background-color: var(--green-f5); color: var(--principal-2); border: none; font-weight: 600;"
                                                        onclick="updateTeachingContent('teacher-area')">
                                                        <i class="bi bi-save me-1"></i>Guardar
                                                    </button>

                                                    <div id="teacher-area-teaching-content-alert" class="alert alert-sm mt-2 mb-0 hidden p-2"
                                                        role="alert" style="font-size: 0.85rem;">
                                                    </div>
                                                </div>
                                                <div class="card-footer bg-light border-top p-2">
                                                    <small class="text-muted d-block mb-2">Preview:</small>
                                                    <div class="d-flex gap-1">
                                                        <a id="teacher-area-teaching-content-preview-btn" href="#"
                                                            class="btn btn-sm btn-outline-primary hidden" target="_blank">
                                                            <i class="bi bi-book me-1"></i>Vista
                                                        </a>
                                                        <button class="btn btn-sm btn-outline-danger" onclick="removeTeachingContent('teacher-area')"
                                                            id="teacher-area-remove-teaching-btn" style="display:none;">
                                                            <i class="bi bi-trash"></i>
                                                        </button>
                                                        <small class="text-muted align-self-center ms-1" id="teacher-area-no-content-message">No hay contenido</small>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Asana Workspace Card -->
                                        <div class="col-lg-6">
                                            <div class="card h-100 border-0 shadow-sm">
                                                <div class="card-header bg-gradient"
                                                    style="background: linear-gradient(135deg, #FF6B6B 0%, #F06595 100%);">
                                                    <h6 class="mb-0 text-dark"><i class="bi bi-kanban me-2"></i>Asana</h6>
                                                </div>
                                                <div class="card-body">
                                                    <div class="mb-3">
                                                        <label for="teacher-area-asana-workspace-url" class="form-label small fw-bold">URL del espacio de trabajo</label>
                                                        <input type="url" class="form-control form-control-sm" id="teacher-area-asana-workspace-url"
                                                            placeholder="https://app.asana.com/0/..." />
                                                    </div>
                                                    <button class="btn btn-sm w-100"
                                                        style="background-color: #FF6B6B; color: white; border: none; font-weight: 600;"
                                                        onclick="updateAsanaWorkspace('teacher-area')">
                                                        <i class="bi bi-save me-1"></i>Guardar
                                                    </button>

                                                    <div id="teacher-area-asana-workspace-alert" class="alert alert-sm mt-2 mb-0 hidden p-2"
                                                        role="alert" style="font-size: 0.85rem;">
                                                    </div>
                                                </div>
                                                <div class="card-footer bg-light border-top p-2">
                                                    <small class="text-muted d-block mb-2">Estado:</small>
                                                    <div class="d-flex gap-1">
                                                        <a id="teacher-area-asana-workspace-preview-btn" href="#"
                                                            class="btn btn-sm btn-outline-danger hidden" target="_blank">
                                                            <i class="bi bi-kanban me-1"></i>Abrir
                                                        </a>
                                                        <button class="btn btn-sm btn-outline-danger" onclick="removeAsanaWorkspace('teacher-area')"
                                                            id="teacher-area-remove-asana-btn" style="display:none;">
                                                            <i class="bi bi-trash"></i>
                                                        </button>
                                                        <small class="text-muted align-self-center ms-1" id="teacher-area-no-asana-message">No configurado</small>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Zoom Credentials Card -->
                                        <div class="col-lg-6">
                                            <div class="card h-100 border-0 shadow-sm">
                                                <div class="card-header"
                                                    style="background: linear-gradient(135deg, #2D8CFF 0%, #4FA9FF 100%);">
                                                    <h6 class="mb-0 text-white"><i class="bi bi-camera-video me-2"></i>Zoom</h6>
                                                </div>
                                                <div class="card-body">
                                                    <div class="row g-2 mb-3">
                                                        <div class="col-6">
                                                            <label for="teacher-area-zoom-meeting-id" class="form-label small fw-bold">ID de reunión</label>
                                                            <input type="text" class="form-control form-control-sm" id="teacher-area-zoom-meeting-id"
                                                                placeholder="123 456 7890" />
                                                        </div>
                                                        <div class="col-6">
                                                            <label for="teacher-area-zoom-passcode" class="form-label small fw-bold">Código de acceso</label>
                                                            <input type="text" class="form-control form-control-sm" id="teacher-area-zoom-passcode"
                                                                placeholder="abc123" />
                                                        </div>
                                                        <div class="col-12">
                                                            <label for="teacher-area-zoom-host-key" class="form-label small fw-bold">Host Key <span class="text-muted fw-normal">(opcional)</span></label>
                                                            <input type="text" class="form-control form-control-sm" id="teacher-area-zoom-host-key"
                                                                placeholder="123456" />
                                                        </div>
                                                        <div class="col-6">
                                                            <label for="teacher-area-zoom-email" class="form-label small fw-bold">Email de la cuenta <span class="text-muted fw-normal">(opcional)</span></label>
                                                            <input type="email" class="form-control form-control-sm" id="teacher-area-zoom-email"
                                                                placeholder="docente@ejemplo.com" autocomplete="off" />
                                                        </div>
                                                        <div class="col-6">
                                                            <label for="teacher-area-zoom-password" class="form-label small fw-bold">Contraseña de la cuenta <span class="text-muted fw-normal">(opcional)</span></label>
                                                            <div class="password-input-group">
                                                                <input type="password" class="form-control form-control-sm" id="teacher-area-zoom-password"
                                                                    placeholder="••••••••" autocomplete="current-password" />
                                                                <button type="button" class="password-toggle"
                                                                    onclick="togglePasswordVisibility('teacher-area-zoom-password')">
                                                                    <i class="bi bi-eye"></i>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button class="btn btn-sm w-100"
                                                        style="background-color: #2D8CFF; color: white; border: none; font-weight: 600;"
                                                        onclick="saveZoomCredentials()">
                                                        <i class="bi bi-save me-1"></i>Guardar credenciales
                                                    </button>
                                                </div>
                                                <div class="card-footer bg-light border-top p-2">
                                                    <small class="text-muted d-block mb-2">Estado:</small>
                                                    <div class="d-flex gap-1 align-items-center">
                                                        <button class="btn btn-sm btn-outline-danger" onclick="removeZoomCredentials()"
                                                            id="teacher-area-remove-zoom-btn" style="display:none;">
                                                            <i class="bi bi-trash"></i>
                                                        </button>
                                                        <small class="text-muted ms-1" id="teacher-area-no-zoom-message">No configurado</small>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                    </div><!-- /.row -->
                                </div>
                            </div>
                        </div> <!-- End #teacher-area-subtabs-content -->
                    </div> <!-- End .mt-4 container for subtabs -->
                </div> <!-- End #teacher-area-tab -->





                <!-- Access Settings Tab -->
                <div id="access-settings-tab" class="section-content hidden">
                    <div class="d-flex justify-content-between align-items-center my-4">
                        <h2 class="subtitle-page">Configuración de los Accesos</h2>
                    </div>

                    <div class="row g-4">
                        <!-- Student Access Password Card -->
                        <div class="col-lg-6">
                            <div class="card h-100 border-0 shadow-sm">
                                <div class="card-header bg-gradient"
                                    style="background: linear-gradient(135deg, var(--principal-1) 0%, var(--complementario-2) 100%);">
                                    <h6 class="mb-0 text-dark"><i class="bi bi-key me-2"></i>Acceso del estudiante</h6>
                                </div>
                                <div class="card-body">
                                    <div class="mb-3">
                                        <label for="access-password-input"
                                            class="form-label small fw-bold">Contraseña</label>
                                        <div class="password-input-group">
                                            <input type="password" class="form-control form-control-sm"
                                                id="access-password-input" placeholder="Enter password">
                                            <button type="button" class="password-toggle"
                                                onclick="togglePasswordVisibility('access-password-input')">
                                                <i class="bi bi-eye"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <button class="btn btn-sm w-100"
                                        style="background-color: var(--green-f5); color: var(--principal-2); border: none; font-weight: 600;"
                                        onclick="updateAccessPassword()">
                                        <i class="bi bi-save me-1"></i>Actualizar
                                    </button>

                                    <div id="password-alert" class="alert alert-sm mt-2 mb-0 hidden p-2" role="alert"
                                        style="font-size: 0.85rem;">
                                    </div>
                                </div>
                                <div class="card-footer bg-light border-top p-2">
                                    <small class="text-muted d-block mb-2">Link generado:</small>
                                    <div class="input-group input-group-sm">
                                        <input type="text" class="form-control form-control-sm" id="student-access-link"
                                            readonly>
                                        <button class="btn btn-outline-secondary btn-sm" type="button"
                                            onclick="copyAccessLink()">
                                            <i class="bi bi-clipboard"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Teaching Content Card -->
                        <div class="col-lg-6">
                            <div class="card h-100 border-0 shadow-sm">
                                <div class="card-header bg-gradient"
                                    style="background: linear-gradient(135deg, var(--blue-light-f5) 0%, var(--green-f5) 100%);">
                                    <h6 class="mb-0 text-dark"><i class="bi bi-book me-2"></i>Planificador / Refactor
                                    </h6>
                                </div>
                                <div class="card-body">
                                    <div class="mb-3">
                                        <label for="teaching-content-url" class="form-label small fw-bold">URL del
                                            contenido</label>
                                        <input type="url" class="form-control form-control-sm" id="teaching-content-url"
                                            placeholder="https://example.com" />
                                    </div>
                                    <button class="btn btn-sm w-100"
                                        style="background-color: var(--green-f5); color: var(--principal-2); border: none; font-weight: 600;"
                                        onclick="updateTeachingContent()">
                                        <i class="bi bi-save me-1"></i>Guardar
                                    </button>

                                    <div id="teaching-content-alert" class="alert alert-sm mt-2 mb-0 hidden p-2"
                                        role="alert" style="font-size: 0.85rem;">
                                    </div>
                                </div>
                                <div class="card-footer bg-light border-top p-2">
                                    <small class="text-muted d-block mb-2">Preview:</small>
                                    <div class="d-flex gap-1">
                                        <a id="teaching-content-preview-btn" href="#"
                                            class="btn btn-sm btn-outline-primary hidden" target="_blank">
                                            <i class="bi bi-book me-1"></i>Vista
                                        </a>
                                        <button class="btn btn-sm btn-outline-danger" onclick="removeTeachingContent()"
                                            id="remove-teaching-btn" style="display:none;">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                        <small class="text-muted align-self-center ms-1" id="no-content-message">No hay
                                            contenido</small>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Asana Workspace Card -->
                        <div class="col-lg-6">
                            <div class="card h-100 border-0 shadow-sm">
                                <div class="card-header bg-gradient"
                                    style="background: linear-gradient(135deg, #FF6B6B 0%, #F06595 100%);">
                                    <h6 class="mb-0 text-dark"><i class="bi bi-kanban me-2"></i>Asana</h6>
                                </div>
                                <div class="card-body">
                                    <div class="mb-3">
                                        <label for="asana-workspace-url" class="form-label small fw-bold">URL del
                                            espacio de trabajo</label>
                                        <input type="url" class="form-control form-control-sm" id="asana-workspace-url"
                                            placeholder="https://app.asana.com/0/..." />
                                    </div>
                                    <button class="btn btn-sm w-100"
                                        style="background-color: #FF6B6B; color: white; border: none; font-weight: 600;"
                                        onclick="updateAsanaWorkspace()">
                                        <i class="bi bi-save me-1"></i>Guardar
                                    </button>

                                    <div id="asana-workspace-alert" class="alert alert-sm mt-2 mb-0 hidden p-2"
                                        role="alert" style="font-size: 0.85rem;">
                                    </div>
                                </div>
                                <div class="card-footer bg-light border-top p-2">
                                    <small class="text-muted d-block mb-2">Estado:</small>
                                    <div class="d-flex gap-1">
                                        <a id="asana-workspace-preview-btn" href="#"
                                            class="btn btn-sm btn-outline-danger hidden" target="_blank">
                                            <i class="bi bi-kanban me-1"></i>Abrir
                                        </a>
                                        <button class="btn btn-sm btn-outline-danger" onclick="removeAsanaWorkspace()"
                                            id="remove-asana-btn" style="display:none;">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                        <small class="text-muted align-self-center ms-1" id="no-asana-message">No
                                            configurado</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Collaborators Tab -->
                <div id="collaborators-tab" class="section-content hidden">
                    <!-- spec 0014 Fase C: contenido portado a React. El componente
                         CollaboratorsPanelHost (_components/CollaboratorsPanel.tsx) monta aquí por portal
                         la cabecera + #collaborators-list (list-group). La lógica sigue en el orquestador:
                         loadCollaborators()/displayCollaborators() (null-safe, lo llama switchTab al abrir)
                         puebla #collaborators-list por id; el botón llama a window.openCollaboratorModal()
                         y las filas a openCollaboratorModulesModal/removeCollaborator. (Se eliminó el
                         segundo #collaborators-tab duplicado —tabla muerta y oculta— más abajo.) -->
                </div>

                <!-- Program Info Tab (New) -->
                <div id="info-tab" class="section-content hidden">
                    <div class="d-flex justify-content-between align-items-center my-4 pb-3 border-bottom">
                        <h2 class="mb-0">Detalles del Programa</h2>
                        <div class="d-flex gap-2 justify-content-end">
                            <button id="preview-roadmap-btn" class="btn btn-outline-primary"
                                onclick="previewPromotion()" title="Vista previa del roadmap">
                                <i class="bi bi-eye me-2"></i>Preview Roadmap
                            </button>
                            <button id="syllabus-pdf-btn" class="btn btn-outline-secondary"
                                onclick="downloadPromotionSyllabus()" title="Descargar Syllabus (PDF o Word)">
                                <i class="bi bi-file-earmark-text me-2"></i>Syllabus
                            </button>
                        </div>
                    </div>

                    <!-- Program Details Navigation Tabs -->
                    <nav class="nav nav-tabs mb-4" id="program-details-tabs" role="tablist">
                        <button class="nav-link active" id="program-details-roadmap-tab" type="button" role="tab"
                            aria-selected="true" onclick="switchProgramDetailsTab('roadmap')">
                            <i class="bi bi-map me-2"></i>Roadmap
                        </button>
                        <button class="nav-link" id="program-details-calendar-tab" type="button" role="tab"
                            aria-selected="false" onclick="switchProgramDetailsTab('calendar')">
                            <i class="bi bi-calendar me-2"></i>Calendario
                        </button>
                        <button class="nav-link" id="program-details-schedule-tab" type="button" role="tab"
                            aria-selected="false" onclick="switchProgramDetailsTab('schedule')">
                            <i class="bi bi-clock me-2"></i>Horario
                        </button>
                        <button class="nav-link" id="program-details-team-tab" type="button" role="tab"
                            aria-selected="false" onclick="switchProgramDetailsTab('team')">
                            <i class="bi bi-people me-2"></i>Equipo
                        </button>
                        <button class="nav-link" id="program-details-resources-tab" type="button" role="tab"
                            aria-selected="false" onclick="switchProgramDetailsTab('resources')">
                            <i class="bi bi-tools me-2"></i>Recursos
                        </button>
                        <button class="nav-link" id="program-details-pildoras-tab" type="button" role="tab"
                            aria-selected="false" onclick="switchProgramDetailsTab('pildoras')">
                            <i class="bi bi-lightbulb me-2"></i>Píldoras
                        </button>
                        <button class="nav-link" id="program-details-evaluation-tab" type="button" role="tab"
                            aria-selected="false" onclick="switchProgramDetailsTab('evaluation')">
                            <i class="bi bi-clipboard-check me-2"></i>Criterios
                        </button>
                        <button class="nav-link" id="program-details-virtual-classroom-tab" type="button" role="tab"
                            aria-selected="false" onclick="switchProgramDetailsTab('virtual-classroom')">
                            <i class="bi bi-laptop me-2"></i>Aula Virtual
                        </button>
                        <button class="nav-link" id="program-details-quicklinks-tab" type="button" role="tab"
                            aria-selected="false" onclick="switchProgramDetailsTab('quicklinks')">
                            <i class="bi bi-lightning me-2"></i>Quick Links
                        </button>
                        <button class="nav-link" id="program-details-sections-tab" type="button" role="tab"
                            aria-selected="false" onclick="switchProgramDetailsTab('sections')">
                            <i class="bi bi-file-text me-2"></i>Secciones
                        </button>
                    </nav>

                    <!-- Tab Content -->
                    <div class="tab-content" id="program-details-content">
                        <!-- Roadmap Tab -->
                        <div class="tab-pane fade show active" id="program-details-roadmap" role="tabpanel"
                            aria-labelledby="program-details-roadmap-tab">
                            <!-- spec 0014 Fase C: contenido portado a React. El componente
                                 RoadmapPanelHost (_components/RoadmapPanel.tsx) monta aquí por portal la
                                 cabecera + #modules-list + #gantt-table conservando los ids legacy. La
                                 lógica sigue en el orquestador: loadModules() (lo llama
                                 switchProgramDetailsTab y el CRUD de módulos) puebla por id; los controles
                                 llaman a window.toggleShowEmployability/openEmployabilityModal/openModuleModal. -->
                        </div>

                        <!-- Calendario Tab -->
                        <div class="tab-pane fade" id="program-details-calendar" role="tabpanel"
                            aria-labelledby="program-details-calendar-tab">
                            <!-- spec 0014 Fase C: contenido portado a React. El componente
                                 CalendarSettingsHost (_components/CalendarSettings.tsx) monta
                                 aquí por portal (config de Google Calendar + URL de citas + preview). -->

                        </div>

                        <!-- Schedule Tab -->
                        <div class="tab-pane fade" id="program-details-schedule" role="tabpanel"
                            aria-labelledby="program-details-schedule-tab">
                            <!-- spec 0014 Fase C: contenido portado a React. El componente
                                 ScheduleSettingsHost (_components/ScheduleSettings.tsx) monta aquí por
                                 portal (franjas online/presencial + notas, auto-guardado). Usa los IDs
                                 legacy (sched-*) porque saveExtendedInfo() los lee al "guardar todo". -->
                        </div>

                        <!-- Team Tab -->
                        <div class="tab-pane fade" id="program-details-team" role="tabpanel"
                            aria-labelledby="program-details-team-tab">
                            <!-- spec 0014 Fase C: contenido portado a React. El componente
                                 TeamManagerHost (_components/TeamManager.tsx) monta aquí por portal
                                 (tabla de miembros del equipo). Los modales de alta/edición/borrado
                                 siguen en el orquestador (ya shadcn); displayTeam() dispara el
                                 refresco vía window.__refreshTeam(). -->
                        </div>

                        <!-- Resources Tab -->
                        <div class="tab-pane fade" id="program-details-resources" role="tabpanel"
                            aria-labelledby="program-details-resources-tab">
                            <!-- Recursos del programa (plantilla/template): spec 0014 Fase C →
                                 React. ResourcesManagerHost (_components/ResourcesManager.tsx) monta
                                 aquí por portal (tabla #resources-list-body). El modal de catálogo
                                 (openResourceModal/resourceModal) sigue en el orquestador; displayResources()
                                 dispara el refresco vía window.__refreshResources(). -->
                            <div id="program-details-resources-template" class="mb-3"></div>

                            <!-- Recursos de la Promoción (publicables): spec 0014 Fase C → React.
                                 PromoResourcesManagerHost (_components/PromoResourcesManager.tsx) monta
                                 aquí por portal (self-fetch /promotion-resources/all + accordions por
                                 módulo). El modal promoResourceModal y las acciones (publish/unpublish/
                                 delete/editar) siguen en el orquestador; loadPromoResources() dispara el
                                 refresco vía window.__refreshPromoResources(). -->
                            <div id="program-details-promo-resources"></div>
                        </div>

                        <!-- Píldoras Tab -->
                        <div class="tab-pane fade" id="program-details-pildoras" role="tabpanel"
                            aria-labelledby="program-details-pildoras-tab">
                            <!-- spec 0014 Fase C: contenido portado a React. El componente
                                 PildorasPanelHost (_components/PildorasPanel.tsx) monta aquí por portal el
                                 panel (navegación de módulos + toggle + botones + #pildoras-list-body)
                                 conservando los ids legacy. La lógica sigue en el orquestador:
                                 displayPildoras/updateModuleNavigation (null-safe) pueblan por id; los
                                 controles llaman a window.navigateToPreviousModule/navigateToNextModule/
                                 togglePildorasAssignment/addPildoraRow/downloadPildorasExcelTemplate/
                                 importPildorasFromExcel. -->
                        </div>

                        <!-- Evaluation Tab -->
                        <div class="tab-pane fade" id="program-details-evaluation" role="tabpanel"
                            aria-labelledby="program-details-evaluation-tab">
                            <!-- spec 0014 Fase C: contenido portado a React. El componente
                                 EvaluationCriteriaHost (_components/EvaluationCriteria.tsx) monta aquí
                                 por portal (toolbar + editor contenteditable #evaluation-text). Conserva
                                 el id legacy evaluation-text (saveExtendedInfo lo lee). El HTML inicial
                                 lo expone el orquestador en window.__evaluationHtml + __refreshEvaluation. -->
                        </div>

                        <!-- Virtual Classroom Tab -->
                        <div class="tab-pane fade" id="program-details-virtual-classroom" role="tabpanel"
                            aria-labelledby="program-details-virtual-classroom-tab">
                            <!-- spec 0014 Fase C: contenido portado a React. El componente
                                 VirtualClassroomPanelHost (_components/VirtualClassroomPanel.tsx) monta
                                 aquí por portal el panel #virtual-classroom-panel conservando todos los
                                 ids legacy (vc-*). La lógica sigue en el orquestador:
                                 initVirtualClassroomPanel (lo llama switchProgramDetailsTab/loadEvaluation)
                                 puebla/lee por id; los controles llaman a window.onVirtualClassroomProjectChange/
                                 saveVirtualClassroom/deactivateVirtualClassroom. -->
                        </div>

                        <div class="tab-pane fade" id="program-details-quicklinks" role="tabpanel"
                            aria-labelledby="program-details-quicklinks-tab">
                            <!-- spec 0014 Fase C: contenido portado a React. El componente
                                 QuickLinksManagerHost (_components/QuickLinksManager.tsx) monta aquí por
                                 portal (lista + alta/borrado). Tras CRUD refresca el overview vía
                                 window.loadQuickLinks/refreshQuickActions (que el orquestador expone). -->
                        </div>

                        <!-- Sections Tab -->
                        <div class="tab-pane fade" id="program-details-sections" role="tabpanel"
                            aria-labelledby="program-details-sections-tab">
                            <!-- spec 0014 Fase C: contenido portado a React. El componente
                                 SectionsManagerHost (_components/SectionsManager.tsx) monta aquí por
                                 portal (lista de secciones + alta/edición/borrado con su propio Dialog). -->
                        </div>

                    </div>
                </div>

                <!-- spec 0014 Fase C: segundo #collaborators-tab (tabla "Colaboradores del Programa")
                     ELIMINADO. Era un id DUPLICADO y código MUERTO: switchTab usa getElementById, que
                     devolvía el primer #collaborators-tab (la list-group de arriba, ahora React), por lo
                     que esta tabla nunca se mostraba. Sus ids (collaborators-list-body, add-collaborator-btn)
                     tenían consumidores guardados en el orquestador → no-op tras quitarlos. -->
                <!-- Evaluación Tab -->


            </main>

    <!-- Evaluation Modal -->
    <!-- evaluationModal migrado (spec 0013-e 5/5): shadcn Dialog en page.tsx.
         El cuerpo (#eval-modal-body) se sigue poblando por openEvaluationModal()
         via innerHTML; #eval-modal-save-btn y #eval-modal-title conservan sus ids. -->

    <!-- editPromotionModal y deletePromotionModal removidos (spec 0013-b).
         Ahora viven como shadcn Dialog en app/promotion/page.tsx. -->

    <!-- Module Modal -->
    <!-- moduleModal, quickLinkModal y sectionModal removidos (spec 0013-c).
         Ahora viven como shadcn Dialog en app/promotion/page.tsx. -->

    <!-- promoResourceModal removido (spec 0013-c). shadcn Dialog en page.tsx. -->

    <!-- studentModal, studentProgressModal, employabilityModal, attendanceModal,
         studentSummaryModal removidos (spec 0013-d v2). shadcn Dialog en page.tsx. -->

    <!-- Assign Project Modal -->
    <!-- assignProjectModal eliminado (spec 0013-e 4/5): feature incompleta.
         openAssignProjectModal nunca se implementó (sin opener, sin poblado, sin
         handler del submit de #assign-project-form). El botón "+ Asignar Proyecto"
         de page.tsx también se elimina. -->

    <!-- Project Assignment Detail Modal -->
    <!-- projectAssignmentDetailModal eliminado (spec 0013-e 3/5): era codigo muerto.
         Nunca se abria (sin .show() ni data-bs-toggle), sin poblado, y su handler
         onclick saveProjectAssignmentDetail() no existia en ningun archivo. -->

    <!-- Add Collaborator Modal (by Email) -->
    <!-- addCollaboratorModal eliminado (spec 0013-f): codigo muerto.
         Sin opener (.show()/data-bs-toggle) y su handler onclick addCollaboratorByEmail()
         no existe en ningun archivo. Superseido por collaboratorModal (select de usuarios). -->

    <!-- Team Member Modal -->
    <!-- teamModal removido (spec 0013-e 2/5): shadcn Dialog en page.tsx. -->
    <!-- Estructura React-managed; el <select> dinamico se puebla via innerHTML. -->
    <!-- editTeamModal y teamModal viven ahora en app/promotion/page.tsx. -->
    <!-- Las funciones openTeamModal/fillTeamFromCollaborator/addTeamMember siguen en promotion-detail.js. -->
    <!-- preview del colaborador: id="team-collab-preview" (toggle d-none desde JS). -->




    <!-- resourceModal removido (spec 0013-c). shadcn Dialog en page.tsx. -->

    <!-- Collaborator Selection Modal -->
    <!-- collaboratorModal migrado (spec 0013-f): shadcn Dialog en page.tsx.
         #collaborator-select, #collaborator-info-preview y #collaborator-module-checklist
         se siguen poblando por openCollaboratorModal()/onCollaboratorSelected() en
         promotion-detail.js. El botón "Agregar Colaborador" ahora tiene id=add-collaborator-btn. -->

    <!-- Edit Collaborator info & Module Assignment modal -->
    <!-- collaboratorModulesModal migrado (spec 0013-e/f): shadcn Dialog en page.tsx.
         Header (#collab-name/email/role-display) y checklist (#collab-modules-checklist)
         se siguen poblando por openCollaboratorModulesModal() en promotion-detail.js. -->




    <!-- Acta de Inicio Modal -->
    <!-- actaInicioModal migrado (spec 0013-g): shadcn Dialog en page.tsx.
         El form se inyecta desde app/promotion/acta-inicio-body.ts; openActaModal()
         y saveActaData() en promotion-detail.js lo pueblan/guardan. -->

    <style>
        /* ── Rich-text evaluation editor ─────────────────────────────────── */
        #evaluation-text:empty:before {
            content: attr(data-placeholder);
            color: #adb5bd;
            pointer-events: none;
        }
        #evaluation-text:focus {
            box-shadow: none;
            outline: none;
        }
        #evaluation-text ul, #evaluation-text ol {
            padding-left: 1.4em;
            margin-bottom: 0.5em;
        }
        #eval-rte-toolbar .btn:focus {
            box-shadow: none;
        }
        /* ────────────────────────────────────────────────────────────────── */

        .min-height-tag {
            min-height: 32px;
        }

        .acta-tag {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: #f0f0f0;
            border: 1px solid #ccc;
            border-radius: 20px;
            padding: 2px 10px 2px 12px;
            font-size: .85rem;
        }

        .acta-tag .rm {
            cursor: pointer;
            color: #888;
            font-size: 1rem;
            line-height: 1;
        }

        .acta-tag .rm:hover {
            color: #c00;
        }

        .acta-dayoff-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;
            flex-wrap: wrap;
        }

        .acta-dayoff-row input[type=text] {
            flex: 1;
            min-width: 120px;
        }
    </style>

    <!-- Profile Modal -->
    <!-- profileModal removido (spec 0013-b). Ahora vive como shadcn Dialog
         en app/promotion/page.tsx. -->

    <!-- Attendance Dropdown Container (dynamic) -->
    <div id="attendance-dropdown-container"></div>

    
    
    
    
    
    
    
    
    
    
    
    
    
    
    

    <!-- confirmDeleteTopicModal removido (spec 0013-b). Ahora vive como
         shadcn Dialog en app/promotion/page.tsx. -->

`;
export default promotionDetailBody;
