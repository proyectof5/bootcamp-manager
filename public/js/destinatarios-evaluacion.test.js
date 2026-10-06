/**
 * Quién recibe el informe de evaluación y quién no.
 *
 * `promotion-detail.js` es un script de navegador de ~18 000 líneas, no un
 * módulo: no se puede importar. Como lo que hay que proteger aquí es que a
 * nadie dado de baja le llegue un correo, se extraen del fichero las dos
 * funciones puras implicadas y se evalúan en un contexto aislado. Si alguien
 * las renombra o las borra, el test falla en la extracción en vez de pasar
 * en silencio, que es lo que importa.
 *
 *   node --test public/js/destinatarios-evaluacion.test.js
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const fuente = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), 'promotion-detail.js'),
    'utf8',
);

/** Saca una `function nombre(...) { … }` completa del fichero, contando llaves. */
function extraer(nombre) {
    const inicio = fuente.indexOf(`function ${nombre}(`);
    assert.notEqual(inicio, -1, `No se encontró la función ${nombre} en promotion-detail.js`);
    let i = fuente.indexOf('{', inicio);
    let profundidad = 0;
    for (; i < fuente.length; i++) {
        if (fuente[i] === '{') profundidad++;
        else if (fuente[i] === '}' && --profundidad === 0) return fuente.slice(inicio, i + 1);
    }
    throw new Error(`Función ${nombre} sin cerrar`);
}

const { _destinatariosEvaluacion } = new Function(
    `${extraer('_esEstudianteDeBaja')}\n${extraer('_destinatariosEvaluacion')}\nreturn { _destinatariosEvaluacion };`,
)();

const activa = { id: 'a1', name: 'Ana', lastname: 'Pérez', email: 'ana@f5.org' };
const otro = { id: 'a2', name: 'Luis', lastname: 'Gil', email: 'luis@f5.org' };

test('a quien está de baja por isWithdrawn no se le envía', () => {
    const baja = { id: 'b1', name: 'Marta', lastname: 'Ruiz', email: 'marta@f5.org', isWithdrawn: true };
    const r = _destinatariosEvaluacion(['a1', 'b1'], [activa, baja]);
    assert.deepEqual(r.destinatarios.map(d => d.email), ['ana@f5.org']);
    assert.deepEqual(r.deBaja, ['Marta Ruiz']);
});

test('también cuenta la baja registrada solo en withdrawal.date', () => {
    // Las dos señales existen en los datos y no siempre viajan juntas.
    const baja = { id: 'b2', name: 'Iván', lastname: 'Soto', email: 'ivan@f5.org', withdrawal: { date: '2026-03-01' } };
    const r = _destinatariosEvaluacion(['a1', 'b2'], [activa, baja]);
    assert.deepEqual(r.destinatarios.map(d => d.email), ['ana@f5.org']);
    assert.deepEqual(r.deBaja, ['Iván Soto']);
});

test('un id que ya no corresponde a nadie no genera envío ni expone el id', () => {
    const r = _destinatariosEvaluacion(['a1', 'f9a71dca-a6d9-4a8e-accb-db98b5bb5000'], [activa]);
    assert.equal(r.destinatarios.length, 1);
    assert.equal(r.eliminados.length, 1);
    assert.equal(r.destinatarios[0].email, 'ana@f5.org');
});

test('quien no tiene correo se separa de las bajas: es otra cosa', () => {
    const sinCorreo = { id: 'c1', name: 'Rosa', lastname: 'Díaz' };
    const r = _destinatariosEvaluacion(['a1', 'c1'], [activa, sinCorreo]);
    assert.deepEqual(r.sinCorreo, ['Rosa Díaz']);
    assert.deepEqual(r.deBaja, []);
    assert.equal(r.destinatarios.length, 1);
});

test('un equipo entero de baja no deja ningún destinatario', () => {
    const b1 = { id: 'b1', name: 'Marta', lastname: 'Ruiz', email: 'm@f5.org', isWithdrawn: true };
    const b2 = { id: 'b2', name: 'Iván', lastname: 'Soto', email: 'i@f5.org', isWithdrawn: true };
    const r = _destinatariosEvaluacion(['b1', 'b2'], [b1, b2]);
    assert.equal(r.destinatarios.length, 0, 'no se envía ni un solo correo');
    assert.equal(r.deBaja.length, 2);
});

test('el equipo normal recibe todos', () => {
    const r = _destinatariosEvaluacion(['a1', 'a2'], [activa, otro]);
    assert.deepEqual(r.destinatarios.map(d => d.email), ['ana@f5.org', 'luis@f5.org']);
    assert.deepEqual([r.deBaja, r.eliminados, r.sinCorreo], [[], [], []]);
});

test('sin integrantes no revienta', () => {
    const r = _destinatariosEvaluacion([], [activa]);
    assert.deepEqual(r.destinatarios, []);
});
