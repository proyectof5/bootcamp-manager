/**
 * doc-pdf.ts — primitivas para los documentos de la carpeta de proyecto
 * (docs/tasks/documentos-carpeta-iso.md).
 *
 * Los seis documentos que alimentan la estructura ISO comparten portada, títulos
 * de sección, tablas y pie con paginación. Sin esto serían seis generadores
 * parecidos pero distintos, y en una carpeta que revisa una auditoría el que
 * parezcan el mismo documento importa tanto como el contenido.
 *
 * El estilo sale del sílabo (_lib/syllabus-pdf.ts), pero aquí es sobrio a
 * propósito: texto oscuro, líneas grises y el naranja SOLO en el filete de la
 * portada. Un informe justificativo no es una landing.
 *
 * jsPDF se carga por CDN antes que esto (ver page.tsx) y vive en window.jspdf.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

type RGB = [number, number, number];

const C: Record<string, RGB> = {
  texto:   [17, 24, 39],
  suave:   [107, 114, 128],
  linea:   [201, 206, 212],
  fondo:   [247, 248, 250],
  marca:   [214, 57, 0],     // brand-700, el que sí contrasta
  blanco:  [255, 255, 255],
};

const MARGEN = 16;

export interface Doc {
  d: any;            // jsPDF
  y: number;
  ancho: number;
  alto: number;
}

function jsPDF(): any {
  const j = (window as any).jspdf?.jsPDF;
  if (!j) throw new Error('jsPDF no está cargado todavía. Espera a que termine de abrir la promoción.');
  return j;
}

const fecha = (d = new Date()) =>
  d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

/** Abre un documento con su portada: título, promoción y fecha de generación. */
export function nuevoDoc(titulo: string, promocion: string, subtitulo = ''): Doc {
  const JsPDF = jsPDF();
  const d = new JsPDF({ unit: 'mm', format: 'a4' });
  const ancho = d.internal.pageSize.getWidth();
  const alto = d.internal.pageSize.getHeight();

  // Filete de marca: lo único con color de la portada.
  d.setFillColor(...C.marca);
  d.rect(0, 0, ancho, 3, 'F');

  d.setTextColor(...C.suave);
  d.setFont('helvetica', 'normal');
  d.setFontSize(9);
  d.text(promocion.toUpperCase(), MARGEN, 16);

  d.setTextColor(...C.texto);
  d.setFont('helvetica', 'bold');
  d.setFontSize(18);
  const lineas = d.splitTextToSize(titulo, ancho - MARGEN * 2);
  d.text(lineas, MARGEN, 26);

  let y = 26 + lineas.length * 8;
  if (subtitulo) {
    d.setFont('helvetica', 'normal');
    d.setFontSize(10);
    d.setTextColor(...C.suave);
    d.text(d.splitTextToSize(subtitulo, ancho - MARGEN * 2), MARGEN, y);
    y += 6;
  }

  d.setFontSize(8);
  d.setTextColor(...C.suave);
  d.text(`Generado el ${fecha()} desde Bootcamp Manager`, MARGEN, y + 2);

  return { d, y: y + 12, ancho, alto };
}

/** Salta de página si no caben `necesario` mm. */
export function espacio(doc: Doc, necesario: number) {
  if (doc.y + necesario > doc.alto - MARGEN - 8) {
    doc.d.addPage();
    doc.y = MARGEN + 6;
  }
}

export function seccion(doc: Doc, texto: string) {
  espacio(doc, 16);
  doc.d.setFont('helvetica', 'bold');
  doc.d.setFontSize(11);
  doc.d.setTextColor(...C.texto);
  doc.d.text(texto, MARGEN, doc.y);
  doc.d.setLineWidth(0.4);
  doc.d.setDrawColor(...C.linea);
  doc.d.line(MARGEN, doc.y + 2, doc.ancho - MARGEN, doc.y + 2);
  doc.y += 9;
}

export function parrafo(doc: Doc, texto: string, tono: 'normal' | 'suave' = 'normal') {
  if (!texto) return;
  doc.d.setFont('helvetica', 'normal');
  doc.d.setFontSize(9.5);
  doc.d.setTextColor(...(tono === 'suave' ? C.suave : C.texto));
  const lineas = doc.d.splitTextToSize(texto, doc.ancho - MARGEN * 2);
  espacio(doc, lineas.length * 5 + 2);
  doc.d.text(lineas, MARGEN, doc.y);
  doc.y += lineas.length * 5 + 3;
}

/** Pares etiqueta/valor, para fichas. */
export function campos(doc: Doc, pares: [string, string][]) {
  doc.d.setFontSize(9.5);
  for (const [k, v] of pares) {
    espacio(doc, 7);
    doc.d.setFont('helvetica', 'bold');
    doc.d.setTextColor(...C.suave);
    doc.d.text(k, MARGEN, doc.y);
    doc.d.setFont('helvetica', 'normal');
    doc.d.setTextColor(...C.texto);
    const lineas = doc.d.splitTextToSize(v || '—', doc.ancho - MARGEN - 62);
    doc.d.text(lineas, MARGEN + 46, doc.y);
    doc.y += Math.max(6, lineas.length * 5);
  }
  doc.y += 2;
}

/**
 * Tabla con cabecera repetida en cada página. `anchos` son proporciones; si no
 * se pasan, se reparte a partes iguales.
 */
export function tabla(doc: Doc, cabeceras: string[], filas: string[][], anchos?: number[]) {
  const util = doc.ancho - MARGEN * 2;
  const props = anchos && anchos.length === cabeceras.length ? anchos : cabeceras.map(() => 1);
  const suma = props.reduce((a, b) => a + b, 0);
  const cols = props.map(p => (p / suma) * util);
  const x = (i: number) => MARGEN + cols.slice(0, i).reduce((a, b) => a + b, 0);

  const pintarCabecera = () => {
    doc.d.setFillColor(...C.fondo);
    doc.d.rect(MARGEN, doc.y - 4.5, util, 7, 'F');
    doc.d.setFont('helvetica', 'bold');
    doc.d.setFontSize(8);
    doc.d.setTextColor(...C.suave);
    cabeceras.forEach((h, i) => doc.d.text(doc.d.splitTextToSize(h, cols[i] - 3)[0], x(i) + 1.5, doc.y));
    doc.y += 5;
  };

  espacio(doc, 18);
  pintarCabecera();

  doc.d.setFont('helvetica', 'normal');
  doc.d.setFontSize(8.5);
  for (const fila of filas) {
    const trozos = fila.map((c, i) => doc.d.splitTextToSize(String(c ?? ''), cols[i] - 3));
    const altoFila = Math.max(...trozos.map((t: string[]) => t.length)) * 4 + 2.5;

    if (doc.y + altoFila > doc.alto - MARGEN - 8) {
      doc.d.addPage();
      doc.y = MARGEN + 10;
      pintarCabecera();
      doc.d.setFont('helvetica', 'normal');
      doc.d.setFontSize(8.5);
    }

    doc.d.setTextColor(...C.texto);
    trozos.forEach((t: string[], i: number) => doc.d.text(t, x(i) + 1.5, doc.y));
    doc.y += altoFila;
    doc.d.setDrawColor(...C.linea);
    doc.d.setLineWidth(0.1);
    doc.d.line(MARGEN, doc.y - 2, doc.ancho - MARGEN, doc.y - 2);
  }
  doc.y += 4;
}

/** Aviso enmarcado, para lo que el lector no puede pasar por alto. */
export function aviso(doc: Doc, texto: string) {
  const lineas = doc.d.splitTextToSize(texto, doc.ancho - MARGEN * 2 - 6);
  const alto = lineas.length * 4.5 + 6;
  espacio(doc, alto + 4);
  doc.d.setFillColor(...C.fondo);
  doc.d.setDrawColor(...C.linea);
  doc.d.setLineWidth(0.3);
  doc.d.roundedRect(MARGEN, doc.y - 4, doc.ancho - MARGEN * 2, alto, 1.5, 1.5, 'FD');
  doc.d.setFont('helvetica', 'normal');
  doc.d.setFontSize(8.5);
  doc.d.setTextColor(...C.suave);
  doc.d.text(lineas, MARGEN + 3, doc.y + 1);
  doc.y += alto + 3;
}

/** Espacio de firma, para los documentos que alguien tiene que avalar. */
export function firma(doc: Doc, nombre: string, cargo: string, cuando: string) {
  espacio(doc, 30);
  doc.y += 6;
  doc.d.setDrawColor(...C.linea);
  doc.d.setLineWidth(0.3);
  doc.d.line(MARGEN, doc.y + 12, MARGEN + 70, doc.y + 12);
  doc.d.setFont('helvetica', 'bold');
  doc.d.setFontSize(9);
  doc.d.setTextColor(...C.texto);
  doc.d.text(nombre || '—', MARGEN, doc.y + 17);
  doc.d.setFont('helvetica', 'normal');
  doc.d.setFontSize(8);
  doc.d.setTextColor(...C.suave);
  doc.d.text([cargo || '—', cuando ? `Aprobado el ${cuando}` : 'Pendiente de aprobación'], MARGEN, doc.y + 22);
  doc.y += 30;
}

/** Numera las páginas y guarda. Llamar SIEMPRE al final. */
export function guardar(doc: Doc, nombre: string) {
  const total = doc.d.internal.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.d.setPage(p);
    doc.d.setFont('helvetica', 'normal');
    doc.d.setFontSize(7.5);
    doc.d.setTextColor(...C.suave);
    doc.d.text(`${p} de ${total}`, doc.ancho - MARGEN, doc.alto - 8, { align: 'right' });
  }
  doc.d.save(nombre.replace(/[^\w\s.-]/g, '').replace(/\s+/g, '_'));
}
