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
        orange:     [255, 107,  53],   // #FF6B35 - brand orange (used sparingly)
        orangeLight:[240, 240, 240],   // replaced with light grey
        dark:       [ 30,  30,  30],
        gray:       [100, 100, 100],
        lightGray:  [245, 245, 245],
        white:      [255, 255, 255],
        ganttBar:   [200, 200, 200],   // neutral grey bar
        ganttHead:  [ 80,  80,  80],
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

    /** Título de sección — plain bold text with a thin grey underline */
    function sectionTitle(doc, text, y, margin, pageW) {
        setFont(doc, C.dark);
        doc.setFont('helvetica', 'bold');
        setFontSize(doc, 10);
        doc.text(text, margin, y + 5);
        doc.setLineWidth(0.4);
        setDraw(doc, C.gray);
        doc.line(margin, y + 7, pageW - margin, y + 7);
        doc.setFont('helvetica', 'normal');
        return y + 12;
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
    function buildCover(doc, title, subtitle, date, pageW, pageH, logoDataUrl) {
        // White background — no coloured banner

        // Logo top-right (if available)
        if (logoDataUrl) {
            try {
                doc.addImage(logoDataUrl, 'WEBP', pageW - 52, 14, 38, 0);
            } catch (_) {
                // image failed — skip silently
            }
        }

        // // Thin grey rule across full width
        // doc.setLineWidth(0.5);
        // setDraw(doc, C.gray);
        // doc.line(12, 28, pageW - 12, 28);

        // Title block
        setFont(doc, C.dark);
        doc.setFont('helvetica', 'bold');
        setFontSize(doc, 22);
        const titleLines = doc.splitTextToSize(title, pageW - 60);
        doc.text(titleLines, 12, 50);

        if (subtitle) {
            setFont(doc, C.gray);
            doc.setFont('helvetica', 'normal');
            setFontSize(doc, 10);
            doc.text(subtitle, 12, 50 + titleLines.length * 9 + 4);
        }

        // Bottom thin rule
        doc.setLineWidth(0.5);
        setDraw(doc, C.gray);
        doc.line(12, pageH - 20, pageW - 12, pageH - 20);
    }

    // ─── HEADER en cada página (excepto portada) ───────────────────────────────
    function pageHeader(doc, title, pageW, logoDataUrl) {
        // Thin top line
        // doc.setLineWidth(0.4);
        // setDraw(doc, [180, 180, 180]);
        // doc.line(0, 10, pageW, 10);
        // Small title text left
        setFont(doc, C.gray);
        doc.setFont('helvetica', 'normal');
        setFontSize(doc, 6.5);
        doc.text(title, 12, 7.5);
        // Logo right (small)
        if (logoDataUrl) {
            try { doc.addImage(logoDataUrl, 'WEBP', pageW - 30, 1.5, 18, 0); } catch (_) {}
        }
    }

    // ─── FOOTER con número de página ─────────────────────────────────────────
    function addFooters(doc, pageW, pageH) {
        const total = doc.getNumberOfPages();
        for (let i = 1; i <= total; i++) {
            doc.setPage(i);
            doc.setLineWidth(0.3);
            setDraw(doc, [180, 180, 180]);
            doc.line(12, pageH - 8, pageW - 12, pageH - 8);
            setFont(doc, C.gray);
            setFontSize(doc, 6.5);
            doc.setFont('helvetica', 'normal');
            doc.text(`Página ${i} de ${total}`, pageW - 12, pageH - 4, { align: 'right' });
        }
    }

    // ─── SECCIÓN: Información general ─────────────────────────────────────────
    function buildInfoSection(doc, data, y, margin, pageW, pageH) {
        y = checkPage(doc, y, 30, margin, pageH);
        y = sectionTitle(doc, '1. Información General', y, margin, pageW);

        const rows = [
            ['Nombre',        data.name        || '—'],
            ['Tipo',          data.type        || '—'],
            ['Modalidad',     data.modality    || '—'],
            ['Horas totales', data.totalHours  ? `${data.totalHours} h` : (data.hours ? `${data.hours} h` : null)],
            ['Duración',      data.weeks       ? `${data.weeks} semanas` : null],
            ['Inicio',        data.startDate   || null],
            ['Fin',           data.endDate     || null],
            ['Idioma',        data.language    || null],
            ['Descripción',   data.description || null],
        ].filter(r => r[1]);

        rows.forEach(row => {
            y = checkPage(doc, y, 6, margin, pageH);
            setFont(doc, C.gray);
            doc.setFont('helvetica', 'bold');
            setFontSize(doc, 8);
            doc.text(`${row[0]}:`, margin, y);
            setFont(doc, C.dark);
            doc.setFont('helvetica', 'normal');
            const lines = doc.splitTextToSize(String(row[1]), pageW - margin * 2 - 42);
            doc.text(lines[0], margin + 42, y);
            y += 5.5;
            lines.slice(1).forEach(l => {
                y = checkPage(doc, y, 5, margin, pageH);
                doc.text(l, margin + 42, y);
                y += 5;
            });
        });

        return y + 5;
    }

    // ─── SECCIÓN: Horario ──────────────────────────────────────────────────────
    function buildScheduleSection(doc, schedule, y, margin, pageW, pageH) {
        if (!schedule || (!schedule.online?.start && !schedule.presential?.start)) return y;
        y = checkPage(doc, y, 30, margin, pageH);
        y = sectionTitle(doc, '2. Horario de la Formación', y, margin, pageW);

        const modes = [];
        if (schedule.online?.start)     modes.push({ label: 'Online / Teletrabajo', data: schedule.online });
        if (schedule.presential?.start) modes.push({ label: 'Presencial',            data: schedule.presential });

        const fields = [
            { key: 'entry',  label: 'Entrada'  },
            { key: 'start',  label: 'Inicio'   },
            { key: 'break',  label: 'Descanso' },
            { key: 'lunch',  label: 'Comida'   },
            { key: 'finish', label: 'Fin'      },
        ];

        modes.forEach(m => {
            y = checkPage(doc, y, 6, margin, pageH);
            setFont(doc, C.dark);
            doc.setFont('helvetica', 'bold');
            setFontSize(doc, 8);
            doc.text(m.label, margin, y);
            y += 5.5;
            fields.forEach(f => {
                if (!m.data[f.key]) return;
                y = checkPage(doc, y, 5, margin, pageH);
                setFont(doc, C.gray);
                doc.setFont('helvetica', 'bold');
                setFontSize(doc, 7.5);
                doc.text(`${f.label}:`, margin + 4, y);
                setFont(doc, C.dark);
                doc.setFont('helvetica', 'normal');
                doc.text(m.data[f.key], margin + 28, y);
                y += 5;
            });
            y += 2;
        });

        if (schedule.notes) {
            y += 1;
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

        competences.forEach((comp, i) => {
            y = checkPage(doc, y, 12, margin, pageH);

            // Nombre
            setFont(doc, C.dark);
            doc.setFont('helvetica', 'bold');
            setFontSize(doc, 8.5);
            const nameLines = doc.splitTextToSize(comp.name || '—', pageW - margin * 2);
            doc.text(nameLines, margin, y);
            y += nameLines.length * 5 + 1;

            // Descripción
            if (comp.description) {
                y = checkPage(doc, y, 5, margin, pageH);
                setFont(doc, C.dark);
                doc.setFont('helvetica', 'normal');
                setFontSize(doc, 7.5);
                const descLines = doc.splitTextToSize(comp.description, pageW - margin * 2 - 4);
                descLines.forEach(l => {
                    y = checkPage(doc, y, 5, margin, pageH);
                    doc.text(l, margin + 4, y);
                    y += 4.5;
                });
            }

            // Herramientas
            const tools = comp.selectedTools || comp.allTools || [];
            if (tools.length) {
                y = checkPage(doc, y, 5, margin, pageH);
                setFont(doc, C.gray);
                doc.setFont('helvetica', 'bold');
                setFontSize(doc, 7);
                doc.text('Herramientas:', margin + 4, y);
                setFont(doc, C.dark);
                doc.setFont('helvetica', 'normal');
                const toolNames = tools.map(t => typeof t === 'string' ? t : (t.name || t)).join(' · ');
                const tLines = doc.splitTextToSize(toolNames, pageW - margin * 2 - 40);
                doc.text(tLines[0], margin + 34, y);
                y += 4.5;
                tLines.slice(1).forEach(l => {
                    y = checkPage(doc, y, 4.5, margin, pageH);
                    doc.text(l, margin + 34, y);
                    y += 4.5;
                });
            }

            // Indicadores por nivel
            const indicators = comp.competenceIndicators || {};
            const levels = [
                { key: 'initial', label: 'Inicial' },
                { key: 'medio',   label: 'Medio'   },
                { key: 'advance', label: 'Avanzado' },
            ];
            levels.forEach(lv => {
                const inds = indicators[lv.key] || [];
                if (!inds.length) return;
                y = checkPage(doc, y, 5, margin, pageH);
                setFont(doc, C.gray);
                doc.setFont('helvetica', 'bold');
                setFontSize(doc, 7);
                doc.text(`Nivel ${lv.label}:`, margin + 4, y);
                const indStr = inds.map(ind => typeof ind === 'string' ? ind : (ind.name || ind.description || ind)).join(' / ');
                const iLines = doc.splitTextToSize(indStr, pageW - margin * 2 - 38);
                setFont(doc, C.dark);
                doc.setFont('helvetica', 'normal');
                doc.text(iLines[0], margin + 34, y);
                y += 4.5;
                iLines.slice(1).forEach(il => {
                    y = checkPage(doc, y, 4.5, margin, pageH);
                    doc.text(il, margin + 34, y);
                    y += 4.5;
                });
            });

            y += 2;
            hLine(doc, y, margin, pageW - margin, C.lightGray, 0.2);
            y += 3;
        });

        return y + 4;
    }

    // ─── SECCIÓN: Diagrama Gantt — DESACTIVADO ────────────────────────────────
    function buildGanttSection(doc, promotion, y, margin, pageW, pageH, sectionNum) {
        // Gantt removed per design guidelines — modules section shows week info
        return y;
    }

    // ─── SECCIÓN: Módulos ─────────────────────────────────────────────────────
    function buildModulesSection(doc, modules, y, margin, pageW, pageH, sectionNum) {
        if (!modules || !modules.length) return y;
        y = checkPage(doc, y, 20, margin, pageH);
        y = sectionTitle(doc, `${sectionNum}. Módulos y Contenido`, y, margin, pageW);

        modules.forEach((mod, i) => {
            y = checkPage(doc, y, 12, margin, pageH);

            // Nombre del módulo + duración en semanas
            setFont(doc, C.dark);
            doc.setFont('helvetica', 'bold');
            setFontSize(doc, 9);
            const dur = mod.duration ? ` — ${mod.duration} semana${mod.duration == 1 ? '' : 's'}` : '';
            const modTitle = `Módulo ${i + 1}: ${mod.name}${dur}`;
            const titleLines = doc.splitTextToSize(modTitle, pageW - margin * 2);
            doc.text(titleLines, margin, y);
            y += titleLines.length * 5.5 + 1;

            // Proyectos
            const projects = mod.projects || [];
            if (projects.length) {
                y = checkPage(doc, y, 5, margin, pageH);
                setFont(doc, C.gray);
                doc.setFont('helvetica', 'bold');
                setFontSize(doc, 7.5);
                doc.text('Proyectos:', margin + 4, y);
                y += 4.5;
                projects.forEach(p => {
                    y = checkPage(doc, y, 5, margin, pageH);
                    const pName = typeof p === 'string' ? p : (p.name || 'Proyecto');
                    const pWeeks = typeof p === 'object' && p.weeks ? ` (${p.weeks} sem.)` : '';
                    const pDesc  = typeof p === 'object' && p.description ? ` — ${p.description}` : '';
                    setFont(doc, C.dark);
                    doc.setFont('helvetica', 'normal');
                    setFontSize(doc, 7.5);
                    const pLine = doc.splitTextToSize(`• ${pName}${pWeeks}${pDesc}`, pageW - margin * 2 - 8);
                    pLine.forEach(l => {
                        y = checkPage(doc, y, 5, margin, pageH);
                        doc.text(l, margin + 8, y);
                        y += 4.5;
                    });
                });
                y += 1;
            }

            // Cursos
            const courses = mod.courses || [];
            if (courses.length) {
                y = checkPage(doc, y, 5, margin, pageH);
                setFont(doc, C.gray);
                doc.setFont('helvetica', 'bold');
                setFontSize(doc, 7.5);
                doc.text('Cursos:', margin + 4, y);
                y += 4.5;
                courses.forEach(c => {
                    y = checkPage(doc, y, 5, margin, pageH);
                    const cName  = typeof c === 'string' ? c : (c.name || 'Curso');
                    const cWeeks = typeof c === 'object' && c.weeks ? ` (${c.weeks} sem.)` : '';
                    setFont(doc, C.dark);
                    doc.setFont('helvetica', 'normal');
                    setFontSize(doc, 7.5);
                    doc.text(`• ${cName}${cWeeks}`, margin + 8, y);
                    y += 4.5;
                });
                y += 1;
            }

            y += 2;
            hLine(doc, y, margin, pageW - margin, C.lightGray);
            y += 4;
        });

        return y;
    }

    // ─── Helper: strip HTML tags → plain text (for jsPDF rendering) ─────────
    function _htmlToPlainText(html) {
        if (!html) return '';
        // Convert block elements to newlines before stripping tags
        return html
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n')
            .replace(/<\/li>/gi, '\n')
            .replace(/<li[^>]*>/gi, '• ')
            .replace(/<[^>]+>/g, '')
            .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    // ─── SECCIÓN: Metodología de Evaluación ───────────────────────────────────
    function buildEvaluationSection(doc, evaluation, y, margin, pageW, pageH, sectionNum) {
        if (!evaluation) return y;
        // Strip HTML if stored as rich text
        const evalText = /<[a-z]/i.test(evaluation) ? _htmlToPlainText(evaluation) : evaluation;
        y = checkPage(doc, y, 20, margin, pageH);
        y = sectionTitle(doc, `${sectionNum}. Metodología de Evaluación`, y, margin, pageW);

        setFont(doc, C.dark);
        doc.setFont('helvetica', 'normal');
        setFontSize(doc, 7.5);

        const lines = doc.splitTextToSize(evalText, pageW - margin * 2 - 4);
        lines.forEach(line => {
            y = checkPage(doc, y, 5, margin, pageH);
            // Detección de líneas que son "títulos" (texto sin bullet pero corto)
            const isBullet = line.trim().startsWith('•');
            const isTitle = !isBullet && line.trim().length > 0 && line.trim().length < 60 && !line.includes(' ');
            if (isBullet) {
                setFont(doc, C.dark);
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

        // ── Try to load logo as base64 for jsPDF ──
        const logoSrc = (window.APP_CONFIG?.BASE_URL || window.location.origin) + '/img/f5-logo-naranja.webp';
        const _withLogo = (cb) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const cvs = document.createElement('canvas');
                cvs.width = img.naturalWidth; cvs.height = img.naturalHeight;
                cvs.getContext('2d').drawImage(img, 0, 0);
                cb(cvs.toDataURL('image/png'));
            };
            img.onerror = () => cb(null);
            img.src = logoSrc;
        };

        _withLogo((logoDataUrl) => {
            // ── Página 1: directamente la información (sin portada) ──────────
            pageHeader(doc, title, pageW, logoDataUrl);
            let y = 16;

            // 1. Info general
            y = buildInfoSection(doc, infoData, y, margin, pageW, pageH);

            // 2. Horario
            pageHeader(doc, title, pageW, logoDataUrl);
            y = buildScheduleSection(doc, schedule, y, margin, pageW, pageH);

            // 3. Competencias
            if (competences && competences.length) {
                pageHeader(doc, title, pageW, logoDataUrl);
                y = buildCompetencesSection(doc, competences, y, margin, pageW, pageH);
            }

            // 4. Gantt
            let sectionCounter = competences && competences.length ? 4 : 3;
            if (modules && modules.length && weeks) {
                pageHeader(doc, title, pageW, logoDataUrl);
                y = buildGanttSection(doc, { modules, weeks }, y, margin, pageW, pageH, sectionCounter);
                sectionCounter++;
            }

            // 5. Módulos
            if (modules && modules.length) {
                pageHeader(doc, title, pageW, logoDataUrl);
                y = buildModulesSection(doc, modules, y, margin, pageW, pageH, sectionCounter);
                sectionCounter++;
            }

            const safeTitle = title.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 40);
            doc.save(`syllabus_${safeTitle}.pdf`);
        });
    }

    // ─── BUILDER WORD (.doc editable) ────────────────────────────────────────
    function _toDoc(title, info, schedule, competences, modules, evaluation, weeks) {
        const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        const computedHours = info.totalHours || info.hours || calcHours(schedule, weeks) || null;

        let body = `<h1 style="color:#000;font-family:Arial;margin-bottom:4px">${esc(title)}</h1>`;
        body += `<hr style="border:1px solid #ccc;margin-bottom:16px"/>`;

        // 1. Info general — plain key-value lines
        body += `<h2 style="color:#000;font-family:Arial">1. Información General</h2>`;
        [
            ['Nombre',        info.name],
            ['Tipo',          info.type],
            ['Modalidad',     info.modality],
            ['Horas totales', computedHours ? `${computedHours} h` : null],
            ['Duración',      info.weeks    ? `${info.weeks} semanas` : null],
            ['Idioma',        info.language],
            ['Descripción',   info.description],
        ].filter(r => r[1]).forEach(r => {
            body += `<p style="font-family:Arial;font-size:10pt;margin:3px 0"><b>${esc(r[0])}:</b> ${esc(r[1])}</p>`;
        });

        // 2. Horario
        if (schedule && (schedule.online?.start || schedule.presential?.start)) {
            const modes = [];
            if (schedule.online?.start)     modes.push({ label: 'Online / Teletrabajo', d: schedule.online });
            if (schedule.presential?.start) modes.push({ label: 'Presencial',           d: schedule.presential });
            body += `<h2 style="color:#000;font-family:Arial">2. Horario de la Formación</h2>`;
            modes.forEach(m => {
                body += `<p style="font-family:Arial;font-weight:bold;margin:6px 0 2px">${esc(m.label)}</p>`;
                [['entry','Entrada'],['start','Inicio'],['break','Descanso'],['lunch','Comida'],['finish','Fin']].forEach(([k, lbl]) => {
                    if (!m.d[k]) return;
                    body += `<p style="font-family:Arial;font-size:10pt;margin:2px 0 2px 12px"><b>${lbl}:</b> ${esc(m.d[k])}</p>`;
                });
            });
            if (schedule.notes) body += `<p style="font-family:Arial;font-size:9pt;color:#666;font-style:italic;margin-top:4px">${esc(schedule.notes)}</p>`;
        }

        // 3. Competencias
        let sN = 3;
        if (competences && competences.length) {
            body += `<h2 style="color:#000;font-family:Arial">${sN}. Competencias</h2>`;
            competences.forEach(comp => {
                const tools = (comp.selectedTools || comp.allTools || [])
                    .map(t => typeof t === 'string' ? t : (t.name || t)).filter(Boolean);
                body += `<p style="font-family:Arial;font-size:10pt;font-weight:bold;margin:8px 0 2px">${esc(comp.name)}</p>`;
                if (comp.description) body += `<p style="font-family:Arial;font-size:10pt;margin:2px 0 2px 12px">${esc(comp.description)}</p>`;
                if (tools.length) body += `<p style="font-family:Arial;font-size:9pt;color:#555;margin:2px 0 2px 12px"><b>Herramientas:</b> ${esc(tools.join(' · '))}</p>`;
                body += `<hr style="border:0;border-top:1px solid #ddd;margin:6px 0"/>`;
            });
            sN++;
        }

        // 4. Módulos (sin Gantt)
        if (modules && modules.length) {
            body += `<h2 style="color:#000;font-family:Arial">${sN}. Módulos y Contenido</h2>`;
            modules.forEach((mod, i) => {
                const dur = mod.duration ? ` — ${mod.duration} semana${mod.duration == 1 ? '' : 's'}` : '';
                body += `<h3 style="font-family:Arial;color:#000;margin:12px 0 4px">Módulo ${i + 1}: ${esc(mod.name)}<span style="font-weight:normal;color:#666">${esc(dur)}</span></h3>`;
                if (mod.projects?.length) {
                    body += `<p style="font-family:Arial;font-size:10pt;margin:4px 0 2px"><b>Proyectos:</b></p><ul style="font-family:Arial;font-size:10pt;margin:2px 0">`;
                    mod.projects.forEach(p => {
                        const n = typeof p === 'string' ? p : (p.name || '');
                        const w = typeof p === 'object' && p.weeks ? ` (${p.weeks} sem.)` : '';
                        const d = typeof p === 'object' && p.description ? ` — ${p.description}` : '';
                        body += `<li>${esc(n + w + d)}</li>`;
                    });
                    body += `</ul>`;
                }
                if (mod.courses?.length) {
                    body += `<p style="font-family:Arial;font-size:10pt;margin:4px 0 2px"><b>Cursos:</b></p><ul style="font-family:Arial;font-size:10pt;margin:2px 0">`;
                    mod.courses.forEach(c => {
                        const n = typeof c === 'string' ? c : (c.name || '');
                        const w = typeof c === 'object' && c.weeks ? ` (${c.weeks} sem.)` : '';
                        body += `<li>${esc(n + w)}</li>`;
                    });
                    body += `</ul>`;
                }
            });
            sN++;
        }

        // 5. Evaluación
        if (evaluation) {
            body += `<h2 style="color:#000;font-family:Arial">${sN}. Evaluación</h2>`;
            const evalHasHtml = /<[a-z]/i.test(evaluation);
            if (evalHasHtml) {
                body += `<div style="font-family:Arial;">${evaluation}</div>`;
            } else {
                body += `<p style="font-family:Arial;white-space:pre-wrap">${esc(evaluation)}</p>`;
            }
        }

        const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word"
xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8">
<style>
  body  { font-family:Arial,sans-serif; font-size:11pt; margin:2cm; }
  h1    { font-size:20pt; color:#000; }
  h2    { font-size:14pt; color:#000; margin-top:18pt; }
  h3    { font-size:12pt; }
</style>
</head><body>${body}</body></html>`;

        const blob = new Blob(['\ufeff' + html], { type: 'application/msword;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `syllabus_${title.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 40)}.doc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
    }

    // ─── MODAL para elegir formato ────────────────────────────────────────────
    function _showModal(pdfArgs, docArgs) {
        document.getElementById('__sylModal')?.remove();
        const el = document.createElement('div');
        el.id = '__sylModal';
        el.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.55);z-index:999999;display:flex;align-items:center;justify-content:center';
        el.innerHTML = `
          <div style="background:#fff;border-radius:16px;padding:36px 32px 28px;width:380px;max-width:95vw;text-align:center;font-family:Arial,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
            <div style="width:56px;height:56px;background:#FF4700;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:900">F5</div>
            <h3 style="margin:0 0 8px;font-size:20px;color:#1c1c1c">Descargar Syllabus</h3>
            <p style="margin:0 0 24px;color:#666;font-size:14px">Elige el formato</p>
            <div style="display:flex;gap:14px">
              <button id="__sylPDF" style="flex:1;padding:16px 8px;background:#FF4700;color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:14px;font-weight:700;display:flex;flex-direction:column;align-items:center;gap:6px">
                <span style="font-size:28px">📄</span><span>PDF</span>
                <small style="font-weight:400;opacity:.85">Listo para imprimir</small>
              </button>
              <button id="__sylDOC" style="flex:1;padding:16px 8px;background:#fff;color:#FF4700;border:2px solid #FF4700;border-radius:10px;cursor:pointer;font-size:14px;font-weight:700;display:flex;flex-direction:column;align-items:center;gap:6px">
                <span style="font-size:28px">📝</span><span>Word / Google</span>
                <small style="font-weight:400;color:#888">Editable (.doc)</small>
              </button>
            </div>
            <button id="__sylCancel" style="margin-top:16px;background:none;border:none;color:#aaa;font-size:13px;cursor:pointer;text-decoration:underline">Cancelar</button>
          </div>`;
        document.body.appendChild(el);
        const close = () => el.remove();
        el.addEventListener('click', e => { if (e.target === el) close(); });
        document.getElementById('__sylCancel').addEventListener('click', close);
        document.getElementById('__sylPDF').addEventListener('click', () => { close(); build(...pdfArgs); });
        document.getElementById('__sylDOC').addEventListener('click', () => { close(); _toDoc(...docArgs); });
    }

    // ─── API PÚBLICA ───────────────────────────────────────────────────────────
    function fromPromotion(promotion, extendedInfo) {
        const ext  = extendedInfo || {};
        const info = {
            name:        promotion.name,
            type:        promotion.type,
            modality:    ext.modality    || promotion.modality,
            totalHours:  ext.totalHours,
            weeks:       promotion.weeks,
            language:    promotion.language,
            description: promotion.description,
        };
        const schedule    = ext.schedule    || {};
        const competences = ext.competences || [];
        const modules     = promotion.modules || [];
        const evaluation  = ext.evaluation  || '';
        const weeks       = promotion.weeks  || 0;
        const subtitle    = `${promotion.type || 'Bootcamp'}`;

        _showModal(
            [promotion.name, subtitle, info, schedule, competences, modules, evaluation, weeks],
            [promotion.name, info, schedule, competences, modules, evaluation, weeks]
        );
    }

    function fromTemplate(template) {
        const info = {
            name:        template.name,
            type:        template.type     || 'Bootcamp',
            modality:    template.modality || '—',
            totalHours:  template.hours    || template.totalHours,
            weeks:       template.weeks,
            language:    template.language || '—',
            description: template.description,
        };
        const subtitle    = `Plantilla · ${template.type || 'Bootcamp'}`;
        const schedule    = template.schedule    || {};
        const competences = template.competences || [];
        const modules     = template.modules     || [];
        const evaluation  = template.evaluation  || '';
        const weeks       = template.weeks       || 0;

        _showModal(
            [template.name, subtitle, info, schedule, competences, modules, evaluation, weeks],
            [template.name, info, schedule, competences, modules, evaluation, weeks]
        );
    }

    return { fromPromotion, fromTemplate };
})();

window.SyllabusPDF = SyllabusPDF;