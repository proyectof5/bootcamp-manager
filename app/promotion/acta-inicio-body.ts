// Form de Acta de Inicio extraido de body.ts (spec 0013-g). Se inyecta en el
// <Dialog> shadcn de page.tsx via dangerouslySetInnerHTML (memoizado). Los ids,
// selects estaticos y onclick (actaAddFunder/actaAddDayOffRow) los maneja
// promotion-detail.js. NO editar a mano salvo para el barrido Bootstrap de 0014.
const actaInicioFormHtml = `
                    <div class="row g-3">

                        <!-- Escuela -->
                        <div class="col-md-6">
                            <label class="form-label fw-semibold">Escuela y/o área responsable</label>
                            <select class="form-select" id="acta-school">
                                <option value="">-- Selecciona comunidad --</option>
                                <option value="Andalucía">Andalucía</option>
                                <option value="Aragón">Aragón</option>
                                <option value="Asturias">Asturias</option>
                                <option value="Baleares">Baleares</option>
                                <option value="Canarias">Canarias</option>
                                <option value="Cantabria">Cantabria</option>
                                <option value="Castilla-La Mancha">Castilla-La Mancha</option>
                                <option value="Castilla y León">Castilla y León</option>
                                <option value="Cataluña">Cataluña</option>
                                <option value="Comunidad Valenciana">Comunidad Valenciana</option>
                                <option value="Extremadura">Extremadura</option>
                                <option value="Galicia">Galicia</option>
                                <option value="La Rioja">La Rioja</option>
                                <option value="Madrid">Madrid</option>
                                <option value="Murcia">Murcia</option>
                                <option value="Navarra">Navarra</option>
                                <option value="País Vasco">País Vasco</option>
                                <option value="Ceuta">Ceuta</option>
                                <option value="Melilla">Melilla</option>
                            </select>
                        </div>

                        <!-- Tipo proyecto -->
                        <div class="col-md-6">
                            <label class="form-label fw-semibold">Tipo proyecto formativo</label>
                            <input type="text" class="form-control" id="acta-project-type" value="Bootcamp"
                                placeholder="Bootcamp">
                        </div>

                        <!-- Fechas salida positiva -->
                        <div class="col-md-6">
                            <label class="form-label fw-semibold">Fecha inicio periodo salida positiva</label>
                            <input type="date" class="form-control" id="acta-positive-exit-start">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-semibold">Fecha fin periodo salida positiva</label>
                            <input type="date" class="form-control" id="acta-positive-exit-end">
                        </div>

                        <!-- Horas totales -->
                        <div class="col-md-6">
                            <label class="form-label fw-semibold">Horas totales de formación</label>
                            <select class="form-select" id="acta-total-hours">
                                <option value="">-- Selecciona --</option>
                                <option value="450 horas">450 horas</option>
                                <option value="850 horas">850 horas</option>
                                <option value="1.250 horas">1.250 horas</option>
                            </select>
                        </div>

                        <!-- Modalidad -->
                        <div class="col-md-6">
                            <label class="form-label fw-semibold">Modalidad</label>
                            <select class="form-select" id="acta-modality">
                                <option value="">-- Selecciona --</option>
                                <option value="Presencial">Presencial</option>
                                <option value="Online">Online</option>
                                <option value="Híbrido (Presencial + Online)">Híbrido (Presencial + Online)</option>
                            </select>
                        </div>

                        <!-- Días presenciales y lugar -->
                        <div class="col-12">
                            <label class="form-label fw-semibold">Días presenciales y lugar</label>
                            <div class="d-flex flex-wrap gap-2 mb-2" id="acta-presential-days-checkboxes">
                                <div class="form-check form-check-inline">
                                    <input class="form-check-input" type="checkbox" id="pd-lun" value="lunes">
                                    <label class="form-check-label" for="pd-lun">Lunes</label>
                                </div>
                                <div class="form-check form-check-inline">
                                    <input class="form-check-input" type="checkbox" id="pd-mar" value="martes">
                                    <label class="form-check-label" for="pd-mar">Martes</label>
                                </div>
                                <div class="form-check form-check-inline">
                                    <input class="form-check-input" type="checkbox" id="pd-mie" value="miércoles">
                                    <label class="form-check-label" for="pd-mie">Miércoles</label>
                                </div>
                                <div class="form-check form-check-inline">
                                    <input class="form-check-input" type="checkbox" id="pd-jue" value="jueves">
                                    <label class="form-check-label" for="pd-jue">Jueves</label>
                                </div>
                                <div class="form-check form-check-inline">
                                    <input class="form-check-input" type="checkbox" id="pd-vie" value="viernes">
                                    <label class="form-check-label" for="pd-vie">Viernes</label>
                                </div>
                            </div>
                            <select class="form-select" id="acta-presential-location">
                                <option value="">-- Selecciona sede --</option>
                                <option value="C/ Fernando Poo, 25, Arganzuela, 28045 Madrid">C/ Fernando Poo, 25,
                                    Arganzuela, 28045 Madrid</option>
                                <option value="Av. del Bogatell, 82, Sant Martí, 08005 Barcelona">Av. del Bogatell, 82,
                                    Sant Martí, 08005 Barcelona</option>
                                <option value="C/ María Josefa, 27, Centro, 33209 Gijón, Asturias">C/ María Josefa, 27,
                                    Centro, 33209 Gijón, Asturias</option>
                            </select>
                        </div>

                        <!-- Materiales -->
                        <div class="col-12">
                            <label class="form-label fw-semibold">Materiales/recursos necesarios</label>
                            <textarea class="form-control" id="acta-materials"
                                rows="2">No son necesarios recursos adicionales.</textarea>
                        </div>

                        <!-- Período prácticas -->
                        <div class="col-md-4">
                            <label class="form-label fw-semibold">Período de prácticas</label>
                            <select class="form-select" id="acta-internships">
                                <option value="">Sin especificar</option>
                                <option value="true">Sí</option>
                                <option value="false">No</option>
                            </select>
                        </div>

                        <!-- Financiadores (etiquetas únicas) -->
                        <div class="col-12">
                            <label class="form-label fw-semibold">Financiadores</label>
                            <small class="text-muted d-block mb-1">Añade cada financiador como etiqueta única. Pulsa
                                Enter o el botón para añadir.</small>
                            <div class="input-group mb-2">
                                <input type="text" class="form-control" id="acta-funder-input" placeholder="Ej: SAGE.">
                                <button class="btn btn-outline-secondary" type="button" onclick="actaAddFunder()">
                                    <i class="bi bi-plus"></i> Añadir
                                </button>
                            </div>
                            <div id="acta-funders-tags" class="d-flex flex-wrap gap-2 min-height-tag"></div>
                        </div>

                        <!-- Fecha justificación financiadores -->
                        <div class="col-12">
                            <label class="form-label fw-semibold">Fecha de justificación a cada financiador</label>
                            <textarea class="form-control" id="acta-funder-deadlines" rows="2"
                                placeholder="Ej: Realización de reportes a JP Morgan y Sage."></textarea>
                        </div>

                        <!-- OKR y KPIs FF5 -->
                        <div class="col-12">
                            <label class="form-label fw-semibold">OKR y KPIs de FF5</label>
                            <textarea class="form-control" id="acta-okr-kpis" rows="4">PIPO3.R1 Satisfacción 4,2/5 de coders sobre la excelencia del equipo formativo de la formación
ISEC2.R1 Jornadas de selección con un 40% de personas participantes con el proceso 100% finalizado.
ISEC3.R2 Resultado 78% salida positiva.
ISECR2 Finalizar cada programa con un máximo de bajas de 10%.</textarea>
                        </div>

                        <!-- KPIs financiadores (por financiador) -->
                        <div class="col-12">
                            <label class="form-label fw-semibold">KPIs financiadores</label>
                            <small class="text-muted d-block mb-2">Define los KPIs para cada financiador
                                añadido.</small>
                            <div id="acta-funder-kpis-container">
                                <!-- Generated dynamically per funder -->
                                <p class="text-muted fst-italic small" id="acta-funder-kpis-empty">Añade financiadores
                                    primero para definir sus KPIs.</p>
                            </div>
                        </div>

                        <!-- Datalist for user search in day-off rows -->
                        <datalist id="acta-users-datalist"></datalist>

                        <!-- Día off Formador/a -->
                        <div class="col-12">
                            <label class="form-label fw-semibold">Día off Formador/a</label>
                            <small class="text-muted d-block mb-1">Por módulo: selecciona el día libre del formador/a
                                principal.</small>
                            <div id="acta-trainer-dayoff-rows">
                                <!-- Rows added dynamically per module, and one manual row -->
                            </div>
                            <button class="btn btn-sm btn-outline-secondary mt-1" type="button"
                                onclick="actaAddDayOffRow('trainer')">
                                <i class="bi bi-plus"></i> Añadir módulo
                            </button>
                        </div>

                        <!-- Día off CoFormador/a -->
                        <div class="col-12">
                            <label class="form-label fw-semibold">Día off CoFormador/a</label>
                            <small class="text-muted d-block mb-1">Por módulo: selecciona el día libre del
                                coformador/a.</small>
                            <div id="acta-cotrainer-dayoff-rows">
                            </div>
                            <button class="btn btn-sm btn-outline-secondary mt-1" type="button"
                                onclick="actaAddDayOffRow('cotrainer')">
                                <i class="bi bi-plus"></i> Añadir módulo
                            </button>
                        </div>

                        <!-- Reuniones de proyecto -->
                        <div class="col-12">
                            <label class="form-label fw-semibold">Planificación reuniones de proyecto</label>
                            <textarea class="form-control" id="acta-project-meetings"
                                rows="2">Ver el calendario de reuniones en Asana.</textarea>
                        </div>

                        <!-- Reuniones de equipo -->
                        <div class="col-12">
                            <label class="form-label fw-semibold">Planificación reuniones de equipo</label>
                            <div class="row g-2 align-items-center">
                                <div class="col-auto">
                                    <select class="form-select" id="acta-team-meeting-day" style="min-width:130px;">
                                        <option value="lunes">Lunes</option>
                                        <option value="martes">Martes</option>
                                        <option value="miércoles">Miércoles</option>
                                        <option value="jueves" selected>Jueves</option>
                                        <option value="viernes">Viernes</option>
                                    </select>
                                </div>
                                <div class="col-auto d-flex align-items-center gap-1">
                                    <input type="time" class="form-control" id="acta-team-meeting-start" value="14:30"
                                        style="width:120px;">
                                    <span class="text-muted">–</span>
                                    <input type="time" class="form-control" id="acta-team-meeting-end" value="15:00"
                                        style="width:120px;">
                                </div>
                            </div>
                        </div>

                        <!-- Aprobación y difusión del documento -->
                        <div class="col-12 mt-2">
                            <hr class="my-2">
                            <label class="form-label fw-semibold">
                                <i class="bi bi-pen me-1 text-secondary"></i>Aprobación y difusión del documento
                            </label>
                            <small class="text-muted d-block mb-2">Persona responsable de aprobar y difundir este
                                acta.</small>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-semibold">Nombre</label>
                            <input type="text" class="form-control" id="acta-approval-name"
                                placeholder="Nombre completo" list="acta-users-datalist">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-semibold">Cargo</label>
                            <input type="text" class="form-control" id="acta-approval-role"
                                placeholder="Ej: Project Manager">
                        </div>

                    </div><!-- /row -->
`;

export default actaInicioFormHtml;
