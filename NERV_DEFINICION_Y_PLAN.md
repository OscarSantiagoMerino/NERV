# NERV — PMO Agéntica embebida en GitHub

**Hackathon "Agents, Everywhere" · Equipo de 3 personas · Ventana de construcción: 5–6 horas**
**Repo:** `https://github.com/OscarSantiagoMerino/NERV` (owner: `OscarSantiagoMerino`)

> Este documento es (1) la definición técnica del proyecto y (2) el plan de trabajo por hitos para 3 personas trabajando en paralelo, cada una operando agentes de programación (Claude Code / Codex). Está escrito para servir directamente como prompt de contexto para esos agentes: cópialo completo en el contexto de cada agente, junto con la sección de rol correspondiente.

---

## 1. Resumen ejecutivo (elevator pitch)

**NERV** es un agente de **dirección y gerencia estratégica de proyectos analíticos** que vive **dentro de GitHub**, el lugar donde el trabajo ya está ocurriendo. No es un chatbot al que le preguntas por tu proyecto: es una **PMO (Project Management Office) agéntica** que se instala en un repositorio y ejecuta el ciclo completo de gerencia del curso GMAC:

1. **Establecer (Planificación y Organización):** a partir de una descripción de proyecto en lenguaje natural, NERV genera el Acta de Constitución (charter), descompone el alcance en un backlog de entregables (EDT/WBS → épicas → issues), estima cada tarea por tres valores (PERT), calcula la ruta crítica, y **materializa todo como objetos reales de GitHub**: milestones, issues, labels y asignaciones.
2. **Asignar roles (Organización):** construye la **matriz RACI** del equipo (Data Project Lead, Lead Statistician, Data Engineer, MLOps Engineer) y la aplica: cada issue queda etiquetado con su rol responsable (R) y aprobador (A), y asignado al miembro del equipo que ocupa ese rol.
3. **Monitorear y controlar (Dirección y Control):** un agente de monitoreo lee el estado vivo del repo (issues cerrados/abiertos, PRs, commits, milestones) y calcula las métricas de control del marco teórico — **SPI y CPI (Earned Value Management)**, velocidad de sprint, matriz de riesgos activos — y publica reportes de desvío como comentarios/issues en el propio repo, con decisiones directivas sugeridas (mitigación, re-priorización, alerta de ruta crítica).
4. **Cuadro de mando:** un dashboard web (CopilotKit) muestra el cuadro de mando integral analítico (impacto, estabilidad, desempeño, gobierno) con un copiloto conversacional que ejecuta acciones reales sobre el repo ("reasigna las tareas en riesgo", "¿qué pasa si perdemos un día?").

**Por qué cumple el tema:** el entorno (GitHub) no es un envoltorio — es el sustrato de datos y el actuador del agente. Las métricas EVM se calculan de la telemetría real del repo y las decisiones del agente se ejecutan como mutaciones reales (crear/cerrar/asignar/etiquetar issues). Nada de esto es reproducible en un chatbox aislado: sin el repo no hay datos ni acciones.

---

## 2. Alineación con los criterios de evaluación

| Criterio | Cómo lo ataca NERV |
|---|---|
| Core Requirements & Functionality | Flujo end-to-end demostrable: descripción → charter → issues/milestones/RACI reales en GitHub → trabajo simulado → reporte de control EVM publicado en el repo → dashboard. |
| Innovation & Theme Alignment | El agente vive en GitHub (webhooks + API + bot). El entorno aporta los datos (telemetría del repo) y los actuadores (issues, labels, comentarios). Patrón nuevo: "la PMO como agente residente del repositorio". |
| Technical Execution & Integration | Orquestación multi-agente (OpenAI Agents SDK) con handoffs: Chartering → Staffing → Monitor. Tools tipadas contra la API de GitHub. Motor EVM determinista (código, no LLM) para los números. Manejo de fallos: si el LLM falla, el plan degrada a plantillas. |
| Usefulness & Agentic Experience | Problema real (85% de proyectos analíticos no llegan a producción por mala gestión — dato del marco teórico). Usuario controla: el agente propone en PR/issue, el humano aprueba. |

---

## 3. Marco teórico aplicado (diapositivas GMAC → funcionalidades)

Cada concepto de las diapositivas se convierte en una capacidad concreta. Esto se cita en el README y en el video.

| Concepto (diapositivas) | Feature en NERV |
|---|---|
| Acta de Constitución / Business Case (PMBOK v7 / PRINCE2) | `charter.md` generado y comiteado al repo por el agente; incluye objetivo, alcance, supuestos y triple restricción analítica. |
| EDT/WBS tradicional vs Backlog adaptativo | El Chartering Agent genera ambos: árbol WBS (en el charter) y backlog de issues con épicas (labels `epic:*`). |
| Matriz RACI (Data Project Lead, Lead Statistician, Data Engineer, MLOps Engineer) | `raci.json` + labels `role:R-data-engineer`, etc.; asignación automática de issues según el mapa rol→username. |
| Estimación por Tres Valores (PERT) y Ruta Crítica (CPM) | Cada issue lleva estimaciones (O, M, P) en su frontmatter; el motor calcula E=(O+4M+P)/6, varianza, y la cadena crítica; los issues críticos reciben label `critical-path`. |
| EVM: SPI y CPI | Motor determinista: PV (valor planificado por fecha), EV (issues cerrados ponderados por estimación), AC (esfuerzo reportado o proxy por tiempo). SPI=EV/PV, CPI=EV/AC. |
| Matriz de riesgos (calidad de datos 35%, cambio de requisitos 30%, obsolescencia 20%, RRHH 15%) | `risks.json` con probabilidad×impacto; el Monitor sube la severidad cuando detecta señales (issues bloqueados, cambios de alcance) y publica alertas. |
| Concept drift / degradación temporal | Metáfora operativa: si SPI cae por debajo de umbral entre cortes, el Monitor lo reporta como "drift de cronograma" y sugiere retrenado del plan (re-priorización). |
| Cuadro de Mando (negocio, estabilidad, desempeño, gobierno) | Las 4 tarjetas KPI del dashboard. |
| Costo de calidad / deuda técnica analítica | Label `quality-gate`; issues de prevención generados automáticamente (tests de datos, documentación de metadatos DAMA). |
| Liderazgo servicial / gestión de stakeholders | El reporte semanal del Monitor traduce métricas técnicas a lenguaje de impacto (sección "Para stakeholders"). |
| DIKW | Narrativa del pipeline del agente: datos del repo → información (métricas) → conocimiento (diagnóstico) → sabiduría (decisión directiva sugerida). |

---

## 4. Alcance funcional del MVP (lo que SÍ se construye en 5–6 h)

**F1. Bootstrap de proyecto (Chartering Agent).**
Input: título + descripción del proyecto + lista de 3–4 miembros con su rol RACI (JSON o formulario del dashboard). Output:
- `docs/charter.md` comiteado al repo objetivo.
- 2–3 milestones (sprints) con fechas.
- 10–18 issues con: cuerpo estructurado (objetivo, criterio de aceptación, estimación O/M/P en un bloque YAML), labels de épica, rol RACI y prioridad; asignee según mapa rol→username.
- `nerv/plan.json` comiteado: fuente de verdad del plan (ids de issues, estimaciones, dependencias, fechas PV).

**F2. Motor de control EVM (determinista, sin LLM).**
`GET /metrics/{owner}/{repo}` → lee issues/milestones vía API GitHub, cruza con `plan.json` y devuelve: PV, EV, AC, SPI, CPI, % avance por milestone, issues en ruta crítica abiertos, burndown (serie), riesgos activos.

**F3. Monitor Agent (control y desvíos).**
Se dispara manualmente desde el dashboard ("Run control cycle") y/o por `workflow_dispatch` de GitHub Actions. Con las métricas de F2 + lectura de los issues, genera el **Reporte de Control** (markdown) y lo publica como issue `📊 Control Report — <fecha>` en el repo: estado semáforo, SPI/CPI, desvíos, riesgos re-evaluados, 2–3 decisiones directivas sugeridas, sección para stakeholders. Si SPI < 0.9 sugiere qué issues re-priorizar (los de ruta crítica primero).

**F4. Dashboard con copiloto (CopilotKit + Next.js).**
- Vista "Cuadro de Mando": 4 KPI cards (SPI, CPI, % avance, riesgos activos), burndown, tabla de issues con RACI, semáforo de ruta crítica.
- Formulario de bootstrap (F1).
- Sidebar de CopilotKit conectado al backend: acciones `bootstrap_project`, `run_control_cycle`, `get_metrics`, `reassign_issue`, `explain_metric`.

**F5. Demo reproducible.**
Script `scripts/simulate_progress.py` que cierra un subconjunto de issues con fechas desfasadas para que el demo muestre SPI≠1 y dispare las alertas (sin esperar días reales).

**Fuera de alcance (NO construir):** autenticación multiusuario real (Auth0 solo si sobra tiempo), Slack/Teams, persistencia en BD (todo estado vive en el repo: `plan.json` + issues), fine-tuning, multi-repo, tests exhaustivos.

---

## 5. Arquitectura técnica

```
┌────────────────────────────────────────────────────────────────┐
│  GitHub (ENTORNO = datos + actuadores)                         │
│  repo objetivo: issues, milestones, labels, docs/charter.md,   │
│  nerv/plan.json, Actions (workflow_dispatch → control cycle)   │
└───────────────▲───────────────────────────────▲────────────────┘
                │ REST (PyGithub / octokit)     │ publica reportes
┌───────────────┴───────────────────────────────┴────────────────┐
│  BACKEND  FastAPI (Python 3.11)  — carpeta /backend            │
│  ├─ orchestrator: OpenAI Agents SDK                            │
│  │   ├─ CharteringAgent  (tools: create_milestone,            │
│  │   │    create_issue, commit_file, apply_labels)             │
│  │   ├─ StaffingAgent    (tool: assign_by_raci)                │
│  │   └─ MonitorAgent     (tools: get_metrics, post_issue,      │
│  │        update_risks)                                        │
│  ├─ evm/engine.py  (PERT, CPM, PV/EV/AC, SPI, CPI) ← puro,     │
│  │    determinista, con unit tests                             │
│  ├─ github_client.py  (wrapper tipado de la API)               │
│  └─ api.py  REST para el frontend (contrato en §6)             │
│  LLM vía OpenRouter (OPENROUTER_API_KEY, modelo por env var;   │
│  fallback: OPENAI_API_KEY directo)                             │
└───────────────▲────────────────────────────────────────────────┘
                │ HTTP JSON (contrato §6)
┌───────────────┴────────────────────────────────────────────────┐
│  FRONTEND  Next.js 14 + CopilotKit  — carpeta /frontend        │
│  dashboard (KPI cards, burndown con Recharts, tabla RACI)      │
│  + CopilotSidebar con acciones → backend                       │
└────────────────────────────────────────────────────────────────┘
```

**Decisiones cerradas (no re-discutir durante la hackathon):**
- Lenguajes: backend Python + FastAPI; frontend Next.js (App Router) + CopilotKit + Tailwind + Recharts.
- LLM: vía **OpenRouter** (un solo API key para el equipo); modelo por defecto `openai/gpt-4o-mini` (barato/rápido), configurable por env.
- Estado: **el repo es la base de datos.** `nerv/plan.json` es la fuente de verdad del plan; las métricas se recalculan on-demand. Cero SQL.
- Auth GitHub: un **Personal Access Token clásico** (repo scope) en `.env` (`GITHUB_TOKEN`). Nada de GitHub Apps (demasiado setup para 6 h).
- Repo objetivo del demo: crear un segundo repo `NERV-demo-project` donde el agente planifica y monitorea un proyecto ficticio realista ("Modelo de churn para telco", que conecta con el marco teórico). Así el repo NERV queda limpio como producto.
- Exa (opcional, si hay tiempo en H3): tool `research_risks` del CharteringAgent que busca benchmarks de riesgos del dominio del proyecto para poblar `risks.json` con citas.

---

## 6. Contratos entre componentes (definir a la hora 0 — esto desbloquea el paralelismo)

**6.1 `nerv/plan.json` (lo produce F1, lo consume F2/F3/F4):**
```json
{
  "project": {"title": "...", "repo": "OscarSantiagoMerino/NERV-demo-project",
               "start_date": "2026-09-12", "end_date": "2026-09-26"},
  "team": [{"username": "OscarSantiagoMerino", "role": "data_project_lead"}],
  "raci": {"scope_definition": {"A": "data_project_lead", "R": "data_project_lead", "C": ["lead_statistician"], "I": ["data_engineer", "mlops_engineer"]}},
  "tasks": [{
    "issue_number": 12, "title": "...", "epic": "ingesta",
    "estimate_h": {"o": 2, "m": 4, "p": 8}, "expected_h": 4.33,
    "depends_on": [10, 11], "critical_path": true,
    "planned_start": "2026-09-12", "planned_finish": "2026-09-14",
    "role_r": "data_engineer", "assignee": "usuario2"
  }],
  "risks": [{"id": "R1", "name": "Calidad e inconsistencia de datos",
             "prob": 0.35, "impact": 4, "status": "open", "signals": ["issues con label blocked"]}]
}
```

**6.2 API REST del backend (lo produce Persona A, lo consume Persona C):**
- `POST /bootstrap` body `{title, description, repo, team:[{username, role}], sprint_length_days}` → `202 {run_id}`; al terminar, el plan está en el repo. `GET /bootstrap/{run_id}` → `{status, summary, links}`.
- `GET /metrics?repo=owner/name` → `{spi, cpi, pv, ev, ac, pct_complete, burndown:[{date, remaining_h}], critical_open:[issue_number], risks:[...], by_milestone:[...]}`.
- `POST /control-cycle` body `{repo}` → `{report_issue_url, spi, cpi, decisions:[...]}`.
- `POST /actions/reassign` body `{repo, issue_number, username}` → `{ok}`.
- Todos los endpoints devuelven errores como `{error: {code, message}}`; el frontend los muestra en un toast.

**6.3 Formato del cuerpo de issue generado (lo produce A, lo parsea el motor EVM):**
```markdown
## Objetivo
...
## Criterio de aceptación
- [ ] ...
```yaml
nerv:
  estimate_h: {o: 2, m: 4, p: 8}
  epic: ingesta
  role_r: data_engineer
  depends_on: [12]
```
```

---

## 7. Estructura del repositorio NERV

```
NERV/
├── README.md                  ← pitch, arquitectura, GIFs, cómo correr, marco teórico
├── docs/
│   ├── DEFINICION_Y_PLAN.md   ← este documento
│   └── demo-script.md         ← guion del video (Persona C)
├── backend/
│   ├── pyproject.toml / requirements.txt
│   ├── app/api.py, app/agents/{chartering,staffing,monitor}.py
│   ├── app/evm/engine.py  +  tests/test_evm.py
│   ├── app/github_client.py
│   └── .env.example  (GITHUB_TOKEN, OPENROUTER_API_KEY, NERV_MODEL)
├── frontend/
│   ├── package.json, app/, components/{KpiCards,Burndown,RaciTable,BootstrapForm}.tsx
│   └── .env.example  (NEXT_PUBLIC_API_URL, OPENAI_API_KEY para CopilotKit runtime)
├── scripts/simulate_progress.py
└── .github/workflows/control-cycle.yml   ← workflow_dispatch → POST /control-cycle
```

**Reglas de trabajo en el repo (para que 3 agentes no colisionen):**
- `main` protegido mentalmente: solo merges que compilan. Cada persona trabaja en su rama: `feat/backend-core`, `feat/github-integration`, `feat/frontend`.
- Las carpetas son territorios: A solo toca `backend/app/{api,evm,agents}`, B solo `backend/app/github_client.py`, `scripts/`, `.github/`, y el repo demo; C solo `frontend/` y `docs/`. `README.md` lo cierra C al final.
- Commits pequeños y push frecuente (cada 20–30 min) para integrar temprano.
- Los contratos del §6 son ley: si alguien necesita cambiarlos, se anuncia en el grupo ANTES de cambiar código.
- Merge a `main` en cada hito (H1, H2, H3), no al final.

---

## 8. Plan de trabajo por hitos (reloj de 5½ horas)

Convención: **[H]** = lo hace el humano; **[A]** = lo delega a su agente de código (Claude Code / Codex); **[H+A]** = humano dirige, agente ejecuta con revisión.

### Personas y roles
- **P1 — Orquestación & Motor (Backend core).** Dueño de: Agents SDK, motor EVM, API REST.
- **P2 — Entorno GitHub (Integración).** Dueño de: cliente GitHub, repo demo, seed/simulación, Actions, secrets.
- **P3 — Experiencia (Frontend + Entrega).** Dueño de: dashboard CopilotKit, README, video, post, submission.

### H0 · Arranque (0:00–0:30) — TODOS juntos
- [H] Los 3: leer este documento completo. Acordar (o ajustar en ≤10 min) los contratos del §6. Congelarlos.
- [H] P1: crear el repo con esta estructura de carpetas y el `docs/DEFINICION_Y_PLAN.md`; push inicial a `main`. Los otros dos clonan.
- [H] P2: crear `NERV-demo-project` (repo público vacío), generar el `GITHUB_TOKEN` (PAT con scope repo), conseguir `OPENROUTER_API_KEY`, compartir por canal privado. Rellenar `.env.example`.
- [H] P3: verificar acceso a créditos de sponsors; `npx create-next-app` + instalar CopilotKit en `feat/frontend`.
- **Gate H0 (0:30):** repo con estructura, contratos congelados, tokens en manos de los 3.

### H1 · Esqueletos verticales (0:30–2:00) — en paralelo
**P1 [A]:** FastAPI con los 4 endpoints del §6 devolviendo **datos mock realistas** (hardcodeados según el contrato). Luego `evm/engine.py` real: PERT, forward-pass CPM sobre `depends_on`, PV por interpolación de fechas planificadas, EV por issues cerrados ponderados, AC proxy (horas esperadas de issues cerrados × factor de fechas reales), SPI, CPI, burndown. `tests/test_evm.py` con un caso numérico verificado a mano. **El motor es código puro; el LLM jamás calcula números.**
**P2 [A]:** `github_client.py`: crear milestone, crear issue (con cuerpo del §6.3), aplicar labels (crear si faltan), asignar, comentar, comitear archivo, listar issues con estado+fechas de cierre. Probarlo en vivo contra `NERV-demo-project` con un script de humo. [H] Definir el proyecto ficticio del demo (título, descripción, 4 épicas del pipeline analítico de las diapositivas: Ingesta/EDA, Feature Store, Modelado/DoE, MLOps/API — 14 issues aprox).
**P3 [A]:** Dashboard con datos de los endpoints mock de P1: 4 KPI cards, burndown (Recharts), tabla de issues RACI, formulario de bootstrap. CopilotSidebar montado con 2 acciones dummy. Tailwind, oscuro, estética "centro de control".
- **Gate H1 (2:00):** `GET /metrics` mock alimenta un dashboard que ya se ve bien; cliente GitHub crea issues reales; motor EVM con test en verde. **Merge de las 3 ramas a `main`.**

### H2 · Integración real (2:00–3:30)
**P1 [H+A]:** Sustituir mocks: `/metrics` = motor EVM + datos reales vía cliente de P2. CharteringAgent con Agents SDK: prompt de sistema que recibe descripción del proyecto → produce plan JSON (validado con Pydantic; **retry 1 vez, y si falla 2 veces usar plantilla determinista de respaldo** — nunca bloquear el demo) → llama tools de P2 para materializar en GitHub → comitea `plan.json` y `charter.md`. StaffingAgent (asignación RACI) puede ser una función dentro del mismo flujo.
**P2 [H+A]:** `scripts/simulate_progress.py` (cierra ~60% de issues con fechas que produzcan SPI≈0.85 — desvío visible). Workflow `control-cycle.yml` (workflow_dispatch → curl al backend; si el backend no es público, se documenta y se dispara localmente). Apoyar a P1 en el cableado de tools.
**P3 [H+A]:** Conectar el frontend al backend real (`NEXT_PUBLIC_API_URL`). Acciones CopilotKit reales: `bootstrap_project`, `run_control_cycle`, `get_metrics`, `reassign_issue`. Estados de carga y errores. [H] Empezar `docs/demo-script.md` con el guion de 2 min.
- **Gate H2 (3:30):** flujo E2E completo al menos una vez: bootstrap desde el dashboard → issues reales → simulate → métricas reales en dashboard. **Merge a `main`.**

### H3 · Monitor Agent + pulido (3:30–4:30)
**P1 [A]:** MonitorAgent: toma `/metrics` + lista de issues, redacta el Reporte de Control (plantilla fija con secciones: semáforo, EVM, desvíos, riesgos, decisiones sugeridas, "para stakeholders") y lo publica vía tool de P2. Umbral: SPI<0.9 ⇒ nombra los issues de ruta crítica abiertos y sugiere re-priorización.
**P2 [H+A]:** Ensayo completo del demo desde cero (script `reset_demo.sh`: borra issues del repo demo y lo deja virgen → bootstrap → simulate → control). Cronometrar. Arreglar fricciones. Si sobra: tool Exa `research_risks`.
**P3 [H+A]:** Pulido visual (semáforo, badge de ruta crítica, links a los issues reales), README con arquitectura y capturas.
- **Gate H3 (4:30):** demo ensayado corre de cero en <5 min sin intervención manual salvo los clics del guion. **Feature freeze absoluto.**

### H4 · Entrega (4:30–5:30)
**P3 [H]:** graba el video de 2 min siguiendo el guion (pantalla: dashboard → GitHub mostrando issues creados → reporte de control publicado → sidebar del copiloto ejecutando una reasignación). Post en redes tagueando a los partners. Formulario de submission.
**P1 [H]:** revisión final del repo: `README` correcto, `.env.example` completo, sin secretos comiteados (`git log -p | grep -i key` rápido), licencia MIT, tag `v0.1.0`.
**P2 [H]:** deja el repo demo en el estado final bonito (reporte de control visible como último issue); verifica que el repo NERV clona y corre con el README en una carpeta limpia.
- **Entrega: 5:30, con 30 min de colchón.**

### Reparto humano vs agente (regla general)
- **Los agentes (Claude Code/Codex) escriben:** todo el código repetitivo y de integración (endpoints, componentes React, cliente GitHub, tests, scripts), los prompts largos de los agentes NERV, el README base.
- **Los humanos deciden y verifican:** contratos del §6, diseño del proyecto demo, umbrales EVM, revisión de cada PR de su agente antes de merge, secretos/tokens (nunca pasan por el contexto del agente: se pegan a mano en `.env`), el guion y el video, y toda interacción con el formulario de submission.
- Cada humano mantiene UN agente principal en su territorio de carpetas; si lanza un segundo agente, es para tareas de solo-lectura (revisar, documentar) para evitar conflictos de merge.

---

## 9. Prompts de arranque por persona (pegar a su agente en la hora 0)

**P1 (backend core):**
> Trabajas en el repo NERV (rama `feat/backend-core`), carpeta `backend/`. Contexto completo en `docs/DEFINICION_Y_PLAN.md` — léelo primero. Tu territorio: `app/api.py`, `app/evm/`, `app/agents/`. NO toques `app/github_client.py` (lo hace otra persona; impórtalo según su firma del §6). Tarea 1: FastAPI con los endpoints del §6.2 devolviendo mocks realistas conformes al contrato. Tarea 2: `app/evm/engine.py` — PERT (E=(O+4M+P)/6), CPM forward pass sobre `depends_on`, PV/EV/AC, SPI, CPI, burndown; funciones puras sobre el dict de `plan.json`; escribe `tests/test_evm.py` con un caso a mano y hazlo pasar. Los cálculos numéricos JAMÁS los hace un LLM. Python 3.11, FastAPI, Pydantic v2. Commits pequeños.

**P2 (integración GitHub):**
> Trabajas en el repo NERV (rama `feat/github-integration`). Contexto en `docs/DEFINICION_Y_PLAN.md` — léelo primero. Tu territorio: `backend/app/github_client.py`, `scripts/`, `.github/`. Implementa un cliente GitHub (PyGithub) con funciones tipadas: `create_milestone`, `create_issue(body conforme §6.3)`, `ensure_labels`, `assign`, `comment`, `commit_file`, `list_issues_with_state`. Token en env `GITHUB_TOKEN`; repo objetivo `OscarSantiagoMerino/NERV-demo-project`. Escribe `scripts/smoke_github.py` que cree y cierre un issue de prueba. Luego `scripts/simulate_progress.py` (cierra issues según `nerv/plan.json` para producir SPI≈0.85) y `scripts/reset_demo.sh`. Maneja rate limits con reintentos simples. Nunca imprimas el token.

**P3 (frontend + entrega):**
> Trabajas en el repo NERV (rama `feat/frontend`), carpeta `frontend/`. Contexto en `docs/DEFINICION_Y_PLAN.md` — léelo primero. Next.js 14 App Router + Tailwind + CopilotKit + Recharts. Consume la API del §6.2 (`NEXT_PUBLIC_API_URL`, mientras tanto los mocks de P1). Páginas: `/` dashboard (4 KPI cards SPI/CPI/avance/riesgos con semáforo, burndown, tabla de issues con rol RACI y link real, panel de riesgos) y formulario de bootstrap. Monta `CopilotSidebar` con acciones `bootstrap_project`, `run_control_cycle`, `get_metrics`, `reassign_issue` llamando al backend. Estética: dark, "sala de control", limpia. Estados de carga y error en todo fetch.

---

## 10. Riesgos del hackathon y plan B (dogfooding de la matriz de riesgos)

| Riesgo | Prob. | Mitigación / Plan B |
|---|---|---|
| El LLM genera planes malformados | Media | Validación Pydantic + 1 retry + plantilla determinista de respaldo (el demo nunca depende de la suerte del LLM). |
| Rate limit / permisos GitHub | Baja | PAT clásico probado en H0; reintentos; el repo demo es propio. |
| Integración tardía rompe el E2E | Media | Merges obligatorios en cada gate; contratos congelados en H0; mocks conformes al contrato desde H1. |
| Se acaba el tiempo | Media | Orden de recorte preacordado: 1º Exa, 2º acción `reassign` del copiloto, 3º GitHub Action (se dispara a mano), 4º formulario de bootstrap (se usa un `curl` grabado). El núcleo intocable: bootstrap→issues→simulate→métricas→reporte. |
| Backend no desplegable públicamente | Alta | Todo corre en localhost para el video; el README documenta `docker compose up` o `make dev` si da tiempo. No se pierde tiempo en deploy. |

---

## 11. Checklist de entrega
- [ ] Título: **NERV — La PMO agéntica que vive en tu repositorio**.
- [ ] Descripción escrita (≈150 palabras, sale del §1).
- [ ] Repo público `OscarSantiagoMerino/NERV` con README completo (pitch, arquitectura, GIF, setup, mapeo al marco teórico GMAC, qué se construyó durante el evento: todo).
- [ ] Video 2 min (guion en `docs/demo-script.md`).
- [ ] Post en redes tagueando partners.
- [ ] Submission en el portal antes del deadline.
