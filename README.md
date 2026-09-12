# NERV — PMO Agéntica embebida en GitHub

> **MVP vigente:** comenzar por [docs/mvp/README.md](docs/mvp/README.md), sus [contratos mínimos](docs/mvp/CONTRATOS.md) y los tres prompts enlazados allí. Ese paquete define la demo interactiva de 110 minutos y sustituye el alcance técnico descrito abajo. El contenido siguiente conserva la propuesta inicial; no acredita funcionalidades ya construidas.

**NERV** es un agente de dirección y gerencia estratégica de proyectos analíticos que vive **dentro de GitHub**. No es un chatbot al que le preguntas por tu proyecto: es una PMO (Project Management Office) agéntica que se instala en un repositorio y ejecuta el ciclo completo de gerencia (establecer, asignar roles, monitorear y controlar), materializando todo como objetos reales de GitHub — milestones, issues, labels, asignaciones y reportes de control.

## Qué hace

1. **Establecer.** A partir de una descripción de proyecto en lenguaje natural, genera el Acta de Constitución, descompone el alcance en un backlog (WBS → épicas → issues), estima cada tarea por tres valores (PERT), calcula la ruta crítica y crea milestones, issues, labels y asignaciones en GitHub.
2. **Asignar roles.** Construye la matriz RACI del equipo (Data Project Lead, Lead Statistician, Data Engineer, MLOps Engineer) y la aplica: cada issue queda etiquetado con su rol responsable/aprobador y asignado al miembro correspondiente.
3. **Monitorear y controlar.** Un agente de monitoreo lee el estado vivo del repo (issues, PRs, commits, milestones) y calcula métricas de control — SPI y CPI (Earned Value Management), velocidad de sprint, matriz de riesgos — publicando reportes de desvío como issues del propio repo, con decisiones directivas sugeridas.
4. **Cuadro de mando.** Un dashboard web (Next.js + CopilotKit) muestra el cuadro de mando integral (impacto, estabilidad, desempeño, gobierno) con un copiloto conversacional que ejecuta acciones reales sobre el repo.

## Por qué GitHub es el entorno, no un envoltorio

Las métricas EVM se calculan a partir de la telemetría real del repositorio, y las decisiones del agente se ejecutan como mutaciones reales (crear/cerrar/asignar/etiquetar issues). Sin el repo no hay datos ni actuadores.

## Arquitectura

```
GitHub (entorno = datos + actuadores)
  issues, milestones, labels, docs/charter.md, nerv/plan.json, Actions
        ▲                                    ▲
        │ REST (PyGithub)                    │ publica reportes
Backend — FastAPI (Python)
  ├─ orchestrator: CharteringAgent → StaffingAgent → MonitorAgent
  ├─ evm/engine.py (PERT, CPM, PV/EV/AC, SPI, CPI) — determinista, sin LLM
  └─ api.py — REST para el frontend
        ▲
        │ HTTP JSON
Frontend — Next.js + CopilotKit
  dashboard (KPIs, burndown, tabla RACI) + copiloto conversacional
```

## La sala del proyecto (implementada)

`apps/web` sirve una sala en `http://127.0.0.1:3100/room` con tres paneles —
Board, Charter & plan y Team chat — y un asistente a la derecha. Lo que
distingue a NERV de un tablero más está en ese asistente:

1. **Sync** lee el repositorio configurado y pega esa lectura al tablero.
   Mover una tarjeta a Done nunca cierra la issue, y una lectura parcial
   nunca borra tareas: el estado de NERV y el `open/closed` de GitHub son
   hechos distintos.
2. **Review risks** ejecuta al especialista de riesgo sobre el charter y el
   snapshot recién leído. Devuelve qué amenaza el criterio de éxito, la
   evidencia citada con su número de issue, y separa lo observado de lo
   inferido y de lo que no pudo establecer. Si no hay modelo configurado
   cae a una lectura por reglas, y la tarjeta dice cuál de las dos produjo
   el resultado.
3. **La propuesta es inmutable.** El texto que el lead lee es byte por byte
   el que se publica; para cambiarlo se rechaza y se revisa otra vez. Solo
   el lead puede aprobar, y aprobar es lo único que escribe en GitHub.
4. **Nunca dos issues.** Antes de publicar se reclama la propuesta con una
   condición de versión, así que doble clic, dos pestañas o un reintento
   producen una sola escritura. Si la respuesta se pierde, el resultado
   queda *incierto* y se reconcilia buscando el marcador
   `<!-- nerv-proposal:UUID -->`, nunca creando la issue de nuevo.

Sin `GITHUB_TOKEN` todo el recorrido funciona contra un repositorio fixture
local, y cada superficie lo etiqueta como tal.

```bash
npm ci && npm run dev:web    # http://127.0.0.1:3100
```

## Estado del proyecto

Este repositorio está en fase de definición y planeación. El detalle completo (marco teórico, contratos entre componentes, plan de trabajo por hitos, prompts de arranque por rol) está en [`NERV_DEFINICION_Y_PLAN.md`](./NERV_DEFINICION_Y_PLAN.md).

## Licencia

MIT
