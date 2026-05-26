/**
 * lib/api.ts
 * Thin fetch wrapper — replaces window.APP_CONFIG + config.js for Next.js pages.
 *
 * NEXT_PUBLIC_API_URL must be set at build time (GitHub Actions injects it
 * from the BACKEND_URL secret).  In local dev, create a .env.local file:
 *   NEXT_PUBLIC_API_URL=http://localhost:3000
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : '');

export function getApiUrl(): string {
  return API_URL;
}

/**
 * Fetch helper that:
 * - Resolves relative paths against NEXT_PUBLIC_API_URL
 * - Attaches the stored JWT as Authorization: Bearer <token>
 * - Sets Content-Type: application/json by default (pass `raw: true` to skip)
 */
export async function apiFetch(
  path: string,
  options: RequestInit & { raw?: boolean } = {},
): Promise<Response> {
  const { raw, ...fetchOptions } = options;

  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: Record<string, string> = {
    ...(raw ? {} : { 'Content-Type': 'application/json' }),
    ...(fetchOptions.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  return fetch(`${API_URL}${path}`, { ...fetchOptions, headers });
}
