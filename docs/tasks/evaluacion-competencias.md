# Evaluación de competencias / rúbricas

## Contexto

Cada proyecto evalúa un conjunto de competencias; cada competencia tiene 3
niveles (Básico/Medio/Avanzado), cada nivel un conjunto de indicadores. El
profesor marca indicadores como hechos; la app calcula automáticamente qué
nivel se ha alcanzado.

## Decisiones confirmadas

- **Regla de nivel (cambiada, ya no es la original)**: cada nivel es
  independiente — se alcanza en cuanto se marca `>= EVAL_LEVEL_THRESHOLD`
  de SUS PROPIOS indicadores, sin exigir nada del nivel anterior. Antes era
  secuencial y exigía el 100% (Básico completo para que contara Medio,
  etc.) — cambiado explícitamente a petición del usuario.
- **`EVAL_LEVEL_THRESHOLD = 0.6`** (60%) — empezó en 0.7 (70%), se bajó tras
  un caso real: con 5 indicadores, el 70% exacto (3.5) no es alcanzable con
  un número entero de indicadores, la única forma de cruzarlo era 4/5
  (80%), dejando 3/5 (60%, conceptualmente "la mayoría") fuera. Es `>=`,
  no `>`.
- **El nivel se recalcula SIEMPRE en vivo** desde `checkedIndicators`
  (nunca se lee un valor cacheado) en la vista interactiva — así que un
  cambio de `EVAL_LEVEL_THRESHOLD` afecta automáticamente a evaluaciones ya
  hechas, sin migrar datos, con solo abrir la evaluación.
- **Excepción conocida, sin resolver**: el informe PDF/email
  (`app/promotion/_lib/reports.ts`) lee un campo `level` YA GUARDADO en la
  evaluación en vez de recalcularlo — ese valor solo se refresca cuando se
  vuelve a tocar algún indicador de esa competencia y se guarda. Una
  evaluación antigua que no se vuelva a tocar puede mostrar en el PDF un
  nivel calculado con una regla/umbral ya obsoleto. Migrar/recalcular y
  reguardar el nivel de TODAS las evaluaciones existentes es una operación
  aparte, de más riesgo, no hecha sin confirmación explícita del usuario.

## Estado

- Cambio de regla (secuencial+100% → independiente+umbral) — PR #58,
  mergeado.
- Ajuste de umbral 70%→60% — PR #59, mergeado.
- Recalculado y reguardado manualmente (dry-run → confirmación → write) el
  `level` de las evaluaciones de IA School Bootcamp - P7 dos veces (al
  bajar a 70% y luego a 60%) — la única promoción migrada a mano hasta
  ahora; el resto de promociones tienen el `level` guardado con la regla
  vieja hasta que se abran/editen o se decida migrarlas también.

## Pendiente / Próximos pasos

- Decidir si se migra `level` de TODAS las evaluaciones existentes (no solo
  P7) a la regla actual — pendiente de que el usuario lo pida
  explícitamente, dado el riesgo mayor.
- Arreglar `reports.ts` para que recalcule en vez de leer `level` guardado
  (eliminaría la necesidad de migrar nada en el futuro) — no evaluado en
  detalle el coste/riesgo de este cambio.

## Archivos clave

- `public/js/promotion-detail.js` — `_computeEvalAutoLevel(checkedByLevel,
  totalByLevel)` (única función, consolida 4 sitios que antes duplicaban
  este cálculo), constante `EVAL_LEVEL_THRESHOLD`, `updateEvalIndicator`
  (handler al marcar un checkbox — el único sitio que persiste `level`).
- `app/promotion/_components/EvaluationGridPanel.tsx`,
  `EvaluationCriteria.tsx`, `ProgramCompetences.tsx` — UI (no explorados en
  profundidad todavía, solo se tocó la lógica de cálculo en
  promotion-detail.js).
- `app/promotion/_lib/reports.ts` — generador de PDF/email, lee `level`
  guardado (ver limitación conocida arriba).
