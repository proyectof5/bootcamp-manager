import { test } from 'node:test';
import assert from 'node:assert/strict';
import { faltanDatos, estaCompleto, PENDIENTE, type Aviso } from './privacidad.ts';

const completo = (): Aviso => ({
    responsable: {
        razonSocial: 'Ejemplo, S.L.', cif: 'B00000000',
        domicilio: 'Calle Ejemplo 1, Madrid', correo: 'privacidad@ejemplo.es',
        dpd: 'dpd@ejemplo.es',
    },
    finalidades: [
        { titulo: 'Formación', descripcion: '…', baseJuridica: 'Contrato', conservacion: '4 años' },
    ],
    transferencias: 'No hay.',
    actualizado: '30 de septiembre de 2026',
});

test('un aviso completo se puede enseñar', () => {
    assert.deepEqual(faltanDatos(completo()), []);
    assert.equal(estaCompleto(completo()), true);
});

test('falta cualquier dato del responsable y no se enseña', () => {
    for (const campo of ['razonSocial', 'cif', 'domicilio', 'correo', 'dpd'] as const) {
        const a = completo();
        a.responsable[campo] = PENDIENTE;
        assert.equal(estaCompleto(a), false, `${campo} sin rellenar debería ocultarlo`);
        assert.equal(faltanDatos(a).length, 1);
    }
});

test('falta la base jurídica o el plazo de una finalidad y no se enseña', () => {
    const sinBase = completo();
    sinBase.finalidades[0].baseJuridica = PENDIENTE;
    assert.equal(estaCompleto(sinBase), false);
    assert.match(faltanDatos(sinBase)[0], /base jurídica de «formación»/);

    const sinPlazo = completo();
    sinPlazo.finalidades[0].conservacion = PENDIENTE;
    assert.equal(estaCompleto(sinPlazo), false);
    assert.match(faltanDatos(sinPlazo)[0], /cuánto se conservan/);
});

test('faltan las transferencias o la fecha y no se enseña', () => {
    const a = completo(); a.transferencias = PENDIENTE;
    assert.equal(estaCompleto(a), false);
    const b = completo(); b.actualizado = PENDIENTE;
    assert.equal(estaCompleto(b), false);
});

test('el DPD puede quedar vacío a propósito: eso no es un hueco', () => {
    const a = completo();
    a.responsable.dpd = '';          // "no procede", decisión tomada
    assert.equal(estaCompleto(a), true);
});

test('lo que falta se cuenta todo, no solo lo primero', () => {
    const a = completo();
    a.responsable.cif = PENDIENTE;
    a.actualizado = PENDIENTE;
    a.finalidades[0].conservacion = PENDIENTE;
    assert.equal(faltanDatos(a).length, 3);
});

test('el aviso real de esta aplicación todavía está incompleto', () => {
    // Se deja escrito a propósito: cuando F5 rellene el fichero, este test falla
    // y hay que cambiarlo por `estaCompleto() === true`. Es el recordatorio.
    assert.equal(estaCompleto(), false);
});
