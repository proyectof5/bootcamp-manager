---
description: Actualiza un spec existente en docs/tasks/ con el progreso de esta sesión
argument-hint: <nombre-del-spec-sin-.md>
---
Actualiza `docs/tasks/$ARGUMENTS.md` con el avance de esta sesión.

Pasos:
1. Lee el archivo primero — completo.
2. Mueve a "Estado" lo que ya se completó (con nº de PR y repo si existe),
   actualiza "Pendiente / Próximos pasos" con lo que quede (borra lo que ya
   no aplique), y añade a "Decisiones confirmadas" cualquier decisión nueva
   tomada con el usuario en esta sesión que no estuviera ya ahí.
3. Edita el archivo existente — no lo reescribas desde cero. Conserva todo
   lo que sigue siendo cierto.
4. Si el archivo no existe todavía, dilo y ofrece usar `/spec-new` en su
   lugar — no lo crees aquí.
5. Commitea el cambio: si hay una rama de trabajo abierta para esta misma
   feature, va ahí; si no, una rama `docs/` fresca desde `origin/main`.
