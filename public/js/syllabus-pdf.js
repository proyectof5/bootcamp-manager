/**
 * syllabus-pdf.js
 * Genera un PDF tipo Syllabus a partir de los datos de una promoción activa
 * o de una plantilla de bootcamp.
 *
 * Dependencias (deben estar cargadas antes):
 *   - jsPDF  (window.jspdf.jsPDF)
 *   - html2canvas  (window.html2canvas)
 *
 * Uso público:
 *   SyllabusPDF.fromPromotion(promotion, extendedInfo)
 *   SyllabusPDF.fromTemplate(template)
 */

const SyllabusPDF = (() => {
    // ─── Colores de marca ──────────────────────────────────────────────────────
    const C = {
        orange:     [255,  71,   0],
        orangeLight:[255, 200, 175],
        dark:       [ 30,  30,  30],
        gray:       [100, 100, 100],
        lightGray:  [240, 240, 240],
        white:      [255, 255, 255],
        ganttBar:   [255, 180, 130],
        ganttHead:  [255, 120,  60],
    };

    // ─── Helpers básicos ───────────────────────────────────────────────────────
    const rgb = (arr) => ({ r: arr[0], g: arr[1], b: arr[2] });

    function setFill(doc, arr)   { doc.setFillColor(...arr); }
    function setDraw(doc, arr)   { doc.setDrawColor(...arr); }
    function setFont(doc, arr)   { doc.setTextColor(...arr); }
    function setFontSize(doc, s) { doc.setFontSize(s); }

    function hLine(doc, y, x1, x2, color = C.lightGray, lw = 0.3) {
        doc.setLineWidth(lw);
        setDraw(doc, color);
        doc.line(x1, y, x2, y);
    }

    /** Comprueba si queda espacio suficiente; si no, añade página y devuelve nuevo Y */
    function checkPage(doc, y, needed, margin, pageH) {
        if (y + needed > pageH - margin) {
            doc.addPage();
            return margin + 4;
        }
        return y;
    }

    /** Título de sección con fondo naranja */
    function sectionTitle(doc, text, y, margin, pageW) {
        setFill(doc, C.orange);
        doc.roundedRect(margin, y, pageW - margin * 2, 7, 1.5, 1.5, 'F');
        setFont(doc, C.white);
        setFontSize(doc, 9);
        doc.setFont('helvetica', 'bold');
        doc.text(text.toUpperCase(), margin + 3, y + 5);
        doc.setFont('helvetica', 'normal');
        return y + 10;
    }

    /** Fila de tabla simple */
    function tableRow(doc, cols, widths, y, margin, rowH = 6, bg = null, textColor = C.dark) {
        if (bg) { setFill(doc, bg); doc.rect(margin, y, widths.reduce((a, b) => a + b, 0), rowH, 'F'); }
        setFont(doc, textColor);
        setFontSize(doc, 7.5);
        let x = margin;
        cols.forEach((text, i) => {
            const w = widths[i];
            const lines = doc.splitTextToSize(String(text || '—'), w - 2);
            doc.text(lines[0], x + 1.5, y + 4);
            x += w;
        });
        return y + rowH;
    }

    /** Calcula horas de formación a partir del schedule */
    function calcHours(schedule, weeks) {
        if (!schedule || !weeks) return null;
        const s = schedule.online || schedule.presential;
        if (!s || !s.start || !s.finish) return null;
        const [sh, sm] = s.start.split(':').map(Number);
        const [fh, fm] = s.finish.split(':').map(Number);
        let dailyMin = (fh * 60 + fm) - (sh * 60 + sm);
        // Descontar descanso si existe
        if (s.break) {
            const [bh, bm] = s.break.split(':').map(Number);
            dailyMin -= 15; // pausa estándar
        }
        // 5 días / semana
        return Math.round((dailyMin / 60) * 5 * weeks);
    }

    // ─── PORTADA ───────────────────────────────────────────────────────────────
    function buildCover(doc, title, subtitle, date, pageW, pageH) {
        // Franja superior naranja
        setFill(doc, C.orange);
        doc.rect(0, 0, pageW, 38, 'F');

        // Título
        setFont(doc, C.white);
        doc.setFont('helvetica', 'bold');
        setFontSize(doc, 22);
        doc.text('SYLLABUS', pageW / 2, 16, { align: 'center' });
        setFontSize(doc, 11);
        doc.text('Bootcamp Manager · Factoría F5', pageW / 2, 25, { align: 'center' });

        // Recuadro central con nombre
        const bx = 20, by = 50, bw = pageW - 40, bh = 50;
        setFill(doc, C.lightGray);
        doc.roundedRect(bx, by, bw, bh, 3, 3, 'F');
        setFont(doc, C.orange);
        doc.setFont('helvetica', 'bold');
        setFontSize(doc, 17);
        const titleLines = doc.splitTextToSize(title, bw - 10);
        doc.text(titleLines, pageW / 2, by + 18, { align: 'center' });

        if (subtitle) {
            setFont(doc, C.gray);
            doc.setFont('helvetica', 'normal');
            setFontSize(doc, 9);
            doc.text(subtitle, pageW / 2, by + 38, { align: 'center' });
        }

        // Fecha
        setFont(doc, C.gray);
        setFontSize(doc, 8);
        doc.setFont('helvetica', 'italic');
        doc.text(`Generado: ${date}`, pageW / 2, pageH - 12, { align: 'center' });

        // Franja inferior
        setFill(doc, C.orange);
        doc.rect(0, pageH - 8, pageW, 8, 'F');
    }

    // ─── HEADER en cada página (excepto portada) ───────────────────────────────
    function pageHeader(doc, title, pageW) {
        setFill(doc, C.orange);
        doc.rect(0, 0, pageW, 10, 'F');
        setFont(doc, C.white);
        doc.setFont('helvetica', 'bold');
        setFontSize(doc, 7);
        doc.text(title, 10, 6.5);
        doc.setFont('helvetica', 'normal');
    }

    // ─── FOOTER con número de página ─────────────────────────────────────────
    function addFooters(doc, pageW, pageH) {
        const total = doc.getNumberOfPages();
        for (let i = 1; i <= total; i++) {
            doc.setPage(i);
            if (i === 1) continue; // portada sin footer de página
            setFill(doc, C.orange);
            doc.rect(0, pageH - 6, pageW, 6, 'F');
            setFont(doc, C.white);
            setFontSize(doc, 6.5);
            doc.setFont('helvetica', 'normal');
            doc.text(`Página ${i} de ${total}`, pageW - 10, pageH - 1.5, { align: 'right' });
        }
    }

    // ─── SECCIÓN: Información general ─────────────────────────────────────────
    function buildInfoSection(doc, data, y, margin, pageW, pageH) {
        y = checkPage(doc, y, 30, margin, pageH);
        y = sectionTitle(doc, '1. Información General', y, margin, pageW);

        const rows = [
            ['Nombre',       data.name       || '—'],
            ['Tipo',         data.type       || '—'],
            ['Modalidad',    data.modality   || '—'],
            ['Horas totales',data.totalHours ? `${data.totalHours} h` : (data.hours ? `${data.hours} h` : '—')],
            ['Semanas',      data.weeks      ? `${data.weeks} semanas` : '—'],
            ['Inicio',       data.startDate  || '—'],
            ['Fin',          data.endDate    || '—'],
            ['Idioma',       data.language   || '—'],
            ['Descripción',  data.description|| '—'],
        ].filter(r => r[1] !== '—' || r[0] === 'Nombre');

        const colW = [(pageW - margin * 2) * 0.32, (pageW - margin * 2) * 0.68];
        rows.forEach((row, i) => {
            y = checkPage(doc, y, 7, margin, pageH);
            const bg = i % 2 === 0 ? C.lightGray : C.white;
            setFill(doc, bg);
            doc.rect(margin, y, colW[0] + colW[1], 6, 'F');
            setFont(doc, C.gray);
            setFontSize(doc, 7.5);
            doc.setFont('helvetica', 'bold');
            doc.text(row[0], margin + 1.5, y + 4);
            setFont(doc, C.dark);
            doc.setFont('helvetica', 'normal');
            const lines = doc.splitTextToSize(String(row[1]), colW[1] - 3);
            doc.text(lines[0], margin + colW[0] + 1.5, y + 4);
            y += 6;
        });

        return y + 4;
    }

    // ─── SECCIÓN: Horario ──────────────────────────────────────────────────────
    function buildScheduleSection(doc, schedule, y, margin, pageW, pageH) {
        if (!schedule || (!schedule.online?.start && !schedule.presential?.start)) return y;
        y = checkPage(doc, y, 30, margin, pageH);
        y = sectionTitle(doc, '2. Horario de la Formación', y, margin, pageW);

        const modes = [];
        if (schedule.online?.start)     modes.push({ label: 'Online / Teletrabajo', data: schedule.online });
        if (schedule.presential?.start) modes.push({ label: 'Presencial',            data: schedule.presential });

        const colW = (pageW - margin * 2) / (modes.length || 1);
        const fields = [
            { key: 'entry',  label: 'Entrada'  },
            { key: 'start',  label: 'Inicio'   },
            { key: 'break',  label: 'Descanso' },
            { key: 'lunch',  label: 'Comida'   },
            { key: 'finish', label: 'Fin'      },
        ];

        // Cabeceras de modalidad
        let xOff = margin;
        modes.forEach(m => {
            setFill(doc, C.orangeLight);
            doc.rect(xOff, y, colW, 6, 'F');
            setFont(doc, C.dark);
            doc.setFont('helvetica', 'bold');
            setFontSize(doc, 8);
            doc.text(m.label, xOff + 2, y + 4);
            xOff += colW;
        });
        y += 6;

        fields.forEach((f, fi) => {
            const rowY = y;
            xOff = margin;
            modes.forEach(m => {
                const bg = fi % 2 === 0 ? C.lightGray : C.white;
                setFill(doc, bg);
                doc.rect(xOff, rowY, colW, 5.5, 'F');
                setFont(doc, C.gray);
                doc.setFont('helvetica', 'bold');
                setFontSize(doc, 7);
                doc.text(f.label + ':', xOff + 2, rowY + 3.8);
                setFont(doc, C.dark);
                doc.setFont('helvetica', 'normal');
                doc.text(m.data[f.key] || '—', xOff + 26, rowY + 3.8);
                xOff += colW;
            });
            y += 5.5;
        });

        if (schedule.notes) {
            y += 2;
            setFont(doc, C.gray);
            setFontSize(doc, 7);
            doc.setFont('helvetica', 'italic');
            const noteLines = doc.splitTextToSize(`Notas: ${schedule.notes}`, pageW - margin * 2);
            noteLines.forEach(line => {
                y = checkPage(doc, y, 5, margin, pageH);
                doc.text(line, margin, y);
                y += 4.5;
            });
        }

        return y + 4;
    }

    // ─── SECCIÓN: Competencias ─────────────────────────────────────────────────
    function buildCompetencesSection(doc, competences, y, margin, pageW, pageH) {
        if (!competences || !competences.length) return y;
        y = checkPage(doc, y, 20, margin, pageH);
        y = sectionTitle(doc, '3. Competencias', y, margin, pageW);

        const totalW = pageW - margin * 2;
        const cW = [totalW * 0.30, totalW * 0.70];

        // Cabecera de tabla
        setFill(doc, C.dark);
        doc.rect(margin, y, totalW, 6, 'F');
        setFont(doc, C.white);
        doc.setFont('helvetica', 'bold');
        setFontSize(doc, 7.5);
        doc.text('Competencia', margin + 2, y + 4);
        doc.text('Descripción', margin + cW[0] + 2, y + 4);
        y += 6;

        competences.forEach((comp, i) => {
            const descLines = doc.splitTextToSize(comp.description || comp.name || '—', cW[1] - 4);
            const rowH = Math.max(6, descLines.length * 4.5 + 2);
            y = checkPage(doc, y, rowH + 2, margin, pageH);

            const bg = i % 2 === 0 ? C.lightGray : C.white;
            setFill(doc, bg);
            doc.rect(margin, y, totalW, rowH, 'F');

            // Nombre
            setFont(doc, C.orange);
            doc.setFont('helvetica', 'bold');
            setFontSize(doc, 7.5);
            const nameLines = doc.splitTextToSize(comp.name || '—', cW[0] - 4);
            doc.text(nameLines, margin + 2, y + 4);

            // Descripción
            setFont(doc, C.dark);
            doc.setFont('helvetica', 'normal');
            setFontSize(doc, 7);
            doc.text(descLines, margin + cW[0] + 2, y + 4);

            y += rowH;

            // ── Herramientas de la competencia ──────────────────────────────
            const tools = comp.selectedTools || comp.allTools || [];
            if (tools.length) {
                y = checkPage(doc, y, 10, margin, pageH);
                setFill(doc, [250, 245, 240]);
                doc.rect(margin + 4, y, totalW - 4, 5.5, 'F');
                setFont(doc, C.orange);
                doc.setFont('helvetica', 'bold');
                setFontSize(doc, 6.5);
                doc.text('🔧 Herramientas:', margin + 6, y + 3.8);
                setFont(doc, C.dark);
                doc.setFont('helvetica', 'normal');
                const toolNames = tools.map(t => typeof t === 'string' ? t : (t.name || t)).join(' · ');
                const tLines = doc.splitTextToSize(toolNames, totalW - 40);
                doc.text(tLines[0], margin + 36, y + 3.8);
                y += 5.5;
            }

            // ── Indicadores por nivel ──────────────────────────────────────
            const indicators = comp.competenceIndicators || {};
            const levels = [
                { key: 'initial', label: 'Inicial',   color: [220, 252, 231] },
                { key: 'medio',   label: 'Medio',     color: [254, 249, 195] },
                { key: 'advance', label: 'Avanzado',  color: [254, 226, 226] },
            ];

            levels.forEach(lv => {
                const inds = indicators[lv.key] || [];
                if (!inds.length) return;
                y = checkPage(doc, y, 7, margin, pageH);
                setFill(doc, lv.color);
                doc.rect(margin + 4, y, totalW - 4, 5.5, 'F');
                setFont(doc, C.dark);
                doc.setFont('helvetica', 'bold');
                setFontSize(doc, 6.5);
                doc.text(`Nivel ${lv.label}:`, margin + 6, y + 3.8);
                doc.setFont('helvetica', 'normal');
                const indStr = inds.map(ind => typeof ind === 'string' ? ind : (ind.name || ind.description || ind)).join(' / ');
                const iLines = doc.splitTextToSize(indStr, totalW - 40);
                doc.text(iLines[0], margin + 34, y + 3.8);
                y += 5.5;
                if (iLines.length > 1) {
                    iLines.slice(1).forEach(il => {
                        y = checkPage(doc, y, 5, margin, pageH);
                        setFont(doc, C.dark);
                        doc.setFont('helvetica', 'normal');
                        setFontSize(doc, 6.5);
                        doc.text(il, margin + 6, y + 3.8);
                        y += 4.5;
                    });
                }
            });

            y += 2;
            hLine(doc, y, margin, pageW - margin, C.orangeLight, 0.2);
            y += 2;
        });

        return y + 4;
    }

    // ─── SECCIÓN: Diagrama Gantt ───────────────────────────────────────────────
    function buildGanttSection(doc, promotion, y, margin, pageW, pageH, sectionNum) {
        const modules = promotion.modules || [];
        const weeks   = promotion.weeks   || 0;
        if (!modules.length || !weeks) return y;

        y = checkPage(doc, y, 20, margin, pageH);
        y = sectionTitle(doc, `${sectionNum}. Diagrama Gantt`, y, margin, pageW);

        const totalW   = pageW - margin * 2;
        const labelW   = 42;
        const weekW    = Math.min(4.5, (totalW - labelW) / weeks);
        const tableW   = labelW + weekW * weeks;
        const rowH     = 5;

        // Fila de cabecera (semanas)
        setFill(doc, C.dark);
        doc.rect(margin, y, tableW, rowH, 'F');
        setFont(doc, C.white);
        doc.setFont('helvetica', 'bold');
        setFontSize(doc, 5.5);
        doc.text('Módulo / Sem.', margin + 1, y + 3.5);
        for (let w = 0; w < weeks; w++) {
            const xW = margin + labelW + w * weekW;
            if (w % 4 === 0) {
                // Mes
                setFont(doc, C.white);
                setFontSize(doc, 4.5);
                doc.text(`M${Math.floor(w / 4) + 1}`, xW + 0.5, y + 3.5);
            }
        }
        y += rowH;

        // Fila de números de semana
        setFill(doc, C.orangeLight);
        doc.rect(margin, y, tableW, rowH - 1, 'F');
        setFont(doc, C.dark);
        setFontSize(doc, 4.5);
        doc.setFont('helvetica', 'normal');
        for (let w = 0; w < weeks; w++) {
            const xW = margin + labelW + w * weekW;
            doc.text(`${w + 1}`, xW + weekW / 2 - 1, y + 3);
        }
        y += rowH - 1;

        // Filas de módulos
        let weekCursor = 0;
        modules.forEach((mod, i) => {
            y = checkPage(doc, y, rowH + 1, margin, pageH);
            const bg = i % 2 === 0 ? C.lightGray : C.white;
            setFill(doc, bg);
            doc.rect(margin, y, tableW, rowH, 'F');

            // Etiqueta
            setFont(doc, C.dark);
            doc.setFont('helvetica', 'bold');
            setFontSize(doc, 5.5);
            const modLabel = doc.splitTextToSize(`M${i + 1}: ${mod.name}`, labelW - 2);
            doc.text(modLabel[0], margin + 1, y + 3.5);
            doc.setFont('helvetica', 'normal');

            // Barras de duración
            const dur = parseInt(mod.duration) || 0;
            const start = weekCursor;
            const end   = Math.min(start + dur, weeks);
            for (let w = start; w < end; w++) {
                const xW = margin + labelW + w * weekW;
                setFill(doc, C.ganttBar);
                doc.rect(xW + 0.3, y + 0.8, weekW - 0.6, rowH - 1.6, 'F');
            }
            weekCursor += dur;

            // Línea divisora de mes
            for (let w = 0; w < weeks; w++) {
                if (w % 4 === 0 && w > 0) {
                    setDraw(doc, C.gray);
                    doc.setLineWidth(0.1);
                    const xW = margin + labelW + w * weekW;
                    doc.line(xW, y, xW, y + rowH);
                }
            }

            y += rowH;
        });

        // Leyenda
        y += 3;
        setFill(doc, C.ganttBar);
        doc.rect(margin, y, 8, 4, 'F');
        setFont(doc, C.dark);
        setFontSize(doc, 6.5);
        doc.text('= Duración del módulo', margin + 10, y + 3);
        y += 8;

        return y;
    }

    // ─── SECCIÓN: Módulos ─────────────────────────────────────────────────────
    function buildModulesSection(doc, modules, y, margin, pageW, pageH, sectionNum) {
        if (!modules || !modules.length) return y;
        y = checkPage(doc, y, 20, margin, pageH);
        y = sectionTitle(doc, `${sectionNum}. Módulos y Contenido`, y, margin, pageW);

        modules.forEach((mod, i) => {
            y = checkPage(doc, y, 12, margin, pageH);

            // Cabecera de módulo
            setFill(doc, C.orangeLight);
            doc.roundedRect(margin, y, pageW - margin * 2, 6.5, 1, 1, 'F');
            setFont(doc, C.dark);
            doc.setFont('helvetica', 'bold');
            setFontSize(doc, 8.5);
            doc.text(`Módulo ${i + 1}: ${mod.name}   (${mod.duration || '?'} semanas)`, margin + 3, y + 4.5);
            y += 7.5;

            const totalW = pageW - margin * 2;

            // Proyectos
            const projects = mod.projects || [];
            if (projects.length) {
                y = checkPage(doc, y, 6, margin, pageH);
                setFont(doc, C.orange);
                doc.setFont('helvetica', 'bold');
                setFontSize(doc, 7.5);
                doc.text('Proyectos:', margin + 3, y + 3);
                y += 5;
                projects.forEach((p, pi) => {
                    y = checkPage(doc, y, 5, margin, pageH);
                    const pName = typeof p === 'string' ? p : (p.name || 'Proyecto');
                    const pDesc = typeof p === 'object' && p.description ? ` — ${p.description}` : '';
                    setFill(doc, pi % 2 === 0 ? C.lightGray : C.white);
                    doc.rect(margin + 4, y, totalW - 4, 5, 'F');
                    setFont(doc, C.dark);
                    doc.setFont('helvetica', 'normal');
                    setFontSize(doc, 7);
                    const pLine = doc.splitTextToSize(`• ${pName}${pDesc}`, totalW - 10);
                    doc.text(pLine[0], margin + 6, y + 3.5);
                    y += 5;
                });
            }

            // Cursos
            const courses = mod.courses || [];
            if (courses.length) {
                y = checkPage(doc, y, 6, margin, pageH);
                setFont(doc, C.orange);
                doc.setFont('helvetica', 'bold');
                setFontSize(doc, 7.5);
                doc.text('Cursos:', margin + 3, y + 3);
                y += 5;
                courses.forEach((c, ci) => {
                    y = checkPage(doc, y, 5, margin, pageH);
                    const cName = typeof c === 'string' ? c : (c.name || 'Curso');
                    setFill(doc, ci % 2 === 0 ? C.lightGray : C.white);
                    doc.rect(margin + 4, y, totalW - 4, 5, 'F');
                    setFont(doc, C.dark);
                    doc.setFont('helvetica', 'normal');
                    setFontSize(doc, 7);
                    doc.text(`• ${cName}`, margin + 6, y + 3.5);
                    y += 5;
                });
            }

            y += 4;
            hLine(doc, y, margin, pageW - margin, C.orangeLight);
            y += 3;
        });

        return y;
    }

    // ─── SECCIÓN: Metodología de Evaluación ───────────────────────────────────
    function buildEvaluationSection(doc, evaluation, y, margin, pageW, pageH, sectionNum) {
        if (!evaluation) return y;
        y = checkPage(doc, y, 20, margin, pageH);
        y = sectionTitle(doc, `${sectionNum}. Metodología de Evaluación`, y, margin, pageW);

        setFont(doc, C.dark);
        doc.setFont('helvetica', 'normal');
        setFontSize(doc, 7.5);

        const lines = doc.splitTextToSize(evaluation, pageW - margin * 2 - 4);
        lines.forEach(line => {
            y = checkPage(doc, y, 5, margin, pageH);
            // Detección de líneas que son "títulos" (texto sin bullet pero corto)
            const isBullet = line.trim().startsWith('•');
            const isTitle = !isBullet && line.trim().length > 0 && line.trim().length < 60 && !line.includes(' ');
            if (isBullet) {
                setFont(doc, C.orange);
                doc.setFont('helvetica', 'bold');
                setFontSize(doc, 7.5);
            } else if (line.trim().startsWith('Evaluación') || line.trim().startsWith('Valoración')) {
                setFont(doc, C.dark);
                doc.setFont('helvetica', 'bold');
                setFontSize(doc, 8);
            } else {
                setFont(doc, C.dark);
                doc.setFont('helvetica', 'normal');
                setFontSize(doc, 7.5);
            }
            doc.text(line, margin + 2, y);
            y += 4.5;
        });

        return y + 4;
    }

    // ─── BUILDER PRINCIPAL ────────────────────────────────────────────────────
    function build(title, subtitle, infoData, schedule, competences, modules, evaluation, weeks) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const margin = 12;

        const today = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

        // Portada
        buildCover(doc, title, subtitle, today, pageW, pageH);

        // ── Página 2 en adelante ──────────────────────────────────────────────
        doc.addPage();
        pageHeader(doc, title, pageW);
        let y = 14;

        // 1. Info general
        y = buildInfoSection(doc, infoData, y, margin, pageW, pageH);

        // 2. Horario
        pageHeader(doc, title, pageW);
        y = buildScheduleSection(doc, schedule, y, margin, pageW, pageH);

        // 3. Competencias
        if (competences && competences.length) {
            pageHeader(doc, title, pageW);
            y = buildCompetencesSection(doc, competences, y, margin, pageW, pageH);
        }

        // 4. Gantt
        let sectionCounter = competences && competences.length ? 4 : 3;
        if (modules && modules.length && weeks) {
            pageHeader(doc, title, pageW);
            y = buildGanttSection(doc, { modules, weeks }, y, margin, pageW, pageH, sectionCounter);
            sectionCounter++;
        }

        // 5. Módulos
        if (modules && modules.length) {
            pageHeader(doc, title, pageW);
            y = buildModulesSection(doc, modules, y, margin, pageW, pageH, sectionCounter);
            sectionCounter++;
        }

        // 6. Evaluación
        if (evaluation) {
            pageHeader(doc, title, pageW);
            y = buildEvaluationSection(doc, evaluation, y, margin, pageW, pageH, sectionCounter);
        }

        // Footers (número de página)
        addFooters(doc, pageW, pageH);

        const safeTitle = title.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 40);
        doc.save(`syllabus_${safeTitle}.pdf`);
    }

    // ─── API PÚBLICA ───────────────────────────────────────────────────────────

    /**
     * Genera el syllabus de una PROMOCIÓN ACTIVA.
     * @param {Object} promotion    — datos de la promoción (modules, weeks, etc.)
     * @param {Object} extendedInfo — datos extendidos (schedule, competences, evaluation)
     */
    function fromPromotion(promotion, extendedInfo) {
        if (!window.jspdf) {
            alert('Error: jsPDF no está cargado. Recarga la página e inténtalo de nuevo.');
            return;
        }
        const ext = extendedInfo || {};
        const info = {
            name:        promotion.name,
            type:        promotion.type,
            modality:    ext.modality || promotion.modality,
            totalHours:  ext.totalHours,
            weeks:       promotion.weeks,
            startDate:   promotion.startDate,
            endDate:     promotion.endDate,
            language:    promotion.language,
            description: promotion.description,
        };
        const subtitle = [promotion.startDate, promotion.endDate].filter(Boolean).join(' → ');
        build(
            promotion.name,
            subtitle,
            info,
            ext.schedule || {},
            ext.competences || [],
            promotion.modules || [],
            ext.evaluation || '',
            promotion.weeks || 0
        );
    }

    /**
     * Genera el syllabus de una PLANTILLA de bootcamp.
     * @param {Object} template — datos de la plantilla
     */
    function fromTemplate(template) {
        if (!window.jspdf) {
            alert('Error: jsPDF no está cargado. Recarga la página e inténtalo de nuevo.');
            return;
        }
        const info = {
            name:        template.name,
            type:        template.type || 'Bootcamp',
            modality:    template.modality || '—',
            totalHours:  template.hours || template.totalHours,
            weeks:       template.weeks,
            language:    template.language || '—',
            description: template.description,
        };
        build(
            template.name,
            `Plantilla · ${template.type || 'Bootcamp'}`,
            info,
            template.schedule || {},
            template.competences || [],
            template.modules || [],
            template.evaluation || '',
            template.weeks || 0
        );
    }

    return { fromPromotion, fromTemplate };
})();

window.SyllabusPDF = SyllabusPDF;
