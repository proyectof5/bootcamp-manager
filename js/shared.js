/**
 * shared.js — functions available on every page
 */

/**
 * Decode a JWT payload without verifying the signature.
 * Returns null if the token is malformed.
 */
function decodeJwtPayload(token) {
    try {
        const base64Url = token.split('.')[1];
        if (!base64Url) return null;
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(base64));
    } catch (e) {
        return null;
    }
}

/**
 * Returns true if the token is missing, malformed, or its exp claim is in the past.
 */
function isTokenExpired(token) {
    if (!token) return true;
    const payload = decodeJwtPayload(token);
    if (!payload) return true;
    if (!payload.exp) return false; // No expiry claim — treat as valid
    return Date.now() >= payload.exp * 1000;
}
window.isTokenExpired = isTokenExpired;

/**
 * Remove all session data from localStorage.
 */
function clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    localStorage.removeItem('userRole');
}
window.clearSession = clearSession;

/**
 * Clear session data and redirect to login page.
 * Called from navbar "Logout" links across all pages.
 */
function logout() {
    clearSession();
    window.location.href = 'login.html';
}
window.logout = logout;
