/**
 * syllabus-pdf.js  — v2
 * Genera un Syllabus en PDF (jsPDF) o DOCX (docx.js vía CDN UMD).
 *
 * Mejoras v2:
 *   - Sin fechas (inicio/fin) — solo horas de formación
 *   - Logo naranja de Factoría F5 en encabezado de cada página
 *   - Diagrama Gantt en página landscape propia, a pantalla completa
 *   - Selección de formato: PDF o Word (.docx editable)
 *   - Sin solapamientos entre líneas (rowH ampliado)
 *   - Portada solo con nombre de formación, sin fechas
 *
 * Uso público:
 *   SyllabusPDF.fromPromotion(promotion, extendedInfo)
 *   SyllabusPDF.fromTemplate(template)
 */

const SyllabusPDF = (() => {

    // ─── Paleta de colores ─────────────────────────────────────────────────────
    const C = {
        orange:      [255,  71,   0],
        orangeLight: [255, 210, 185],
        orangePale:  [255, 240, 232],
        dark:        [ 28,  28,  28],
        gray:        [ 95,  95,  95],
        lightGray:   [242, 242, 242],
        white:       [255, 255, 255],
        ganttBar:    [255, 160, 100],
        ganttHead:   [200,  55,   0],
        tableHead:   [ 50,  50,  50],
    };

    // ─── Logos ─────────────────────────────────────────────────────────────────
    // Logo naranja (para encabezados sobre fondo blanco)
    let _logoOrangeURL = null;
    // Logo blanco (para portada sobre fondo naranja) — generado desde SVG inline
    let _logoWhiteURL  = null;

    /** Convierte una URL de imagen (webp/png/svg) a PNG DataURL via canvas */
    async function imgToDataURL(src) {
        try {
            const resp = await fetch(src);
            if (!resp.ok) throw new Error('not found');
            const blob = await resp.blob();
            const blobURL = URL.createObjectURL(blob);
            const img = new Image();
            await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = blobURL; });
            // Usar dimensiones naturales para preservar el aspect ratio
            const w = img.naturalWidth  || 729;
            const h = img.naturalHeight || 310;
            const canvas = document.createElement('canvas');
            canvas.width  = w;
            canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0);
            const dataURL = canvas.toDataURL('image/png');
            URL.revokeObjectURL(blobURL);
            return dataURL;
        } catch (e) {
            console.warn('[SyllabusPDF] Logo no cargado:', src, e.message);
            return null;
        }
    }

    /** Logo blanco desde el SVG embebido (sin petición de red) */
    async function buildWhiteLogoURL() {
        // SVG de logo-factoria-b.svg (fill blanco, viewBox 728.75×309.67)
        const svgSrc = '/img/logo-factoria-b.svg';
        const url = await imgToDataURL(svgSrc);
        if (url) return url;
        // Fallback: generar SVG inline con texto
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 729 310" width="729" height="310"><text x="20" y="220" font-family="Arial" font-size="180" font-weight="bold" fill="white">F5</text></svg>`;
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const blobURL = URL.createObjectURL(blob);
        const result = await imgToDataURL(blobURL).catch(() => null);
        URL.revokeObjectURL(blobURL);
        return result;
    }

    async function getLogoOrangeURL() {
        if (_logoOrangeURL) return _logoOrangeURL;
        _logoOrangeURL = await imgToDataURL('/img/f5-logo-naranja.webp');
        return _logoOrangeURL;
    }

    async function getLogoWhiteURL() {
        if (_logoWhiteURL) return _logoWhiteURL;
        _logoWhiteURL = await buildWhiteLogoURL();
        return _logoWhiteURL;
    }

    // ─── Helpers PDF ───────────────────────────────────────────────────────────
    const setFill = (doc, c) => doc.setFillColor(...c);
    const setDraw = (doc, c) => doc.setDrawColor(...c);
    const setFont = (doc, c) => doc.setTextColor(...c);
    const setSize = (doc, s) => doc.setFontSize(s);

    function hLine(doc, y, x1, x2, color = C.lightGray, lw = 0.3) {
        doc.setLineWidth(lw);
        setDraw(doc, color);
        doc.line(x1, y, x2, y);
    }

    /** Calcula horas de formación a partir del schedule y semanas */
    function calcHours(schedule, weeks) {
        if (!schedule || !weeks) return null;
        const s = schedule.online || schedule.presential;
        if (!s || !s.start || !s.finish) return null;
        const [sh, sm] = s.start.split(':').map(Number);
        const [fh, fm] = s.finish.split(':').map(Number);
        const dailyMin = (fh * 60 + fm) - (sh * 60 + sm);
        if (dailyMin <= 0) return null;
        return Math.round((dailyMin / 60) * 5 * weeks);
    }

    /** Guarda espacio; si no cabe, nueva página con header y devuelve nuevo Y */
    function guard(doc, y, needed, margin, pageH, headerFn) {
        if (y + needed > pageH - margin - 8) {
            doc.addPage();
            if (headerFn) headerFn(doc);
            return margin + (headerFn ? 14 : 4);
        }
        return y;
    }

    /** Título de sección con fondo naranja redondeado */
    function sectionTitle(doc, text, y, margin, pageW) {
        setFill(doc, C.orange);
        doc.roundedRect(margin, y, pageW - margin * 2, 7.5, 1.5, 1.5, 'F');
        setFont(doc, C.white);
        doc.setFont('helvetica', 'bold');
        setSize(doc, 9);
        doc.text(text.toUpperCase(), margin + 3.5, y + 5.2);
        doc.setFont('helvetica', 'normal');
        return y + 11;
    }

    // ─── HEADER con logo real en cada página — fondo BLANCO ──────────────────
    function buildPageHeader(doc, title, logoURL, pageW) {
        // Fondo blanco
        setFill(doc, C.white);
        doc.rect(0, 0, pageW, 13, 'F');
        // Logo naranja a la izquierda (ratio 728/310 ≈ 2.35:1 → 28×12mm)
        if (logoURL) {
            try { doc.addImage(logoURL, 'PNG', 3, 0.5, 28, 12); } catch (_) {}
        }
        // Título a la derecha en gris oscuro
        setFont(doc, C.dark);
        doc.setFont('helvetica', 'bold');
        setSize(doc, 7.5);
        doc.text(title, pageW - 5, 8.5, { align: 'right', maxWidth: pageW - 38 });
        doc.setFont('helvetica', 'normal');
        // Línea naranja al pie del header
        setFill(doc, C.orange);
        doc.rect(0, 12, pageW, 1, 'F');
    }

    /** Footer numerado — se aplica a todas las páginas excepto portada */
    function addFooters(doc, pageW, pageH) {
        const total = doc.getNumberOfPages();
        for (let i = 2; i <= total; i++) {
            doc.setPage(i);
            setFill(doc, C.orange);
            doc.rect(0, pageH - 6, pageW, 6, 'F');
            setFont(doc, C.white);
            setSize(doc, 6);
            doc.setFont('helvetica', 'normal');
            doc.text(`${i} / ${total}`, pageW - 5, pageH - 1.5, { align: 'right' });
        }
    }

    // ─── PORTADA ───────────────────────────────────────────────────────────────
    function buildCover(doc, title, hoursLabel, logoURL, pageW, pageH) {
        // Franja superior
        setFill(doc, C.orange);
        doc.rect(0, 0, pageW, 40, 'F');

        // Logo blanco centrado en la franja naranja (ratio 728/310 ≈ 2.35:1)
        if (logoURL) {
            // 42mm ancho → 42/2.35 ≈ 18mm alto
            try { doc.addImage(logoURL, 'PNG', pageW / 2 - 21, 8, 42, 18); } catch (_) {}
        }

        // "SYLLABUS"
        setFont(doc, C.white);
        doc.setFont('helvetica', 'bold');
        setSize(doc, 26);
        doc.text('SYLLABUS', pageW / 2, 35, { align: 'center' });

        // Recuadro con nombre de formación
        const bx = 18, by = 52, bw = pageW - 36, bh = 54;
        setFill(doc, C.lightGray);
        doc.roundedRect(bx, by, bw, bh, 3, 3, 'F');
        setFill(doc, C.orange);
        doc.roundedRect(bx, by, 3, bh, 1.5, 1.5, 'F');

        setFont(doc, C.orange);
        doc.setFont('helvetica', 'bold');
        setSize(doc, 16);
        const titleLines = doc.splitTextToSize(title, bw - 16);
        doc.text(titleLines, pageW / 2, by + 18, { align: 'center' });

        if (hoursLabel) {
            setFont(doc, C.gray);
            doc.setFont('helvetica', 'normal');
            setSize(doc, 9.5);
            doc.text(hoursLabel, pageW / 2, by + bh - 10, { align: 'center' });
        }

        // Franja inferior
        setFill(doc, C.orange);
        doc.rect(0, pageH - 8, pageW, 8, 'F');
        setFont(doc, C.white);
        setSize(doc, 7);
        doc.text('Factoría F5 · Bootcamp Manager', pageW / 2, pageH - 2.5, { align: 'center' });
    }

    // ─── SECCIÓN: Información General ─────────────────────────────────────────
    function buildInfoSection(doc, data, y, margin, pageW, pageH, headerFn) {
        y = guard(doc, y, 30, margin, pageH, headerFn);
        y = sectionTitle(doc, '1. Información General', y, margin, pageW);

        const rows = [
            ['Nombre de la formación', data.name        || ''],
            ['Tipo',                   data.type        || ''],
            ['Modalidad',              data.modality    || ''],
            ['Horas totales',          data.totalHours  ? `${data.totalHours} h` : (data.hours ? `${data.hours} h` : '')],
            ['Nº de semanas',          data.weeks       ? `${data.weeks} semanas` : ''],
            ['Idioma',                 data.language    || ''],
            ['Descripción',            data.description || ''],
        ].filter(r => r[1]);

        const totalW = pageW - margin * 2;
        const col0   = totalW * 0.34;
        const col1   = totalW * 0.66;
        const ROW_H  = 7.5;

        rows.forEach((row, i) => {
            const valLines = doc.splitTextToSize(String(row[1]), col1 - 5);
            const rowH = Math.max(ROW_H, valLines.length * 4.8 + 3);
            y = guard(doc, y, rowH + 1, margin, pageH, headerFn);

            setFill(doc, i % 2 === 0 ? C.lightGray : C.white);
            doc.rect(margin, y, totalW, rowH, 'F');

            setFont(doc, C.gray);
            doc.setFont('helvetica', 'bold');
            setSize(doc, 7.5);
            doc.text(row[0], margin + 2.5, y + rowH / 2 + 1.5);

            setFont(doc, C.dark);
            doc.setFont('helvetica', 'normal');
            setSize(doc, 7.5);
            doc.text(valLines, margin + col0 + 2.5, y + 5);

            y += rowH;
        });

        return y + 6;
    }

    // ─── SECCIÓN: Horario ──────────────────────────────────────────────────────
    function buildScheduleSection(doc, schedule, y, margin, pageW, pageH, headerFn) {
        if (!schedule) return y;
        const modes = [];
        if (schedule.online?.start)     modes.push({ label: 'Online / Teletrabajo', d: schedule.online });
        if (schedule.presential?.start) modes.push({ label: 'Presencial',           d: schedule.presential });
        if (!modes.length) return y;

        y = guard(doc, y, 40, margin, pageH, headerFn);
        y = sectionTitle(doc, '2. Horario de la Formación', y, margin, pageW);

        const totalW = pageW - margin * 2;
        const colW   = totalW / modes.length;
        const fields = [
            { key: 'entry',  label: 'Entrada'      },
            { key: 'start',  label: 'Inicio clase' },
            { key: 'break',  label: 'Descanso'     },
            { key: 'lunch',  label: 'Comida'       },
            { key: 'finish', label: 'Fin'          },
        ];
        const ROW_H = 7;

        // Cabeceras de modalidad
        modes.forEach((m, mi) => {
            const xOff = margin + mi * colW;
            setFill(doc, C.orange);
            doc.roundedRect(xOff, y, colW - 1, ROW_H, 1, 1, 'F');
            setFont(doc, C.white);
            doc.setFont('helvetica', 'bold');
            setSize(doc, 8);
            doc.text(m.label, xOff + colW / 2, y + 5, { align: 'center' });
        });
        y += ROW_H + 1;

        fields.forEach((f, fi) => {
            const bg = fi % 2 === 0 ? C.lightGray : C.white;
            modes.forEach((m, mi) => {
                const xOff = margin + mi * colW;
                setFill(doc, bg);
                doc.rect(xOff, y, colW - 1, ROW_H, 'F');
                setFont(doc, C.gray);
                doc.setFont('helvetica', 'bold');
                setSize(doc, 7);
                doc.text(f.label + ':', xOff + 3, y + ROW_H * 0.65);
                setFont(doc, C.dark);
                doc.setFont('helvetica', 'normal');
                doc.text(m.d[f.key] || '—', xOff + 32, y + ROW_H * 0.65);
            });
            y += ROW_H;
        });

        if (schedule.notes) {
            y += 3;
            const noteLines = doc.splitTextToSize(`Notas: ${schedule.notes}`, totalW);
            noteLines.forEach(line => {
                y = guard(doc, y, 5.5, margin, pageH, headerFn);
                setFont(doc, C.gray); setSize(doc, 7); doc.setFont('helvetica', 'italic');
                doc.text(line, margin + 1, y); y += 5;
            });
        }

        return y + 6;
    }

    // ─── SECCIÓN: Competencias ─────────────────────────────────────────────────
    function buildCompetencesSection(doc, competences, y, margin, pageW, pageH, headerFn) {
        if (!competences?.length) return y;
        y = guard(doc, y, 20, margin, pageH, headerFn);
        y = sectionTitle(doc, '3. Competencias y Herramientas', y, margin, pageW);

        const totalW = pageW - margin * 2;

        competences.forEach((comp, ci) => {
            const descLines = doc.splitTextToSize(comp.description || '', totalW - 8);
            const hdrH = Math.max(10, descLines.length * 4.8 + 12);
            y = guard(doc, y, hdrH + 4, margin, pageH, headerFn);

            setFill(doc, C.orangePale);
            doc.roundedRect(margin, y, totalW, hdrH, 1.5, 1.5, 'F');
            setFill(doc, C.orange);
            doc.roundedRect(margin, y, 3, hdrH, 1.5, 1.5, 'F');

            setFont(doc, C.orange);
            doc.setFont('helvetica', 'bold');
            setSize(doc, 9);
            doc.text(`${ci + 1}. ${comp.name || ''}`, margin + 6, y + 6.5);

            if (descLines.length) {
                setFont(doc, C.dark);
                doc.setFont('helvetica', 'normal');
                setSize(doc, 7.5);
                doc.text(descLines, margin + 6, y + 12);
            }
            y += hdrH + 2;

            // Herramientas
            const tools = (comp.selectedTools || comp.allTools || []);
            if (tools.length) {
                y = guard(doc, y, 8, margin, pageH, headerFn);
                setFill(doc, C.lightGray);
                doc.rect(margin + 4, y, totalW - 4, 7.5, 'F');
                setFont(doc, C.orange);
                doc.setFont('helvetica', 'bold');
                setSize(doc, 7);
                doc.text('Herramientas:', margin + 6, y + 5);
                setFont(doc, C.dark);
                doc.setFont('helvetica', 'normal');
                const toolStr = tools.map(t => typeof t === 'string' ? t : (t.name || '')).filter(Boolean).join('  ·  ');
                const tLines = doc.splitTextToSize(toolStr, totalW - 48);
                doc.text(tLines[0], margin + 40, y + 5);
                y += 7.5;
                tLines.slice(1).forEach(tl => {
                    y = guard(doc, y, 5.5, margin, pageH, headerFn);
                    setFont(doc, C.dark); doc.setFont('helvetica', 'normal'); setSize(doc, 7);
                    doc.text(tl, margin + 6, y + 4); y += 5.5;
                });
            }

            // Indicadores por nivel
            const indicators = comp.competenceIndicators || {};
            const levels = [
                { key: 'initial', label: 'Nivel Inicial',  bg: [220, 252, 231], fg: [22, 101, 52]  },
                { key: 'medio',   label: 'Nivel Medio',    bg: [254, 249, 195], fg: [113, 63, 18]  },
                { key: 'advance', label: 'Nivel Avanzado', bg: [254, 226, 226], fg: [153, 27, 27]  },
            ];

            levels.forEach(lv => {
                const inds = indicators[lv.key] || [];
                if (!inds.length) return;
                const indStr = inds.map(ind => typeof ind === 'string' ? ind : (ind.name || ind.description || '')).filter(Boolean).join('  /  ');
                const iLines = doc.splitTextToSize(indStr, totalW - 52);
                const lvH = Math.max(8, iLines.length * 4.8 + 4);
                y = guard(doc, y, lvH + 2, margin, pageH, headerFn);

                setFill(doc, lv.bg);
                doc.rect(margin + 4, y, totalW - 4, lvH, 'F');
                setFont(doc, lv.fg);
                doc.setFont('helvetica', 'bold');
                setSize(doc, 7);
                doc.text(lv.label + ':', margin + 6, y + 5.5);
                setFont(doc, C.dark);
                doc.setFont('helvetica', 'normal');
                doc.text(iLines, margin + 46, y + 5.5);
                y += lvH + 1;
            });

            y += 4;
            hLine(doc, y, margin, pageW - margin, C.orangeLight, 0.3);
            y += 5;
        });

        return y + 3;
    }

    // ─── SECCIÓN: Diagrama Gantt — PÁGINA LANDSCAPE + detalle por módulo ────────
    function buildGanttSection(doc, modules, weeks, competences, title, logoURL, sectionNum) {
        if (!modules?.length || !weeks) return;

        // ── Página landscape para el diagrama de barras ──────────────────────
        doc.addPage('a4', 'landscape');
        const pageW = doc.internal.pageSize.getWidth();   // ~297 mm
        const pageH = doc.internal.pageSize.getHeight();  // ~210 mm
        const margin = 10;

        buildPageHeader(doc, title, logoURL, pageW);

        let y = 16;
        y = sectionTitle(doc, `${sectionNum}. Diagrama Gantt`, y, margin, pageW);

        const totalW = pageW - margin * 2;
        const labelW = 64;
        const gridW  = totalW - labelW;
        const weekW  = gridW / weeks;
        const rowH   = Math.max(6.5, Math.min(10, (pageH - y - 32) / (modules.length + 2)));

        // ── Cabecera de meses ──────────────────────────────────────────────
        setFill(doc, C.tableHead);
        doc.rect(margin, y, totalW, rowH, 'F');
        setFont(doc, C.white);
        doc.setFont('helvetica', 'bold');
        setSize(doc, 6.5);
        doc.text('Módulo', margin + 2, y + rowH * 0.68);
        for (let w = 0; w < weeks; w += 4) {
            setFont(doc, C.white); setSize(doc, 5.5);
            doc.text(`Mes ${Math.floor(w / 4) + 1}`, margin + labelW + w * weekW + 1, y + rowH * 0.68);
        }
        y += rowH;

        // ── Fila números de semana ─────────────────────────────────────────
        setFill(doc, C.orange);
        doc.rect(margin + labelW, y, gridW, rowH * 0.8, 'F');
        setFont(doc, C.white); doc.setFont('helvetica', 'normal'); setSize(doc, 4.5);
        for (let w = 0; w < weeks; w++) {
            const xW = margin + labelW + w * weekW;
            doc.text(`S${w + 1}`, xW + weekW / 2, y + rowH * 0.6, { align: 'center' });
            if (w % 4 === 0 && w > 0) {
                setDraw(doc, C.gray); doc.setLineWidth(0.2);
                doc.line(xW, y, xW, y + rowH * 0.8);
            }
        }
        const ganttContentTop = y;
        y += rowH * 0.8;

        // ── Filas de módulos con barras ───────────────────────────────────
        let weekCursor = 0;
        modules.forEach((mod, i) => {
            const bg = i % 2 === 0 ? C.lightGray : C.white;
            setFill(doc, bg);
            doc.rect(margin, y, totalW, rowH, 'F');

            setFont(doc, C.dark); doc.setFont('helvetica', 'bold'); setSize(doc, 6);
            const lbl = doc.splitTextToSize(`M${i + 1}  ${mod.name}`, labelW - 3);
            doc.text(lbl[0], margin + 2, y + rowH * 0.68);
            doc.setFont('helvetica', 'normal');

            const dur   = parseInt(mod.duration) || 0;
            const start = weekCursor;
            const end   = Math.min(start + dur, weeks);
            const barX  = margin + labelW + start * weekW;
            const barW  = (end - start) * weekW;

            if (barW > 0) {
                setFill(doc, C.ganttHead);
                doc.rect(barX + 0.5, y + rowH * 0.18 + 0.5, barW, rowH * 0.64, 'F');
                setFill(doc, C.ganttBar);
                doc.roundedRect(barX, y + rowH * 0.18, barW, rowH * 0.64, 0.8, 0.8, 'F');
                if (barW > 10) {
                    setFont(doc, C.dark); doc.setFont('helvetica', 'bold'); setSize(doc, 5);
                    doc.text(`${dur}s`, barX + barW / 2, y + rowH * 0.65, { align: 'center' });
                }
            }
            weekCursor += dur;
            for (let w = 4; w < weeks; w += 4) {
                const xW = margin + labelW + w * weekW;
                setDraw(doc, [200, 200, 200]); doc.setLineWidth(0.15);
                doc.line(xW, y, xW, y + rowH);
            }
            y += rowH;
        });

        // Borde del grid
        setDraw(doc, C.gray); doc.setLineWidth(0.3);
        doc.rect(margin, ganttContentTop, totalW, y - ganttContentTop);

        // Leyenda
        y += 5;
        setFill(doc, C.ganttBar); doc.rect(margin, y, 10, 4, 'F');
        setFont(doc, C.dark); setSize(doc, 6.5); doc.setFont('helvetica', 'normal');
        doc.text('= Duración del módulo (semanas)', margin + 13, y + 3);

        // ── Páginas de detalle por módulo (portrait) ─────────────────────────
        // Mapa de competencias por id/nombre
        const compMap = {};
        (competences || []).forEach(comp => {
            const key = comp.id || comp.name;
            if (key) compMap[key] = comp;
        });

        modules.forEach((mod, i) => {
            const projects = Array.isArray(mod.projects) ? mod.projects : [];
            const courses  = Array.isArray(mod.courses)  ? mod.courses  : [];
            if (!projects.length && !courses.length) return;

            doc.addPage('a4', 'portrait');
            const pW = doc.internal.pageSize.getWidth();
            const pH = doc.internal.pageSize.getHeight();
            const mg = 12;
            buildPageHeader(doc, title, logoURL, pW);

            let dy = 16;
            const tW = pW - mg * 2;
            const hdr = (d) => buildPageHeader(d, title, logoURL, d.internal.pageSize.getWidth());

            // Encabezado del módulo
            dy = guard(doc, dy, 14, mg, pH, hdr);
            setFill(doc, C.orange);
            doc.roundedRect(mg, dy, tW, 9, 1.5, 1.5, 'F');
            setFont(doc, C.white); doc.setFont('helvetica', 'bold'); setSize(doc, 9.5);
            const durLabel = mod.duration ? `  (${mod.duration} semanas)` : '';
            doc.text(`Módulo ${i + 1}: ${mod.name}${durLabel}`, mg + 4, dy + 6.2);
            dy += 11;

            // ── PROYECTOS ─────────────────────────────────────────────────
            if (projects.length) {
                dy = guard(doc, dy, 10, mg, pH, hdr);
                setFill(doc, [255, 245, 235]);
                doc.roundedRect(mg, dy, tW, 7.5, 1, 1, 'F');
                setFill(doc, C.orange); doc.rect(mg, dy, 2.5, 7.5, 'F');
                setFont(doc, C.orange); doc.setFont('helvetica', 'bold'); setSize(doc, 8.5);
                doc.text('PROYECTOS', mg + 5, dy + 5.2);
                dy += 9;

                projects.forEach((proj) => {
                    const pName = typeof proj === 'string' ? proj : (proj.name || 'Proyecto');
                    const pDesc = typeof proj === 'object' ? (proj.description || '') : '';
                    const projCompIds = typeof proj === 'object' ? (proj.competences || proj.competenceIds || []) : [];

                    dy = guard(doc, dy, 11, mg, pH, hdr);
                    setFill(doc, C.lightGray); doc.rect(mg, dy, tW, 8, 'F');
                    setFill(doc, C.ganttBar);   doc.rect(mg, dy, 2.5, 8, 'F');
                    setFont(doc, C.dark); doc.setFont('helvetica', 'bold'); setSize(doc, 8);
                    doc.text(`  Proyecto: ${pName}`, mg + 4, dy + 5.5);
                    dy += 8;

                    if (pDesc) {
                        const dLines = doc.splitTextToSize(pDesc, tW - 8);
                        const dH = dLines.length * 4.5 + 3;
                        dy = guard(doc, dy, dH, mg, pH, hdr);
                        setFont(doc, C.gray); doc.setFont('helvetica', 'italic'); setSize(doc, 7);
                        doc.text(dLines, mg + 5, dy + 4);
                        dy += dH;
                    }

                    // Competencias del proyecto
                    const projComps = projCompIds.length > 0
                        ? projCompIds.map(cId => compMap[cId] || Object.values(compMap).find(c => c.name === cId)).filter(Boolean)
                        : [];
                    if (projComps.length) {
                        dy = guard(doc, dy, 7, mg, pH, hdr);
                        setFont(doc, C.orange); doc.setFont('helvetica', 'bold'); setSize(doc, 7);
                        doc.text('Competencias trabajadas:', mg + 5, dy + 4);
                        dy += 6;
                        projComps.forEach(comp => {
                            const tools = (comp.selectedTools || comp.allTools || []).map(t => typeof t === 'string' ? t : (t.name || '')).filter(Boolean);
                            const toolStr = tools.length ? `   [${tools.join(' · ')}]` : '';
                            const cLine = doc.splitTextToSize(`• ${comp.name}${toolStr}`, tW - 10);
                            const cH = cLine.length * 4.5 + 2;
                            dy = guard(doc, dy, cH, mg, pH, hdr);
                            setFill(doc, [255, 245, 235]); doc.rect(mg + 4, dy, tW - 4, cH, 'F');
                            setFont(doc, C.dark); doc.setFont('helvetica', 'normal'); setSize(doc, 7);
                            doc.text(cLine, mg + 7, dy + 4.5);
                            dy += cH;
                        });
                    }
                    dy += 3;
                });
            }

            // ── CURSOS ────────────────────────────────────────────────────
            if (courses.length) {
                dy = guard(doc, dy, 10, mg, pH, hdr);
                setFill(doc, [230, 243, 255]);
                doc.roundedRect(mg, dy, tW, 7.5, 1, 1, 'F');
                setFill(doc, [30, 100, 200]); doc.rect(mg, dy, 2.5, 7.5, 'F');
                setFont(doc, [30, 100, 200]); doc.setFont('helvetica', 'bold'); setSize(doc, 8.5);
                doc.text('CURSOS', mg + 5, dy + 5.2);
                dy += 9;

                courses.forEach((course, ci) => {
                    const cName = typeof course === 'string' ? course : (course.name || 'Curso');
                    const cDesc = typeof course === 'object' ? (course.description || '') : '';
                    const rowBg = ci % 2 === 0 ? C.lightGray : C.white;
                    dy = guard(doc, dy, 8, mg, pH, hdr);
                    setFill(doc, rowBg); doc.rect(mg + 4, dy, tW - 4, 7, 'F');
                    setFill(doc, [30, 100, 200]); doc.rect(mg + 4, dy, 2, 7, 'F');
                    setFont(doc, C.dark); doc.setFont('helvetica', 'bold'); setSize(doc, 7.5);
                    doc.text(`  Curso: ${cName}`, mg + 8, dy + 4.8);
                    dy += 7;
                    if (cDesc) {
                        const dLines = doc.splitTextToSize(cDesc, tW - 12);
                        const dH = dLines.length * 4.3 + 2;
                        dy = guard(doc, dy, dH, mg, pH, hdr);
                        setFont(doc, C.gray); doc.setFont('helvetica', 'italic'); setSize(doc, 6.5);
                        doc.text(dLines, mg + 8, dy + 3.5);
                        dy += dH;
                    }
                });
            }

            // ── COMPETENCIAS GLOBALES DEL MÓDULO ─────────────────────────
            const modComps = Object.values(compMap).filter(c => {
                const refs = c.modules || c.moduleIds || [];
                return refs.includes(mod.id) || refs.includes(mod.name);
            });
            if (modComps.length) {
                dy = guard(doc, dy, 10, mg, pH, hdr);
                setFill(doc, C.lightGray);
                doc.roundedRect(mg, dy, tW, 7.5, 1, 1, 'F');
                setFont(doc, C.gray); doc.setFont('helvetica', 'bold'); setSize(doc, 8);
                doc.text('COMPETENCIAS Y HERRAMIENTAS DEL MÓDULO', mg + 4, dy + 5.2);
                dy += 9;
                modComps.forEach(comp => {
                    const tools = (comp.selectedTools || comp.allTools || []).map(t => typeof t === 'string' ? t : (t.name || '')).filter(Boolean);
                    dy = guard(doc, dy, 8, mg, pH, hdr);
                    setFill(doc, [255, 245, 235]); doc.rect(mg, dy, tW, 7, 'F');
                    setFont(doc, C.orange); doc.setFont('helvetica', 'bold'); setSize(doc, 7.5);
                    doc.text(`• ${comp.name}`, mg + 3, dy + 4.8);
                    if (tools.length) {
                        const ts = doc.splitTextToSize(tools.join('  ·  '), tW * 0.55);
                        setFont(doc, C.dark); doc.setFont('helvetica', 'normal'); setSize(doc, 7);
                        doc.text(ts[0], mg + tW * 0.42, dy + 4.8);
                    }
                    dy += 7;
                });
            }
        });
    }

    // ─── SECCIÓN: Módulos y Contenido ─────────────────────────────────────────
    function buildModulesSection(doc, modules, y, margin, pageW, pageH, headerFn, sectionNum) {
        if (!modules?.length) return y;
        y = guard(doc, y, 20, margin, pageH, headerFn);
        y = sectionTitle(doc, `${sectionNum}. Módulos y Contenido`, y, margin, pageW);

        const totalW = pageW - margin * 2;

        modules.forEach((mod, i) => {
            y = guard(doc, y, 16, margin, pageH, headerFn);

            // Cabecera de módulo
            setFill(doc, C.orange);
            doc.roundedRect(margin, y, totalW, 8.5, 1.5, 1.5, 'F');
            setFont(doc, C.white);
            doc.setFont('helvetica', 'bold');
            setSize(doc, 8.5);
            const dur = mod.duration ? `  (${mod.duration} semanas)` : '';
            doc.text(`Módulo ${i + 1}: ${mod.name}${dur}`, margin + 4, y + 5.8);
            y += 10.5;

            const projects = mod.projects || [];
            if (projects.length) {
                y = guard(doc, y, 8, margin, pageH, headerFn);
                setFont(doc, C.orange);
                doc.setFont('helvetica', 'bold');
                setSize(doc, 7.5);
                doc.text('Proyectos:', margin + 4, y + 4.5);
                y += 7;
                projects.forEach((p, pi) => {
                    const pName = typeof p === 'string' ? p : (p.name || 'Proyecto');
                    const pDesc = typeof p === 'object' && p.description ? ` — ${p.description}` : '';
                    const pLines = doc.splitTextToSize(`• ${pName}${pDesc}`, totalW - 14);
                    const pH = Math.max(7, pLines.length * 4.8 + 3);
                    y = guard(doc, y, pH, margin, pageH, headerFn);
                    setFill(doc, pi % 2 === 0 ? C.lightGray : C.white);
                    doc.rect(margin + 4, y, totalW - 4, pH, 'F');
                    setFont(doc, C.dark); doc.setFont('helvetica', 'normal'); setSize(doc, 7);
                    doc.text(pLines, margin + 6, y + 5);
                    y += pH;
                });
            }

            const courses = mod.courses || [];
            if (courses.length) {
                y = guard(doc, y, 8, margin, pageH, headerFn);
                setFont(doc, C.orange);
                doc.setFont('helvetica', 'bold');
                setSize(doc, 7.5);
                doc.text('Cursos:', margin + 4, y + 4.5);
                y += 7;
                courses.forEach((c, ci) => {
                    const cName = typeof c === 'string' ? c : (c.name || 'Curso');
                    y = guard(doc, y, 7, margin, pageH, headerFn);
                    setFill(doc, ci % 2 === 0 ? C.lightGray : C.white);
                    doc.rect(margin + 4, y, totalW - 4, 7, 'F');
                    setFont(doc, C.dark); doc.setFont('helvetica', 'normal'); setSize(doc, 7);
                    doc.text(`• ${cName}`, margin + 6, y + 4.8);
                    y += 7;
                });
            }

            y += 4;
            hLine(doc, y, margin, pageW - margin, C.orangeLight, 0.3);
            y += 5;
        });

        return y;
    }

    // ─── SECCIÓN: Metodología de Evaluación ───────────────────────────────────
    function buildEvaluationSection(doc, evaluation, y, margin, pageW, pageH, headerFn, sectionNum) {
        if (!evaluation) return y;
        y = guard(doc, y, 20, margin, pageH, headerFn);
        y = sectionTitle(doc, `${sectionNum}. Metodología de Evaluación`, y, margin, pageW);

        const lines = doc.splitTextToSize(evaluation, pageW - margin * 2 - 4);
        lines.forEach(line => {
            y = guard(doc, y, 6, margin, pageH, headerFn);
            const trimmed = line.trim();
            if (!trimmed) { y += 3; return; }
            if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
                setFont(doc, C.orange); doc.setFont('helvetica', 'bold'); setSize(doc, 7.5);
            } else if (/^[A-ZÁÉÍÓÚ].{0,50}:$/.test(trimmed)) {
                setFont(doc, C.dark); doc.setFont('helvetica', 'bold'); setSize(doc, 8);
            } else {
                setFont(doc, C.dark); doc.setFont('helvetica', 'normal'); setSize(doc, 7.5);
            }
            doc.text(line, margin + 2, y);
            y += 5.5;
        });

        return y + 5;
    }

    // ─── BUILDER PRINCIPAL — PDF ───────────────────────────────────────────────
    async function buildPDF(title, infoData, schedule, competences, modules, evaluation, weeks) {
        if (!window.jspdf) { alert('jsPDF no está cargado. Recarga la página.'); return; }

        // Logo naranja → headers blancos; logo blanco → portada naranja
        const [logoOrange, logoWhite] = await Promise.all([getLogoOrangeURL(), getLogoWhiteURL()]);
        const { jsPDF } = window.jspdf;

        const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW  = doc.internal.pageSize.getWidth();
        const pageH  = doc.internal.pageSize.getHeight();
        const margin = 12;

        const totalHours = infoData.totalHours || infoData.hours || calcHours(schedule, weeks);
        if (totalHours && !infoData.totalHours) infoData = { ...infoData, totalHours };

        const hoursLabel = totalHours ? `${totalHours} horas de formación` : null;

        // Portada: logo blanco sobre fondo naranja
        buildCover(doc, title, hoursLabel, logoWhite, pageW, pageH);

        // Función de header para páginas portrait: logo naranja sobre fondo blanco
        const headerFn = (d) => buildPageHeader(d, title, logoOrange, d.internal.pageSize.getWidth());

        // Página 2 — contenido
        doc.addPage();
        headerFn(doc);
        let y = 16;

        y = buildInfoSection(doc, infoData, y, margin, pageW, pageH, headerFn);
        y = buildScheduleSection(doc, schedule, y, margin, pageW, pageH, headerFn);

        let secN = 3;
        if (competences?.length) {
            y = buildCompetencesSection(doc, competences, y, margin, pageW, pageH, headerFn);
            secN = 4;
        }

        // Gantt en página landscape + páginas de detalle por módulo
        if (modules?.length && weeks) {
            buildGanttSection(doc, modules, weeks, competences, title, logoOrange, secN);
            secN++;

            // Volver a portrait para continuar
            doc.addPage('a4', 'portrait');
            buildPageHeader(doc, title, logoOrange, doc.internal.pageSize.getWidth());
            y = 16;
        }

        const pW = doc.internal.pageSize.getWidth();
        const pH = doc.internal.pageSize.getHeight();

        // Sección Módulos eliminada — el detalle completo ya está en las páginas del Gantt

        if (evaluation) {
            buildEvaluationSection(doc, evaluation, y, margin, pW, pH, () => buildPageHeader(doc, title, logoOrange, doc.internal.pageSize.getWidth()), secN);
        }

        addFooters(doc, pageW, pageH);

        const safe = title.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
        doc.save(`syllabus_${safe}.pdf`);
    }

    // ─── BUILDER PRINCIPAL — DOCX ──────────────────────────────────────────────
    async function buildDOCX(title, infoData, schedule, competences, modules, evaluation, weeks) {
        // Cargar docx.js UMD si no está disponible
        if (!window.docx) {
            await new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = 'https://unpkg.com/docx@8.5.0/build/index.umd.js';
                s.onload = resolve;
                s.onerror = () => reject(new Error('No se pudo cargar docx.js'));
                document.head.appendChild(s);
            });
        }

        const {
            Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
            ImageRun, Header, AlignmentType, WidthType, ShadingType,
            BorderStyle, TableLayoutType, VerticalAlign, PageBreak,
        } = window.docx;

        // ── Colores (hex para docx) ────────────────────────────────────────
        const ORANGE  = 'FF4700';
        const GRAY    = '5F5F5F';
        const LGRAY   = 'F2F2F2';
        const DARK    = '1C1C1C';
        const WHITE   = 'FFFFFF';
        const OPALE   = 'FFF0E8';  // orangePale
        const BLUEDARK = '1E64C8';
        const BLUELIGHT = 'E6F3FF';

        // ── Obtener logos como ArrayBuffer para ImageRun ──────────────────
        // Logo naranja → encabezado blanco; logo blanco → portada naranja
        const [logoOrangeURL, logoWhiteURL] = await Promise.all([getLogoOrangeURL(), getLogoWhiteURL()]);

        function dataURLtoBuffer(dataURL) {
            if (!dataURL) return null;
            try {
                const b64 = dataURL.split(',')[1];
                const bin = atob(b64);
                const arr = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
                return arr.buffer;
            } catch (e) { return null; }
        }

        // ratio 728/310 ≈ 2.35:1  →  portada: 150px ancho × 64px alto
        //                          →  header:   80px ancho × 34px alto
        const logoWhiteBuffer  = dataURLtoBuffer(logoWhiteURL);
        const logoOrangeBuffer = dataURLtoBuffer(logoOrangeURL);

        // ── Helpers ────────────────────────────────────────────────────────
        const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
        const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

        const cell = (text, bg = LGRAY, bold = false, color = DARK, sz = 18) => new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: String(text || ''), bold, color, size: sz })] })],
            shading:  { fill: bg, type: ShadingType.CLEAR },
            margins:  { top: 60, bottom: 60, left: 80, right: 80 },
        });

        const pNormal = (text, color = DARK, bold = false, size = 20, spacing = 60) =>
            new Paragraph({ children: [new TextRun({ text, color, bold, size })], spacing: { after: spacing } });

        // Párrafo de sección (equivale al sectionTitle naranja del PDF)
        const sectionHead = (text, secColor = ORANGE) => new Paragraph({
            children: [new TextRun({ text: `  ${text.toUpperCase()}  `, bold: true, size: 26, color: WHITE })],
            shading:  { fill: secColor, type: ShadingType.CLEAR },
            spacing:  { before: 400, after: 140 },
        });

        // Cabecera naranja de subsección (módulo, proyecto, curso, etc.)
        const subHead = (text, bg = ORANGE, color = WHITE, sz = 22) => new Paragraph({
            children: [new TextRun({ text, bold: true, size: sz, color })],
            shading:  { fill: bg, type: ShadingType.CLEAR },
            spacing:  { before: 200, after: 80 },
        });

        const children = [];

        const totalHours = infoData.totalHours || infoData.hours || calcHours(schedule, weeks);

        // ── PORTADA (idéntica al PDF: franja naranja + logo centrado + título) ──
        // Franja naranja superior simulada como tabla de una celda
        children.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType ? TableLayoutType.FIXED : undefined,
            rows: [new TableRow({ children: [new TableCell({
                children: [
                    // Logo blanco centrado (ratio 728/310 ≈ 2.35:1 → 150×64px)
                    ...(logoWhiteBuffer ? [new Paragraph({
                        children: [new ImageRun({ data: logoWhiteBuffer, transformation: { width: 150, height: 64 }, type: 'png' })],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 200, after: 160 },
                    })] : [new Paragraph({ text: '', spacing: { after: 40 } })]),
                    // "SYLLABUS"
                    new Paragraph({
                        children: [new TextRun({ text: 'SYLLABUS', bold: true, size: 72, color: WHITE })],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 0 },
                    }),
                ],
                shading:  { fill: ORANGE, type: ShadingType.CLEAR },
                margins:  { top: 400, bottom: 400, left: 300, right: 300 },
                borders:  noBorders,
            })]})],
            borders: { insideH: noBorder, insideV: noBorder, top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
        }));

        // Recuadro del título de la formación (equivale al recuadro gris del PDF)
        children.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [new TableRow({ children: [
                // Borde naranja izquierdo
                new TableCell({
                    children: [new Paragraph({ text: '' })],
                    shading:  { fill: ORANGE, type: ShadingType.CLEAR },
                    width:    { size: 3, type: WidthType.PERCENTAGE },
                    borders:  noBorders,
                    margins:  { top: 0, bottom: 0, left: 0, right: 0 },
                }),
                // Nombre + horas
                new TableCell({
                    children: [
                        new Paragraph({
                            children: [new TextRun({ text: title, bold: true, size: 52, color: ORANGE })],
                            spacing: { before: 200, after: 120 },
                        }),
                        ...(totalHours ? [new Paragraph({
                            children: [new TextRun({ text: `${totalHours} horas de formación`, size: 26, color: GRAY })],
                            spacing: { after: 200 },
                        })] : []),
                    ],
                    shading:  { fill: LGRAY, type: ShadingType.CLEAR },
                    width:    { size: 97, type: WidthType.PERCENTAGE },
                    borders:  noBorders,
                    margins:  { top: 200, bottom: 200, left: 300, right: 200 },
                }),
            ]})],
            borders: { insideH: noBorder, insideV: noBorder, top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
            margins: { top: 400 },
        }));

        // Salto de página tras portada
        children.push(new Paragraph({ children: [new PageBreak()], spacing: { after: 0 } }));

        // ── 1. INFORMACIÓN GENERAL ────────────────────────────────────────────
        children.push(sectionHead('1. Información General'));
        const infoRows = [
            ['Nombre de la formación', infoData.name || ''],
            ['Tipo',                   infoData.type || ''],
            ['Modalidad',              infoData.modality || ''],
            ['Horas totales',          totalHours ? `${totalHours} h` : ''],
            ['Semanas',                infoData.weeks ? `${infoData.weeks} semanas` : ''],
            ['Idioma',                 infoData.language || ''],
            ['Descripción',            infoData.description || ''],
        ].filter(r => r[1]);
        if (infoRows.length) {
            children.push(new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: infoRows.map((row, i) => new TableRow({ children: [
                    cell(row[0], i % 2 === 0 ? 'EEEEEE' : 'F8F8F8', true, ORANGE),
                    cell(row[1], i % 2 === 0 ? 'EEEEEE' : 'F8F8F8', false, DARK),
                ]})),
            }));
        }
        children.push(new Paragraph({ text: '', spacing: { after: 200 } }));

        // ── 2. HORARIO ────────────────────────────────────────────────────────
        const modes = [];
        if (schedule?.online?.start)     modes.push({ label: 'Online / Teletrabajo', d: schedule.online });
        if (schedule?.presential?.start) modes.push({ label: 'Presencial',           d: schedule.presential });
        if (modes.length) {
            children.push(sectionHead('2. Horario'));
            const fields  = ['entry','start','break','lunch','finish'];
            const fLabels = ['Entrada','Inicio clase','Descanso','Comida','Fin'];
            children.push(new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({ children: [
                        cell('', ORANGE),
                        ...modes.map(m => cell(m.label, ORANGE, true, WHITE)),
                    ]}),
                    ...fields.map((f, fi) => new TableRow({ children: [
                        cell(fLabels[fi], fi % 2 === 0 ? 'EEEEEE' : 'F8F8F8', true, GRAY),
                        ...modes.map(m => cell(m.d[f] || '—', fi % 2 === 0 ? 'EEEEEE' : 'F8F8F8')),
                    ]})),
                ],
            }));
            children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
        }

        // ── 3. COMPETENCIAS Y HERRAMIENTAS ────────────────────────────────────
        let secN = 3;
        if (competences?.length) {
            children.push(sectionHead(`${secN}. Competencias y Herramientas`));
            competences.forEach((comp, ci) => {
                // Nombre de competencia con fondo naranja pálido (igual que PDF)
                children.push(new Paragraph({
                    children: [new TextRun({ text: `${ci + 1}. ${comp.name || ''}`, bold: true, size: 24, color: ORANGE })],
                    shading:  { fill: OPALE, type: ShadingType.CLEAR },
                    spacing:  { before: 120, after: 60 },
                    indent:   { left: 100 },
                }));
                if (comp.description) {
                    children.push(new Paragraph({
                        children: [new TextRun({ text: comp.description, italics: true, size: 20, color: DARK })],
                        spacing: { after: 60 },
                        indent:  { left: 200 },
                    }));
                }
                const tools = (comp.selectedTools || comp.allTools || []);
                if (tools.length) {
                    const ts = tools.map(t => typeof t === 'string' ? t : (t.name || '')).filter(Boolean).join('  ·  ');
                    children.push(new Paragraph({
                        children: [
                            new TextRun({ text: 'Herramientas: ', bold: true, size: 18, color: ORANGE }),
                            new TextRun({ text: ts, size: 18, color: DARK }),
                        ],
                        spacing: { after: 60 },
                        indent:  { left: 200 },
                    }));
                }
                const indicators = comp.competenceIndicators || {};
                [['initial','Nivel Inicial'],['medio','Nivel Medio'],['advance','Nivel Avanzado']].forEach(([key, label]) => {
                    const inds = indicators[key] || [];
                    if (!inds.length) return;
                    const is = inds.map(ind => typeof ind === 'string' ? ind : (ind.name || ind.description || '')).filter(Boolean).join(' / ');
                    children.push(new Paragraph({
                        children: [
                            new TextRun({ text: `${label}: `, bold: true, color: GRAY, size: 18 }),
                            new TextRun({ text: is, color: DARK, size: 18 }),
                        ],
                        spacing: { after: 40 },
                        indent:  { left: 200 },
                    }));
                });
                children.push(new Paragraph({ text: '', spacing: { after: 80 } }));
            });
            secN++;
        }

        // ── GANTT + DETALLE POR MÓDULO (idéntico al PDF) ──────────────────────
        if (modules?.length && weeks) {
            children.push(sectionHead(`${secN}. Diagrama Gantt`));

            // Tabla de barras de texto
            let cursor = 0;
            const ganttRows = modules.map((mod, i) => {
                const dur   = parseInt(mod.duration) || 0;
                const start = cursor;
                cursor += dur;
                // Construir barra proporcional al total de semanas (max ~40 chars)
                const barLen = Math.min(weeks, 40);
                const scale  = barLen / weeks;
                const filled = Math.round(dur * scale);
                const startPos = Math.round(start * scale);
                const bar = Array.from({ length: barLen }, (_, w) =>
                    (w >= startPos && w < startPos + filled) ? '█' : '░'
                ).join('');
                return new TableRow({ children: [
                    cell(`M${i+1}. ${mod.name}`, i % 2 === 0 ? 'EEEEEE' : 'F8F8F8', true,  DARK,  18),
                    cell(bar,                      i % 2 === 0 ? 'EEEEEE' : 'F8F8F8', false, ORANGE, 14),
                    cell(`${dur} sem`,              i % 2 === 0 ? 'EEEEEE' : 'F8F8F8', false, GRAY,  18),
                ]});
            });
            children.push(new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({ children: [
                        cell('Módulo',              ORANGE, true, WHITE),
                        cell(`Semanas (1–${weeks})`, ORANGE, true, WHITE),
                        cell('Dur.',                ORANGE, true, WHITE),
                    ]}),
                    ...ganttRows,
                ],
            }));
            children.push(new Paragraph({ text: '', spacing: { after: 300 } }));

            // Detalle por módulo — idéntico a las páginas portrait del PDF
            const compMapDocx = {};
            (competences || []).forEach(comp => {
                const key = comp.id || comp.name;
                if (key) compMapDocx[key] = comp;
            });

            modules.forEach((mod, i) => {
                const projects = Array.isArray(mod.projects) ? mod.projects : [];
                const courses  = Array.isArray(mod.courses)  ? mod.courses  : [];
                if (!projects.length && !courses.length) return;

                // Salto de página por módulo (igual que PDF agrega página nueva)
                children.push(new Paragraph({ children: [new PageBreak()], spacing: { after: 0 } }));

                // Encabezado naranja del módulo
                children.push(subHead(
                    `Módulo ${i + 1}: ${mod.name}${mod.duration ? `  (${mod.duration} semanas)` : ''}`,
                    ORANGE, WHITE, 24
                ));

                // PROYECTOS
                if (projects.length) {
                    children.push(subHead('  PROYECTOS', 'CC3800', WHITE, 20));
                    projects.forEach(proj => {
                        const pName = typeof proj === 'string' ? proj : (proj.name || 'Proyecto');
                        const pDesc = typeof proj === 'object' ? (proj.description || '') : '';
                        const projCompIds = typeof proj === 'object' ? (proj.competences || proj.competenceIds || []) : [];

                        // Fila de proyecto con borde naranja izquierdo (igual que PDF)
                        children.push(new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            rows: [new TableRow({ children: [
                                new TableCell({
                                    children: [new Paragraph({ text: '' })],
                                    shading:  { fill: 'FFA064', type: ShadingType.CLEAR },
                                    width:    { size: 2, type: WidthType.PERCENTAGE },
                                    borders:  noBorders, margins: { top: 0, bottom: 0, left: 0, right: 0 },
                                }),
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({ text: `▶  Proyecto: ${pName}`, bold: true, size: 22, color: DARK })],
                                        spacing: { before: 60, after: 60 },
                                    })],
                                    shading:  { fill: LGRAY, type: ShadingType.CLEAR },
                                    width:    { size: 98, type: WidthType.PERCENTAGE },
                                    borders:  noBorders, margins: { top: 80, bottom: 80, left: 200, right: 100 },
                                }),
                            ]})],
                            borders: { insideH: noBorder, insideV: noBorder, top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
                        }));

                        if (pDesc) {
                            children.push(new Paragraph({
                                children: [new TextRun({ text: pDesc, italics: true, size: 18, color: GRAY })],
                                spacing: { before: 20, after: 60 },
                                indent:  { left: 300 },
                            }));
                        }

                        // Competencias del proyecto
                        const projComps = projCompIds.length > 0
                            ? projCompIds.map(cId => compMapDocx[cId] || Object.values(compMapDocx).find(c => c.name === cId)).filter(Boolean)
                            : [];
                        if (projComps.length) {
                            children.push(new Paragraph({
                                children: [new TextRun({ text: 'Competencias trabajadas:', bold: true, size: 18, color: ORANGE })],
                                spacing: { before: 60, after: 40 },
                                indent:  { left: 300 },
                            }));
                            projComps.forEach(comp => {
                                const tools = (comp.selectedTools || comp.allTools || []).map(t => typeof t === 'string' ? t : (t.name || '')).filter(Boolean);
                                const toolStr = tools.length ? `   [${tools.join(' · ')}]` : '';
                                children.push(new Paragraph({
                                    children: [
                                        new TextRun({ text: `• ${comp.name}`, bold: true, size: 18, color: DARK }),
                                        new TextRun({ text: toolStr, size: 18, color: GRAY }),
                                    ],
                                    shading: { fill: OPALE, type: ShadingType.CLEAR },
                                    spacing: { before: 20, after: 20 },
                                    indent:  { left: 440 },
                                }));
                            });
                        }
                        children.push(new Paragraph({ text: '', spacing: { after: 60 } }));
                    });
                }

                // CURSOS
                if (courses.length) {
                    children.push(subHead('  CURSOS', BLUEDARK, WHITE, 20));
                    courses.forEach((course, ci) => {
                        const cName = typeof course === 'string' ? course : (course.name || 'Curso');
                        const cDesc = typeof course === 'object' ? (course.description || '') : '';
                        children.push(new Table({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            rows: [new TableRow({ children: [
                                new TableCell({
                                    children: [new Paragraph({ text: '' })],
                                    shading:  { fill: BLUEDARK, type: ShadingType.CLEAR },
                                    width:    { size: 2, type: WidthType.PERCENTAGE },
                                    borders:  noBorders, margins: { top: 0, bottom: 0, left: 0, right: 0 },
                                }),
                                new TableCell({
                                    children: [new Paragraph({
                                        children: [new TextRun({ text: `  Curso: ${cName}`, bold: true, size: 21, color: DARK })],
                                        spacing: { before: 60, after: 60 },
                                    })],
                                    shading:  { fill: ci % 2 === 0 ? 'EEEEEE' : 'F8F8F8', type: ShadingType.CLEAR },
                                    width:    { size: 98, type: WidthType.PERCENTAGE },
                                    borders:  noBorders, margins: { top: 80, bottom: 80, left: 200, right: 100 },
                                }),
                            ]})],
                            borders: { insideH: noBorder, insideV: noBorder, top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
                        }));
                        if (cDesc) {
                            children.push(new Paragraph({
                                children: [new TextRun({ text: cDesc, italics: true, size: 18, color: GRAY })],
                                spacing: { before: 20, after: 40 },
                                indent:  { left: 300 },
                            }));
                        }
                    });
                }

                // Competencias globales del módulo
                const modCompsDocx = Object.values(compMapDocx).filter(c => {
                    const refs = c.modules || c.moduleIds || [];
                    return refs.includes(mod.id) || refs.includes(mod.name);
                });
                if (modCompsDocx.length) {
                    children.push(new Paragraph({
                        children: [new TextRun({ text: 'COMPETENCIAS Y HERRAMIENTAS DEL MÓDULO', bold: true, size: 20, color: GRAY })],
                        shading:  { fill: 'EFEFEF', type: ShadingType.CLEAR },
                        spacing:  { before: 180, after: 80 },
                    }));
                    modCompsDocx.forEach(comp => {
                        const tools = (comp.selectedTools || comp.allTools || []).map(t => typeof t === 'string' ? t : (t.name || '')).filter(Boolean);
                        children.push(new Paragraph({
                            children: [
                                new TextRun({ text: `• ${comp.name}`, bold: true, size: 20, color: ORANGE }),
                                new TextRun({ text: tools.length ? `   ${tools.join(' · ')}` : '', size: 18, color: DARK }),
                            ],
                            shading: { fill: OPALE, type: ShadingType.CLEAR },
                            spacing: { before: 40, after: 40 },
                            indent:  { left: 200 },
                        }));
                    });
                }
            });

            children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
            secN++;
        }

        // Sección "Módulos y Contenido" eliminada — el detalle completo ya aparece
        // en las páginas de detalle por módulo dentro de la sección Gantt

        // ── EVALUACIÓN ────────────────────────────────────────────────────────
        if (evaluation) {
            children.push(sectionHead(`${secN}. Metodología de Evaluación`));
            evaluation.split('\n').forEach(line => {
                if (line.trim()) children.push(pNormal(line));
            });
        }

        // ── Encabezado de página con logo (igual que el header blanco del PDF) ─
        const pageHeaderChildren = [
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [new TableRow({ children: [
                    // Logo naranja a la izquierda (ratio 2.35:1 → 80×34px)
                    new TableCell({
                        children: [logoOrangeBuffer
                            ? new Paragraph({
                                children: [new ImageRun({ data: logoOrangeBuffer, transformation: { width: 80, height: 34 }, type: 'png' })],
                                spacing: { before: 0, after: 0 },
                            })
                            : new Paragraph({ children: [new TextRun({ text: 'Factoría F5', bold: true, size: 16, color: ORANGE })] })
                        ],
                        shading:  { fill: WHITE, type: ShadingType.CLEAR },
                        width:    { size: 30, type: WidthType.PERCENTAGE },
                        borders:  noBorders, margins: { top: 40, bottom: 40, left: 80, right: 80 },
                    }),
                    // Título a la derecha
                    new TableCell({
                        children: [new Paragraph({
                            children: [new TextRun({ text: title, bold: true, size: 14, color: DARK })],
                            alignment: AlignmentType.RIGHT,
                            spacing: { before: 0, after: 0 },
                        })],
                        shading:  { fill: WHITE, type: ShadingType.CLEAR },
                        width:    { size: 70, type: WidthType.PERCENTAGE },
                        borders:  noBorders, margins: { top: 80, bottom: 0, left: 80, right: 80 },
                        verticalAlign: VerticalAlign ? VerticalAlign.CENTER : undefined,
                    }),
                ]})],
                borders: { insideH: noBorder, insideV: noBorder, top: noBorder, bottom: { style: BorderStyle.SINGLE, size: 8, color: ORANGE }, left: noBorder, right: noBorder },
            }),
        ];

        const doc2 = new Document({
            sections: [{
                properties: {},
                headers: {
                    default: new Header({ children: pageHeaderChildren }),
                },
                children,
            }],
        });
        const blob = await Packer.toBlob(doc2);
        const url  = URL.createObjectURL(blob);
        const a    = Object.assign(document.createElement('a'), { href: url, download: `syllabus_${title.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40)}.docx` });
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    }

    // ─── MODAL DE SELECCIÓN DE FORMATO ────────────────────────────────────────
    function showFormatModal(onPDF, onDOCX) {
        document.getElementById('_syllabus-modal')?.remove();

        const overlay = document.createElement('div');
        overlay.id = '_syllabus-modal';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.52);z-index:9999;display:flex;align-items:center;justify-content:center;';
        overlay.innerHTML = `
          <div style="background:#fff;border-radius:14px;padding:32px 28px 24px;max-width:400px;width:90%;box-shadow:0 8px 40px rgba(0,0,0,.28);font-family:Arial,sans-serif;text-align:center;">
            <div style="width:48px;height:48px;background:#FF4700;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:22px;font-weight:900;color:#fff;">F5</div>
            <h5 style="margin:0 0 6px;color:#1c1c1c;font-size:18px;font-weight:700;">Descargar Syllabus</h5>
            <p style="margin:0 0 24px;color:#666;font-size:13px;">Elige el formato de descarga:</p>
            <div style="display:flex;gap:12px;justify-content:center;">
              <button id="_btn-pdf"  style="flex:1;padding:14px 8px;border:none;border-radius:8px;background:#FF4700;color:#fff;font-size:14px;font-weight:700;cursor:pointer;">📄 PDF</button>
              <button id="_btn-docx" style="flex:1;padding:14px 8px;border:2px solid #FF4700;border-radius:8px;background:#fff;color:#FF4700;font-size:14px;font-weight:700;cursor:pointer;">📝 Word (.docx)</button>
            </div>
            <p style="margin:14px 0 0;font-size:11px;color:#aaa;">El Word es editable y mantiene los estilos</p>
            <button id="_btn-cancel" style="display:block;margin:12px auto 0;background:none;border:none;color:#aaa;font-size:13px;cursor:pointer;text-decoration:underline;">Cancelar</button>
          </div>`;
        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        overlay.querySelector('#_btn-pdf').onclick    = () => { close(); onPDF();  };
        overlay.querySelector('#_btn-docx').onclick   = () => { close(); onDOCX(); };
        overlay.querySelector('#_btn-cancel').onclick = close;
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    }

    // ─── API PÚBLICA ───────────────────────────────────────────────────────────
    function fromPromotion(promotion, extendedInfo) {
        const ext  = extendedInfo || {};
        const hours = ext.totalHours || calcHours(ext.schedule, promotion.weeks);
        const info = {
            name:        promotion.name,
            type:        promotion.type || '',
            modality:    ext.modality || promotion.modality || '',
            totalHours:  hours,
            weeks:       promotion.weeks,
            language:    promotion.language || '',
            description: promotion.description || '',
        };
        const args = [
            promotion.name,
            info,
            ext.schedule     || {},
            ext.competences  || [],
            promotion.modules || [],
            ext.evaluation   || '',
            promotion.weeks  || 0,
        ];
        showFormatModal(
            () => buildPDF(...args),
            () => buildDOCX(...args)
        );
    }

    function fromTemplate(template) {
        const hours = template.hours || template.totalHours || calcHours(template.schedule, template.weeks);
        const info = {
            name:        template.name,
            type:        template.type     || 'Bootcamp',
            modality:    template.modality || '',
            totalHours:  hours,
            weeks:       template.weeks,
            language:    template.language || '',
            description: template.description || '',
        };
        const args = [
            template.name,
            info,
            template.schedule    || {},
            template.competences || [],
            template.modules     || [],
            template.evaluation  || '',
            template.weeks       || 0,
        ];
        showFormatModal(
            () => buildPDF(...args),
            () => buildDOCX(...args)
        );
    }

    return { fromPromotion, fromTemplate };
})();

window.SyllabusPDF = SyllabusPDF;
