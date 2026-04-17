/**
 * reports.js
 * PDF Report generation via print-window technique
 * 4 report types:
 *   1. Ficha Seguimiento Técnico   (per student)
 *   2. Acta de Inicio               (program-level)
 *   3. Descripción Técnica Formación (full bootcamp)
 */
(function (window) {
    'use strict';

    const API_URL = window.APP_CONFIG?.API_URL || window.API_URL || window.location.origin;

    // ─── Brand colours (Factoría F5 palette) ────────────────────────────────
    const PRIMARY   = '#FF6B35';   // orange
    const DARK      = '#1A1A2E';   // dark navy
    const SECONDARY = '#4A4A6A';   // muted purple-grey
    const LIGHT_BG  = '#F8F9FA';
    const BORDER    = '#DEE2E6';

    function _baseCss() {
        return `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        @page { margin: 18mm 16mm 18mm 16mm; size: A4; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', Arial, sans-serif; font-size: 10pt; color: #000; line-height: 1.6; background: #fff; }
        h1 { font-size: 17pt; font-weight: 700; color: #000; }
        h2 { font-size: 13pt; font-weight: 600; color: #000; margin-top: 16pt; margin-bottom: 6pt; }
        h3 { font-size: 11pt; font-weight: 700; color: #000; margin-top: 14pt; margin-bottom: 5pt; }
        h4 { font-size: 10pt; font-weight: 600; color: #000; margin-top: 10pt; margin-bottom: 3pt; }
        p  { margin-bottom: 5pt; color: #000; }
        ul, ol { margin-left: 14pt; margin-bottom: 5pt; }
        li { margin-bottom: 2pt; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 10pt; font-size: 9.5pt; break-inside: auto; }
        th { background: #f0f0f0; color: #000; padding: 5pt 7pt; text-align: left; font-weight: 600; border: 1px solid #ccc; }
        td { padding: 5pt 7pt; border: 1px solid #ddd; vertical-align: top; color: #000; }
        tr { break-inside: avoid; break-after: auto; }
        tr:nth-child(even) td { background: #fafafa; }
        .badge {
            display: inline-block; padding: 2pt 6pt; border-radius: 10pt;
            font-size: 8pt; font-weight: 600; line-height: 1.3;
        }
        .badge-orange  { background: ${PRIMARY}; color: #fff; }
        .badge-dark    { background: #333; color: #fff; }
        .badge-green   { background: #198754; color: #fff; }
        .badge-blue    { background: #0d6efd; color: #fff; }
        .badge-red     { background: #dc3545; color: #fff; }
        .badge-yellow  { background: #ffc107; color: #000; }
        .badge-grey    { background: #6c757d; color: #fff; }
        .badge-info    { background: #0dcaf0; color: #000; }
        .badge-light   { background: #e9ecef; color: #333; border: 1px solid #ccc; }
        .section-box { margin-bottom: 10pt; break-inside: avoid; }
        .card        { margin-bottom: 10pt; break-inside: avoid; }
        .section-box.accent, .section-box.green, .section-box.blue, .section-box.red { }
        .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10pt; }
        .row3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10pt; }
        .kv { margin-bottom: 4pt; break-inside: avoid; }
        .kv strong { color: #000; }
        .empty-note { color: #888; font-style: italic; font-size: 9pt; }
        .pill-row { display: flex; flex-wrap: wrap; gap: 4pt; margin-top: 3pt; }
        .page-break { page-break-before: always; }
        .no-break { break-inside: avoid; }
        h1, h2, h3, h4 { break-after: avoid; }
        `;
    }

    // ─── Header banner ───────────────────────────────────────────────────────
    function _header(title, subtitle, promotionName, date, promo) {
        let periodHtml = '';
        if (promo && (promo.startDate || promo.endDate)) {
            const start = _fmtDate(promo.startDate) || '—';
            const end   = _fmtDate(promo.endDate)   || '—';
            periodHtml = `<div style="font-size:9pt; color:#666; margin-top:2pt;">
                Período: <span style="color:${DARK}; font-weight:500;">${start}</span> 
                al <span style="color:${DARK}; font-weight:500;">${end}</span>
            </div>`;
        }

        const logoUrl = (window.APP_CONFIG?.BASE_URL || window.location.origin) + '/img/f5-logo-naranja.webp';

        return `
        <div style="display:flex; justify-content:space-between; align-items:flex-start;
                    border-bottom: 1px solid #ccc; padding-bottom: 12pt; margin-bottom: 16pt;">
            <div>
                <h1 style="font-size:17pt; font-weight:700; color:#000; margin:0 0 3pt 0;">${_esc(title)}</h1>
                ${subtitle ? `<div style="font-size:10.5pt; color:#000; margin-top:3pt;">${_esc(subtitle)}</div>` : ''}
                ${promotionName ? `<div style="font-size:9pt; color:#333; margin-top:3pt;">Promoción: <strong>${_esc(promotionName)}</strong></div>` : ''}
                ${periodHtml}
            </div>
            <div style="flex-shrink:0; margin-left:16pt;">
                <img src="${logoUrl}" alt="Factoria F5 logo naranja"
                     style="height:80pt; width:auto; display:block;"
                     onerror="this.style.display='none'">
            </div>
        </div>`;
    }

    // ─── Footer ──────────────────────────────────────────────────────────────
    function _footer() {
        return '';
    }

    // ─── html2pdf options ────────────────────────────────────────────────────
    // (kept only for _previewWindow which still uses html2pdf CDN loaded inside the popup)

    /** Wrap html in a full standalone document */
    function _wrapHtml(htmlContent) {
        return `<!DOCTYPE html><html lang="es"><head>
            <meta charset="UTF-8">
            <style>${_baseCss()}</style>
        </head><body style="margin:0;padding:12px 16px;background:#fff;">${htmlContent}${_footer()}</body></html>`;
    }

    /**
     * Core renderer: renders htmlContent inside a hidden iframe,
     * captures it with html2canvas, slices into A4 pages with jsPDF.
     * Returns Promise<jsPDF instance>.
     */
    function _renderToPdf(htmlContent, filename) {
        return new Promise((resolve, reject) => {
            const html2canvas = window.html2canvas;
            const jspdf = window.jspdf;
            
            if (!html2canvas || !jspdf) {
                const msg = 'Librerías html2canvas / jsPDF no cargadas. Revisa tu conexión.';
                console.error('[Reports]', msg);
                reject(new Error(msg));
                return;
            }
            
            const jsPDF = jspdf.jsPDF || window.jsPDF;
            if (!jsPDF) {
                const msg = 'No se pudo encontrar el constructor jsPDF.';
                console.error('[Reports]', msg);
                reject(new Error(msg));
                return;
            }

            // Create a hidden iframe so the browser fully lays out the HTML
            const iframe = document.createElement('iframe');
            // Make it "visible" but off-screen and non-interactive to ensure rendering
            iframe.style.cssText = 'position:fixed;top:0;left:-2000px;width:794px;height:1000px;visibility:hidden;pointer-events:none;border:none;z-index:-1;';
            document.body.appendChild(iframe);

            // Write the full HTML document into the iframe
            const iDoc = iframe.contentDocument || iframe.contentWindow.document;
            iDoc.open();
            iDoc.write(_wrapHtml(htmlContent));
            iDoc.close();

            // Give the browser time to finish layout/fonts
            const capture = () => {
                const body = iDoc.body;
                // Expand iframe to full content height so nothing is clipped
                const scrollH = Math.max(body.scrollHeight, body.offsetHeight, iDoc.documentElement.scrollHeight);
                iframe.style.height = (scrollH + 100) + 'px';

                // ── Collect bottom-edge of elements that shouldn't be split ──
                //    BEFORE html2canvas runs so the iframe is still live.
                const bodyTop = body.getBoundingClientRect().top;
                const safeBreakSelectors = 'tr, h2, h3, .section-box, .no-break, .kv, .card';
                const rowBottomsPx = Array.from(iDoc.querySelectorAll(safeBreakSelectors)).map(el => {
                    return el.getBoundingClientRect().bottom - bodyTop;
                }).filter(v => v > 0);

                // Also collect top-edges of elements that must not be split mid-card
                // so we can push the page break to just before the card starts
                const noBreakTopsPx = Array.from(iDoc.querySelectorAll('.section-box, .no-break')).map(el => {
                    return el.getBoundingClientRect().top - bodyTop;
                }).filter(v => v > 0);

                // Sort unique values to ensure logical slicing
                const uniqueBottoms = [...new Set(rowBottomsPx)].sort((a, b) => a - b);
                const uniqueNoBreakTops = [...new Set(noBreakTopsPx)].sort((a, b) => a - b);

                html2canvas(body, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    windowWidth: 794,
                    scrollX: 0,
                    scrollY: 0,
                    width: body.scrollWidth,
                    height: scrollH
                }).then(canvas => {
                    document.body.removeChild(iframe);

                    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

                    const pageW  = pdf.internal.pageSize.getWidth();   // 210mm
                    const pageH  = pdf.internal.pageSize.getHeight();  // 297mm
                    const margin = 14; // mm

                    const usableW = pageW - margin * 2;
                    const usableH = pageH - margin * 2;

                    const canvasMmW = usableW;
                    // canvas was rendered at scale:2, so 1 CSS px = 2 canvas px
                    const cssPxToMm = usableW / (canvas.width / 2);
                    const canvasMmH = (canvas.height / 2) * cssPxToMm;

                    // Convert element bottoms from CSS px → mm
                    const rowBottomsMm = uniqueBottoms.map(px => px * cssPxToMm);

                    // Convert no-break element tops to mm (used to avoid cutting into a card)
                    const noBreakTopsMm = uniqueNoBreakTops.map(px => px * cssPxToMm);

                    // ── Smart page-break: build slices that always end at an element boundary ──
                    const slices = [];
                    let yPos = 0;
                    while (yPos < canvasMmH - 0.5) {
                        let sliceH = Math.min(usableH, canvasMmH - yPos);
                        if (sliceH < canvasMmH - yPos) {
                            // Not the last page — find the best cut point
                            const sliceEnd = yPos + sliceH;

                            // Check if a no-break card starts inside the slice but isn't at the very top.
                            // If so, pull the cut back to just before that card's top (push card to next page).
                            const cardStartInSlice = noBreakTopsMm.filter(t => t > yPos + 5 && t < sliceEnd - 2);
                            if (cardStartInSlice.length) {
                                // Find the last card-top that still leaves a meaningful slice
                                // Walk backwards: pick last card top where the cut would be > yPos+10mm
                                const preferredCut = cardStartInSlice[cardStartInSlice.length - 1];
                                // Only use it if it gives us a reasonable slice (at least 20mm)
                                if (preferredCut - yPos >= 20) {
                                    sliceH = preferredCut - yPos;
                                } else {
                                    // Try earlier card start
                                    const earlier = cardStartInSlice.find(t => t - yPos >= 20);
                                    if (earlier !== undefined) sliceH = earlier - yPos;
                                }
                            }

                            // Fallback: use row bottoms as before (for tables / non-card elements)
                            const fits = rowBottomsMm.filter(e => e > yPos + 5 && e <= yPos + sliceH - 1);
                            if (fits.length && Math.abs(fits[fits.length - 1] - (yPos + sliceH)) < 2) {
                                // Row bottom aligns closely — prefer it
                                sliceH = fits[fits.length - 1] - yPos;
                            }
                        }
                        slices.push({ yPos, sliceH });
                        yPos += sliceH;
                    }

                    // ── Render each slice into its own sub-canvas and add to PDF ──
                    let firstPage = true;
                    for (const { yPos: yp, sliceH: sh } of slices) {
                        if (!firstPage) pdf.addPage();
                        firstPage = false;

                        const pxStart = Math.round(yp / cssPxToMm * 2);
                        const pxH    = Math.round(sh / cssPxToMm * 2);
                        const sliceCanvas = document.createElement('canvas');
                        sliceCanvas.width  = canvas.width;
                        sliceCanvas.height = Math.max(1, pxH);
                        const ctx = sliceCanvas.getContext('2d');
                        ctx.drawImage(canvas, 0, pxStart, canvas.width, pxH, 0, 0, canvas.width, pxH);

                        pdf.addImage(
                            sliceCanvas.toDataURL('image/jpeg', 0.95), 'JPEG',
                            margin, margin,
                            canvasMmW, sh,
                            undefined, 'FAST'
                        );
                    }

                    pdf.setProperties({ title: filename || 'informe.pdf' });
                    resolve(pdf);
                }).catch(err => {
                    if (iframe.parentNode) document.body.removeChild(iframe);
                    console.error('[Reports] html2canvas error:', err);
                    reject(err);
                });
            };

            // Wait for iframe load event, then a short extra tick for fonts
            const checkLoad = () => {
                if (iDoc.readyState === 'complete') {
                    setTimeout(capture, 500);
                } else {
                    iframe.onload = () => setTimeout(capture, 500);
                    // Backup timeout in case onload doesn't fire
                    setTimeout(capture, 2000);
                }
            };
            
            checkLoad();
            
            // Safety timeout to avoid hanging the UI forever
            setTimeout(() => {
                if (iframe.parentNode) {
                    document.body.removeChild(iframe);
                    reject(new Error('Tiempo de espera agotado al generar el PDF.'));
                }
            }, 30000);
        });
    }

    /** Directly download a single PDF. Returns a Promise. */
    async function _savePdf(htmlContent, filename) {
        //console.log('[Reports] _savePdf called for:', filename);
        try {
            const pdf = await _renderToPdf(htmlContent, filename);
            //console.log('[Reports] PDF rendered, saving now...');
            pdf.save(filename || 'informe.pdf');
        } catch (err) {
            console.error('[Reports] _savePdf error:', err);
            throw err;
        }
    }

    /** Generate a PDF Blob without downloading it (for ZIP). Returns Promise<Blob>. */
    async function _getPdfBlob(htmlContent, filename) {
        const pdf = await _renderToPdf(htmlContent, filename);
        return pdf.output('blob');
    }

    /** Bundle multiple { blob, filename } objects into a ZIP and download it. */
    async function _zipAndDownload(files, zipName) {
        if (!window.JSZip) {
            alert('La librería JSZip no está cargada. Comprueba tu conexión a internet.');
            return;
        }
        const zip = new JSZip();
        files.forEach(({ blob, filename }) => zip.file(filename, blob));
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(zipBlob);
        a.download = zipName || 'informes.zip';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); document.body.removeChild(a); }, 1000);
    }

    /** Show a saving spinner overlay */
    function _showSaving(msg) {
        const existing = document.getElementById('_pdf-saving-overlay');
        if (existing) existing.remove();
        const el = document.createElement('div');
        el.id = '_pdf-saving-overlay';
        el.innerHTML = `
            <div style="position:fixed;inset:0;background:rgba(26,26,46,.7);z-index:99999;
                        display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;">
                <div style="width:48px;height:48px;border:5px solid #FF6B35;border-top-color:transparent;
                            border-radius:50%;animation:spin .8s linear infinite;"></div>
                <div style="color:#fff;font-family:Inter,sans-serif;font-size:15px;">${msg || 'Generando PDF…'}</div>
                <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
            </div>`;
        document.body.appendChild(el);
    }

    function _hideSaving() {
        document.getElementById('_pdf-saving-overlay')?.remove();
    }

    // ─── Legacy preview window (kept ONLY for printProjectReport signature preview) ──
    function _previewWindow(htmlContent, filename) {
        const win = window.open('', '_blank', 'width=960,height=780');
        if (!win) { alert('El navegador bloqueó la ventana emergente. Permite los popups para este sitio.'); return; }

        const barCss = `
            #print-bar { position:fixed;top:0;left:0;right:0;z-index:9999;background:#1A1A2E;color:#fff;
                display:flex;align-items:center;justify-content:space-between;padding:10px 20px;gap:12px;
                font-family:'Inter',sans-serif;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,.4); }
            .bar-logo{font-weight:700;color:#FF6B35;font-size:15px;}
            .bar-hint{color:#ccc;font-size:12px;}
            .btn-save{background:#FF6B35;color:#fff;border:none;border-radius:6px;padding:8px 20px;
                font-size:13px;font-weight:600;cursor:pointer;transition:background .15s;}
            .btn-save:hover{background:#e05520;}
            .btn-cl{background:transparent;color:#aaa;border:1px solid #555;border-radius:6px;
                padding:7px 14px;font-size:12px;cursor:pointer;}
            .btn-cl:hover{color:#fff;border-color:#aaa;}
            @media print{#print-bar{display:none!important}}
            body{padding-top:56px;}
        `;

        // Encode filename for safe use in JS inside the popup
        const safeFilename = JSON.stringify(filename || 'informe-proyecto.pdf');

        win.document.write(`<!DOCTYPE html><html lang="es"><head>
            <meta charset="UTF-8">
            <title>Vista previa – Bootcamp Manager</title>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>
            <style>${_baseCss()}${barCss}</style>
        </head><body>
            <div id="print-bar">
                <div style="display:flex;align-items:center;gap:10px;">
                    <span class="bar-logo">Bootcamp Manager</span>
                    <span class="bar-hint">Vista previa · añade tu firma antes de guardar</span>
                </div>
                <div style="display:flex;gap:8px;">
                    <button class="btn-save" onclick="savePdf()">⬇ Guardar PDF</button>
                    <button class="btn-cl" onclick="window.close()">Cerrar</button>
                </div>
            </div>
            <div id="pdf-content">${htmlContent}${_footer()}</div>
            <script>
                function savePdf(){
                    var btn=document.querySelector('.btn-save');
                    btn.disabled=true; btn.textContent='Generando…';
                    var el=document.getElementById('pdf-content');
                    html2pdf().set({
                        margin:[18,16,18,16], filename:${safeFilename},
                        image:{type:'jpeg',quality:.97},
                        html2canvas:{scale:2,useCORS:true,logging:false},
                        jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},
                        pagebreak:{mode:['avoid-all','css'],before:'.page-break'}
                    }).from(el).save().then(function(){ btn.disabled=false; btn.textContent='⬇ Guardar PDF'; });
                }
            <\/script>
        </body></html>`);
        win.document.close();
        win.onload = () => win.focus();
    }

    // ─── Escape helper ───────────────────────────────────────────────────────
    function _esc(text) {
        if (!text) return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    function _fmtDate(d) {
        if (!d) return '—';
        try { return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }); }
        catch { return String(d); }
    }

    function _today() {
        return new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
    }

    /** Format a YYYY-MM-DD or ISO date as Spanish long date with weekday: "lunes, 10 de agosto de 2026" */
    function _fmtDateEs(d) {
        if (!d) return '—';
        try {
            // Parse as local date to avoid timezone shift
            const parts = String(d).split('T')[0].split('-');
            if (parts.length === 3) {
                const dt = new Date(+parts[0], +parts[1]-1, +parts[2]);
                return dt.toLocaleDateString('es-ES', { weekday:'long', day:'2-digit', month:'2-digit', year:'numeric' });
            }
            return String(d);
        } catch { return String(d); }
    }

    function _levelBadge(level) {
        const map = { 0: ['grey','Sin nivel'], 1: ['red','Básico'], 2: ['yellow','Medio'], 3: ['green','Avanzado'],
                      4: ['blue','Excelente'] };
        const [cls, label] = map[level] || ['grey', `Nv.${level}`];
        return `<span class="badge badge-${cls}">Nv.${level ?? '—'} ${label}</span>`;
    }

    // ─── Motivo del Informe modal ─────────────────────────────────────────────
    /**
     * Shows a Bootstrap modal asking for the reason ("motivo") of the report.
     * Safely hides any currently-open Bootstrap modal and restores it afterwards.
     * Returns Promise<string|null>:
     *   - string (possibly empty) when the user confirms
     *   - null when the user cancels
     */
    function _askRazon(title) {
        //console.log('[Reports] Showing _askRazon modal for:', title);
        return new Promise(resolve => {
            // ── Hide any currently-open Bootstrap modal so they don't stack ──
            const openModalEl   = document.querySelector('.modal.show');
            const openModalInst = openModalEl ? (window.bootstrap?.Modal.getInstance(openModalEl) || null) : null;
            if (openModalInst) {
                //console.log('[Reports] Hiding existing modal');
                openModalInst.hide();
            }

            // ── Build the modal DOM ──
            const id = '_razon-informe-modal';
            const existing = document.getElementById(id);
            if (existing) {
                const inst = window.bootstrap?.Modal.getInstance(existing);
                if (inst) inst.hide();
                existing.remove();
            }

            const div = document.createElement('div');
            div.innerHTML = `
<div class="modal fade" id="${id}" tabindex="-1" aria-labelledby="${id}-label" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content shadow">
      <div class="modal-header" style="background:#1A1A2E;color:#fff;border-bottom:2px solid #FF6B35;">
        <h5 class="modal-title" id="${id}-label" style="font-size:1rem;">
          <i class="bi bi-file-earmark-text me-2" style="color:#FF6B35;"></i>${_esc(title || 'Informe de Seguimiento Técnico')}
        </h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Cerrar"></button>
      </div>
      <div class="modal-body pb-2">
        <label class="form-label fw-semibold mb-1" style="font-size:.875rem;color:#4A4A6A;">
          Motivo del informe <span class="text-muted fw-normal">(opcional)</span>
        </label>
        <textarea id="${id}-textarea" class="form-control" rows="4"
          placeholder="Ej: Seguimiento mensual de progreso, revisión por solicitud de financiador, evaluación de fin de módulo…"
          style="font-size:.875rem;resize:vertical;"></textarea>
        <div class="form-text mt-1">Déjalo en blanco para generar el informe sin motivo.</div>
      </div>
      <div class="modal-footer pt-2">
        <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">
          <i class="bi bi-x me-1"></i>Cancelar
        </button>
        <button type="button" class="btn btn-sm" id="${id}-confirm"
          style="background:#FF6B35;color:#fff;border:none;">
          <i class="bi bi-file-earmark-pdf me-1"></i>Generar PDF
        </button>
      </div>
    </div>
  </div>
</div>`;
            document.body.appendChild(div.firstElementChild);

            const modalEl  = document.getElementById(id);
            if (!window.bootstrap?.Modal) {
                console.error('[Reports] Bootstrap Modal library not found!');
                resolve(''); // Fallback to no reason if bootstrap is missing
                return;
            }
            const modal    = new window.bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false });
            let   resolved = false;

            // ── Confirm ──
            document.getElementById(`${id}-confirm`).addEventListener('click', () => {
                if (resolved) return;
                resolved = true;
                const val = (document.getElementById(`${id}-textarea`)?.value || '').trim();
                modal.hide();
                resolve(val); // empty string = confirmed without text
            });

            // ── After modal closes (either path) — clean up DOM and handle cancel ──
            modalEl.addEventListener('hidden.bs.modal', () => {
                modalEl.remove();
                if (!resolved) {
                    resolved = true;
                    // Restore previously-hidden modal
                    if (openModalInst) {
                        try { openModalInst.show(); } catch (_) {}
                    }
                    resolve(null); // cancelled
                }
            }, { once: true });

            modal.show();
            modalEl.addEventListener('shown.bs.modal', () => {
                document.getElementById(`${id}-textarea`)?.focus();
            }, { once: true });
        });
    }

    /**
     * Shows a Bootstrap modal to select a week from a list of options.
     * Returns Promise<number|null>: the index of the selected option, or null if cancelled.
     */
    function _askWeekSelect(title, options, collaborators = []) {
        //console.log('[Reports] Showing _askWeekSelect modal with collaborators');
        return new Promise(resolve => {
            const openModalEl   = document.querySelector('.modal.show');
            const openModalInst = openModalEl ? (window.bootstrap?.Modal.getInstance(openModalEl) || null) : null;
            if (openModalInst) openModalInst.hide();

            const id = '_week-select-modal';
            const existing = document.getElementById(id);
            if (existing) {
                const inst = window.bootstrap?.Modal.getInstance(existing);
                if (inst) inst.hide();
                existing.remove();
            }

            let optHtml = '';
            options.forEach((opt, idx) => {
                optHtml += `<option value="${idx}">${_esc(opt.label)}</option>`;
            });

            let collHtml = '';
            collaborators.forEach(c => {
                collHtml += `<option value="${c.email}">${_esc(c.name)} (${_esc(c.email)})</option>`;
            });
            collHtml += `<option value="manual">Añadir otro email manualmente...</option>`;

            const div = document.createElement('div');
            div.innerHTML = `
<div class="modal fade" id="${id}" tabindex="-1" aria-labelledby="${id}-label" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content shadow">
      <div class="modal-header" style="background:#1A1A2E;color:#fff;border-bottom:2px solid #FF6B35;">
        <h5 class="modal-title" id="${id}-label" style="font-size:1rem;">
          <i class="bi bi-calendar3 me-2" style="color:#FF6B35;"></i>${_esc(title || 'Seleccionar Semana')}
        </h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Cerrar"></button>
      </div>
      <div class="modal-body pb-2">
        <label class="form-label fw-semibold mb-1" style="font-size:.875rem;color:#4A4A6A;">
          Elige la semana para el informe
        </label>
        <select id="${id}-select" class="form-select mb-3" style="font-size:.875rem;">
          ${optHtml}
        </select>
        
        <div class="p-3 mb-2 rounded border" style="background: #f8f9fa;">
            <div class="form-check form-switch mb-2">
              <input class="form-check-input" type="checkbox" id="${id}-send-check">
              <label class="form-check-label fw-semibold" for="${id}-send-check" style="color: #1A1A2E;">Enviar por email tras generar</label>
            </div>
            
            <div id="${id}-email-section" style="display:none;">
              <label class="form-label small text-muted mb-1">Destinatario:</label>
              <select id="${id}-dest-select" class="form-select form-select-sm mb-2" style="font-size:.8rem;">
                ${collHtml}
              </select>
              <input type="email" id="${id}-manual-email" class="form-control form-control-sm" placeholder="ejemplo@email.com" style="display:none;font-size:.8rem;">
            </div>
        </div>
        
        <div class="form-text mt-1 text-muted small">Al elegir "Enviar", el sistema generará el PDF y lo hará llegar por email al destino seleccionado.</div>
      </div>
      <div class="modal-footer pt-1">
        <button type="button" class="btn btn-outline-secondary btn-sm" data-bs-dismiss="modal">
          <i class="bi bi-x me-1"></i>Cancelar
        </button>
        <button type="button" class="btn btn-sm" id="${id}-excel-btn"
          style="background:#1D6F42;color:#fff;border:none;">
          <i class="bi bi-file-earmark-spreadsheet me-1"></i>Descargar Excel
        </button>
        <button type="button" class="btn btn-sm" id="${id}-download-btn" 
          style="background:#f1f3f5;color:#4A4A6A;border:1px solid #dee2e6;">
          <i class="bi bi-download me-1"></i>Descargar PDF
        </button>
        <button type="button" class="btn btn-sm" id="${id}-send-btn" 
          style="background:#FF6B35;color:#fff;border:none;display:none;">
          <i class="bi bi-send me-1"></i>Generar y Enviar
        </button>
      </div>
    </div>
  </div>
</div>`;
            document.body.appendChild(div.firstElementChild);

            const modalEl  = document.getElementById(id);
            if (!window.bootstrap?.Modal) return resolve(options.length ? { weekIdx: 0, action: 'download' } : null);
            const modal    = new window.bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false });
            let   resolved = false;

            const sendCheck = document.getElementById(`${id}-send-check`);
            const emailSec  = document.getElementById(`${id}-email-section`);
            const destSel   = document.getElementById(`${id}-dest-select`);
            const manualIn  = document.getElementById(`${id}-manual-email`);
            const downBtn   = document.getElementById(`${id}-download-btn`);
            const excelBtn  = document.getElementById(`${id}-excel-btn`);
            const sendBtn   = document.getElementById(`${id}-send-btn`);

            sendCheck.addEventListener('change', () => {
                const checked = sendCheck.checked;
                emailSec.style.display = checked ? 'block' : 'none';
                sendBtn.style.display  = checked ? 'inline-block' : 'none';
                downBtn.style.display  = checked ? 'none' : 'inline-block';
                excelBtn.style.display = checked ? 'none' : 'inline-block';
            });

            destSel.addEventListener('change', () => {
                manualIn.style.display = (destSel.value === 'manual') ? 'block' : 'none';
            });

            downBtn.addEventListener('click', () => {
               if (resolved) return;
               resolved = true;
               const val = parseInt(document.getElementById(`${id}-select`).value, 10);
               modal.hide();
               resolve({
                 weekIdx: isNaN(val) ? 0 : val,
                 action: 'download'
               });
            });

            excelBtn.addEventListener('click', () => {
               if (resolved) return;
               resolved = true;
               const val = parseInt(document.getElementById(`${id}-select`).value, 10);
               modal.hide();
               resolve({
                 weekIdx: isNaN(val) ? 0 : val,
                 action: 'excel'
               });
            });

            sendBtn.addEventListener('click', () => {
               if (resolved) return;
               let email = destSel.value;
               if (email === 'manual') {
                  email = manualIn.value.trim();
                  if (!email || !email.includes('@')) {
                      alert('Por favor, indica un email válido.');
                      return;
                  }
               }
               resolved = true;
               const val = parseInt(document.getElementById(`${id}-select`).value, 10);
               modal.hide();
               resolve({
                 weekIdx: isNaN(val) ? 0 : val,
                 action: 'send',
                 email: email
               });
            });

            modalEl.addEventListener('hidden.bs.modal', () => {
                modalEl.remove();
                if (!resolved) {
                    resolved = true;
                    if (openModalInst) try { openModalInst.show(); } catch (_) {}
                    resolve(null);
                }
            }, { once: true });

            modal.show();
        });
    }

    // ─── Reason block HTML (injected right after the header) ─────────────────
    function _razonBlock(razonInforme) {
        if (!razonInforme) return '';
        return `<p style="margin-bottom:12pt; font-size:9.5pt; color:#000;">
            <strong>Motivo del informe:</strong> ${_esc(razonInforme)}
        </p>`;
    }

    // ════════════════════════════════════════════════════════════════════════
    // 1. FICHA SEGUIMIENTO TÉCNICO
    // ════════════════════════════════════════════════════════════════════════
    async function printTechnical(studentId, promotionId) {
        // Ask for reason first — null means user cancelled
        const razonInforme = await _askRazon('Informe de Seguimiento Técnico');
        if (razonInforme === null) return;

        const token = localStorage.getItem('token');
        try {
            const [stuRes, promoRes, pildarasRes] = await Promise.all([
                fetch(`${API_URL}/api/promotions/${promotionId}/students/${studentId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/promotions/${promotionId}`,                       { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/promotions/${promotionId}/modules-pildoras`,      { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            if (!stuRes.ok) throw new Error('No se pudo cargar el estudiante');
            const s   = await stuRes.json();
            const promo = promoRes.ok ? await promoRes.json() : {};
            const pildarasData = pildarasRes.ok ? await pildarasRes.json() : {};
            const modulesPildarasExtended = pildarasData.modulesPildoras || [];
            const tt  = s.technicalTracking || {};
            const fullName = `${s.name || ''} ${s.lastname || ''}`.trim();

            let html = _header(
                'Ficha de Seguimiento Técnico',
                fullName,
                promo.name,
                _today(),
                promo
            );

            // ── Motivo del informe (right after header) ──
            html += _razonBlock(razonInforme);

            // ── Datos personales ──
            html += `<div class="kv"><strong>Coder:</strong> ${fullName}</div>
                <div class="kv"><strong>Promoción:</strong> ${promo.name || '—'}</div>
                <div class="kv"><strong>Fecha de generación:</strong> ${_today()}</div>`;

            // ── Notas del profesor ── (omitir si vacío)
            const notes = tt.teacherNotes || [];
            if (notes.length) {
                html += `<h3>Notas del Profesor</h3>`;
                html += `<table><thead><tr><th>Fecha</th><th>Nota</th></tr></thead><tbody>`;
                notes.forEach(n => {
                    html += `<tr><td style="white-space:nowrap;">${_fmtDate(n.createdAt || n.date)}</td><td>${_esc(n.note || n.text || '')}</td></tr>`;
                });
                html += `</tbody></table>`;
            }

            // ── Proyectos realizados ──
            html += `<h3>Proyectos Realizados</h3>`;
            const teams = tt.teams || [];
            if (teams.length) {
                teams.forEach(t => {
                    const typeLabel = t.projectType === 'individual' ? 'Individual' : 'Grupal';
                    const members = (t.members || []).map(m => _esc(m.name)).join(', ');
                    const comps   = t.competences || [];
                    html += `<div class="no-break" style="margin-bottom:10pt;">
                        <div style="margin-bottom:3pt;"><strong>${_esc(t.teamName || 'Proyecto')}</strong> — ${typeLabel}</div>
                        <div class="kv"><strong>Módulo:</strong> ${_esc(t.moduleName || '—')}</div>
                        ${members ? `<div class="kv"><strong>Compañeros:</strong> ${members}</div>` : ''}
                        ${comps.length ? `
                        <div style="margin-top:4pt;">
                            <strong>Competencias trabajadas:</strong>
                            <ul style="margin-top:2pt;">
                            ${comps.map(c => {
                                const tools = (c.toolsUsed || []).join(', ');
                                return `<li>${_esc(c.competenceName)} (Nivel ${c.level || '—'})${tools ? ' — ' + _esc(tools) : ''}</li>`;
                            }).join('')}
                            </ul>
                        </div>` : ''}
                    </div>`;
                });
            } else {
                html += `<p class="empty-note">Sin proyectos registrados.</p>`;
            }

            // ── Proyectos Pendientes de Entrega ──
            // Compara los proyectos del roadmap con los teams ya evaluados del alumno
            const evaluatedProjectNames = new Set(
                (tt.teams || []).map(t => (t.teamName || '').trim().toLowerCase())
            );
            const pendingProjects = [];
            (promo.modules || []).forEach(mod => {
                (mod.projects || []).forEach(proj => {
                    const projName = typeof proj === 'string' ? proj : (proj.name || '');
                    if (projName && !evaluatedProjectNames.has(projName.trim().toLowerCase())) {
                        pendingProjects.push({ projectName: projName, moduleName: mod.name || '—' });
                    }
                });
            });
            if (pendingProjects.length) {
                html += `<h3>Proyectos Pendientes de Entrega</h3>`;
                html += `<table><thead><tr><th>Proyecto</th><th>Módulo</th></tr></thead><tbody>`;
                pendingProjects.forEach(p => {
                    html += `<tr><td>${_esc(p.projectName)}</td><td>${_esc(p.moduleName)}</td></tr>`;
                });
                html += `</tbody></table>`;
            }

            // ── Módulos completados ──
            html += `<h3>Módulos Completados</h3>`;
            const mods = tt.completedModules || [];
            if (mods.length) {
                html += `<table><thead><tr><th>Módulo</th><th>Fecha</th><th>Nota</th><th>Observaciones</th></tr></thead><tbody>`;
                mods.forEach(m => {
                    const gradeMap = { 1: 'Insuficiente', 2: 'Básico', 3: 'Competente', 4: 'Excelente' };
                    html += `<tr>
                        <td>${_esc(m.moduleName || '—')}</td>
                        <td>${_fmtDate(m.completionDate)}</td>
                        <td>${gradeMap[m.finalGrade] || m.finalGrade || '—'}</td>
                        <td>${_esc(m.notes || '')}</td>
                    </tr>`;
                });
                html += `</tbody></table>`;
            } else {
                html += `<p class="empty-note">Sin módulos completados.</p>`;
            }

            // ── Píldoras: presentadas y no presentadas ──
            // Compute both groups from live ExtendedInfo data
            const _pilPresentadas = [];
            const _pilPendientes  = [];
            modulesPildarasExtended.forEach(mp => {
                (mp.pildoras || []).forEach(p => {
                    const studentIds = (p.students || []).map(s2 => String(s2.id));
                    if (!studentIds.includes(String(studentId))) return;
                    const entry = {
                        pildoraTitle: p.title || '—',
                        moduleName:   mp.moduleName || '—',
                        date:         p.date || null,
                        mode:         p.mode || null,
                        status:       p.status || ''
                    };
                    if (p.status === 'Presentada') _pilPresentadas.push(entry);
                    else                            _pilPendientes.push(entry);
                });
            });

            // ── Píldoras Presentadas (omitir si vacío) ──
            if (_pilPresentadas.length) {
                html += `<h3>Píldoras Presentadas</h3>`;
                html += `<table><thead><tr><th>Título</th><th>Módulo</th><th>Fecha</th><th>Modalidad</th></tr></thead><tbody>`;
                _pilPresentadas.forEach(p => {
                    html += `<tr>
                        <td>${_esc(p.pildoraTitle)}</td>
                        <td>${_esc(p.moduleName)}</td>
                        <td>${_fmtDate(p.date)}</td>
                        <td>${_esc(p.mode || '—')}</td>
                    </tr>`;
                });
                html += `</tbody></table>`;
            }

            // ── Píldoras No Presentadas / Pendientes (omitir si vacío) ──
            if (_pilPendientes.length) {
                html += `<h3>Píldoras No Presentadas / Pendientes</h3>`;
                html += `<table><thead><tr><th>Título</th><th>Módulo</th><th>Fecha prevista</th><th>Estado</th></tr></thead><tbody>`;
                _pilPendientes.forEach(p => {
                    html += `<tr>
                        <td>${_esc(p.pildoraTitle)}</td>
                        <td>${_esc(p.moduleName)}</td>
                        <td>${_fmtDate(p.date)}</td>
                        <td>${_esc(p.status || 'Pendiente')}</td>
                    </tr>`;
                });
                html += `</tbody></table>`;
            }

            const filename = `tecnico_${(fullName).replace(/\s+/g,'-')}.pdf`;
            _showSaving('Generando PDF…');
            await _savePdf(html, filename);
            _hideSaving();
        } catch (e) {
            _hideSaving();
            console.error('[Reports] printTechnical:', e);
            alert('Error generando el informe técnico: ' + e.message);
        }
    }


    // ════════════════════════════════════════════════════════════════════════
    // 2. FICHA SEGUIMIENTO TRANSVERSAL
    // ════════════════════════════════════════════════════════════════════════
    async function printTransversal(studentId, promotionId) {
        const token = localStorage.getItem('token');
        try {
            const [stuRes, promoRes] = await Promise.all([
                fetch(`${API_URL}/api/promotions/${promotionId}/students/${studentId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/promotions/${promotionId}`,                       { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            if (!stuRes.ok) throw new Error('No se pudo cargar el estudiante');
            const s   = await stuRes.json();
            const promo = promoRes.ok ? await promoRes.json() : {};
            const fullName = `${s.name || ''} ${s.lastname || ''}`.trim();

            _showSaving('Generando PDF…');
            await _savePdf(_transPageHtml(s, promo), `transversal_${fullName.replace(/\s+/g,'-')}.pdf`);
            _hideSaving();
        } catch (e) {
            _hideSaving();
            console.error('[Reports] printTransversal:', e);
            alert('Error generando el informe transversal: ' + e.message);
        }
    }

    async function printBulkTransversal(studentIds, promotionId) {
        if (!studentIds?.length) { alert('Selecciona al menos un estudiante.'); return; }
        const token = localStorage.getItem('token');
        try {
            const promoRes = await fetch(`${API_URL}/api/promotions/${promotionId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const promo = promoRes.ok ? await promoRes.json() : {};
            const students = await Promise.all(studentIds.map(id => _fetchStudent(id, promotionId, token)));

            if (students.length === 1) {
                const s = students[0];
                const fullName = `${s.name||''} ${s.lastname||''}`.trim();
                _showSaving('Generando PDF…');
                await _savePdf(_transPageHtml(s, promo), `transversal_${fullName.replace(/\s+/g,'-')}.pdf`);
            } else {
                const files = [];
                for (let i = 0; i < students.length; i++) {
                    const s = students[i];
                    const fullName = `${s.name||''} ${s.lastname||''}`.trim();
                    const fname = `transversal_${fullName.replace(/\s+/g,'-')}.pdf`;
                    _showSaving(`Generando PDF ${i + 1} de ${students.length}: ${fullName}…`);
                    const blob = await _getPdfBlob(_transPageHtml(s, promo), fname);
                    files.push({ blob, filename: fname });
                }
                _showSaving(`Comprimiendo ${files.length} PDFs…`);
                await _zipAndDownload(files, `seguimiento-transversal_${(promo.name||'promo').replace(/\s+/g,'-')}.zip`);
            }
            _hideSaving();
        } catch (e) {
            _hideSaving();
            console.error('[Reports] printBulkTransversal:', e);
            alert('Error generando los informes transversales: ' + e.message);
        }
    }


    // ════════════════════════════════════════════════════════════════════════
    // 3. ACTA DE INICIO
    // ════════════════════════════════════════════════════════════════════════
async function printActaInicio(promotionId) {
    const token = localStorage.getItem('token');
    try {
        const [promoRes, extRes] = await Promise.all([
            fetch(`${API_URL}/api/promotions/${promotionId}`,              { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/api/promotions/${promotionId}/extended-info`)
        ]);
        if (!promoRes.ok) throw new Error('No se pudo cargar la promoción');
        const promo = await promoRes.json();
        const ext   = extRes.ok ? await extRes.json() : {};

        const sched = ext.schedule || {};
        const team  = ext.team || [];

        const ORANGE = '#E85D26';
        const BLUE   = '#4472C4';  // azul usado en los valores del documento real

        const style = `
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body {
                    font-family: 'Poppins', Arial, sans-serif;
                    font-size: 10pt;
                    color: #1a1a1a;
                    padding: 40pt 50pt 80pt 50pt;
                    line-height: 1.5;
                }

                /* ── Título principal ── */
                .doc-title {
                    font-size: 22pt;
                    font-weight: bold;
                    color: ${ORANGE};
                    text-align: center;
                    margin-bottom: 22pt;
                    margin-top: 10pt;
                }

                /* ── Subtítulo: nombre proyecto y fecha ── */
                .doc-meta {
                    margin-bottom: 20pt;
                }
                .doc-meta .label {
                    font-weight: bold;
                    color: ${ORANGE};
                    font-size: 11pt;
                }
                .doc-meta .value {
                    color: #1a1a1a;
                    font-size: 11pt;
                    font-style: italic;
                }
                .doc-meta .promo-name {
                    display: block;
                    font-size: 13pt;
                    font-weight: bold;
                    color: ${BLUE};
                    text-align: center;
                    margin-top: 4pt;
                    margin-bottom: 2pt;
                }
                .doc-meta .promo-sub {
                    display: block;
                    font-size: 11pt;
                    font-weight: bold;
                    color: ${BLUE};
                    text-align: center;
                    margin-bottom: 14pt;
                }
                .doc-meta .fecha-label {
                    font-weight: bold;
                    color: ${ORANGE};
                    font-size: 10.5pt;
                }
                .doc-meta .fecha-value {
                    font-style: italic;
                    color: #1a1a1a;
                    font-size: 10.5pt;
                }

                /* ── Tabla principal ── */
                .main-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20pt;
                }
                .main-table td {
                    border: 1px solid #b0b0b0;
                    padding: 10pt 12pt;
                    vertical-align: top;
                    line-height: 1.55;
                }
                /* columna izquierda: negrita, color oscuro */
                .main-table td.label {
                    width: 35%;
                    font-weight: bold;
                    color: #1a1a1a;
                    font-size: 10pt;
                }
                /* columna derecha: color naranja/azul según doc */
                .main-table td.value {
                    width: 65%;
                    color: ${BLUE};
                    font-size: 10pt;
                }
                /* filas donde el valor va en naranja (horario, responsable, formadores...) */
                .main-table td.value.orange {
                    color: ${ORANGE};
                }

                /* ── Sección aprobación ── */
                .approval {
                    margin-top: 18pt;
                    font-size: 10pt;
                }
                .approval p {
                    margin-bottom: 5pt;
                }
                .approval .al {
                    font-weight: bold;
                }
                .approval .sign-area {
                    margin-top: 30pt;
                    height: 50pt;
                    border-bottom: 1px solid #999;
                    width: 200pt;
                }

                /* ── Pie de página ── */
                .footer {
                    position: fixed;
                    bottom: 16pt;
                    right: 40pt;
                    display: flex;
                    align-items: center;
                    gap: 6pt;
                }
                .footer-badge {
                    background: ${ORANGE};
                    color: white;
                    font-size: 9pt;
                    font-weight: bold;
                    padding: 2pt 4pt;
                    border-radius: 2pt;
                }
                .footer-text {
                    font-size: 14pt;
                    font-weight: bold;
                    color: ${ORANGE};
                }
                .footer-sub {
                    font-size: 6.5pt;
                    color: #999;
                    letter-spacing: 1.2pt;
                    text-transform: uppercase;
                    display: block;
                    margin-top: -2pt;
                }
                .page-num {
                    position: fixed;
                    bottom: 16pt;
                    left: 50pt;
                    font-size: 8pt;
                    color: #aaa;
                }

                @media print {
                    body { padding: 20pt 30pt 60pt 30pt; }
                    .no-break { page-break-inside: avoid; }
                }
            </style>
        `;

        // ── Helpers para construir celdas ──
        const row = (labelHtml, valueHtml, colorClass = '') =>
            `<tr>
                <td class="label">${labelHtml}</td>
                <td class="value ${colorClass}">${valueHtml}</td>
            </tr>`;

        const esc = (v) => _esc(v);
        const val = (v) => esc(v || '—');

        // ── Horario ──
        let horarioHtml = '';
        if (sched.online)      horarioHtml += `Virtual: de ${esc(sched.online.entry||'—')} a ${esc(sched.online.finish||'—')}<br>`;
        if (sched.presential)  horarioHtml += `Presencial: de ${esc(sched.presential.entry||'—')} a ${esc(sched.presential.finish||'—')}`;
        if (!horarioHtml)      horarioHtml = '—';
        if (sched.notes)       horarioHtml += `<br><em>${esc(sched.notes)}</em>`;

        // ── Equipo por rol ──
        const byRole = (keywords) => {
            const found = team.filter(m =>
                keywords.some(k => (m.role||'').toLowerCase().includes(k))
            );
            if (!found.length) return '—';
            return found.map(m => esc(m.name + (m.period ? ` | ${m.period}` : ''))).join('<br>');
        };
        const otrosRoles = team
            .filter(m => !['responsable','project','formador','coformador','co-formador',
                           'coordinador','empleabilidad'].some(k => (m.role||'').toLowerCase().includes(k)))
            .map(m => `- ${esc(m.role||'')}: ${esc(m.name||'')}`)
            .join('<br>') || '—';

        // ── Responsable del proyecto (para sección aprobación) ──
        const responsable = team.find(m =>
            ['responsable','project'].some(k => (m.role||'').toLowerCase().includes(k))
        );

        // ── HTML ──
        let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">${style}</head><body>`;

        // Título
        html += `<div class="doc-title">Acta de inicio de proyecto formativo</div>`;

        // Meta: nombre proyecto + fecha
        html += `<div class="doc-meta">
            <span class="label">Nombre proyecto: </span>
            <span class="promo-name">${val(promo.name)}</span>
            ${promo.subtitle ? `<span class="promo-sub">${esc(promo.subtitle)}</span>` : ''}
            <br>
            <span class="fecha-label">Fecha de elaboración del acta: </span>
            <span class="fecha-value">${_today()}</span>
        </div>`;

        // Tabla principal
        html += `<table class="main-table"><tbody>`;

        html += row(
            'Escuela y/o área<br>responsable del<br>proyecto formativo',
            val(ext.school || promo.school)
        );
        html += row(
            'Tipo proyecto formativo',
            val(ext.projectType || ext.type || promo.type || 'Bootcamp')
        );
        html += row(
            'Fecha de inicio de<br>proyecto formativo',
            val(promo.startDate)
        );
        html += row(
            'Fecha de fin de<br>proyecto formativo',
            val(promo.endDate)
        );
        html += row(
            'Fecha inicio formación:',
            val(promo.startDate)
        );
        html += row(
            'Fecha de fin de<br>formación:',
            val(promo.endDate)
        );
        html += row(
            'Fecha de inicio periodo<br>salida positiva:',
            val(_fmtDateEs(ext.positiveExitStart))
        );
        html += row(
            'Fecha de fin de periodo<br>de salida positiva:',
            val(_fmtDateEs(ext.positiveExitEnd))
        );
        html += row(
            'Horas totales de<br>formación',
            val(ext.totalHours || promo.hours)
        );
        html += row(
            'Modalidad',
            val(ext.modality || promo.modality),
            'orange'
        );
        html += row(
            'Días presenciales y<br>lugar',
            val(ext.presentialDays),
            'orange'
        );
        html += row(
            'Horario',
            horarioHtml,
            'orange'
        );
        html += row(
            'Responsable del<br>proyecto',
            byRole(['responsable','project']),
            'orange'
        );
        html += row(
            'Formador/a principal',
            byRole(['formador']),
            'orange'
        );
        html += row(
            'Coformador/a',
            byRole(['coformador','co-formador']),
            'orange'
        );
        html += row(
            'Coordinador/a de<br>Formación y<br>Empleabilidad IT',
            byRole(['coordinador','empleabilidad']),
            'orange'
        );
        // fila vacía como en el documento real
        html += `<tr><td class="label"></td><td class="value"></td></tr>`;
        html += row('Otros roles:', otrosRoles, 'orange');
        html += row(
            'Materiales/recursos<br>necesarios',
            val(ext.materials),
            'orange'
        );
        html += row(
            'Período prácticas<br>(sí/no)',
            ext.internships != null ? (ext.internships ? 'Sí' : 'No') : '—',
            'orange'
        );
        html += row(
            'Financiadores',
            (ext.funders||'').split('\n').map(f => f.trim()).filter(Boolean)
                .map(f => esc(f)).join('<br>') || '—',
            'orange'
        );
        html += row(
            'Fecha de justificación a<br>cada financiador',
            val(ext.funderDeadlines),
            'orange'
        );
        html += row(
            'OKR y KPIs de FF5 en<br>este proyecto formativo',
            (ext.okrKpis||'').split('\n').map(l => l.trim()).filter(Boolean)
                .map(l => `• ${esc(l)}`).join('<br>') || '—',
            'orange'
        );
        // KPIs por financiador (format: "Funder: kpi\n---\nFunder2: kpi2")
        const kpiLines = (ext.funderKpis||'').split(/\n---\n/).map(b => {
            const m = b.match(/^([^:]+):\s*([\s\S]*)$/);
            if (!m) return esc(b.trim());
            const kpiItems = m[2].trim().split('\n').map(l => l.trim()).filter(Boolean)
                .map(l => `&nbsp;&nbsp;• ${esc(l)}`).join('<br>');
            return `<strong>${esc(m[1].trim())}:</strong><br>${kpiItems || '—'}`;
        }).filter(Boolean);
        html += row(
            'KPIs financiadores',
            kpiLines.length ? kpiLines.join('<br><br>') : '—',
            'orange'
        );
        html += row(
            'Día off Formador/a',
            (ext.trainerDayOff||'').split(/\.\s+/).map(e => e.trim().replace(/\.$/, '')).filter(Boolean)
                .map(e => esc(e)).join('<br>') || '—',
            'orange'
        );
        html += row(
            'Día off coFormador/a',
            (ext.cotrainerDayOff||'').split(/\.\s+/).map(e => e.trim().replace(/\.$/, '')).filter(Boolean)
                .map(e => esc(e)).join('<br>') || '—',
            'orange'
        );
        html += row(
            'Planificación de<br>reuniones de proyecto',
            val(ext.projectMeetings),
            'orange'
        );
        html += row(
            'Planificación de<br>reuniones de equipo<br>(formador/a-coformad<br>or/a-responsable de<br>promoción)',
            val(ext.teamMeetings),
            'orange'
        );

        html += `</tbody></table>`;

        // ── Sección aprobación (igual que en la última página del acta real) ──
        const approvalName = ext.approvalName || (responsable ? responsable.name : '');
        const approvalRole = ext.approvalRole || (responsable ? responsable.role : '');
        html += `<div class="approval">
            <p><span class="al">Aprobación y difusión del documento:</span></p>
            <br>
            <p><span class="al">Nombre:</span> ${approvalName ? esc(approvalName) : '—'}</p>
            <p><span class="al">Cargo:</span> ${approvalRole ? esc(approvalRole) : '—'}</p>
            <p><span class="al">Firma y fecha:</span> ${_today()}</p>
            <div class="sign-area"></div>
        </div>`;

        // ── Pie con logo Factoría F5 ──
        html += `
        <div class="footer">
            <div>
                <span class="footer-badge">F5</span>
                <span class="footer-text">factoría</span>
                <span class="footer-sub">powered by simplon</span>
            </div>
        </div>`;

        html += `</body></html>`;

        const filename = `acta-inicio_${(promo.name||'promo').replace(/\s+/g,'-')}.pdf`;
        _showSaving('Generando PDF…');
        await _savePdf(html, filename);
        _hideSaving();
    } catch (e) {
        _hideSaving();
        console.error('[Reports] printActaInicio:', e);
        alert('Error generando el Acta de Inicio: ' + e.message);
    }
}

    // ════════════════════════════════════════════════════════════════════════
    // 4. DESCRIPCIÓN TÉCNICA DE FORMACIÓN
    // ════════════════════════════════════════════════════════════════════════
    async function printDescripcionTecnica(promotionId) {
        const token = localStorage.getItem('token');
        try {
            const [promoRes, extRes, competencesRes] = await Promise.all([
                fetch(`${API_URL}/api/promotions/${promotionId}`,              { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/promotions/${promotionId}/extended-info`),
                fetch(`${API_URL}/api/competences`,                            { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            if (!promoRes.ok) throw new Error('No se pudo cargar la promoción');
            const promo       = await promoRes.json();
            const ext         = extRes.ok ? await extRes.json() : {};
            const allComps    = competencesRes.ok ? await competencesRes.json() : [];
            const modules     = promo.modules || [];
            const extComps    = ext.competences || [];
            const team        = ext.team || [];
            const resources   = ext.resources || [];
            const evaluation  = ext.evaluation || '';
            const sched       = ext.schedule || {};

            let html = _header(
                'Descripción Técnica de la Formación',
                promo.name,
                null,
                _today(),
                promo
            );

            // ── 1. Presentación ──
            html += `<h3>1. Presentación del Programa</h3>
            <div class="kv"><strong>Nombre:</strong> ${_esc(promo.name)}</div>
            <div class="kv"><strong>Inicio:</strong> ${_esc(promo.startDate || '—')}</div>
            <div class="kv"><strong>Fin:</strong> ${_esc(promo.endDate || '—')}</div>
            <div class="kv"><strong>Duración:</strong> ${_esc(promo.weeks || '—')} semanas</div>
            <div class="kv"><strong>Nº módulos:</strong> ${modules.length}</div>
            <div class="kv"><strong>Equipo:</strong> ${team.length} persona(s)</div>
            ${promo.description ? `<p style="margin-top:6pt;">${_esc(promo.description)}</p>` : ''}`;

            // ── 2. Equipo formativo ──
            html += `<h3>2. Equipo Formativo</h3>`;
            if (team.length) {
                html += `<table><thead><tr><th>Nombre</th><th>Rol</th><th>Email</th></tr></thead><tbody>`;
                team.forEach(m => {
                    html += `<tr><td>${_esc(m.name || '—')}</td><td>${_esc(m.role || '—')}</td><td>${_esc(m.email || '—')}</td></tr>`;
                });
                html += `</tbody></table>`;
            } else { html += `<p class="empty-note">Sin equipo registrado.</p>`; }

            // ── 3. Horario ──
            html += `<h3>3. Horario del Programa</h3>
            <h4>Online</h4>
            ${['entry','start','break','lunch','finish'].map(k =>
                sched.online?.[k] ? `<div class="kv"><strong>${_schedLabel(k)}:</strong> ${_esc(sched.online[k])}</div>` : ''
            ).join('')}
            <h4>Presencial</h4>
            ${['entry','start','break','lunch','finish'].map(k =>
                sched.presential?.[k] ? `<div class="kv"><strong>${_schedLabel(k)}:</strong> ${_esc(sched.presential[k])}</div>` : ''
            ).join('')}`;

            // ── 4. Roadmap – módulos ──
            html += `<h3>4. Roadmap – Módulos y Contenidos</h3>`;
            if (modules.length) {
                modules.forEach((mod, idx) => {
                    const courses  = mod.courses  || [];
                    const projects = mod.projects || [];
                    const pildoras = mod.pildoras || [];
                    html += `<div class="no-break" style="margin-bottom:10pt;">
                        <div style="margin-bottom:4pt;">
                            <strong>Módulo ${idx + 1}: ${_esc(mod.name)}</strong>
                            <span style="font-size:9pt; margin-left:6pt;">(${mod.duration || '?'} semanas)</span>
                        </div>`;

                    if (courses.length) {
                        html += `<div style="margin-bottom:4pt;"><strong>Cursos / Contenidos:</strong>
                            <ul style="margin:2pt 0 0 14pt; padding:0;">
                                ${courses.map(c => `<li>${_esc(c.name || '?')}${c.duration ? ` (${c.duration}d)` : ''}</li>`).join('')}
                            </ul></div>`;
                    }
                    if (projects.length) {
                        html += `<div style="margin-bottom:4pt;"><strong>Proyectos:</strong>
                            <ul style="margin:2pt 0 0 14pt; padding:0;">
                                ${projects.map(p => `<li>${_esc(p.name || '?')}</li>`).join('')}
                            </ul></div>`;
                    }
                    if (pildoras.length) {
                        html += `<div><strong>Píldoras asignadas:</strong> ${pildoras.map(p => _esc(p.title || '?')).join(', ')}</div>`;
                    }
                    html += `</div>`;
                });
            } else { html += `<p class="empty-note">Sin módulos definidos.</p>`; }

            // ── 5. Competencias del programa ──
            html += `<div class="page-break"></div><h3>5. Competencias del Programa</h3>`;
            const compsToShow = extComps.length ? extComps : allComps;
            if (compsToShow.length) {
                compsToShow.forEach(c => {
                    const areaLabel = c.area || (c.areas && c.areas[0]?.name) || '';
                    const levels = c.levels || [];
                    const tools  = c.selectedTools || c.allTools || (c.tools || []).map(t => t.name || t) || [];
                    const startMod = c.startModule?.name || '';
                    html += `<div class="no-break" style="margin-bottom:10pt;">
                        <div style="margin-bottom:3pt;">
                            <strong>${_esc(c.name)}</strong>
                            ${areaLabel ? ` — ${_esc(areaLabel)}` : ''}
                            ${startMod ? ` (desde: ${_esc(startMod)})` : ''}
                        </div>
                        ${c.description ? `<p style="font-size:9pt; margin-bottom:4pt;">${_esc(c.description)}</p>` : ''}
                        ${levels.length ? `
                        <table style="margin-bottom:0; font-size:8.5pt;">
                            <thead><tr><th style="width:60pt;">Nivel</th><th>Descripción</th><th>Indicadores</th></tr></thead>
                            <tbody>
                            ${levels.map(lv => `<tr>
                                <td>Nv.${lv.level ?? lv.levelId ?? '?'}</td>
                                <td>${_esc(lv.description || lv.levelDescription || '')}</td>
                                <td>${(lv.indicators || []).map(ind =>
                                    `<div>• ${_esc(typeof ind === 'string' ? ind : ind.name || '')}</div>`
                                ).join('')}</td>
                            </tr>`).join('')}
                            </tbody>
                        </table>` : ''}
                        ${tools.length ? `<div style="margin-top:4pt;"><strong>Herramientas:</strong> ${tools.map(t => _esc(t)).join(', ')}</div>` : ''}
                    </div>`;
                });
            } else { html += `<p class="empty-note">Sin competencias definidas en el programa.</p>`; }

            // ── 6. Sesiones de empleabilidad ──
            const empItems = (ext.pildoras || []).filter(p => p.mode === 'employability')
                .concat(promo.employability || []);
            if (empItems.length || promo.employability?.length) {
                html += `<h3>6. Sesiones de Empleabilidad</h3>`;
                const emp = promo.employability || [];
                if (emp.length) {
                    html += `<table><thead><tr><th>Nombre</th><th>Mes inicio</th><th>Duración</th></tr></thead><tbody>`;
                    emp.forEach(e => {
                        html += `<tr><td>${_esc(e.name || '—')}</td><td>Mes ${e.startMonth || '—'}</td><td>${e.duration || '—'} sem.</td></tr>`;
                    });
                    html += `</tbody></table>`;
                }
            }

            // ── 7. Recursos y materiales ──
            html += `<h3>${empItems.length ? '7' : '6'}. Recursos y Materiales</h3>`;
            if (resources.length) {
                html += `<table><thead><tr><th>Título</th><th>Categoría</th><th>URL</th></tr></thead><tbody>`;
                resources.forEach(r => {
                    html += `<tr>
                        <td>${_esc(r.title || '—')}</td>
                        <td>${_esc(r.category || '—')}</td>
                        <td>${r.url ? `<a href="${_esc(r.url)}">${_esc(r.url)}</a>` : '—'}</td>
                    </tr>`;
                });
                html += `</tbody></table>`;
            } else { html += `<p class="empty-note">Sin recursos registrados.</p>`; }

            // ── 8. Criterios de evaluación ──
            const secNum = empItems.length ? 8 : 7;
            html += `<h3>${secNum}. Criterios de Evaluación</h3>`;
            if (evaluation) {
                // evaluation may be stored as HTML (rich-text editor); render it directly
                const evalHasHtml = /<(p|ul|ol|li|br|b|strong|em|i|u)\b/i.test(evaluation);
                const evalBody = evalHasHtml
                    ? evaluation
                    : `<pre style="white-space:pre-wrap; font-family:inherit; font-size:9.5pt;">${_esc(evaluation)}</pre>`;
                html += `<div class="section-box" style="font-size:9.5pt;line-height:1.6;">${evalBody}</div>`;
            } else { html += `<p class="empty-note">Sin criterios de evaluación definidos.</p>`; }

            const filename = `descripcion-tecnica_${(promo.name||'promo').replace(/\s+/g,'-')}.pdf`;
            _showSaving('Generando PDF…');
            await _savePdf(html, filename);
            _hideSaving();
        } catch (e) {
            _hideSaving();
            console.error('[Reports] printDescripcionTecnica:', e);
            alert('Error generando la Descripción Técnica: ' + e.message);
        }
    }

    function _schedLabel(key) {
        return { entry: 'Entrada', start: 'Inicio Píldoras', break: 'Descanso', lunch: 'Comida', finish: 'Salida' }[key] || key;
    }

    // ════════════════════════════════════════════════════════════════════════
    // 5. INFORME DE PROYECTO INDIVIDUAL
    // ════════════════════════════════════════════════════════════════════════
    async function printProjectReport(teamIndex, studentId, promotionId) {
        // Read data from the already-open ficha if available (no extra fetch needed)
        const st = window.StudentTracking;
        let t  = st?._getTeam(teamIndex);
        let s  = st?._getCurrentStudent();
        let promoName = window.currentPromotion?.name || '';

        // If not available in memory, fetch fresh
        if (!t || !s) {
            const token = localStorage.getItem('token');
            try {
                const [stuRes, promoRes] = await Promise.all([
                    fetch(`${API_URL}/api/promotions/${promotionId}/students/${studentId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`${API_URL}/api/promotions/${promotionId}`,                       { headers: { 'Authorization': `Bearer ${token}` } })
                ]);
                if (!stuRes.ok) throw new Error('No se pudo cargar el estudiante');
                s = await stuRes.json();
                const promo = promoRes.ok ? await promoRes.json() : {};
                promoName = promo.name || '';
                t = (s.technicalTracking?.teams || [])[teamIndex];
            } catch (e) {
                alert('Error cargando datos: ' + e.message);
                return;
            }
        }

        if (!t) { alert('Proyecto no encontrado.'); return; }

        const fullName = `${s.name || ''} ${s.lastname || ''}`.trim();
        const PROJ_LEVEL_COLORS = { 0: 'grey', 1: 'red', 2: 'yellow', 3: 'green' };
        const PROJ_LEVEL_LABELS = { 0: 'Sin nivel', 1: 'Básico', 2: 'Medio', 3: 'Avanzado' };

        let html = _header(
            t.teamName || 'Proyecto',
            fullName,
            promoName,
            _today()
        );

        // ── Datos del proyecto ──
        const typeBadge = t.projectType === 'individual'
            ? `<span class="badge badge-info">Individual</span>`
            : `<span class="badge badge-green">Grupal</span>`;

        const typeLabel = t.projectType === 'individual' ? 'Individual' : 'Grupal';

        html += `<div class="kv"><strong>Proyecto:</strong> ${_esc(t.teamName || '—')}</div>
            <div class="kv"><strong>Tipo:</strong> ${typeLabel}</div>
            <div class="kv"><strong>Módulo:</strong> ${_esc(t.moduleName || '—')}</div>
            <div class="kv"><strong>Coder:</strong> ${_esc(fullName)}</div>
            <div class="kv"><strong>Email:</strong> ${_esc(s.email || '—')}</div>
        ${(t.members && t.members.length && t.projectType === 'grupal')
            ? `<div style="margin-top:6pt;"><strong>Integrantes del equipo:</strong>
                <ul style="margin:2pt 0 0 14pt;">
                    ${t.members.map(m => `<li>${_esc(m.name)}</li>`).join('')}
                </ul>
            </div>`
            : ''
        }`;

        // ── Nota del profesor ──
        if (t.teacherNote) {
            html += `<h3>Nota del Profesor</h3>
            <p style="font-style:italic; white-space:pre-wrap;">${_esc(t.teacherNote)}</p>`;
        }

        // ── Competencias trabajadas ──
        html += `<h3>Competencias Trabajadas</h3>`;
        const comps = t.competences || [];
        if (comps.length) {
            html += `<table>
                <thead><tr><th>Competencia</th><th>Nivel alcanzado</th><th>Herramientas</th></tr></thead>
                <tbody>`;
            comps.forEach(c => {
                const lvlColor = PROJ_LEVEL_COLORS[c.level] ?? 'grey';
                const lvlLabel = PROJ_LEVEL_LABELS[c.level] ?? `Nv.${c.level}`;
                const tools = (c.toolsUsed || [])
                    .map(tl => `<span class="badge badge-light">${_esc(tl)}</span>`)
                    .join(' ');
                html += `<tr>
                    <td><strong>${_esc(c.competenceName || '—')}</strong></td>
                    <td>${_levelBadge(c.level)}</td>
                    <td>${tools || '<span style="color:#aaa;">—</span>'}</td>
                </tr>`;
            });
            html += `</tbody></table>`;

            // Visual summary: one big card per competence with level bar
            html += `<div style="margin-top:10pt;">`;
            comps.forEach(c => {
                const pct = Math.round((c.level / 3) * 100);
                const barColor = c.level === 3 ? '#198754' : c.level === 2 ? '#ffc107' : c.level === 1 ? '#dc3545' : '#aaa';
                const tools = (c.toolsUsed || [])
                    .map(tl => `<span class="badge badge-light">${_esc(tl)}</span>`)
                    .join(' ');
                html += `<div class="section-box no-break" style="margin-bottom:7pt;">
                    <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:4pt;">
                        <strong>${_esc(c.competenceName)}</strong>
                        <span style="font-size:9pt; color:#888;">${PROJ_LEVEL_LABELS[c.level] ?? ''}</span>
                    </div>
                    <div style="background:#eee; border-radius:4pt; height:8pt; overflow:hidden; margin-bottom:5pt;">
                        <div style="width:${pct}%; height:100%; background:${barColor}; border-radius:4pt;"></div>
                    </div>
                    ${tools ? `<div class="pill-row">${tools}</div>` : ''}
                </div>`;
            });
            html += `</div>`;
        } else {
            html += `<p class="empty-note">No se registraron competencias para este proyecto.</p>`;
        }

        // ── Firmas ──
        html += `<div style="margin-top:28pt; max-width:260pt;">
            <div style="font-size:9pt; font-weight:600; margin-bottom:4pt;">Firma del/la docente</div>
            <div style="border-bottom:1.5px solid #999; height:36pt;"></div>
            <div style="font-size:8pt; margin-top:4pt;">Docente responsable</div>
        </div>`;

        const filename = `proyecto_${(t.teamName||'proyecto').replace(/\s+/g,'-')}_${(fullName).replace(/\s+/g,'-')}.pdf`;
        _previewWindow(html, filename);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 6. BULK REPORTS  (multi-student)
    // ════════════════════════════════════════════════════════════════════════

    // ── helpers shared by bulk functions ────────────────────────────────────

    /** Fetch one student with error-safe fallback */
    async function _fetchStudent(studentId, promotionId, token) {
        const res = await fetch(`${API_URL}/api/promotions/${promotionId}/students/${studentId}`,
            { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error(`No se pudo cargar el estudiante ${studentId}`);
        return res.json();
    }

    /** Builds the HTML for the technical tracking PDF page.
     * @param {object} s - Student object (must include projectsAssignments)
     * @param {object} promo - Promotion object
     * @param {string} razonInforme - Reason for the report
     * @param {Array}  modulesPildoras - Extended módules+pildoras from /modules-pildoras endpoint
     */
    function _techPageHtml(s, promo, razonInforme, modulesPildoras = []) {
        const tt = s.technicalTracking || {};
        const fullName = `${s.name || ''} ${s.lastname || ''}`.trim();
        let html = _header('Ficha de Seguimiento Técnico', fullName, promo.name, _today(), promo);

        // ── Motivo del informe ──
        html += _razonBlock(razonInforme || '');

        html += `<div class="kv"><strong>Email:</strong> ${_esc(s.email || '—')}</div>
            <div class="kv"><strong>Nacionalidad:</strong> ${_esc(s.nationality || '—')}</div>
            <div class="kv"><strong>Edad:</strong> ${_esc(s.age || '—')}</div>
            <div class="kv"><strong>Profesión:</strong> ${_esc(s.profession || '—')}</div>`;

        // ── Notas del Profesor (omitir si vacío) ──
        const notes = tt.teacherNotes || [];
        if (notes.length) {
            html += `<h3>Notas del Profesor</h3>`;
            html += `<table><thead><tr><th>Fecha</th><th>Nota</th></tr></thead><tbody>`;
            notes.forEach(n => {
                html += `<tr><td style="white-space:nowrap;">${_fmtDate(n.createdAt || n.date)}</td><td>${_esc(n.note || n.text || '')}</td></tr>`;
            });
            html += `</tbody></table>`;
        }

        // ── Proyectos Realizados ──
        html += `<h3>Proyectos Realizados</h3>`;
        const teams = tt.teams || [];
        if (teams.length) {
            teams.forEach(t => {
                const typeLabel = t.projectType === 'individual' ? 'Individual' : 'Grupal';
                const members = (t.members || []).map(m => _esc(m.name)).join(', ');
                const comps   = t.competences || [];
                html += `<div class="no-break" style="margin-bottom:10pt;">
                    <div style="margin-bottom:3pt;"><strong>${_esc(t.teamName || 'Proyecto')}</strong> — ${typeLabel}</div>
                    <div class="kv"><strong>Módulo:</strong> ${_esc(t.moduleName || '—')}</div>
                    ${members ? `<div class="kv"><strong>Compañeros:</strong> ${members}</div>` : ''}
                    ${t.teacherNote ? `<div class="kv"><em>"${_esc(t.teacherNote)}"</em></div>` : ''}
                    ${comps.length ? `
                    <div style="margin-top:4pt;">
                        <strong>Competencias:</strong>
                        <ul style="margin-top:2pt;">
                        ${comps.map(c => {
                            const tools = (c.toolsUsed || []).join(', ');
                            return `<li>${_esc(c.competenceName)} (Nivel ${c.level || '—'})${tools ? ' — ' + _esc(tools) : ''}</li>`;
                        }).join('')}
                        </ul>
                    </div>` : ''}
                </div>`;
            });
        } else { html += `<p class="empty-note">Sin proyectos registrados.</p>`; }

        // ── Proyectos Pendientes de Entrega (omitir si vacío) ──
        // Compara proyectos del roadmap con los teams ya evaluados del alumno
        const _evaluatedNames = new Set(
            (tt.teams || []).map(t => (t.teamName || '').trim().toLowerCase())
        );
        const _pendingProjects = [];
        (promo.modules || []).forEach(mod => {
            (mod.projects || []).forEach(proj => {
                const projName = typeof proj === 'string' ? proj : (proj.name || '');
                if (projName && !_evaluatedNames.has(projName.trim().toLowerCase())) {
                    _pendingProjects.push({ projectName: projName, moduleName: mod.name || '—' });
                }
            });
        });
        if (_pendingProjects.length) {
            html += `<h3>Proyectos Pendientes de Entrega</h3>`;
            html += `<table><thead><tr><th>Proyecto</th><th>Módulo</th></tr></thead><tbody>`;
            _pendingProjects.forEach(p => {
                html += `<tr><td>${_esc(p.projectName)}</td><td>${_esc(p.moduleName)}</td></tr>`;
            });
            html += `</tbody></table>`;
        }

        // ── Módulos Completados ──
        html += `<h3>Módulos Completados</h3>`;
        const mods = tt.completedModules || [];
        if (mods.length) {
            html += `<table><thead><tr><th>Módulo</th><th>Fecha</th><th>Nota</th></tr></thead><tbody>`;
            mods.forEach(m => {
                const gradeMap = { 1:'Insuficiente', 2:'Básico', 3:'Competente', 4:'Excelente' };
                html += `<tr><td>${_esc(m.moduleName||'—')}</td><td>${_fmtDate(m.completionDate)}</td><td>${gradeMap[m.finalGrade]||m.finalGrade||'—'}</td></tr>`;
            });
            html += `</tbody></table>`;
        } else { html += `<p class="empty-note">Sin módulos completados.</p>`; }

        // ── Píldoras (calculadas desde modulesPildoras si disponible) ──
        if (modulesPildoras.length) {
            const _pilPresentadas = [];
            const _pilPendientes  = [];
            modulesPildoras.forEach(mp => {
                (mp.pildoras || []).forEach(p => {
                    const sIds = (p.students || []).map(s2 => String(s2.id));
                    if (!sIds.includes(String(s.id))) return;
                    const entry = {
                        pildoraTitle: p.title || '—',
                        moduleName:   mp.moduleName || '—',
                        date:         p.date || null,
                        mode:         p.mode || null,
                        status:       p.status || ''
                    };
                    if (p.status === 'Presentada') _pilPresentadas.push(entry);
                    else                            _pilPendientes.push(entry);
                });
            });

            if (_pilPresentadas.length) {
                html += `<h3>Píldoras Presentadas</h3>`;
                html += `<table><thead><tr><th>Título</th><th>Módulo</th><th>Fecha</th><th>Modalidad</th></tr></thead><tbody>`;
                _pilPresentadas.forEach(p => {
                    html += `<tr>
                        <td>${_esc(p.pildoraTitle)}</td>
                        <td>${_esc(p.moduleName)}</td>
                        <td>${_fmtDate(p.date)}</td>
                        <td>${_esc(p.mode || '—')}</td>
                    </tr>`;
                });
                html += `</tbody></table>`;
            }

            if (_pilPendientes.length) {
                html += `<h3>Píldoras No Presentadas / Pendientes</h3>`;
                html += `<table><thead><tr><th>Título</th><th>Módulo</th><th>Fecha prevista</th><th>Estado</th></tr></thead><tbody>`;
                _pilPendientes.forEach(p => {
                    html += `<tr>
                        <td>${_esc(p.pildoraTitle)}</td>
                        <td>${_esc(p.moduleName)}</td>
                        <td>${_fmtDate(p.date)}</td>
                        <td>${_esc(p.status || 'Pendiente')}</td>
                    </tr>`;
                });
                html += `</tbody></table>`;
            }
        }

        return html;
    }

    function _transPageHtml(s, promo) {
        const tr2 = s.transversalTracking || {};
        const fullName = `${s.name || ''} ${s.lastname || ''}`.trim();
        let html = _header('Ficha de Seguimiento Transversal', fullName, promo.name, _today(), promo);

        html += `<div class="kv"><strong>Email:</strong> ${_esc(s.email || '—')}</div>
            <div class="kv"><strong>Nacionalidad:</strong> ${_esc(s.nationality || '—')}</div>
            <div class="kv"><strong>Edad:</strong> ${_esc(s.age || '—')}</div>
            <div class="kv"><strong>Profesión:</strong> ${_esc(s.profession || '—')}</div>`;

        html += `<h3>Sesiones de Empleabilidad</h3>`;
        const emp = tr2.employabilitySessions || [];
        if (emp.length) {
            html += `<table><thead><tr><th>Fecha</th><th>Tema</th><th>Notas</th></tr></thead><tbody>`;
            emp.forEach(e => { html += `<tr><td>${_fmtDate(e.date)}</td><td>${_esc(e.topic||'—')}</td><td>${_esc(e.notes||'')}</td></tr>`; });
            html += `</tbody></table>`;
        } else { html += `<p class="empty-note">Sin sesiones de empleabilidad.</p>`; }

        html += `<h3>Sesiones Individuales</h3>`;
        const ind = tr2.individualSessions || [];
        if (ind.length) {
            html += `<table><thead><tr><th>Fecha</th><th>Tema</th><th>Notas</th></tr></thead><tbody>`;
            ind.forEach(e => { html += `<tr><td>${_fmtDate(e.date)}</td><td>${_esc(e.topic||'—')}</td><td>${_esc(e.notes||'')}</td></tr>`; });
            html += `</tbody></table>`;
        } else { html += `<p class="empty-note">Sin sesiones individuales.</p>`; }

        html += `<h3>Incidencias</h3>`;
        const incs = tr2.incidents || [];
        if (incs.length) {
            html += `<table><thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Estado</th></tr></thead><tbody>`;
            incs.forEach(i => {
                html += `<tr><td>${_fmtDate(i.date)}</td><td>${_esc(i.type||'—')}</td><td>${_esc(i.description||'')}</td>
                    <td>${i.resolved?'<span class="badge badge-green">Resuelta</span>':'<span class="badge badge-red">Pendiente</span>'}</td></tr>`;
            });
            html += `</tbody></table>`;
        } else { html += `<p class="empty-note">Sin incidencias registradas.</p>`; }

        return html;
    }

    // ── 6a. Bulk Technical ───────────────────────────────────────────────────
    async function printBulkTechnical(studentIds, promotionId) {
        if (!studentIds?.length) { alert('Selecciona al menos un estudiante.'); return; }

        // Ask for reason first — null means user cancelled
        const razonInforme = await _askRazon('Informe de Seguimiento Técnico');
        if (razonInforme === null) return;

        const token = localStorage.getItem('token');
        try {
            const [promoRes, pildarasRes] = await Promise.all([
                fetch(`${API_URL}/api/promotions/${promotionId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/promotions/${promotionId}/modules-pildoras`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            const promo = promoRes.ok ? await promoRes.json() : {};
            const pildarasData = pildarasRes.ok ? await pildarasRes.json() : {};
            const modulesPildoras = pildarasData.modulesPildoras || [];
            const students = await Promise.all(studentIds.map(id => _fetchStudent(id, promotionId, token)));

            if (students.length === 1) {
                const s = students[0];
                const fullName = `${s.name||''} ${s.lastname||''}`.trim();
                _showSaving('Generando PDF…');
                await _savePdf(_techPageHtml(s, promo, razonInforme, modulesPildoras), `tecnico_${fullName.replace(/\s+/g,'-')}.pdf`);
            } else {
                // Sequential processing — one iframe at a time
                const files = [];
                for (let i = 0; i < students.length; i++) {
                    const s = students[i];
                    const fullName = `${s.name||''} ${s.lastname||''}`.trim();
                    const fname = `tecnico_${fullName.replace(/\s+/g,'-')}.pdf`;
                    _showSaving(`Generando PDF ${i + 1} de ${students.length}: ${fullName}…`);
                    const blob = await _getPdfBlob(_techPageHtml(s, promo, razonInforme, modulesPildoras), fname);
                    files.push({ blob, filename: fname });
                }
                _showSaving(`Comprimiendo ${files.length} PDFs…`);
                await _zipAndDownload(files, `seguimiento-tecnico_${(promo.name||'promo').replace(/\s+/g,'-')}.zip`);
            }
            _hideSaving();
        } catch (e) {
            _hideSaving();
            console.error('[Reports] printBulkTechnical:', e);
            alert('Error generando los informes: ' + e.message);
        }
    }


    // ── 6c. Bulk by Project (all students who participated in a specific project) ──
    // studentIds: array of IDs to process, or null/undefined = all students in the promotion
    async function printBulkByProject(projectName, promotionId, studentIds) {
        if (!projectName) { alert('Especifica el nombre del proyecto.'); return; }
        const token = localStorage.getItem('token');
        try {
            const [promoRes, studentsRes] = await Promise.all([
                fetch(`${API_URL}/api/promotions/${promotionId}`,          { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/promotions/${promotionId}/students`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            const promo       = promoRes.ok ? await promoRes.json() : {};
            const studentList = studentsRes.ok ? await studentsRes.json() : [];

            // If specific IDs were passed, restrict to those; otherwise use all
            const toFetch = studentIds?.length
                ? studentList.filter(s => studentIds.includes(s.id || s._id))
                : studentList;

            if (!toFetch.length) {
                alert('No se encontraron los estudiantes seleccionados.');
                return;
            }

            // Fetch full tracking data sequentially to avoid race conditions
            _showSaving(`Cargando datos de ${toFetch.length} coders…`);
            const fullStudents = [];
            for (const s of toFetch) {
                const sid = s.id || s._id;
                try {
                    const data = await _fetchStudent(sid, promotionId, token);
                    fullStudents.push(data);
                } catch (e) {
                    console.warn(`[Reports] No se pudo cargar el estudiante ${sid}:`, e);
                }
            }

            // Filter to those who have the project registered in their tracking
            const involved = fullStudents.filter(s =>
                (s.technicalTracking?.teams || []).some(t =>
                    (t.teamName || '').trim().toLowerCase() === projectName.trim().toLowerCase()
                )
            );

            if (!involved.length) {
                _hideSaving();
                alert(`Ninguno de los coders seleccionados tiene el proyecto "${projectName}" registrado en su seguimiento.`);
                return;
            }

            const safeProjName = projectName.replace(/\s+/g, '-');

            // Helper: build HTML for a single student's project page
            const _buildStudentProjectHtml = (s) => {
                const fullName = `${s.name||''} ${s.lastname||''}`.trim();
                let sHtml = _header(`Proyecto: ${_esc(projectName)}`, fullName, promo.name, _today(), promo);
                const projectTeams = (s.technicalTracking?.teams || []).filter(t =>
                    (t.teamName || '').toLowerCase() === projectName.toLowerCase()
                );
                projectTeams.forEach(t => {
                    const typeLabel = t.projectType === 'individual' ? 'Individual' : 'Grupal';
                    const comps = t.competences || [];
                    sHtml += `<div class="kv"><strong>Tipo:</strong> ${typeLabel}</div>
                        <div class="kv"><strong>Módulo:</strong> ${_esc(t.moduleName||'—')}</div>
                        <div class="kv"><strong>Coder:</strong> ${_esc(fullName)}</div>
                        <div class="kv"><strong>Email:</strong> ${_esc(s.email||'—')}</div>`;
                    if (t.members?.length && t.projectType === 'grupal') {
                        sHtml += `<div style="margin-top:5pt;"><strong>Integrantes del equipo:</strong>
                            <ul style="margin:2pt 0 0 14pt;">${t.members.map(m=>`<li>${_esc(m.name)}</li>`).join('')}</ul>
                        </div>`;
                    }
                    if (t.teacherNote) {
                        sHtml += `<h3>Nota del Profesor</h3>
                        <p style="font-style:italic; white-space:pre-wrap;">${_esc(t.teacherNote)}</p>`;
                    }
                    sHtml += `<h3>Competencias Trabajadas</h3>`;
                    if (comps.length) {
                        sHtml += `<table><thead><tr><th>Competencia</th><th>Nivel</th><th>Herramientas</th></tr></thead><tbody>`;
                        comps.forEach(c => {
                            const tools = (c.toolsUsed||[]).join(', ');
                            sHtml += `<tr><td><strong>${_esc(c.competenceName)}</strong></td><td>Nv.${c.level || '—'}</td><td>${tools||'—'}</td></tr>`;
                        });
                        sHtml += `</tbody></table>`;
                    } else { sHtml += `<p class="empty-note">Sin competencias evaluadas.</p>`; }
                });
                sHtml += `<div style="margin-top:28pt; max-width:260pt;">
                    <div style="font-size:9pt; font-weight:600; margin-bottom:4pt;">Firma del/la docente</div>
                    <div style="border-bottom:1.5px solid #999; height:36pt;"></div>
                    <div style="font-size:8pt; margin-top:4pt;">Docente responsable</div>
                </div>`;
                return sHtml;
            };

            if (involved.length === 1) {
                const s = involved[0];
                const fullName = `${s.name||''} ${s.lastname||''}`.trim();
                _showSaving('Generando PDF…');
                await _savePdf(_buildStudentProjectHtml(s), `proyecto_${safeProjName}_${fullName.replace(/\s+/g,'-')}.pdf`);
            } else {
                // Process sequentially (one iframe at a time) to avoid browser rendering conflicts
                const files = [];
                for (let i = 0; i < involved.length; i++) {
                    const s = involved[i];
                    const fullName = `${s.name||''} ${s.lastname||''}`.trim();
                    const fname = `proyecto_${safeProjName}_${fullName.replace(/\s+/g,'-')}.pdf`;
                    _showSaving(`Generando PDF ${i + 1} de ${involved.length}: ${fullName}…`);
                    const blob = await _getPdfBlob(_buildStudentProjectHtml(s), fname);
                    files.push({ blob, filename: fname });
                }
                _showSaving(`Comprimiendo ${files.length} PDFs…`);
                await _zipAndDownload(files, `proyecto_${safeProjName}.zip`);
            }
            _hideSaving();
        } catch (e) {
            _hideSaving();
            console.error('[Reports] printBulkByProject:', e);
            alert('Error generando el informe por proyecto: ' + e.message);
        }
    }

    // ── 6d. All-projects summary for the whole promotion ────────────────────
    async function printAllProjectsSummary(promotionId) {
        const token = localStorage.getItem('token');
        try {
            const [promoRes, studentsRes] = await Promise.all([
                fetch(`${API_URL}/api/promotions/${promotionId}`,          { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/promotions/${promotionId}/students`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            const promo    = promoRes.ok ? await promoRes.json() : {};
            const students = studentsRes.ok ? await studentsRes.json() : [];

            const fullStudents = await Promise.all(
                students.map(s => _fetchStudent(s.id, promotionId, token).catch(() => null))
            );

            // Collect all unique project names
            const projectMap = new Map(); // projectName → [{ student, team }]
            fullStudents.filter(Boolean).forEach(s => {
                (s.technicalTracking?.teams || []).forEach(t => {
                    const key = (t.teamName || 'Sin nombre').trim();
                    if (!projectMap.has(key)) projectMap.set(key, []);
                    projectMap.get(key).push({ student: s, team: t });
                });
            });

            if (!projectMap.size) {
                alert('No se encontraron proyectos registrados en esta promoción.');
                return;
            }

            let html = _header(
                'Resumen de Proyectos de la Promoción',
                `${projectMap.size} proyectos · ${fullStudents.filter(Boolean).length} coders`,
                promo.name,
                _today(),
                promo
            );

            // Overview table
            html += `<h3>Índice de Proyectos</h3>
            <table>
                <thead><tr><th>Proyecto</th><th>Tipo</th><th>Coders</th><th>Módulo</th></tr></thead>
                <tbody>`;
            projectMap.forEach((entries, name) => {
                const firstTeam = entries[0].team;
                const typeBadge = firstTeam.projectType === 'individual'
                    ? `<span class="badge badge-info">Individual</span>`
                    : `<span class="badge badge-green">Grupal</span>`;
                const coderList = entries.map(e => `${_esc(e.student.name||'')} ${_esc(e.student.lastname||'')}`.trim()).join(', ');
                html += `<tr>
                    <td><strong>${_esc(name)}</strong></td>
                    <td>${typeBadge}</td>
                    <td style="font-size:9pt;">${coderList}</td>
                    <td>${_esc(firstTeam.moduleName||'—')}</td>
                </tr>`;
            });
            html += `</tbody></table>`;

            // Detail section per project
            let projectIndex = 0;
            projectMap.forEach((entries, name) => {
                if (projectIndex > 0) html += `<div style="margin-top:18pt; padding-top:12pt; border-top:2px solid ${PRIMARY};"></div>`;
                html += `<h2 style="margin-top:14pt;">${_esc(name)}</h2>`;

                // Aggregate all competences across all students for this project
                const compAgg = new Map(); // competenceName → { levels:[], tools:Set }
                entries.forEach(({ team: t }) => {
                    (t.competences || []).forEach(c => {
                        if (!compAgg.has(c.competenceName)) compAgg.set(c.competenceName, { levels: [], tools: new Set() });
                        const agg = compAgg.get(c.competenceName);
                        agg.levels.push(c.level ?? 0);
                        (c.toolsUsed || []).forEach(tl => agg.tools.add(tl));
                    });
                });

                // Per-student mini cards
                html += `<div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:8pt; margin-bottom:8pt;">`;
                entries.forEach(({ student: s, team: t }) => {
                    const fullName = `${s.name||''} ${s.lastname||''}`.trim();
                    const comps = t.competences || [];
                    html += `<div class="section-box no-break" style="font-size:9pt;">
                        <div style="font-weight:700; font-size:10pt; margin-bottom:3pt;">${_esc(fullName)}</div>
                        <div class="kv"><strong>Email:</strong> ${_esc(s.email||'—')}</div>
                        ${comps.map(c => {
                            const tools = (c.toolsUsed||[]).map(tl=>`<span class="badge badge-light">${_esc(tl)}</span>`).join(' ');
                            return `<div style="margin-top:3pt;">${_levelBadge(c.level)} ${_esc(c.competenceName)} ${tools}</div>`;
                        }).join('')}
                        ${t.teacherNote ? `<div style="margin-top:4pt; font-style:italic; color:#666; border-top:1px solid #eee; padding-top:3pt;">"${_esc(t.teacherNote)}"</div>` : ''}
                    </div>`;
                });
                html += `</div>`;

                // Aggregated competence summary for the project
                if (compAgg.size) {
                    html += `<h3>Competencias del Proyecto (resumen)</h3>
                    <table><thead><tr><th>Competencia</th><th>Nivel medio</th><th>Herramientas</th></tr></thead><tbody>`;
                    compAgg.forEach((agg, compName) => {
                        const avg = agg.levels.reduce((a, b) => a + b, 0) / agg.levels.length;
                        const roundedAvg = Math.round(avg);
                        const tools = [...agg.tools].map(tl => `<span class="badge badge-light">${_esc(tl)}</span>`).join(' ');
                        html += `<tr>
                            <td><strong>${_esc(compName)}</strong></td>
                            <td>${_levelBadge(roundedAvg)} <span style="color:#aaa; font-size:8pt;">(media ${avg.toFixed(1)})</span></td>
                            <td>${tools || '—'}</td>
                        </tr>`;
                    });
                    html += `</tbody></table>`;
                }

                projectIndex++;
            });

            const safeProm = (promo.name||'promo').replace(/\s+/g,'-');
            _showSaving(`Generando resumen de ${projectMap.size} proyecto${projectMap.size > 1 ? 's' : ''}…`);
            await _savePdf(html, `resumen-proyectos_${safeProm}.pdf`);
            _hideSaving();
        } catch (e) {
            _hideSaving();
            console.error('[Reports] printAllProjectsSummary:', e);
            alert('Error generando el resumen de proyectos: ' + e.message);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // ACTA DE BAJA
    // ════════════════════════════════════════════════════════════════════════
    async function printActaBaja(studentId, promotionId) {
        const token = localStorage.getItem('token');
        try {
            const [stuRes, promoRes] = await Promise.all([
                fetch(`${API_URL}/api/promotions/${promotionId}/students/${studentId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/promotions/${promotionId}`,                       { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            if (!stuRes.ok) throw new Error('No se pudo cargar el estudiante');
            const s     = await stuRes.json();
            const promo = promoRes.ok ? await promoRes.json() : {};
            const w     = s.withdrawal || {};
            const fullName = `${s.name || ''} ${s.lastname || ''}`.trim();

            const bajaDate        = w.date         ? new Date(w.date).toLocaleDateString('es-ES',         { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
            const processedDate   = w.processedAt  ? new Date(w.processedAt).toLocaleDateString('es-ES',  { day: '2-digit', month: 'long', year: 'numeric' }) : _today();
            const promoStart      = promo.startDate ? new Date(promo.startDate).toLocaleDateString('es-ES',{ day: '2-digit', month: 'long', year: 'numeric' }) : '—';
            const promoEnd        = promo.endDate   ? new Date(promo.endDate).toLocaleDateString('es-ES',  { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

            let html = _header(
                'Acta de Baja',
                fullName,
                promo.name,
                processedDate,
                promo
            );

            // ── Alert banner ──
            html += `
            <div style="border:1px solid #ccc; border-radius:4pt; padding:10pt 14pt; margin-bottom:16pt;">
                <div style="font-size:11pt; font-weight:700;">🚫 Baja oficial del programa</div>
                <div style="font-size:9pt; color:#333; margin-top:2pt;">
                    Este documento certifica que el/la participante ha causado baja oficial del bootcamp
                    con fecha <strong>${bajaDate}</strong>.
                </div>
            </div>`;

            // ── Datos del participante ──
            html += `<h3>Datos del/la Participante</h3>
            <div class="kv"><strong>Nombre completo:</strong> ${_esc(fullName)}</div>
            <div class="kv"><strong>Email:</strong> ${_esc(s.email || '—')}</div>
            <div class="kv"><strong>Nacionalidad:</strong> ${_esc(s.nationality || '—')}</div>
            <div class="kv"><strong>Sit. Administrativa:</strong> ${_esc(s.administrativeSituation || '—')}</div>
            <div class="kv"><strong>Documento (DNI/NIE):</strong> ${_esc(s.identificationDocument || '—')}</div>
            <div class="kv"><strong>Nivel educativo:</strong> ${_esc(s.educationLevel || '—')}</div>
            <div class="kv"><strong>Género:</strong> ${_esc(s.gender || '—')}</div>
            <div class="kv"><strong>Profesión:</strong> ${_esc(s.profession || '—')}</div>`;

            // ── Datos del programa ──
            html += `<h3>Datos del Programa</h3>
            <div class="kv"><strong>Promoción:</strong> ${_esc(promo.name || '—')}</div>
            <div class="kv"><strong>Inicio del programa:</strong> ${promoStart}</div>
            <div class="kv"><strong>Fin previsto:</strong> ${promoEnd}</div>
            <div class="kv"><strong>Fecha oficial de baja:</strong> ${bajaDate}</div>
            <div class="kv"><strong>Representante Factoría F5:</strong> ${_esc(w.representative || '—')}</div>
            <div class="kv"><strong>Acta generada el:</strong> ${processedDate}</div>`;

            // ── Motivo de la baja ──
            html += `<h3>Motivo de la Baja</h3>
            <p style="white-space:pre-wrap; font-size:10pt; color:#333;">${_esc(w.reason || 'No especificado.')}</p>`;

            // ── Bloque de firmas ──
            html += `
            <div style="margin-top:40pt;">
                <h3>Firmas</h3>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:30pt; margin-top:16pt;">
                    <div style="border-top:1.5px solid #333; padding-top:8pt; text-align:center;">
                        <div style="font-size:9pt; font-weight:600;">PARTICIPANTE</div>
                        <div style="font-size:9pt; margin-top:4pt;">${_esc(fullName)}</div>
                    </div>
                    <div style="border-top:1.5px solid #333; padding-top:8pt; text-align:center;">
                        <div style="font-size:9pt; font-weight:600;">REPRESENTANTE FACTORÍA F5</div>
                        <div style="font-size:9pt; margin-top:4pt;">${_esc(w.representative || '—')}</div>
                    </div>
                </div>
            </div>`;

            const filename = `acta_baja_${(fullName).replace(/\s+/g, '-')}.pdf`;
            _showSaving('Generando Acta de Baja…');
            await _savePdf(html, filename);
            _hideSaving();
        } catch (e) {
            _hideSaving();
            console.error('[Reports] printActaBaja:', e);
            alert('Error generando el acta de baja: ' + e.message);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // ASISTENCIA SEMANAL (PDF)
    // ════════════════════════════════════════════════════════════════════════
    async function printWeeklyAttendance(promotionId, monthFilter = null) {
        const token = localStorage.getItem('token');
        try {
            _showSaving('Recopilando datos de asistencia...');
            const [promoRes, stuRes, collRes] = await Promise.all([
                fetch(`${API_URL}/api/promotions/${promotionId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/promotions/${promotionId}/students`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/promotions/${promotionId}/collaborators`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            
            if (!promoRes.ok) throw new Error('No se pudo cargar la promoción');
            const promo = await promoRes.json();
            const students = await stuRes.json();
            const collaborators = collRes.ok ? await collRes.json() : [];
            
            // Get holidays
            const holRes = await fetch(`${API_URL}/api/promotions/${promotionId}/holidays`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null);
            const holidays = new Set((holRes && holRes.ok ? (await holRes.json()).holidays : []) || []);

            // Determine date range for the weeks
            let pStart = promo.startDate ? new Date(promo.startDate) : new Date();
            let pEnd = promo.endDate ? new Date(promo.endDate) : new Date();

            let currentDate = new Date(pStart);
            while (currentDate.getDay() !== 1) currentDate.setDate(currentDate.getDate() - 1); // Rewind to Monday
            
            let actualEnd = new Date(pEnd);
            actualEnd.setHours(23, 59, 59, 999);
            
            const allWeeks = [];
            while (currentDate <= actualEnd) {
                const weekDates = [];
                for (let i = 0; i < 7; i++) {
                    weekDates.push(new Date(currentDate));
                    currentDate.setDate(currentDate.getDate() + 1);
                }
                if (weekDates[0] > actualEnd) break;
                allWeeks.push(weekDates);
            }

            const formatLocal = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

            // Filter weeks to match the selected month if monthFilter is given (e.g. "2026-03")
            const filteredWeeks = [];
            allWeeks.forEach((wdArray, index) => {
                const wStart = wdArray[0];
                const wEnd = wdArray[4]; // Friday
                const startStr = formatLocal(wStart);
                const endStr = formatLocal(wEnd);
                const belongsToMonth = !monthFilter || startStr.startsWith(monthFilter) || endStr.startsWith(monthFilter);
                if (new Date(`${endStr}T00:00:00`) >= pStart && new Date(`${startStr}T00:00:00`) <= pEnd && belongsToMonth) {
                    filteredWeeks.push({
                        label: `Semana ${index + 1}: ${_fmtDateEs(startStr)} al ${_fmtDateEs(endStr)}`,
                        dates: wdArray,
                        wIdx: index
                    });
                }
            });

            _hideSaving(); // Hide loading indicator before showing prompt

            if (filteredWeeks.length === 0) {
                alert('No se encontraron semanas laborables en el rango seleccionado.');
                return;
            }

            // Ask user which week they want and if they want to send it
            const selection = await _askWeekSelect('Asistencia Semanal', filteredWeeks, collaborators);
            if (selection === null) return; // User cancelled

            const selectedWeek = filteredWeeks[selection.weekIdx];

            _showSaving('Descargando datos de la semana...');

            // Fetch attendance data ONLY for the months that touch this week
            const startStr = formatLocal(selectedWeek.dates[0]);
            const endStr = formatLocal(selectedWeek.dates[4]);
            const startMonth = startStr.substring(0, 7);
            const endMonth = endStr.substring(0, 7);
            
            const monthsToFetch = new Set([startMonth, endMonth]);
            let allAttendance = [];
            for (const m of monthsToFetch) {
                const aRes = await fetch(`${API_URL}/api/promotions/${promotionId}/attendance?month=${m}`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null);
                if (aRes && aRes.ok) {
                    const data = await aRes.json();
                    if (Array.isArray(data)) allAttendance = allAttendance.concat(data);
                }
            }

            // Organize by student and date
            const attMap = {};
            allAttendance.forEach(r => {
                const sId = String(r.studentId?._id || r.studentId);
                if (!attMap[sId]) attMap[sId] = {};
                const dateKey = r.date.includes('T') ? r.date.split('T')[0] : r.date;
                attMap[sId][dateKey] = r;
            });

            const stMap = { 'Presente': 'P', 'Ausente': 'A', 'Con retraso': 'T', 'Justificado': 'J', 'Sale antes': 'S' };

            let html = _header('Informe de Asistencia Semanal', `Semana ${selectedWeek.wIdx + 1}`, promo.name, _today(), promo);

            const workDays = selectedWeek.dates.slice(0, 5);
            
            html += `
            <div class="no-break" style="margin-top:20px;">
                <h3>
                    Semana ${selectedWeek.wIdx + 1} (${_fmtDateEs(formatLocal(workDays[0]))} al ${_fmtDateEs(formatLocal(workDays[4]))})
                </h3>
                <table style="font-size:8.5pt;">
                    <thead>
                        <tr>
                            <th style="width:20%">Estudiante</th>`;
            workDays.forEach(wd => { html += `<th style="text-align:center;">${['Do','Lu','Ma','Mi','Ju','Vi','Sa'][wd.getDay()]} ${wd.getDate()}</th>`; });
            html += `       <th style="text-align:center;" title="Presentes">P</th>
                            <th style="text-align:center;" title="Ausentes">A</th>
                            <th style="text-align:center;" title="Retrasos">T</th>
                            <th style="width:25%">Comentarios</th>
                        </tr>
                    </thead>
                    <tbody>`;

            students.forEach(st => {
                const stuId = String(st.id || st._id);
                const stAtt = attMap[stuId] || {};
                let p=0, a=0, r=0;
                let marksHtml = '';
                let comments = [];

                workDays.forEach(wd => {
                    const localDateStr = formatLocal(wd);
                    const dateNum = wd.getDate();
                    const isHoliday = holidays.has(localDateStr);

                    if (isHoliday) {
                        marksHtml += `<td style="text-align:center;color:#888;background:#f9f9f9;">F</td>`;
                    } else {
                        const rec = stAtt[localDateStr];
                        let mark = '-';
                        let col = '#000';
                        if (rec) {
                            mark = stMap[rec.status] || rec.status.charAt(0);
                            if (mark === 'P') { col = '#198754'; p++; }
                            else if (mark === 'A') { col = '#dc3545'; a++; }
                            else if (mark === 'T') { col = '#fd7e14'; r++; }
                            else if (mark === 'J') { col = '#6c757d'; }
                            else if (mark === 'S') { col = '#fd7e14'; }
                            
                            if (rec.note) comments.push(`<strong>${dateNum}:</strong> ${_esc(rec.note)}`);
                        }
                        marksHtml += `<td style="text-align:center;font-weight:600;color:${col}">${mark}</td>`;
                    }
                });

                const commentText = comments.length > 0 ? comments.join('<br>') : '<span style="color:#aaa;font-size:8pt;">Sin comentarios</span>';

                html += `<tr>
                    <td><strong>${_esc(st.name)} ${_esc(st.lastname)}</strong></td>
                    ${marksHtml}
                    <td style="text-align:center;font-weight:bold;color:#198754;">${p}</td>
                    <td style="text-align:center;font-weight:bold;color:#dc3545;">${a}</td>
                    <td style="text-align:center;font-weight:bold;color:#fd7e14;">${r}</td>
                    <td style="font-size:7.5pt;line-height:1.2;">${commentText}</td>
                </tr>`;
            });

            html += `</tbody></table></div>`;

            // Leyenda
            html += `
            <div style="margin-top:15px; font-size:8pt; color:#666; padding:10px; border:1px solid #ddd; border-radius:4px; display:inline-block;">
                <strong>Leyenda:</strong> &nbsp;
                <span style="color:#198754;font-weight:bold;">P</span> = Presente &nbsp;|&nbsp;
                <span style="color:#dc3545;font-weight:bold;">A</span> = Ausente &nbsp;|&nbsp;
                <span style="color:#fd7e14;font-weight:bold;">T</span> = Con retraso &nbsp;|&nbsp;
                <span style="color:#6c757d;font-weight:bold;">J</span> = Justificado &nbsp;|&nbsp;
                <span style="color:#fd7e14;font-weight:bold;">S</span> = Sale antes &nbsp;|&nbsp;
                <span style="color:#888;">F</span> = Festivo / No laborable
            </div>`;

            const filename = `asistencia_semana_${selectedWeek.wIdx + 1}_${(promo.name || 'promo').replace(/\s+/g, '-')}`;

            if (selection.action === 'excel') {
                // ── Build Excel with SheetJS ──────────────────────────────────
                _showSaving('Generando Excel...');
                const XLSX = window.XLSX;
                if (!XLSX) throw new Error('Librería XLSX no disponible. Recarga la página.');

                const wb = XLSX.utils.book_new();

                // Header row: Estudiante | Lun dd/mm | Mar dd/mm | ... | P | A | T | Comentarios
                const dayLabels = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi'];
                const headerRow = ['Estudiante'];
                workDays.forEach((wd, i) => {
                    const dd = String(wd.getDate()).padStart(2, '0');
                    const mm = String(wd.getMonth() + 1).padStart(2, '0');
                    headerRow.push(`${dayLabels[i]} ${dd}/${mm}`);
                });
                headerRow.push('Presentes', 'Ausentes', 'Retrasos', 'Comentarios');

                const wsData = [headerRow];

                const stMapFull = { 'Presente': 'P', 'Ausente': 'A', 'Con retraso': 'T', 'Justificado': 'J', 'Sale antes': 'S' };
                students.forEach(st => {
                    const stuId = String(st.id || st._id);
                    const stAtt = attMap[stuId] || {};
                    let p = 0, a = 0, r = 0;
                    const row = [`${st.name || ''} ${st.lastname || ''}`.trim()];
                    const comments = [];

                    workDays.forEach(wd => {
                        const localDateStr = formatLocal(wd);
                        if (holidays.has(localDateStr)) {
                            row.push('F');
                        } else {
                            const rec = stAtt[localDateStr];
                            if (rec) {
                                const mark = stMapFull[rec.status] || rec.status.charAt(0);
                                row.push(mark);
                                if (mark === 'P') p++;
                                else if (mark === 'A') a++;
                                else if (mark === 'T') r++;
                                if (rec.note) comments.push(`${wd.getDate()}: ${rec.note}`);
                            } else {
                                row.push('-');
                            }
                        }
                    });

                    row.push(p, a, r, comments.join(' | '));
                    wsData.push(row);
                });

                // Legend row (blank + legend)
                wsData.push([]);
                wsData.push(['Leyenda: P=Presente  A=Ausente  T=Con retraso  J=Justificado  S=Sale antes  F=Festivo']);

                const ws = XLSX.utils.aoa_to_sheet(wsData);

                // Column widths
                ws['!cols'] = [
                    { wch: 28 }, // Estudiante
                    ...workDays.map(() => ({ wch: 10 })),
                    { wch: 10 }, { wch: 10 }, { wch: 10 }, // P A T
                    { wch: 45 }  // Comentarios
                ];

                const sheetName = `Semana ${selectedWeek.wIdx + 1}`;
                XLSX.utils.book_append_sheet(wb, ws, sheetName);

                XLSX.writeFile(wb, `${filename}.xlsx`);
                _hideSaving();

            } else if (selection.action === 'send') {
                _showSaving('Generando y enviando...');
                const pdf = await _renderToPdf(html, filename + '.pdf');
                const base64Data = pdf.output('datauristring');
                const emailRes = await fetch(`${API_URL}/api/reports/send-email`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        to: selection.email,
                        subject: `Informe de Asistencia Semanal: ${promo.name} - Semana ${selectedWeek.wIdx + 1}`,
                        body: `Hola,<br><br>Se adjunta el informe de asistencia semanal correspondiente a la <strong>Semana ${selectedWeek.wIdx + 1}</strong> de la promoción <strong>${promo.name}</strong> (${_fmtDateEs(formatLocal(selectedWeek.dates[0]))} al ${_fmtDateEs(formatLocal(selectedWeek.dates[4]))}).<br><br>Un saludo,<br>Sistema de Gestión de Bootcamps`,
                        filename: filename + '.pdf',
                        base64Data: base64Data
                    })
                });

                if (emailRes.ok) {
                    _hideSaving();
                    alert('¡Email enviado correctamente a ' + selection.email + '!');
                } else {
                    const error = await emailRes.json();
                    throw new Error(error.error || 'Error al enviar el email');
                }
            } else {
                // Default: download PDF
                _showSaving('Generando PDF...');
                const pdf = await _renderToPdf(html, filename + '.pdf');
                pdf.save(filename + '.pdf');
                _hideSaving();
            }
        } catch (e) {
            _hideSaving();
            console.error('[Reports] printWeeklyAttendance:', e);
            alert('Error generando el informe de asistencia semanal: ' + e.message);
        }
    }

    // ─── Public API ──────────────────────────────────────────────────────────
    const Reports = {
        printTechnical,
        printTransversal,
        printActaInicio,
        printActaBaja,
        printDescripcionTecnica,
        printProjectReport,
        printBulkTechnical,
        printBulkTransversal,
        printBulkByProject,
        printAllProjectsSummary,
        printWeeklyAttendance
    };
    
    // Attach to window and log availability
    window.Reports = Reports;
    //console.log('[Reports] Library initialized and attached to window.Reports');

})(window);
