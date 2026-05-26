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
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
          rel="stylesheet"
        />
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
        {/* Bootstrap 5 JS bundle — needed for modals, toasts, dropdowns */}
        <script
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"
          async
        />
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
