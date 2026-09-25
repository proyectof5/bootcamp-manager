/**
 * carpeta-iso.ts — el árbol de la carpeta de proyecto, tal cual lo define
 * Instrucciones_Carpetas.xlsx. Extraído del propio Excel, no transcrito a mano.
 *
 * `contenido` es lo que la norma espera en cada subcarpeta; se escribe en un
 * LÉEME dentro de cada una para que quien monte la carpeta sepa qué falta sin
 * tener que abrir el Excel.
 */

export interface SubCarpeta { nombre: string; contenido: string[] }
export interface Carpeta { nombre: string; subs: SubCarpeta[] }

export const CARPETA_ISO: Carpeta[] = [
  {
    "nombre": "01 Diseño Inicial del proyecto formativo",
    "subs": [
      {
        "nombre": "01.1 Propuesta inicial diseño formativo",
        "contenido": [
          "Propuesta inicial recibida ya sea de parte del donante, de SOMOS F5 o de SIMPLON, o de alguien del equipo interno de FF5, con el contenido esencial que podría tener la nueva formación que se quiere introducir. Si no vino dada de forma externa sino que se trata de una \"innovación\" o rediseño de algún bootcamp ya existente, se incluiría aquí la primera versión borrador con la propuetsa de rediseño a discutir por el equipo."
        ]
      },
      {
        "nombre": "01.2 Diseño formación",
        "contenido": [
          "Incluir aquí toda la documentación disponible con el diseño final de la formación bootcamp (contenido final previsto, stack, road map, cualquier material adicional elaborado como parte del diseño del nuevo bootcamp, etc.)"
        ]
      },
      {
        "nombre": "01.3 Diseño transversales",
        "contenido": [
          "Incluir aquí toda la documentación disponible con el diseño final de la formación transversal que se haya considerado como básica y esencial para el nuevo bootcamp (listado y detalle de las sesiones prevista, materiales elaborados, diseño de las dinámicas, etc.)"
        ]
      },
      {
        "nombre": "01.4 Validación diseño",
        "contenido": [
          "Incluir aquí la aprobación por parte de la Responsable de Escuela (porimero) y de Pedagogía de Somos (después), del diseño de las formaciones (usar documento adjunto en enlace)."
        ]
      }
    ]
  },
  {
    "nombre": "02_Captación_coders",
    "subs": [
      {
        "nombre": "02.1 Acta de inicio",
        "contenido": [
          "se archivará aquí el acta de inicio oficial del proyecto firmada y avalada por RdE y/o PM según el caso"
        ]
      },
      {
        "nombre": "02.2 Difusión",
        "contenido": [
          "Materiales o elementos de difusión preparados para este bootcamp desde comunicación",
          "excel para seguimiento a inscripciones de coders a jornada de selección durante fase captación",
          "Copia formulario inscripción (puede ser un pdf del formulario o un enlace al formulario para que lo vean los auditores)",
          "Copia modelo formulario con ejercicios",
          "carpeta con formularios de ejercicios recibidos",
          "Logos oficiales a utilizar de F5, financiadores, etc."
        ]
      },
      {
        "nombre": "02.3 Jornada selección",
        "contenido": [
          "Trello jornada selección (basta enlace dentro del documento del Brief)",
          "Documento con el Brief de la jornada que ha de incluir obligatoriamente requisitos o criterios básicos de jornada selección",
          "Excel registro entrevistas individuales",
          "Excel regitsro observación grupal"
        ]
      },
      {
        "nombre": "02.4 Información de aspirantes",
        "contenido": [
          "Carpeta donde guardar, de cada coder, los documentos que haya que solicitar como requisitos de acceso o inscripción al bootcamp (Padrón, alta demandante empleo, etc., etc.) así como toda la documentación personal que se haya tenido que solicitar a la persona a modo de expediente."
        ]
      },
      {
        "nombre": "02.5_Inscripciones_bootcamp",
        "contenido": [
          "Carpeta donde guardar todos los documentos de inscripción formal al bootcamp + los anexos que sean necesarios en función de la información que cada bootcamp solicite al participante para inscribirse (derechos de imagen, declaración LGPD, etc. etc.)"
        ]
      },
      {
        "nombre": "02.6_Docs_entregados_coders",
        "contenido": [
          "Incluir aquí todos los documentos que se compartan de forma genérica con los coders cuando ingresan al bootcamp (entorno protector, LGPD, presentación del bootcamp, etc.)"
        ]
      }
    ]
  },
  {
    "nombre": "03_Desarrollo_formación",
    "subs": [
      {
        "nombre": "03.1_Selección_formadores",
        "contenido": [
          "Solicitud de contratación de formadores girada responsable escuela a RRHH",
          "Perfiles elaborados (DPTs) de formador, co-formador y RPs del bootcamp en cuestión"
        ]
      },
      {
        "nombre": "03.2_Plan de gestión del bootcamp",
        "contenido": [
          "Programa general de trabajo del bootcamp",
          "Manual de gestión del proyecto formativo a disposición del equipo"
        ]
      },
      {
        "nombre": "03.3_Ejecución_formación",
        "contenido": [
          "Carpeta con documentos o recursos del acto de bienvenida",
          "Registros de asistencia y justificantes de falta de asistencia en caso necesario",
          "Material de formación",
          "Proyectos de trabjo en clase",
          "Proyectos pedagógicos finales, incluyendo el Brief y la info de los jurados",
          "Documentación y registros de las tutorías individuales con los formadores",
          "rubricas de evaluación de competencias",
          "evaluación de los coders",
          "diplomas entregados",
          "documentos acto clausura formación"
        ]
      },
      {
        "nombre": "03.4_Cierre_formación",
        "contenido": [
          "Informe final evaluación bootcamps y aprendizajes obtenidos",
          "Informe técnico final",
          "Justificación económica del proyecto formativo"
        ]
      }
    ]
  },
  {
    "nombre": "04_Acompañamiento_coders",
    "subs": [
      {
        "nombre": "04.1_Acompañamiento_en_bootcamp",
        "contenido": [
          "Info y docs sobre becas",
          "CV alumnos",
          "Portfolios, github, etc.",
          "Linkedin",
          "Registro y docs generados en seguimientos individuales"
        ]
      },
      {
        "nombre": "04.2_Acompañamiento_post_bootcamp",
        "contenido": [
          "Registro de salidas positivas",
          "Acompañamiento laboral post bootcamp"
        ]
      }
    ]
  },
  {
    "nombre": "05_Evaluación_satisfacción",
    "subs": [
      {
        "nombre": "05.1_Evaluación_inicial bootcamp",
        "contenido": [
          "Modelo cuestionario evaluación inicial",
          "Cuestionarios recibidos evaluación inicial",
          "Informe extraído resultados inicial"
        ]
      },
      {
        "nombre": "05.2_Evaluación_intermedia bootcamp",
        "contenido": [
          "Modelo cuestionario evaluación intermedia",
          "Cuestionarios recibidos evaluación intermedia",
          "Informe extraído resultados intermedios"
        ]
      },
      {
        "nombre": "05.3_Evaluación_final bootcamp",
        "contenido": [
          "Modelo cuestionario evaluación final",
          "Cuestionarios recibidos evaluación final",
          "Informe extraído resultados inicial final"
        ]
      },
      {
        "nombre": "05.4 Evaluación final acompañamiento post bootcamp",
        "contenido": [
          "Modelo cuestionario evaluación final",
          "Cuestionarios recibidos evaluación final",
          "Informe extraído resultados inicial final"
        ]
      }
    ]
  },
  {
    "nombre": "06_Registro_planes",
    "subs": [
      {
        "nombre": "06.1_ Autorizaciones de cambio",
        "contenido": [
          "Archivar aquí cualquier solicitud de cambio en el proyecto aprobada por RdE y/o PM según el caso"
        ]
      },
      {
        "nombre": "06.2_ Anexos registro incidencias",
        "contenido": [
          "Archivar aquí cualquier documentación generada y vinculada a incidencias abiertas de cualquier tipo"
        ]
      }
    ]
  },
  {
    "nombre": "07_OTROS DOCS",
    "subs": []
  }
];
