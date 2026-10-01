/**
 * acceso.ts — con qué credencial habla el portal público con la API.
 *
 * Los endpoints de la promoción ya no están abiertos: piden el token de docente
 * (si se está previsualizando desde dentro de la aplicación) o el de invitado
 * que entrega el servidor tras la contraseña.
 */

/** Token utilizable para esta promoción, o null si no hay ninguno. */
export function credencialAcceso(promotionId: string): string | null {
    if (typeof window === 'undefined') return null;
    const docente = localStorage.getItem('token');
    if (docente) return docente;
    // El token de invitado vale solo para SU promoción: si en esta pestaña se
    // visitó otra antes, el que queda guardado daría 403 y una página vacía.
    if (sessionStorage.getItem('promotionId') === promotionId) {
        return sessionStorage.getItem('promotionAccessToken');
    }
    return null;
}

export function cabeceraAcceso(promotionId: string): Record<string, string> {
    const t = credencialAcceso(promotionId);
    return t ? { Authorization: `Bearer ${t}` } : {};
}
