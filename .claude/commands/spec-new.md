---
description: Crea un nuevo spec en docs/tasks/ para una feature, siguiendo la convención del repo
argument-hint: <nombre-kebab-case> [contexto opcional]
---
El usuario pidió crear un spec: "$ARGUMENTS"

El primer token es el nombre de archivo (kebab-case, sin `.md`); el resto,
si lo hay, es contexto opcional sobre qué debe cubrir.

Pasos:
1. Lee `docs/tasks/README.md` — plantilla y reglas de formato.
2. Lee `docs/tasks/INDEX.md` si existe, para no duplicar un spec ya creado
   para la misma área.
3. Si esta sesión ya tiene contexto reciente y sólido sobre el tema
   (conversación, exploración ya hecha en este mismo hilo), redacta el spec
   a partir de ESO. No vuelvas a explorar el código de cero si ya lo tienes.
4. Si NO hay contexto suficiente en esta sesión, dilo explícitamente y
   pregunta qué debe cubrir el spec antes de inventar nada — un spec
   incorrecto es peor que no tener spec.
5. Escribe `docs/tasks/<nombre>.md` siguiendo la plantilla exacta (Contexto,
   Decisiones confirmadas, Estado, Pendiente / Próximos pasos, Archivos
   clave) — conciso, en frases cortas, no párrafos largos. El objetivo es
   que se lea en menos de un minuto.
6. Actualiza `docs/tasks/INDEX.md` (si existe) añadiendo esta fila.
7. Seguí el flujo de git ya establecido en el repo (rama fresca desde
   `origin/main`, commit, PR) — salvo que ya haya una rama abierta para
   esta misma feature, en cuyo caso el spec va en esa misma rama/PR junto
   con el resto del trabajo.
