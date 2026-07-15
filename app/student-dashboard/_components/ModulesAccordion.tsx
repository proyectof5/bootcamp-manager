'use client';

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { ModuleData, asNamedUrl } from './types';

/**
 * Acordeón de módulos (porta renderModulesAccordion). Usa shadcn Accordion
 * (Radix) en vez del `data-bs-toggle="collapse"` legacy. Primer módulo abierto.
 */
export function ModulesAccordion({ modules }: { modules: ModuleData[] }) {
  if (!modules || modules.length === 0) return null;

  return (
    <Accordion type="single" collapsible defaultValue="item-0" className="w-full">
      {modules.map((module, index) => {
        const courses = (module.courses || []).map(asNamedUrl);
        const projects = (module.projects || []).map(asNamedUrl);
        return (
          <AccordionItem key={index} value={`item-${index}`}>
            <AccordionTrigger>
              Módulo {index + 1}: {module.name}
            </AccordionTrigger>
            <AccordionContent>
              <p className="mb-2">
                <strong>Duration:</strong> {module.duration} weeks
              </p>
              {courses.length > 0 && (
                <>
                  <h6 className="font-semibold">Temas:</h6>
                  <ul className="list-disc pl-5 mb-2">
                    {courses.map((c, i) => (
                      <li key={i}>
                        {c.url ? (
                          <a href={c.url} target="_blank" rel="noreferrer" className="text-crok hover:underline">
                            {c.name}
                          </a>
                        ) : (
                          c.name
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {projects.length > 0 && (
                <>
                  <h6 className="font-semibold">Proyectos:</h6>
                  <ul className="list-disc pl-5">
                    {projects.map((p, i) => (
                      <li key={i}>
                        {p.url ? (
                          <a href={p.url} target="_blank" rel="noreferrer" className="text-crok hover:underline">
                            {p.name}
                          </a>
                        ) : (
                          p.name
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
