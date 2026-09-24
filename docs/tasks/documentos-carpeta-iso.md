# Documentos para la carpeta de proyecto (norma ISO)

## Contexto

Factoría F5 mantiene por bootcamp una carpeta en Drive con una estructura fija
de 7 carpetas y ~30 subcarpetas (`Instrucciones_Carpetas.xlsx`), que es lo que
revisa una auditoría o un financiador. Montarla era todo a mano.

La app no puede llenarla entera —la mayoría son documentos que nacen fuera:
formularios firmados, CVs, cuestionarios de satisfacción, logos— pero sí puede
aportar la parte que ya tiene guardada.

## Decisiones confirmadas

- **La carpeta es para justificar subvención**, no archivo interno. Eso manda
  sobre el resto: prioridad a actas, asistencia, criterios y horas, y el formato
  importa tanto como el contenido.

- **Un solo panel, no un botón en cada sección** (Ajustes › Documentos). Quien
  entra aquí no está «exportando el horario», está montando una carpeta que va a
  revisar alguien de fuera: necesita ver de un vistazo qué hay y qué falta. Y es
  donde irá el botón del ZIP cuando exista.

- **Se dice lo que NO sale de la app.** El panel lista las subcarpetas que hay
  que rellenar a mano. Una carpeta a medias sin avisar es peor que una lista
  honesta.

- **Primitivas compartidas** en `_lib/doc-pdf.ts`: portada, secciones, tablas con
  cabecera repetida, avisos, firma y paginación. Seis generadores sueltos habrían
  dado seis documentos parecidos pero distintos, y en una carpeta de auditoría
  que parezcan el mismo documento importa.

- **Sobrio a propósito**: texto oscuro, líneas grises y el naranja solo en el
  filete de la portada. Un informe justificativo no es una landing.

## Qué cubre cada documento

| Subcarpeta | Documento | De dónde sale |
|---|---|---|
| 01.2 Diseño formación | Competencias del programa | `extendedInfo.competences` + `promotion.stack` |
| 03.1 Selección formadores | Equipo formativo | `extendedInfo.team` + módulos |
| 03.2 Plan de gestión | Horario de la formación | `schedule`, `workingDays`, `holidays`, `flexibleBlocks` |
| 03.3 Ejecución | Requisitos de superación | `passingCriteria` + `Student.completion` |
| 03.3 Ejecución | Entregas por estudiante | `projectEvaluations[].groups` |
| 03.4 Cierre | Métricas de la promoción | `GET /metrics` |

Ya existían y no se tocan: acta de inicio y de baja (02.1), asistencia en Excel
(03.3), rúbricas de competencias (03.3), informe de evaluación de proyecto
(03.3) y el sílabo.

## Estado

Hecho: las primitivas, los seis documentos, el panel y la pestaña. Verificado en
el navegador con los datos reales de la P6: los seis generan PDF (7 KB a 62 KB),
todas las peticiones 200 y ninguna consola con errores.

## Pendiente / Próximos pasos

- **El ZIP con el árbol montado** (fase 2), que es donde esto va. Su botón va en
  este mismo panel.
- **Falta la interfaz de los requisitos de superación**: los campos existen en el
  modelo y el documento los pinta, pero todavía no hay pantalla para fijar los
  criterios, aprobarlos ni decidir el apto de cada persona. Hasta que la haya, el
  documento sale con el aviso de «no aprobados» y todo el mundo «sin decidir».
- **Falta el campo `stack` en Ajustes**: la columna existe y el documento la
  pinta, pero no hay dónde escribirla.
- Las entregas se leen de `projectEvaluations[].groups`; si una entrega llega sin
  grupo (entrega individual sin grupo creado) no aparece. Revisar cuando haya
  datos reales de entregas, que hoy no los hay.

## Archivos clave

- `app/promotion/_lib/doc-pdf.ts` — primitivas de maquetación.
- `app/promotion/_lib/documentos.ts` — los seis generadores.
- `app/promotion/_components/DocumentsPanel.tsx` — el panel y la lista.
- `public/js/promotion-nav.js` — la pestaña dentro de Ajustes.
- `css/promotion-detail.css` — bloque «Ajustes › Documentos».
