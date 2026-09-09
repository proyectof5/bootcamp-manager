---
description: Arranca una feature nueva spec-first — crea el spec en docs/tasks/ ANTES de tocar código
argument-hint: <descripción de la feature>
---
El usuario quiere empezar una feature nueva: "$ARGUMENTS"

Este comando es para el PRINCIPIO de una feature (antes de implementar), no
para documentar algo ya hecho — para eso está `/spec-update`. Si "$ARGUMENTS"
ya se implementó en esta sesión, usa `/spec-new` en su lugar (mismo formato,
pero sin la fase de planificación de abajo).

Pasos:
1. Lee `docs/tasks/README.md` (plantilla y reglas) y `docs/tasks/INDEX.md`
   (para ver si ya existe un spec del área relacionada — si existe, esto es
   más `/spec-update` que un spec nuevo).
2. No implementes nada todavía. Primero entiende el pedido:
   - Si "$ARGUMENTS" ya es concreto y sin ambigüedad, resume tu entendimiento
     en 2-3 líneas antes de seguir.
   - Si falta una decisión que solo el usuario puede tomar (alcance, UX,
     dónde vive un dato, qué pasa con casos borde), pregúntalo ANTES de
     escribir el spec — no lo inventes ni lo dejes como "pendiente" si se
     puede resolver preguntando ahora.
3. Explora el código solo lo necesario para ubicar los archivos/componentes
   que la feature va a tocar (frontend `roadmap-manager-frontend`, backend
   `roadmap-manager-service`, o ambos) — no una exploración exhaustiva,
   solo suficiente para listar "Archivos clave" con precisión.
4. Escribe `docs/tasks/<nombre-kebab-case>.md` con la plantilla exacta:
   - `## Contexto` — qué pide el usuario y por qué, en sus propias palabras
     cuando sea posible.
   - `## Decisiones confirmadas` — solo lo ya confirmado con el usuario
     (en este paso o antes). Nada inventado.
   - `## Estado` — "sin empezar" (es spec-first, todavía no hay código).
   - `## Pendiente / Próximos pasos` — plan de implementación a alto nivel
     (fases si aplica, siguiendo el patrón de ramas/PR del repo) y cualquier
     pregunta que siga abierta.
   - `## Archivos clave` — los que ya se identificaron en el paso 3.
5. Actualiza `docs/tasks/INDEX.md` añadiendo la fila (🟡 o ⬜ según si ya
   hay decisiones confirmadas o solo el spec inicial).
6. Sigue el flujo de git del repo: rama fresca desde `origin/main` (nombre
   tipo `docs/<nombre-spec>`), commit solo del/de los spec(s), PR. La
   implementación en sí va en su propia rama después, cuando el usuario
   confirme que el spec está listo — este comando no escribe código de la
   feature.
