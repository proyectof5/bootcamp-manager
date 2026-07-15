/**
 * lib/toast.ts
 * Bootstrap 5 toast helper — migrated from shared.js showApiToast().
 *
 * Uses DOM manipulation so it works independently of React's render cycle.
 * Bootstrap 5 is loaded via CDN <link> in app/layout.tsx.
 */

export type ToastType = 'success' | 'danger' | 'warning' | 'info';

const ICONS: Record<ToastType, string> = {
  success: 'bi-check-circle-fill',
  danger: 'bi-exclamation-triangle-fill',
  warning: 'bi-exclamation-circle-fill',
  info: 'bi-info-circle-fill',
};

export function showToast(
  message: string,
  type: ToastType = 'danger',
  delay = 4000,
): void {
  if (typeof window === 'undefined') return;

  let container = document.getElementById('api-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'api-toast-container';
    container.style.cssText =
      'position:fixed;bottom:1.25rem;right:1.25rem;z-index:9999;display:flex;flex-direction:column;gap:0.5rem;';
    document.body.appendChild(container);
  }

  const icon = ICONS[type] || ICONS.info;
  const toastEl = document.createElement('div');
  toastEl.className = `toast align-items-center text-bg-${type} border-0`;
  toastEl.setAttribute('role', 'alert');
  toastEl.setAttribute('aria-live', 'assertive');
  toastEl.setAttribute('aria-atomic', 'true');
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body d-flex align-items-center gap-2">
        <i class="bi ${icon}"></i>
        <span>${message}</span>
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto"
              data-bs-dismiss="toast" aria-label="Cerrar"></button>
    </div>`;

  container.appendChild(toastEl);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bs = (window as any).bootstrap;
  if (bs?.Toast) {
    const bsToast = new bs.Toast(toastEl, { delay });
    bsToast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
  } else {
    // Fallback if Bootstrap JS isn't loaded yet
    toastEl.style.cssText = `
      display:block;padding:0.75rem 1rem;border-radius:0.375rem;
      max-width:320px;box-shadow:0 2px 8px rgba(0,0,0,.15);`;
    setTimeout(() => toastEl.remove(), delay);
  }
}

/** Convenience aliases */
export const showSuccess = (msg: string) => showToast(msg, 'success');
export const showError = (msg: string) => showToast(msg, 'danger');
export const showWarning = (msg: string) => showToast(msg, 'warning');
export const showInfo = (msg: string) => showToast(msg, 'info');
