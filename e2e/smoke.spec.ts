import { test, expect } from '@playwright/test';

/**
 * Smoke e2e de la golden path. Dos bloques:
 *  1) Login — render sin auth ni backend (siempre corre).
 *  2) /promotion — render del overview con un token real (gated por env, lo corre
 *     el operador con backend en :3000; ver e2e/README.md).
 */

test.describe('login', () => {
  test('la página de login renderiza el formulario', async ({ page }) => {
    await page.goto('/login');

    // Título decorativo + campos + botón de submit.
    await expect(page.getByText('preparate para dar el salto...')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
  });

  test('abre el diálogo de "olvidé mi contraseña"', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /olvidado tu contraseña/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Restablecer contraseña')).toBeVisible();
  });
});

/**
 * Smoke autenticado de /promotion. Necesita:
 *  - Backend Express corriendo en :3000 (o E2E_API_URL apuntando a otro).
 *  - E2E_TOKEN  = un JWT válido (Bearer) de un formador/admin.
 *  - E2E_PROMO_ID = id de una promo de la que ese token sea owner (datos completos).
 *  - E2E_USER (opcional) = JSON del objeto `user` de localStorage.
 * Si falta token o promo, se salta.
 */
const TOKEN = process.env.E2E_TOKEN;
const PROMO_ID = process.env.E2E_PROMO_ID;

test.describe('promotion (autenticado)', () => {
  test.skip(!TOKEN || !PROMO_ID, 'Define E2E_TOKEN y E2E_PROMO_ID (+ backend en :3000) para correr este smoke.');

  test('el overview del programa carga título, acciones rápidas y notas', async ({ page }) => {
    const userJson = process.env.E2E_USER || '{}';
    // Sembrar sesión antes de que cargue el JS de la app.
    await page.addInitScript(([token, user]) => {
      localStorage.setItem('token', token as string);
      localStorage.setItem('user', user as string);
      localStorage.setItem('role', 'teacher');
    }, [TOKEN, userJson]);

    await page.goto(`/promotion/?id=${PROMO_ID}`);

    // Título poblado por loadPromotion (deja de ser "Loading...").
    const title = page.locator('#promotion-title');
    await expect(title).toBeVisible();
    await expect(title).not.toHaveText(/^\s*(Loading\.\.\.)?\s*$/, { timeout: 15_000 });

    // Acciones rápidas pobladas (4 tarjetas) y bloc de notas montado (portal React).
    await expect(page.locator('#quick-actions-container')).toBeVisible();
    await expect(page.locator('#notes-container')).toBeVisible();

    // Teacher-area → Evaluación: la lista de proyectos renderiza.
    await page.evaluate(() => (window as unknown as { switchTab: (t: string) => void }).switchTab('evaluation'));
    await expect(page.locator('#evaluation-content .accordion-item').first()).toBeVisible({ timeout: 15_000 });
  });
});
