# El Problema — Perspectiva de Negocio

## La cifra que lo resume

**El 85% de los modelos analíticos y estadísticos desarrollados en las organizaciones nunca llegan a producción** (Gartner/McKinsey). No es un problema de matemáticas ni de algoritmos: es un problema de **gerencia de proyectos**. Los equipos analíticos son técnicamente competentes y aun así la mayoría de su trabajo nunca genera valor de negocio, porque nadie gestionó el ciclo de vida del proyecto con el mismo rigor con que se gestionó el modelo.

## Qué le cuesta esto a una organización

- **Presupuesto que se evapora.** Un equipo de ciencia de datos es costoso — salarios, cómputo, licencias, tiempo de negocio dedicado a reuniones y validaciones. Si el 85% de lo producido no se usa, la empresa está financiando trabajo que nunca se traduce en ROI, reducción de costos o ventaja competitiva.
- **Decisiones a ciegas.** El sponsor del proyecto (gerencia, cliente interno, patrocinador) no tiene visibilidad real del avance entre una diapositiva de estado y la siguiente. Para cuando se detecta el desvío, ya no queda margen de reacción — la misma curva de degradación irreversible que describe el concepto de *Concept Drift*: sin monitoreo activo y continuo, el valor cae y no se recupera solo.
- **Responsabilidad difusa.** En equipos multidisciplinarios (Data Project Lead, Estadístico Líder, Data Engineer, MLOps Engineer) es común que una tarea crítica quede en tierra de nadie porque no existe una matriz de responsabilidades (RACI) clara ni un mecanismo que la haga cumplir en el día a día.
- **La gestión vive desconectada del trabajo real.** Existen herramientas de gestión de proyectos (Jira, Excel, reuniones de seguimiento), pero operan separadas de donde el trabajo ocurre de verdad: el repositorio de código. Esto obliga a mantener manualmente la sincronía entre "lo que dice el plan" y "lo que realmente pasó", una tarea que se abandona en cuanto hay presión de tiempo — y es justo cuando más se necesita.

## Por qué el problema es de gerencia, no de tecnología

Las diapositivas del curso GMAC lo formalizan: la gestión de proyectos analíticos exige una capa adicional sobre la gerencia clásica (PMBOK/PRINCE2) — gobierno de datos (DAMA-DMBOK), estimación bajo incertidumbre estocástica (PERT/CPM adaptado), control cuantitativo del desvío (EVM: SPI, CPI) y una matriz de riesgos específica del dominio (calidad de datos 35%, cambio de requisitos 30%, obsolescencia técnica 20%, indisponibilidad de recursos 15%). Ninguna herramienta genérica de gestión de proyectos incorpora esto de fábrica, y armarlo a mano cada vez es exactamente el trabajo que los equipos dejan de hacer bajo presión — el mismo punto ciego que produce el 85% de fracaso.

## La oportunidad

Si la gerencia de un proyecto analítico pudiera vivir **en el mismo lugar donde el equipo ya trabaja** (el repositorio) y actualizarse **automáticamente** a partir de la actividad real (issues, commits, cierres), el desvío se detectaría en el momento en que ocurre — no en el reporte trimestral — y la responsabilidad de cada tarea quedaría explícita desde el día uno. El negocio no necesita "otro dashboard más": necesita que la disciplina de gerencia deje de depender de que alguien, bajo presión, se acuerde de actualizarla a mano.

**En una frase:** el problema no es construir mejores modelos — es que las organizaciones no tienen forma barata y sostenida de gerenciar el proyecto que produce esos modelos, y por eso el 85% de ese esfuerzo se pierde antes de crear valor.
