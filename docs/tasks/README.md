# docs/tasks/ — specs de trabajo por feature

Un archivo por feature/iniciativa grande (no por PR). Objetivo: que retomar
un trabajo, o entender por qué el código es como es, no requiera releer todo
el historial de conversación — con abrir este archivo basta.

Ver [INDEX.md](INDEX.md) para el mapa de todas las áreas funcionales de la
app y cuáles tienen spec todavía.

**Cuándo crear uno**: al empezar cualquier feature de varias fases/PRs, o
cualquier cosa que probablemente se retome más adelante. Usa `/spec-new
<nombre> [contexto]` para crearlo y `/spec-update <nombre>` para
actualizarlo — evita reexplorar el código de cero cuando ya hay contexto en
la sesión.

**Formato** (ver `roadmap-por-fechas.md` como ejemplo real):

```markdown
# <Nombre de la feature>

## Contexto
Por qué existe esto, qué problema resuelve. 2-4 frases.

## Decisiones confirmadas
Lista de decisiones de diseño ya tomadas con el usuario, y por qué —
sobre todo las NO obvias, las que alguien podría deshacer por error si no
sabe que ya se consideraron y descartaron otras opciones.

## Estado
Qué fases/piezas están hechas (con nº de PR y repo), cuáles pendientes.

## Pendiente / Próximos pasos
Qué falta, con el contexto mínimo para retomarlo sin releer nada más.
Si hay una pregunta abierta al usuario, se apunta aquí tal cual, sin
resolverla por adivinanza.

## Archivos clave
Rutas de los archivos que hay que tocar, con una frase de qué hace cada uno
en relación a esta feature — no un resumen del archivo entero.
```

Reglas:
- Español, igual que el resto del repo (`docs/TECH_DEBT.md`, comentarios).
- Actualizar el archivo AL TERMINAR cada fase/PR — no al final de todo.
- Si una feature termina del todo (sin pendientes), se deja el archivo como
  registro histórico — no se borra.
