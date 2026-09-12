# NERV — PMO Agéntica embebida en GitHub

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

## Estado del proyecto

Este repositorio está en fase de definición y planeación. El detalle completo (marco teórico, contratos entre componentes, plan de trabajo por hitos, prompts de arranque por rol) está en [`NERV_DEFINICION_Y_PLAN.md`](./NERV_DEFINICION_Y_PLAN.md).

## Licencia

MIT
