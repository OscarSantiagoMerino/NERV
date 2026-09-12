# Agentes de NERV

La interfaz de `codex/p1-ui` consume dos agentes con responsabilidades distintas. Sus nombres,
rutas y capacidades públicas están definidos en
`apps/web/src/features/intelligence/agent-catalog.ts`; P1 puede importar ese módulo sin cargar
dependencias de servidor.

## Project Assistant

- **Entrada:** chat CopilotKit mediante `/api/copilotkit`, agente runtime `default`.
- **UI:** panel `assistant-chat`.
- **Contexto:** proyecto, hito, tareas, selección, perfil y mensajes recientes suministrados por
  `WorkspaceControl`.
- **Herramientas de interfaz:** `show_panel` y `select_task`.
- **Límite:** explica y navega. No mueve tareas, no envía mensajes, no ejecuta revisiones y no
  publica cambios externos.
- **Modelo predeterminado:** `qwen3:4b` mediante Ollama local; no requiere clave ni pago por API.

## Risk Specialist

- **Entrada:** botón **Review risks**, `POST /api/mvp/review`.
- **UI:** `ReviewPanel`, que recibe `Review` y una `Proposal` opcional.
- **Herramientas:** `read_project`, `read_github`, `read_ambiguous` y
  `propose_mitigation`.
- **Salida:** `RiskFindingSchema`, validada antes de persistirla.
- **Límite:** propone como máximo una mitigación. Nunca aprueba ni publica.
- **Modelo predeterminado:** el mismo Ollama local; si no está disponible, usa la lectura
  heurística explícitamente etiquetada en vez de inventar una respuesta.

## Proveedor local

Ambos agentes usan `MODEL_PROVIDER=ollama`, `MODEL=qwen3:4b` y
`OLLAMA_BASE_URL=http://127.0.0.1:11434/v1`. OpenAI y OpenRouter son alternativas explícitas,
no requisitos del recorrido NERV. La página opcional de voz usa OpenAI Realtime por separado.

## Lo que no es un agente

La sincronización GitHub y el ejecutor de propuestas son servicios deterministas. El ejecutor
solo recibe el payload inmutable después de que una persona con acceso de lead aprueba la
versión mostrada. No se exponen `create_issue`, tokens ni herramientas de escritura al chat o al
especialista.

## Contrato para P1

P1 no necesita conocer prompts, proveedores ni herramientas de servidor. Para integrar un
agente usa `NERV_AGENTS` y respeta:

1. `endpoint` para el transporte.
2. `runtimeAgentId` solo cuando `interaction` es `chat`.
3. `uiPlacement` y `actionLabel` para ubicar el control.
4. `approvalPolicy` para mostrar el límite correcto; nunca convertir una propuesta en ejecución
   automática.

Agregar otro especialista requiere un ID, una salida Zod y una ruta propia. No debe ampliar el
MVP ni compartir una herramienta de escritura externa sin una nueva decisión humana y de
contrato.
