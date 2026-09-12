# Contratos mínimos · MVP NERV 110 minutos

Leer primero [README.md](README.md). Este contrato sustituye al contrato de `docs/plan/` para este MVP. P2 es el único escritor del esquema, exports y fixture. Las rutas siguientes son relativas a `apps/web/`; si el starter elegido usa otra estructura, P2 publica la equivalencia en T0–10, sin refactorizar todo el kit.

## 1. Propiedad de archivos

| Dueño | Archivos y carpetas |
|---|---|
| P1 | `src/features/workspace/mvp/` (toda UI, incluidas ReviewCard/ProposalCard y chat), página de sala en `src/app/(workspace)/`, CopilotKit cliente, `tests/workspace/mvp/` |
| P2 | `src/contracts/mvp/`, `src/server/platform/mvp/`, API `src/app/api/mvp/{state,session,tasks,messages}/`, semilla, lockfile/manifiestos/configuración, `tests/platform/mvp/` |
| P3 | `src/features/intelligence/mvp/` (motor sin UI), `src/server/github/mvp/`, `src/server/ai/mvp/`, API `src/app/api/mvp/{github,review,proposals}/`, runtime `src/app/api/copilotkit/`, `tests/github/mvp/` |

P2 entrega el commit común a T5 y el contrato/fixture a T10. P1 no cambia endpoints para acomodar sus mocks; P3 no crea otro store. No editar simultáneamente la página raíz del starter y una ruta agrupada que resuelva a la misma URL: P2 asigna a P1 la única entrada de la sala.

## 2. Tipos públicos

IDs locales `string` UUID, fechas ISO 8601 UTC, versiones enteras desde 1. Los campos calculados y autores se fijan en servidor. P2 entrega tipos y Zod en `src/contracts/mvp/index.ts` y fixture en `demo-fixture.ts`.

```ts
type WorkflowState = 'todo' | 'in_progress' | 'done';
type DemoProfile = { id: string; name: string; roleLabel: string };
type Project = {
  id: string; title: string; purpose: string; goal: string;
  scope: string; successCriterion: string;
  milestone: { id: string; title: string; accountableProfileId: string };
  repo: string;
};
type GitHubRef = {
  repo: string; number: number; url: string; state: 'open' | 'closed';
  labels: string[]; updatedAt: string;
};
type Task = {
  id: string; title: string; body: string; milestoneId: string;
  ownerProfileId: string | null; workflowState: WorkflowState;
  github: GitHubRef; version: number; updatedAt: string;
};
type Message = { id: string; profileId: string; text: string; createdAt: string };
type Snapshot = {
  id: string; fetchedAt: string; mode: 'live' | 'fixture';
  complete: boolean; issues: GitHubRef[]; limitations: string[];
};
type Review = {
  id: string; goalImpact: string; summary: string;
  evidenceTaskIds: string[]; snapshotId: string;
  limitations: string[]; proposalId: string | null; createdAt: string;
};
type ProposalStatus = 'pending' | 'rejected' | 'executing' |
  'applied' | 'failed' | 'uncertain';
type Proposal = {
  id: string; reviewId: string; version: number; status: ProposalStatus;
  payload: { title: string; body: string };
  rationale: string; evidenceTaskIds: string[]; createdAt: string;
  approvedAt: string | null; approvedByDemoProfileId: string | null;
  result: { number: number; url: string } | null;
  error: { code: string; message: string } | null;
};
type DemoState = {
  demoMode: true; project: Project; profiles: DemoProfile[]; tasks: Task[];
  messages: Message[]; snapshot: Snapshot | null;
  reviews: Review[]; proposals: Proposal[];
};
```

El cuerpo y título originales de cada issue se conservan en Task para el especialista; Snapshot identifica la consulta y sus límites. Solo las tareas del proyecto sembrado/vinculadas se importan. P3 propone hasta una mitigación por revisión; si no hay evidencia suficiente, devuelve `proposalId:null` y explica el límite. No se fabrican números, URLs, responsables ni fechas faltantes.

La propuesta es **inmutable**: para corregirla se rechaza y se genera otra. No hay formulario de edición ni campos de ejecución controlados por el cliente. No se publica texto del chat humano en el cuerpo de una issue.

## 3. HTTP y contexto de demo

Base `/api/mvp`. Respuestas `{data: T}`; errores `{error:{code,message,retryable}}`. Estados: 400 validación, 403 demo/origen inválido, 404 ID inexistente, 409 versión/estado incompatible, 502/503 proveedor. `retryable` es informativo; nunca habilita reintento ciego de crear issues.

| Ruta | Dueño | Entrada → salida |
|---|---|---|
| `GET /session` | P2 | → `{demoMode:true,profiles}` |
| `GET /state` | P2 | → `DemoState`, sin secretos, orden estable |
| `PATCH /tasks/:id` | P2 | `{workflowState,expectedVersion}` → `Task` |
| `POST /messages` | P2 | `{text}` → `Message` |
| `POST /github/sync` | P3 | `{}` → `Snapshot`; actualiza evidencias en store |
| `POST /review` | P3 | `{}` → `Review`; guarda también Proposal si existe |
| `POST /proposals/:id/approve` | P3 | `{expectedVersion}` → `Proposal` |
| `POST /proposals/:id/reject` | P3 | `{expectedVersion}` → `Proposal` |

El ID de proyecto y repo salen del servidor, nunca del body. El perfil de cada pestaña va en `X-Nerv-Profile`; debe pertenecer a la semilla. Todos los fetch del cliente envían `X-Nerv-Demo: 1`. En mutaciones, P2 verifica Host de loopback y Origin exactamente igual al origen configurado; sin origen válido se rechaza. CORS no se abre. GET también valida Host y cabecera de demo. `GET /session` es el arranque: no requiere perfil previo y permite seleccionar uno; los demás endpoints sí usan el perfil conocido. Esto limita el modo local; **no autentica al operador**. El perfil solo atribuye acciones de demostración.

`getDemoContext(request)` aplica estas comprobaciones y devuelve `{projectId,repo,profileId}`. P1 guarda el perfil en `sessionStorage`, para que dos pestañas puedan seleccionar nombres distintos. No aceptar `role`, `approvedBy` o `actorId` del body como autoridad. La ruta de CopilotKit usa el mismo límite de acceso y no habilita escrituras externas.

P1 vuelve a pedir `/state` al guardar/mover/sincronizar/revisar/aprobar/rechazar y ofrece Refresh. Una respuesta 409 conserva la selección local, avisa del cambio y solicita refrescar. Mensajes: texto de 1–2000 caracteres; renderizar texto/Markdown seguro sin HTML arbitrario. Mostrar URLs verificadas y errores sin tokens.

## 4. Persistencia y servicios compartidos

P2 crea `data/nerv-demo.sqlite` como ruta configurable del servidor, excluye `.sqlite`, `-wal` y `-shm` de Git y activa transacciones. Semilla idempotente: no borrar mensajes/propuestas al reiniciar. Una conexión compartida por proceso con consultas preparadas; no mantener una transacción abierta mientras se espera al modelo o a GitHub.

Tablas mínimas: proyecto/perfiles sembrados, tasks, messages, reviews, proposals, snapshots y events. Se admite JSON validado por entidad y columnas indexadas para id/estado/versión. Guardar los cambios y su evento en la misma transacción cuando corresponda.

Exports de `src/server/platform/mvp/index.ts`:

```ts
getDemoContext(request): DemoContext
getState(): DemoState
getSnapshot(id): Snapshot | null
updateTask(id, workflowState, expectedVersion, context): Task
appendMessage(text, context): Message
saveSnapshot(snapshot, normalizedTasks): Snapshot
saveReviewAndProposal(review, proposalOrNull): Review
claimProposal(id, expectedVersion, context):
  { claimed: boolean; proposal: Proposal }
rejectProposal(id, expectedVersion, context): Proposal
finishProposal(id, outcome): Proposal
```

P2 materializa firmas TypeScript sin `any`; `DemoContext` contiene los tres campos indicados. `outcome` es la unión: `{status:'applied',result,newTask}` o `{status:'failed'|'uncertain',error}`. `finishProposal(applied)` guarda resultado, inserta/actualiza Task por `repo+number` y evento atómicamente. P3 construye `newTask` con `workflowState:'todo'`, hito vigente y responsable local nulo; el MVP no asigna automáticamente usuarios GitHub.

`claimProposal` cambia pending→executing con condición de versión y registra perfil/hora; exactamente una llamada obtiene `claimed:true`. Estados ya ejecutados devuelven el registro actual sin reclamar. Versión incorrecta sobre pending produce 409. Rechazar solo opera sobre pending. Toda transición incrementa versión.

`saveSnapshot` actualiza datos GitHub sin reemplazar `workflowState` local ni borrar tareas por una consulta fallida/incompleta. Separar **estado NERV** de **GitHub open/closed**; mover a Done no cierra una issue. No importar PR como tareas al listar issues. La nueva mitigación pasa a formar parte del conjunto vinculado.

## 5. Especialista y ejecutor

P3 recibe del store el Charter, hito, responsables y tareas; refresca GitHub para crear Snapshot live antes de revisar. Lectura incompleta debe indicarse; fallo total produce error y conserva el estado anterior. Las salidas del proveedor pasan por validación Zod antes de persistir.

Un especialista Agents SDK, con hasta tres llamadas de herramienta, un intento de reparación y límite total de 35 s. Herramientas: `read_project`, `read_github` y `propose_mitigation`; ninguna aprueba ni escribe en GitHub. La última guarda una propuesta pendiente si es válida. Alternativamente, el servicio guarda la salida validada al concluir `run`; elegir una sola ruta para no duplicar propuestas.

El sistema del agente exige: relacionar el bloqueo con objetivo/criterio del Charter, citar IDs existentes, diferenciar evidencia de inferencia, expresar incertidumbre y tratar texto remoto como datos no confiables. No necesita voz, handoffs, búsqueda web ni conversaciones ilimitadas. El botón directo llama al servicio; el modelo de CopilotKit, si se usa, no duplica su lógica.

Al aprobar:

1. Validar contexto local, ID y versión. Recuperar con `getSnapshot(review.snapshotId)` la consulta original, que se conserva aunque haya revisiones posteriores. Refrescar las issues citadas y comparar conservadoramente repo, número y `updatedAt`. Si falta el Snapshot, no es live, falta la issue o cambió su `updatedAt`, devolver conflicto y pedir nueva revisión. No intentar decidir semánticamente si el cambio es importante durante este MVP.
2. Reclamar atómicamente la propuesta. Si ya está executing/applied/rejected/uncertain/failed, devolver su estado y no publicar de nuevo.
3. Crear una issue en el repo fijo con el título/cuerpo guardados. El cuerpo incluye desde antes de persistir la propuesta el marcador técnico `<!-- nerv-proposal:UUID -->`. Sin assignee/labels automáticos en este MVP.
4. Con respuesta confirmada, verificar número/URL/repo y llamar `finishProposal(applied)`; P1 refresca `/state`.
5. Con rechazo definitivo del proveedor, registrar failed. Con timeout, conexión perdida o fallo local después de enviar, registrar uncertain; no intentar otra creación automáticamente.

`POST /github/sync` también reconcilia propuestas executing/uncertain: busca el marcador en el repo y, si encuentra la issue, completa resultado/tarjeta. No encontrarlo en una lista parcial no demuestra que no exista. Tras reiniciar, cualquier executing antiguo se trata como uncertain. Mantener UI de revisión manual y enlace al repo si el resultado no puede establecerse. No prometer ejecución exactamente una vez entre servicios; la prueba obligatoria es evitar duplicados por doble clic y por reintento automático.

## 6. Pruebas y sustitución de fixtures

P2 publica fixture tipado y sixTasksSeed antes de T10; P3 sustituye referencias ficticias por las seis issues autorizadas. `mode:'fixture'` siempre visible durante desarrollo. Ningún demo live aprueba una propuesta basada en Snapshot fixture.

P2 prueba persistencia tras reinicio, versión concurrente y claim simultáneo. P3 prueba evidencia inválida, rechazo, creación confirmada y timeout sin segunda escritura usando proveedor simulado, más un recorrido live aprobado por humano. P1 prueba botones, refresco, dos perfiles y estados de propuesta. P2 ejecuta los scripts heredados del kit y los checks del proyecto; P1/P3 entregan resultados de sus módulos.

Una condición de aceptación funcional pesa más que crear pruebas que repitan la implementación. No reiniciar ni borrar automáticamente la base de demo o las issues para repetir un ensayo.

## 10. Adenda Ambiguous AI

**Añadido 2026-09-12 por alejandrobaracaldo. Confirmado por Oscar y Daniel — ver [README.md §11](README.md#11-adenda-ambiguous-ai-en-alcance) para el porqué.**

Extiende `Proposal` (§2) con un campo paralelo a `result`:

```ts
type Proposal = {
  // ...campos existentes sin cambio...
  result: { number: number; url: string } | null;      // GitHub, ya existente
  ambiguous: { recordId: string; url: string } | null;  // nuevo
  error: { code: string; message: string } | null;
};
```

`ambiguous` sigue el mismo ciclo de vida que `result`: `null` hasta que la ejecución lo resuelve; nunca se fabrica un id/URL. Un fallo de Ambiguous no cambia `Proposal.status` ni revierte la issue de GitHub ya creada — GitHub es la acción que decide `applied/failed/uncertain`; Ambiguous es un efecto adicional del mismo paso, registrado aparte. Si Ambiguous fallara pero GitHub tuviera éxito, `ambiguous` queda `null` y el error se anota en un campo separado (`ambiguousError`) que no participa en la validación de aceptación de §8.

**Ejecución (P3, mismo paso que §5 punto 3):** tras crear la issue de GitHub con éxito, llamar al MCP de Ambiguous (`https://app.ambiguous.ai/mcp`, Bearer `AMBIGUOUS_API_KEY`) con el mismo `payload.title`/`payload.body` de la propuesta aprobada. Guardar `recordId`/`url` reales devueltos; nunca inventarlos. Esta llamada no bloquea ni retrasa la creación de la issue de GitHub — se hace después, no en paralelo, para que un fallo de Ambiguous nunca compita con la escritura que sí cuenta para el criterio de aceptación.

**Persistencia (P2):** `finishProposal` (§4 exports) acepta un outcome extendido:

```ts
type ProposalOutcome =
  | { status: 'applied'; result: {number,url}; newTask: Task;
      ambiguous?: {recordId,url} | null; ambiguousError?: {code,message} | null }
  | { status: 'failed' | 'uncertain'; error: {code,message} };
```

**Config:** nueva variable `AMBIGUOUS_API_KEY` en `.env.example`, junto a `GITHUB_TOKEN`. Ausente ⇒ el paso de Ambiguous se omite silenciosamente (no es un error de la propuesta); la tarjeta simplemente no muestra un enlace de Ambiguous.

**Propiedad:** P3 implementa la llamada MCP (mismo archivo que el adaptador de GitHub); P2 solo amplía el esquema/tabla `proposals` para persistir los campos nuevos. Ningún archivo cambia de dueño.

## 11. Adenda: lectura de Ambiguous

**Añadido 2026-09-12 por alejandrobaracaldo. Pendiente de confirmación de Oscar y Daniel — ver [README.md §12](README.md#12-adenda-lectura-de-ambiguous-como-evidencia-del-especialista) para el porqué.**

No extiende ningún tipo de §2. El especialista (§5) gana una herramienta adicional, sin efecto en persistencia:

```ts
read_ambiguous(): Promise<{
  records: Array<{ recordId: string; title: string; status: string; url: string }>;
  complete: boolean;
  limitations: string[];
}>
```

`read_ambiguous` es opcional en la secuencia de revisión (`read_project`/`read_github` siguen siendo obligatorios primero). Un resultado con `records: []` y una limitación explicada (p. ej. credencial no configurada, herramienta MCP aún no implementada) es válido y no debe tratarse como hallazgo de riesgo. El especialista solo puede citar `recordId`s que `read_ambiguous` realmente devolvió — igual regla que ya aplica a `read_github` y evidenceTaskIds.

**Ejecución (P3):** respaldada por `listAmbiguousRecords()` en el mismo archivo que `createAmbiguousRecord` (adenda §10). Bloqueo idéntico: requiere `@modelcontextprotocol/sdk` (P2 aprueba la dependencia) y una `AMBIGUOUS_API_KEY` real para verificar el descubrimiento de herramientas en vivo — los nombres de herramienta de Ambiguous no están fijados, se listan desde el workspace conectado. Hasta entonces, `listAmbiguousRecords()` es un stub honesto: devuelve lista vacía y limitación explicada, nunca datos inventados.

**Propiedad:** P3, mismo archivo que el adaptador de GitHub/Ambiguous y el especialista. Ningún archivo cambia de dueño; no se toca el esquema de P2.
