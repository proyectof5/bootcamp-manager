/**
 * Aviso de privacidad (art. 13 RGPD).
 *
 * El texto sale de _lib/privacidad.ts, que es donde F5 rellena sus datos.
 * Mientras queden huecos, la página lo dice en alto: es preferible a publicar
 * un aviso con datos inventados.
 */

import type { Metadata } from 'next';
import {
    RESPONSABLE, FINALIDADES, CATEGORIAS, DESTINATARIOS,
    TRANSFERENCIAS, ACTUALIZADO, PENDIENTE, estaCompleto, faltanDatos,
} from '../_lib/privacidad';

export const metadata: Metadata = {
    title: 'Privacidad · Bootcamp Manager',
    description: 'Qué datos personales trata esta plataforma, para qué y qué derechos tienes.',
};

const Hueco = ({ que }: { que: string }) => (
    <span className="priv-hueco" title={`Pendiente de completar: ${que}`}>
        pendiente de completar
    </span>
);

const valor = (v: string, que: string) => (v === PENDIENTE ? <Hueco que={que} /> : <>{v}</>);

export default function PrivacidadPage() {
    // Sin los datos de la organización no hay aviso que dar: enseñar el
    // esqueleto con huecos sería peor que no enseñar nada. Los enlaces que
    // llevan aquí también se esconden, así que a esta pantalla solo se llega
    // escribiendo la dirección a mano.
    if (!estaCompleto()) {
        if (process.env.NODE_ENV === 'development') {
            console.warn(
                '[privacidad] El aviso está oculto porque faltan datos en app/_lib/privacidad.ts:\n  · '
                + faltanDatos().join('\n  · ')
            );
        }
        return (
            <main className="priv">
                <h1>Privacidad</h1>
                <p className="priv-entradilla">
                    Estamos preparando esta información. Si quieres saber qué datos tuyos
                    tratamos, o ejercer cualquiera de tus derechos, escribe al equipo de
                    coordinación de tu formación.
                </p>
            </main>
        );
    }

    return (
        <main className="priv">
            <h1>Privacidad</h1>
            <p className="priv-entradilla">
                Esta página explica qué datos personales trata la plataforma del bootcamp,
                para qué se usan y qué puedes pedir sobre ellos.
            </p>

            <section>
                <h2>Quién trata tus datos</h2>
                <dl className="priv-datos">
                    <dt>Responsable</dt><dd>{valor(RESPONSABLE.razonSocial, 'razón social')}</dd>
                    <dt>CIF</dt><dd>{valor(RESPONSABLE.cif, 'CIF')}</dd>
                    <dt>Domicilio</dt><dd>{valor(RESPONSABLE.domicilio, 'domicilio')}</dd>
                    <dt>Contacto</dt><dd>{valor(RESPONSABLE.correo, 'correo de contacto')}</dd>
                    <dt>Delegado de protección de datos</dt>
                    <dd>{RESPONSABLE.dpd === '' ? 'No procede.' : valor(RESPONSABLE.dpd, 'contacto del DPD')}</dd>
                </dl>
            </section>

            <section>
                <h2>Para qué los usamos</h2>
                {FINALIDADES.map((f) => (
                    <article className="priv-finalidad" key={f.titulo}>
                        <h3>{f.titulo}</h3>
                        <p>{f.descripcion}</p>
                        <p className="priv-meta">
                            <span><strong>Base jurídica:</strong> {valor(f.baseJuridica, 'base jurídica')}</span>
                            <span><strong>Conservación:</strong> {valor(f.conservacion, 'plazo de conservación')}</span>
                        </p>
                    </article>
                ))}
            </section>

            <section>
                <h2>Qué datos guardamos</h2>
                <dl className="priv-datos">
                    {CATEGORIAS.map((c) => (
                        <div key={c.grupo} className="priv-par">
                            <dt>{c.grupo}</dt><dd>{c.campos}</dd>
                        </div>
                    ))}
                </dl>
                <p className="priv-nota">
                    No se registra tu dirección IP ni el navegador que usas. Del uso del portal solo
                    se guarda la fecha del último acceso.
                </p>
            </section>

            <section>
                <h2>Quién más los ve</h2>
                <ul>{DESTINATARIOS.map((d) => <li key={d}>{d}</li>)}</ul>
                <p>
                    <strong>Fuera de la Unión Europea:</strong> {valor(TRANSFERENCIAS, 'transferencias internacionales')}
                </p>
            </section>

            <section>
                <h2>Qué puedes pedir</h2>
                <p>
                    Puedes pedir acceder a tus datos, rectificarlos si están mal, suprimirlos,
                    limitar su uso, oponerte a determinados tratamientos y recibirlos en un formato
                    portable. Para cualquiera de estas cosas, escribe a{' '}
                    {valor(RESPONSABLE.correo, 'correo de contacto')}.
                </p>
                <p>
                    Si crees que no te hemos atendido bien, puedes reclamar ante la{' '}
                    <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">
                        Agencia Española de Protección de Datos
                    </a>.
                </p>
            </section>

            <p className="priv-pie">
                Última actualización: {valor(ACTUALIZADO, 'fecha de actualización')}
            </p>
        </main>
    );
}
