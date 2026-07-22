// Auto-generated from promotion-detail.html
// Spec 0013-a: navbar + sidebar overlay + sidebar desktop migrados a JSX
// en app/promotion/page.tsx. Este string ahora empieza directamente con
// <main id="main-content"> y termina con los 23 modales.
const promotionDetailBody = `
    <!-- Main Content -->
    <main id="main-content" class="px-md-4">
                <!-- Overview Tab -->
                <!-- spec 0014 Fase C: el contenido del Overview (título + Acciones Rápidas + Progreso +
                     Agenda + Avisos + bloc de notas) se migró a React: _components/OverviewPanel.tsx
                     monta por portal dentro de este #overview-tab conservando los ids legacy. El div
                     queda con class="section-content" porque switchTab() le togglea .hidden. -->
                <div id="overview-tab" class="section-content"></div>

                <!-- Área del Docente Tab -->
                <div id="teacher-area-tab" class="section-content hidden">
                    <!-- Cabecera de "Área de administración" (título + pestañas). Se oculta
                         automáticamente al entrar al evaluador de un proyecto concreto (regla CSS
                         #teacher-area-tab:has(#eval-project-view:not(.hidden)) en
                         css/promotion-detail.css) — no requiere botón manual: el toggle abrir/cerrar
                         vive en la propia barra del evaluador (.eval-view-topbar, ver
                         EvaluationGridPanel.tsx). -->
                    <div id="teacher-area-header">
                        <div class="my-4">
                            <h1 id="teacher-area-title">Área de Administración</h1>
                            <p id="teacher-area-desc" class="text-muted">Gestión integral del grupo y herramientas de
                                seguimiento</p>
                        </div>

                        <!-- Teacher Area Sub-sections Navigation -->
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
                    </div>

                    <div class="mt-4">
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
                                <!-- spec 0014 Fase C: contenido portado a React. El componente
                                     AttendancePanelHost (_components/AttendancePanel.tsx) monta aquí por portal el
                                     #attendance-tab (nav de mes + stats + leyenda + tabla #attendance-table)
                                     conservando los ids legacy. La lógica sigue en el orquestador: loadAttendance/
                                     renderAttendanceTable (guards añadidos, lo llama switchTeacherAreaSubTab('attendance'))
                                     pueblan por id; los controles llaman a window.exportAttendanceToExcel/
                                     prevAttendanceMonth/nextAttendanceMonth/__printWeeklyAttendance. -->
                            </div>

                            <!-- Evaluation Tab -->
                            <div class="tab-pane fade" id="teacher-area-evaluation" role="tabpanel"
                                aria-labelledby="teacher-area-evaluation-tab">
                                <!-- spec 0014 Fase C (18º y ÚLTIMO bloque): contenido portado a React. El componente
                                     EvaluationGridPanelHost (_components/EvaluationGridPanel.tsx) monta aquí por portal
                                     el #evaluation-tab con sus 4 sub-vistas (#evaluation-tab-view/#evaluation-content,
                                     #team-history-panel, #eval-project-view split-view, #student-eval-panel) conservando
                                     TODOS los ids legacy. La lógica sigue en el orquestador: loadEvaluation/
                                     renderEvaluationTab (null-safe, lo llama switchTeacherAreaSubTab('evaluation'))
                                     pueblan #evaluation-content y togglean las sub-vistas por id; los controles llaman a
                                     window.closeTeamHistoryView/closeEvaluationView/saveIndividualStudentEval/
                                     previewStudentEvalReport/sendEvaluationByEmail/sendEvaluationToAllInProject/
                                     cancelStudentEvalPanel. El keydown handler de los .eval-feedback-rte se delega en
                                     este #teacher-area-evaluation (persistente). Con esto promotion-detail.js ya no es
                                     dueño de ninguna sección de body.ts. -->
                            </div>

                            <!-- Accesos Tab (Área del Docente) -->
                            <div class="tab-pane fade" id="teacher-area-accesos" role="tabpanel"
                                aria-labelledby="teacher-area-accesos-tab">
                                <!-- spec 0014 Fase C: contenido portado a React. El componente
                                     AccessSettingsPanelHost (_components/AccessSettingsPanel.tsx) monta aquí por
                                     portal el #teacher-area-accesos-content (tarjetas Contraseña/link + Planificador
                                     + Asana + Zoom) conservando los ids legacy. La lógica sigue en el orquestador:
                                     loadAccessSettingsInTeacherArea (null-safe, gated isTeacherOrAdmin, lo llama
                                     switchTeacherAreaSubTab('accesos')) puebla/lee por id; los controles llaman a
                                     window.updateAccessPassword/copyAccessLink/togglePasswordVisibility/
                                     updateTeachingContent/removeTeachingContent/updateAsanaWorkspace/
                                     removeAsanaWorkspace/saveZoomCredentials/removeZoomCredentials. -->
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
