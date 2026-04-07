/**
 * shared.js — functions available on every page
 */

/**
 * Clear session data and redirect to login page.
 * Called from navbar "Logout" links across all pages.
 */
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    window.location.href = 'login.html';
}
window.logout = logout;
