/**
 * Proyectos, módulos y cursos se exportan al calendario como DOS eventos de un
 * día —Inicio y Fin— en vez de como un bloque continuo.
 *
 * gantt-adapter.js es un script de navegador y no se puede importar, así que
 * se extrae del fichero la función pura y se evalúa aislada. Si alguien la
 * renombra o la borra, el test falla en la extracción en vez de pasar en
 * silencio.
 *
 *   node --test public/js/roadmap-ics.test.js
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const fuente = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), 'gantt-adapter.js'),
    'utf8',
);

function extraer(nombre) {
    const inicio = fuente.indexOf(`function ${nombre}(`);
    assert.notEqual(inicio, -1, `No se encontró la función ${nombre} en gantt-adapter.js`);
    let i = fuente.indexOf('{', inicio);
    let profundidad = 0;
    for (; i < fuente.length; i++) {
        if (fuente[i] === '{') profundidad++;
        else if (fuente[i] === '}' && --profundidad === 0) return fuente.slice(inicio, i + 1);
    }
    throw new Error(`Función ${nombre} sin cerrar`);
}

const TIPOS = fuente.slice(fuente.indexOf('const TIPOS_PARTIDOS'), fuente.indexOf('\n', fuente.indexOf('const TIPOS_PARTIDOS')));
assert.ok(TIPOS.includes('TIPOS_PARTIDOS'), 'Falta TIPOS_PARTIDOS en gantt-adapter.js');

const { partirEventosLargos } = new Function(
    `${extraer('addDays')}\n${TIPOS}\n${extraer('partirEventosLargos')}\nreturn { partirEventosLargos };`,
)();

const d = (iso) => { const [y, m, dd] = iso.split('-').map(Number); return new Date(y, m - 1, dd); };
const iso = (fecha) => `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;

/** Un proyecto del 10 al 19 de diciembre (endDateExclusive = el 20). */
const proyecto = {
    id: 'p1', itemType: 'project', summary: 'Proyecto X (Módulo 2)', description: 'Proyecto',
    startDate: d('2026-12-10'), endDateExclusive: d('2026-12-20'), startTime: null, endTime: null,
};

const leccion = {
    id: 'l1', itemType: 'leccion', summary: 'Árboles de decisión', description: 'Lección',
    startDate: d('2026-12-11'), endDateExclusive: d('2026-12-12'), startTime: '09:00', endTime: '11:00',
};

test('un proyecto largo se parte en Inicio y Fin', () => {
    const r = partirEventosLargos([proyecto]);
    assert.equal(r.length, 2);
    assert.equal(r[0].summary, 'Inicio Proyecto X (Módulo 2)');
    assert.equal(r[1].summary, 'Fin Proyecto X (Módulo 2)');
});

test('el Inicio cae el primer día y dura solo ese día', () => {
    const [ini] = partirEventosLargos([proyecto]);
    assert.equal(iso(ini.startDate), '2026-12-10');
    assert.equal(iso(ini.endDateExclusive), '2026-12-11', 'el día siguiente: es un evento de un día');
});

test('el Fin cae el ÚLTIMO día activo, no el exclusivo', () => {
    // endDateExclusive es el 20, pero el proyecto termina el 19.
    const [, fin] = partirEventosLargos([proyecto]);
    assert.equal(iso(fin.startDate), '2026-12-19');
    assert.equal(iso(fin.endDateExclusive), '2026-12-20');
});

test('cada mitad lleva su propio identificador', () => {
    // Si compartieran UID, el calendario trataría la segunda como una
    // actualización de la primera y solo quedaría una.
    const [ini, fin] = partirEventosLargos([proyecto]);
    assert.notEqual(ini.id, fin.id);
    assert.ok(ini.id.startsWith('p1'));
    assert.ok(fin.id.startsWith('p1'));
});

test('los módulos y los cursos se parten igual', () => {
    const modulo = { ...proyecto, id: 'm1', itemType: 'module', summary: 'Módulo 2' };
    const curso = { ...proyecto, id: 'c1', itemType: 'course', summary: 'Python básico' };
    const r = partirEventosLargos([modulo, curso]);
    assert.deepEqual(r.map(e => e.summary), [
        'Inicio Módulo 2', 'Fin Módulo 2', 'Inicio Python básico', 'Fin Python básico',
    ]);
});

test('las lecciones no se tocan', () => {
    const r = partirEventosLargos([leccion]);
    assert.equal(r.length, 1);
    assert.equal(r[0].summary, 'Árboles de decisión');
    assert.equal(r[0].startTime, '09:00', 'conserva su hora');
});

test('el tiempo flexible tampoco se toca', () => {
    const flex = { ...proyecto, id: 'f1', itemType: 'flexible', summary: 'Tiempo flexible' };
    const r = partirEventosLargos([flex]);
    assert.equal(r.length, 1);
    assert.equal(r[0].summary, 'Tiempo flexible');
});

test('un proyecto de un solo día NO se duplica', () => {
    // "Inicio" y "Fin" el mismo día serían dos eventos idénticos y sin sentido.
    const corto = { ...proyecto, startDate: d('2026-12-10'), endDateExclusive: d('2026-12-11') };
    const r = partirEventosLargos([corto]);
    assert.equal(r.length, 1);
    assert.equal(r[0].summary, 'Proyecto X (Módulo 2)', 'se queda con su nombre original');
});

test('los marcadores son de día completo aunque el original tuviera hora', () => {
    // Un marcador de inicio a una hora concreta no significa nada: lo que marca
    // es el día en que arranca.
    const conHora = { ...proyecto, startTime: '09:00', endTime: '14:00' };
    const r = partirEventosLargos([conHora]);
    assert.equal(r.length, 2);
    assert.equal(r[0].startTime, null);
    assert.equal(r[1].endTime, null);
});

test('se respeta el orden de entrada', () => {
    const r = partirEventosLargos([leccion, proyecto]);
    assert.deepEqual(r.map(e => e.summary), [
        'Árboles de decisión', 'Inicio Proyecto X (Módulo 2)', 'Fin Proyecto X (Módulo 2)',
    ]);
});

test('una lista vacía no revienta', () => {
    assert.deepEqual(partirEventosLargos([]), []);
});

test('la descripción se mantiene en las dos mitades', () => {
    const [ini, fin] = partirEventosLargos([proyecto]);
    assert.equal(ini.description, 'Proyecto');
    assert.equal(fin.description, 'Proyecto');
});
