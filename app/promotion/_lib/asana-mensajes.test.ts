import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mensajeAsana, DONDE_SE_CONECTA } from './asana-mensajes.ts';

test('sin configurar en el servidor: el problema no es del docente', () => {
    const m = mensajeAsana({ configured: false, connected: false });
    assert.match(m.texto, /servidor/i);
    assert.equal(m.puedeConectar, false, 'no tiene sentido ofrecerle conectar');
    assert.equal(m.tono, 'warning');
});

test('configurado pero sin conectar: se le dice DÓNDE está el botón', () => {
    const m = mensajeAsana({ configured: true, connected: false });
    assert.equal(m.puedeConectar, true);
    assert.ok(
        m.texto.includes(DONDE_SE_CONECTA),
        `el mensaje debe nombrar el sitio real; dice: "${m.texto}"`,
    );
});

test('el mensaje NO manda a Accesos, que es donde ya no está', () => {
    // La conexión de la cuenta se movió de Área del Docente › Accesos al menú
    // del roadmap. El cartel viejo mandaba a una pantalla vacía y la gente
    // abandonaba creyendo que no se podía conectar.
    const m = mensajeAsana({ configured: true, connected: false });
    assert.doesNotMatch(m.texto, /accesos/i);
    assert.doesNotMatch(m.texto, /área del docente/i);
});

test('conectado: no hay nada que avisar', () => {
    assert.equal(mensajeAsana({ configured: true, connected: true }), null);
});

test('la sesión de Asana caducada se distingue de no haber conectado nunca', () => {
    // Son dos cosas distintas para quien lo lee: "vuelve a conectarla" frente
    // a "conéctala". Las dos llevan al mismo sitio.
    const caducada = mensajeAsana({ configured: true, connected: false }, 'asana_not_connected');
    assert.match(caducada.texto, /vuelve a conectar/i);
    assert.ok(caducada.texto.includes(DONDE_SE_CONECTA));
    assert.equal(caducada.puedeConectar, true);
});

test('un estado desconocido no revienta', () => {
    const m = mensajeAsana(null);
    assert.ok(m, 'sin estado se avisa de algo');
    assert.equal(m.puedeConectar, false);
});

test('el sitio se nombra en un solo lugar', () => {
    // Si algún día se vuelve a mover, se cambia aquí y no en cuatro mensajes.
    assert.ok(DONDE_SE_CONECTA.length > 0);
    assert.doesNotMatch(DONDE_SE_CONECTA, /accesos/i);
});
