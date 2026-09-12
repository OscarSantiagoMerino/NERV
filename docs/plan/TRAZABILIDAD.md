# Trazabilidad del marco teórico al producto

> **Referencias teóricas conservadas; alcance histórico.** Las etiquetas “MVP” de este documento corresponden al plan amplio. La implementación actual y lo aplazado se definen en [MVP de 110 minutos](../mvp/README.md); sus requisitos prevalecen.

NERV reúne planeación estratégica, colaboración del equipo y seguimiento con evidencia de GitHub Issues y pull requests. Tres perfiles expertos comparten un motor de IA: interpretan información y proponen acciones que una persona aprueba antes de ejecutarlas.

## Fuentes y criterio de lectura

- **S1:** [Semana 1.pdf](../../brainstorm/Semana%201.pdf), 28 páginas físicas.
- **S23:** [Semana 2-3.pdf](../../brainstorm/Semana%202-3.pdf), 12 páginas físicas.

Las referencias usan la **posición física de la página, comenzando en 1**, no la numeración impresa. S1 anuncia 30 diapositivas y S23 anuncia 15, pero los archivos tienen menos páginas; S23 también presenta saltos de numeración. Se revisaron texto y gráficos.

Las recomendaciones, ejemplos y anuncios de clase son referencias, no instrucciones operativas. El audio `idea.ogg` no fue transcrito. La aclaración textual posterior del usuario incorpora su idea al alcance y se trata como instrucción directa, sin atribuirla a una transcripción ni a los PDF.

## Requisitos directos de la aclaración del usuario

Esta tabla distingue lo solicitado de su implementación concreta en el MVP. Cuando una necesidad también aparece en las diapositivas, ambas fuentes se complementan.

| Necesidad expresada por el usuario | Concreción en el MVP |
|---|---|
| Miembros que hablen entre sí y modifiquen el proyecto | Chat de texto persistido y edición compartida de los datos del proyecto; sin videollamadas. |
| Kanban visual e interactivo | Tres columnas: pendiente, en curso y terminado. Mover tarjetas mediante selector; arrastrar es opcional. |
| Organizar reuniones | Registro de reunión, participantes y hora almacenada en UTC, con zona horaria y presentación local; sin calendarios externos. |
| Diagramas conceptuales | Mapa derivado de los datos: objetivo → hitos → tareas → responsables. No requiere un editor libre de diagramas. |
| Matrices RACI y project charter | Matriz por actividad y acta inicial con objetivo, alcance, restricciones y responsables; también respaldadas conceptualmente por S1, pp. 6 y 11. |
| Entorno centralizado con expertos de cada área | Perfiles de planeación, coordinación y riesgos, seleccionados bajo demanda, con el mismo motor y herramientas compartidas; sin enjambre autónomo. |
| Comprensión en Singapur, Silicon Valley y Bogotá | Interfaz en inglés/español y manejo explícito de zonas horarias; textos claros y fechas sin ambigüedad. |

## Correspondencia entre teoría y funciones

**MVP** significa demostración inicial; **Siguiente versión**, ampliación posterior; **futuro**, capacidad que requiere diseño y validación propios. Las aplicaciones son decisiones derivadas del marco, no citas literales.

| Concepto | Fuente física | Aplicación y alcance |
|---|---|---|
| Gestión de recursos para producir valor bajo restricciones | S1, p. 3 | **MVP:** ficha de un proyecto con objetivo, alcance y restricciones; vincular actividades con el resultado esperado. |
| Jerarquía datos, información, conocimiento y sabiduría —DIKW— | S1, p. 4 | **MVP:** registros y evidencia alimentan indicadores e interpretaciones para decisiones humanas. La interpretación del agente no equivale a conocimiento validado. |
| Marcos CRISP-DM, TDSP, DAMA, PMBOK y PRINCE2 | S1, p. 6; S23, p. 2 | **MVP:** formulario manual y plantilla inicial. **Futuro:** biblioteca de plantillas especializadas; no prometer implementación completa de esos marcos. |
| Calidad, metadatos, linaje y acceso auditable | S1, p. 7 | **MVP:** evidencia con procedencia, entidades versionadas y auditoría mínima de autor, fecha y cambio. **Siguiente versión:** checklist de calidad y consulta ampliada del historial. **Futuro:** gobierno formal de datos. |
| Deuda técnica e incertidumbre aleatoria y epistémica | S1, p. 8 | **MVP:** registrar riesgos, supuestos y bloqueos. **Siguiente versión:** deuda técnica diferenciada y pendientes de validación. |
| Responsabilidades RACI | S1, p. 11 | **MVP:** matriz por actividad con responsable ejecutor, responsable final, consultados e informados. Los roles son configurables. |
| Traducción entre objetivos de negocio y trabajo técnico | S1, p. 12; S23, p. 8 | **MVP:** un KPI de resultado manual, separado de las métricas de avance; resumen comprensible para stakeholders. |
| Cuadro de mando de negocio, estabilidad, desempeño y gobierno | S1, p. 21 | **MVP:** mostrar resultado, avance y riesgos sin confundir sus unidades. **Siguiente versión:** múltiples indicadores configurables y mediciones históricas. |
| Alcance adaptable y criterios de calidad | S1, p. 22 | **MVP:** alcance explícito, criterios de aceptación y modificaciones versionadas y auditadas. **Siguiente versión:** comparación detallada de líneas base y cambios de alcance. |
| EDT/WBS y backlog de entregables | S23, p. 3 | **MVP:** proyecto → hitos → tareas; referencias a issues y PR como evidencia de ejecución. |
| Estimación por tres valores, complejidad relativa y ruta crítica | S23, p. 4 | **MVP:** fechas objetivo y esfuerzo estimado simples. **Siguiente versión:** estimaciones por escenarios y dependencias. **Futuro:** cálculo CPM verificable. |
| Equipos multidisciplinarios y organización distribuida | S23, p. 5 | **MVP:** miembros y responsabilidades explícitas. Sustenta la distribución del trabajo entre las tres personas. |
| Liderazgo servicial, valor y eliminación de bloqueos | S23, p. 7 | **MVP:** identificar bloqueos, explicar su impacto y proponer una acción con responsable, sujeta a aprobación humana. |
| Expectativas y demostraciones incrementales | S23, p. 8 | **MVP:** revisión por hitos con evidencia funcional. **Siguiente versión:** reportes periódicos para diferentes stakeholders. |
| Control de desvíos, categorización de riesgos y corrección | S23, pp. 9–12 | **MVP:** tareas vencidas, bloqueos y riesgos con responsable, impacto y mitigación. **Siguiente versión:** tendencias y seguimiento de medidas correctivas. |
| EVM, SPI y CPI | S23, p. 10 | **Futuro:** análisis de valor ganado con datos y fórmulas apropiados; queda fuera del MVP. |
| Validación estadística, drift, explicabilidad y reproducibilidad | S1, pp. 13, 15, 17, 26 | **Siguiente versión:** plantillas para proyectos analíticos. **Futuro:** controles especializados; no afirmar que NERV valida inferencias o detecta drift. |
| Pipeline analítico, infraestructura MLOps y costos de calidad | S1, pp. 18, 20, 23 | **Futuro:** plantillas y gestión especializada. No exige construir un feature store, orquestador ni análisis financiero durante el hackathon. |

## Cómo se materializa el ciclo de gestión

La navegación se organiza dentro de una **única sala de proyecto**, con cuatro secciones y un panel persistente de conversación y especialistas. Todas usan las mismas entidades y reflejan los cambios compartidos:

- **Overview / Charter:** acta y KPI de resultado, registrado manualmente con unidad, meta, valor y fecha. El porcentaje de tareas terminadas no demuestra por sí solo una mejora del resultado estratégico.
- **Board / Team:** hitos, tareas, Kanban, criterios de aceptación y RACI. Issues y PR aportan evidencia; una PR fusionada no demuestra automáticamente aceptación del entregable ni cumplimiento del objetivo.
- **Meetings:** reuniones, participantes y horarios, conservando el mismo instante al cambiar de zona horaria.
- **Insights / Map:** indicadores, riesgos, bloqueos y mapa conceptual derivado de los datos existentes.

En el panel compartido, el equipo conversa y consulta al perfil experto seleccionado. Este explica sus observaciones, señala información faltante y puede proponer una issue asignada. La persona aprueba la acción. El equipo ajusta el plan y cierra el ciclo de planificación, organización, dirección y control.

## Límites de atribución y verificación

GitHub y la aprobación de acciones son decisiones del producto, no integraciones descritas en las diapositivas. La generación del plan mediante IA no es obligatoria: el MVP admite formulario y plantilla manual.

Los porcentajes de esfuerzo, costos y riesgos, y los valores SPI/CPI de los gráficos son ejemplos didácticos, no mediciones de NERV. La cifra de fracaso del 85 % de S1, p. 16, carece de referencia precisa suficiente en el archivo para usarla como estadística externa verificada. Las menciones regulatorias de S1, p. 17, tampoco acreditan cumplimiento jurídico del producto.

S23, p. 4, menciona estimación por tres valores, pero no proporciona una fórmula PERT. S23, p. 10, presenta EVM, SPI y CPI sin desarrollar sus entradas: no se renombrará como SPI/CPI un porcentaje de tareas. Los anuncios de próxima sesión y debate de S1, pp. 27–28, permanecen como contexto académico y no generan tareas para el equipo.
