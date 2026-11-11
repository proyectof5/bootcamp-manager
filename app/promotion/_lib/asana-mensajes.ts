/**
 * asana-mensajes.ts — qué decirle a quien intenta exportar a Asana y no puede.
 *
 * La conexión de la cuenta de Asana vivía en Área del Docente › Accesos y se
 * movió al menú "⋯" del roadmap, que es donde se usa. Los avisos se quedaron
 * señalando el sitio viejo, así que quien lo intentaba iba a Accesos, no
 * encontraba nada y daba por hecho que no se podía conectar.
 *
 * El sitio se nombra en UNA constante: si vuelve a moverse, se cambia aquí y
 * no en los cuatro mensajes repartidos por RoadmapPanel.
 */

export type EstadoAsana = { configured?: boolean; connected?: boolean } | null | undefined;

/** Dónde está de verdad el botón de conectar la cuenta. */
export const DONDE_SE_CONECTA = 'este mismo menú ⋯ › Conectar mi cuenta';

export type AvisoAsana = {
    texto: string;
    /** Si tiene sentido ofrecerle conectar desde aquí mismo. */
    puedeConectar: boolean;
    tono: 'warning' | 'danger';
};

/**
 * El aviso que toca, o null si no hay nada que avisar.
 *
 * @param estado      lo que devuelve asanaGetStatus()
 * @param codigoError código del backend, cuando el fallo viene de una llamada
 *                    ya iniciada ('asana_not_connected' = la sesión caducó)
 */
export function mensajeAsana(estado: EstadoAsana, codigoError?: string): AvisoAsana | null {
    if (codigoError === 'asana_not_connected') {
        return {
            texto: `Tu cuenta de Asana ya no está conectada. Vuelve a conectarla en ${DONDE_SE_CONECTA}.`,
            puedeConectar: true,
            tono: 'warning',
        };
    }

    if (codigoError === 'asana_not_configured' || (estado && estado.configured === false)) {
        return {
            texto: 'La integración con Asana no está activada en el servidor. Habla con quien lo administre.',
            puedeConectar: false,
            tono: 'warning',
        };
    }

    if (!estado) {
        return {
            texto: 'No se pudo comprobar el estado de Asana. Inténtalo de nuevo.',
            puedeConectar: false,
            tono: 'danger',
        };
    }

    if (!estado.connected) {
        return {
            texto: `Conecta tu cuenta de Asana primero, en ${DONDE_SE_CONECTA}.`,
            puedeConectar: true,
            tono: 'warning',
        };
    }

    return null;
}
