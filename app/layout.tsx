import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Bootcamp Manager',
  description: 'Gestión de promociones y alumnos de bootcamp',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        {/* Bootstrap 5 CSS (CDN) ELIMINADO — spec 0014 Fase B.
            Lo reemplaza css/bootstrap-compat.css (importado en globals.css):
            Reboot + utilidades/componentes Bootstrap-only que la app usa.
            Para REVERTIR temporalmente, descomenta este <link>:
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
          rel="stylesheet"
        />
        */}
        {/* bootstrap-icons (fuente .bi) se MANTIENE: migrar iconos a lucide es
            una decisión aparte, fuera del alcance de Fase B. */}
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.2/font/bootstrap-icons.css"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Homemade+Apple&display=swap"
          rel="stylesheet"
        />
        {/* Bootstrap 5 JS bundle ELIMINADO (spec 0014 Fase A): modales → shadcn Dialog;
            toasts → showApiToast; collapse/dropdown/tabs → shim guardado en shared.js.
            reports.js degrada a defaults (sus modales guardan window.bootstrap?.Modal).
            El CSS de Bootstrap (arriba) se mantiene hasta el barrido de clases (Fase B). */}
        <link
          rel="icon"
          type="image/png"
          href="/img/favicon_bootcamp_manager.png"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
