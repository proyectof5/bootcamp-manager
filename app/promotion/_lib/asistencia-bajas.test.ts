import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ordenarConBajas, fechaDeBaja, yaEstabaDeBaja } from './asistencia-bajas.ts';

const ana = { id: 'a1', name: 'Ana', lastname: 'Pérez' };
const luis = { id: 'a2', name: 'Luis', lastname: 'Gil' };
const marta = { id: 'b1', name: 'Marta', lastname: 'Ruiz', isWithdrawn: true, withdrawal: { date: '2026-03-04' } };
const abel = { id: 'b2', name: 'Abel', lastname: 'Soto', isWithdrawn: true };

test('las bajas van después de todas las activas', () => {
    const { filas } = ordenarConBajas([marta, ana, abel, luis]);
    assert.deepEqual(filas.map(f => f.estudiante.name), ['Ana', 'Luis', 'Abel', 'Marta']);
});

test('la primera baja queda marcada, para poner ahí el separador', () => {
    const { filas } = ordenarConBajas([marta, ana, abel]);
    assert.deepEqual(filas.map(f => f.abreBajas), [false, true, false]);
});

test('sin ninguna baja no hay separador', () => {
    const { filas, hayBajas } = ordenarConBajas([ana, luis]);
    assert.equal(hayBajas, false);
    assert.ok(filas.every(f => !f.abreBajas));
});

test('solo bajas: el separador va en la primera fila', () => {
    const { filas, hayBajas } = ordenarConBajas([marta, abel]);
    assert.equal(hayBajas, true);
    assert.deepEqual(filas.map(f => f.abreBajas), [true, false]);
});

test('se considera baja tanto por la bandera como por la fecha', () => {
    // Las dos señales existen en los datos y no siempre viajan juntas.
    const soloFecha = { id: 'c1', name: 'Iván', lastname: 'Soto', withdrawal: { date: '2026-03-02' } };
    const { filas } = ordenarConBajas([ana, soloFecha]);
    assert.equal(filas.find(f => f.estudiante.id === 'c1').deBaja, true);
    assert.equal(filas.find(f => f.estudiante.id === 'a1').deBaja, false);
});

test('la fecha de baja se normaliza a día', () => {
    assert.equal(fechaDeBaja({ withdrawal: { date: '2026-03-04T00:00:00.000Z' } }), '2026-03-04');
    assert.equal(fechaDeBaja({ withdrawal: { date: '2026-03-04' } }), '2026-03-04');
});

test('sin fecha de baja no hay fecha', () => {
    assert.equal(fechaDeBaja(abel), null);
    assert.equal(fechaDeBaja(ana), null);
});

test('el día de la baja todavía cuenta: estuvo', () => {
    assert.equal(yaEstabaDeBaja(marta, '2026-03-04'), false);
});

test('los días posteriores a la baja ya no le pertenecen', () => {
    assert.equal(yaEstabaDeBaja(marta, '2026-03-05'), true);
    assert.equal(yaEstabaDeBaja(marta, '2026-03-20'), true);
});

test('los días anteriores a la baja son normales', () => {
    assert.equal(yaEstabaDeBaja(marta, '2026-03-02'), false);
});

test('quien está de baja sin fecha no tiene días fuera de rango', () => {
    // No se puede saber desde cuándo, así que se le trata como presente todo el período
    // en vez de inventarse un corte.
    assert.equal(yaEstabaDeBaja(abel, '2026-03-20'), false);
});

test('a quien no está de baja nunca se le corta', () => {
    assert.equal(yaEstabaDeBaja(ana, '2026-12-31'), false);
});
