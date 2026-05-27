'use client';

import { Button } from '@/components/ui/button';

/**
 * Playground del spec 0007 — verificación visual de que Tailwind + shadcn/ui
 * están instalados y los tokens del design-system se aplican correctamente.
 *
 * BORRAR esta carpeta cuando se cierre el spec 0007 (o cuando se mergee a
 * develop, lo que ocurra antes). No debe llegar a producción.
 */
export default function PlaygroundPage() {
  return (
    <div className="p-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-primary">Playground · spec 0007</h1>
        <p className="text-text-muted">
          Verificación de que Tailwind y shadcn funcionan. Esta página se borra al cerrar el spec.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Tokens del design-system</h2>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-md bg-primary px-3 py-1 text-primary-on">primary</span>
          <span className="rounded-md bg-primary-soft px-3 py-1 text-primary">primary-soft</span>
          <span className="rounded-md bg-bg-festive px-3 py-1 text-white">bg-festive</span>
          <span className="rounded-md bg-success px-3 py-1 text-white">success</span>
          <span className="rounded-md bg-warning px-3 py-1 text-white">warning</span>
          <span className="rounded-md bg-danger px-3 py-1 text-white">danger</span>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">shadcn Button variants</h2>
        <div className="flex flex-wrap gap-2">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm">Small</Button>
          <Button>Default</Button>
          <Button size="lg">Large</Button>
        </div>
      </section>
    </div>
  );
}
