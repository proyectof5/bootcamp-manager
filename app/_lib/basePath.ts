// Next.js solo aplica `basePath` (next.config.ts, vía NEXT_PUBLIC_BASE_PATH) a sus propios
// assets internos y a componentes como next/image o next/link. Las rutas absolutas escritas a
// mano (loadScript('/js/...'), <img src="/img/...">) no se reescriben solas, así que bajo un
// despliegue en subpath (GitHub Pages: /bootcamp-manager/) apuntarían a la raíz del dominio y
// darían 404. Este helper las prefija en runtime con el mismo basePath configurado en build.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

export function withBasePath(path: string): string {
  return `${BASE_PATH}${path}`;
}
