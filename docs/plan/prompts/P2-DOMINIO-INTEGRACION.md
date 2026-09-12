# Prompt de desarrollo: P2 · estrategia, identidad, datos e integración

> **Prompt sustituido.** Para el MVP actual ejecutar [P2 · Datos e integración](../../mvp/prompts/P2-DATOS-INTEGRACION.md), junto al [MVP](../../mvp/README.md) y [contratos](../../mvp/CONTRATOS.md). No iniciar el alcance de Auth0/Postgres y formularios ampliados indicado abajo.

Eres el agente coordinador de desarrollo de la persona 2 en **NERV, una plataforma web interactiva de gerencia de proyectos**. Entrega acceso para personas reales, datos compartidos y formularios de Project Charter, objetivos, hitos, RACI, riesgos y KPI. Deben permitir crear, editar, guardar y comprobar resultados en el espacio donde P1 implementa chat humano/Kanban/reuniones y P3 incorpora especialistas/GitHub. Una pantalla fija o cambios que desaparecen al recargar no cumplen esta misión.

Tus agentes Codex/Claude Code construyen el producto; los expertos que aparecerán dentro de NERV son otra parte del producto, a cargo de P3. No implementes todos los endpoints de los otros frentes.

## Preparación y base común

Lee las instrucciones vigentes del repositorio y su estado, `docs/plan/RECURSOS-Y-ARRANQUE.md`, `docs/plan/PLAN-MAESTRO.md`, `docs/plan/CONTRATOS.md` y `docs/plan/TRAZABILIDAD.md`. El período oficial y el alcance humano acordado prevalecen sobre los ejemplos de terceros. El plan no autoriza construir funcionalidad central antes del evento.

Usa el [starter kit oficial](https://github.com/CopilotKit/agents-everywhere-starter-kit) y su [template web](https://github.com/CopilotKit/agents-everywhere-starter-kit/blob/main/apps/web/README.md). Incorpora su infraestructura en NERV conservando documentos, historial y remoto `origin` de NERV. No crees otra app desde cero, sustituyas el proyecto por un clon del kit ni copies `.git` o secretos. Registra el commit del starter y el código heredado. Conserva workspaces, lockfile, adaptadores, overrides y versiones compatibles; comprueba las rutas reales del checkout elegido.

Las rutas `src/` de este prompt son relativas a **`apps/web/`**. La configuración compartida sigue en la raíz del repositorio. H0 acaba T20; H1 T75; H2 T145; H3 T205; H4 T240; entrega T290 y reserva hasta T300. El humano P1 fija la hora límite real. Trabaja en `codex/p2-domain`, dentro de un clon o worktree propio.

## Herramientas asignadas

| Herramienta | Uso en tu frente | Resultado comprobable |
|---|---|---|
| Starter kit: Next.js, React, TypeScript y npm workspaces | Adaptar la base web existente y preservar integración CopilotKit | La app arranca desde el repositorio común |
| Auth0 Universal Login y `@auth0/nextjs-auth0` | Login, logout y validación de sesión de tres cuentas | Dos personas acceden al mismo proyecto; una sesión ajena recibe rechazo |
| Supabase **solo como Postgres**, cliente de servidor | Persistir datos compartidos, versiones y auditoría | Cambios visibles tras recarga y desde otra sesión |
| Zod | Contratos y validaciones compartidas | P1/P3 usan el mismo modelo y errores estables |
| GitHub, ramas/PR y CI | Integrar cambios pequeños y ejecutar comprobaciones | La PR identifica archivos, pruebas y aportación del frente |
| Codex y/o Claude Code | Programación delegada por archivos | Código, validación y límites por entrega |
| Auth0 Agent Skills | Consultar la guía de setup adecuada al framework | Recurso de apoyo; no instalar el toolkit al ejecutar este plan documental |
| Ambiguous AI, opcional después de T205 | Leer documento seleccionado o exportar resumen aprobado de reunión | ID real del proveedor, sin otra fuente de tareas |

Consulta [Auth0 para Next.js](https://auth0.com/docs/quickstart/webapp/nextjs), [Auth0 Agent Skills](https://github.com/auth0/agent-skills), [conexión a Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres) y [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security). Adapta proxy/middleware a la versión de Next.js conservada del kit; no actualices todo el stack para copiar el quickstart literalmente.

## Propiedad y agentes de desarrollo

Posees `src/contracts/`, `src/server/platform/`, `src/features/strategy/`, integración Auth0, API `projects/members/session`, migraciones/semilla `supabase/` según la estructura común, configuración raíz, dependencias/lockfile, CI y pruebas platform/strategy/e2e. P1 posee shell, Kanban/chat/reuniones, diccionarios y contexto/componentes CopilotKit del cliente; P3 posee especialistas, contexto autorizado del servidor, ReviewCard/ProposalCard, mapa, control y ciclo GitHub.

- **Coordinador P2:** único escritor de contratos, fixture, esquema, migraciones y configuración; integra sus subagentes y las PR comunes.
- **Agente plataforma:** Auth0, acceso, cliente Postgres y funciones atómicas en archivos asignados.
- **Agente estrategia:** `StrategyPanel`, formularios y rutas propias en archivos distintos.
- **Revisor:** examina permisos, concurrencia y recorrido compartido; devuelve hallazgos al escritor.

Con dos agentes disponibles, combina coordinación/plataforma y estrategia, y haz revisión cruzada al cerrar cada hito. Usa worktrees separados para escritores simultáneos. Ninguno modifica el archivo o lockfile de otro. P1/P3 implementan sus propios repositorios/rutas sobre tus contratos.

## Primeros veinte minutos

1. **T0–T5:** inspecciona NERV y starter; registra commit, runtime, workspaces y comandos. Incorpora la base necesaria preservando estructura, licencia, documentos y remoto de NERV. Entrega un commit mínimo común a T5 para que P1/P3 abran sus ramas y comiencen en paralelo. El humano P2 comprueba acceso Auth0/Supabase/hosting; credenciales y créditos se verifican, no se suponen.
2. **T5–T10:** publica contrato y fixture tipado para desbloquear P1/P3. Acuerda paneles, HTTP, `authSubject`, permisos, errores y versiones. Declara dependencias solicitadas por los frentes desde un único cambio de configuración. Usa runtime compatible con `.nvmrc`/`engines` del kit; no impongas otro mayor por preferencia.
3. **T10–T15:** prepara `.env.example` sin valores reales y adaptadores de sesión/DB. Sustituye gradualmente incidentes por NERV sin borrar la conexión CopilotKit que necesita P3. El guardado de tareas Ambiguous heredado no será la persistencia principal: evita dejarlo visible como una acción paralela de NERV.
4. **T15–T20:** entrega el commit de contratos/configuración, fixture, exports/rutas y comandos. P1/P3 incorporan este commit aprobado en sus ramas, abiertas desde T5. Comprueba instalación y arranque; conserva `npm run verify` del kit y define scripts comunes de NERV. Si falta una credencial, los otros avanzan con dobles tipados identificados y tú terminas el acceso real en H1; no presentes el modo de prueba como colaboración conectada.

## Identidad y datos obligatorios

Auth0 es el único proveedor de identidad. El humano P2 configura una Regular Web Application, URLs locales/de despliegue y tres cuentas de prueba. Usa `@auth0/nextjs-auth0` y sesión validada en servidor. El identificador externo es **`authSubject: string`**, obtenido de `session.user.sub`; puede incluir prefijos/separadores. No lo conviertas a UUID ni crees relaciones con `auth.users`. `Member.id` interno sí es UUID. La asociación sujeto Auth0/proyecto/miembro es única; un email escrito por el cliente no concede acceso.

Supabase se usa únicamente como Postgres. No implementar Supabase Auth, federación de tokens al navegador ni consultas directas a tablas desde React. Camino común: navegador → HTTP → sesión Auth0 → permiso de proyecto → Zod → repositorio de servidor. P1 consulta colaboración por HTTP; no necesita la API Supabase en el navegador.

Entrega `requireProjectAccess(request, projectId, permission)`: obtiene identidad real y devuelve miembro/rol/proyecto autorizados. Rutas con ID de tarea, reunión o propuesta resuelven su proyecto real en servidor. No aceptar `actorId`, `authSubject`, `approvedBy` o `accessRole` del body como autoridad.

RLS activo; acceso directo de `PUBLIC`, `anon` y `authenticated` denegado a tablas/RPC del producto. No uses `auth.uid()` para la sesión Auth0. El cliente privilegiado existe solo en servidor y opera después del guard; puede eludir RLS, así que prueba ambos límites. Sin claves administrativas en frontend, respuestas o variables `NEXT_PUBLIC_`. Mantén protección de origen/CSRF apropiada en mutaciones con cookies. Restringe ejecución de funciones privilegiadas y fija su `search_path`.

RACI y permisos `lead/member` son distintos. Un lead por proyecto coincide con `charter.leadMemberId`; el formulario no permite ascenderse. Cambios de miembros/roles corresponden a la semilla administrativa humana del MVP.

## Contratos entregados a P1/P3

| Entrega | Consumidor | Acuerdo |
|---|---|---|
| Zod y `demo-fixture.ts` | P1/P3 | Entidades y errores comunes; UTC, zona IANA, UUID internos y `authSubject` string |
| `requireProjectAccess(request, projectId, permission)` | P1/P3 | Contexto autorizado; 401 sin sesión, 403 sin permiso; antes de DB o herramientas del agente |
| Cliente DB privado y repositorios base | P1/P3 | Solo servidor; consultas restringidas al proyecto autorizado |
| Escritura atómica con `expectedVersion` | P1/P3 | Cambio/auditoría en transacción; 409 conserva texto local para revisar |
| `writeAuditEvent()` | P1/P3 | Autor real, entidad, versiones, resumen, fecha; sin secretos ni razonamiento interno |
| Transición atómica de Proposal | P3 | Aprobar payload exacto y reclamar `pending → executing` mediante Postgres; duplicados devuelven estado existente |
| `StrategyPanel({projectId, locale, viewerTimeZone})` y acceso | P1 | UI editable que P1 compone en shell; entrega tus textos en/es a P1 |
| `GET /api/session`, proyectos y miembros | P1/P3 | `{data: ...}` o `{error: {code, message, retryable}}`; sin credenciales |
| Lectura autorizada del dominio | P3 | Charter/objetivo/hitos/RACI/KPI/riesgos desde una única fuente |

P3 posee ejecutor GitHub/endpoints; tú entregas primitivas para impedir dos ejecuciones simultáneas de la misma propuesta. Una petición del modelo no concede aprobación humana. P1/P3 escriben sus consultas sobre el esquema común. Actualiza contrato y fixture, comunica commit y después integra consumidores.

## Hitos y entregables

- **P2-01 · T20:** starter incorporado, commit base, runtime compatible, scripts y contratos; P1/P3 trabajan en paralelo con fixture.
- **P2-02 · T75:** Auth0 real, tres identidades asociadas, Postgres con migraciones/semilla y guard. Dos sesiones comparten proyecto; intento sin acceso falla. `StrategyPanel` con Charter editable inicial y CRUD de proyecto.
- **P2-03 · T145:** formularios persistentes Charter, objetivo, hitos, RACI, KPI manual y riesgos. Solo lead aprueba Charter; cambio pertinente invalida aprobación. Un A y al menos un R por hito, miembros válidos; KPI con valor exige fecha/fuente. Escrituras atómicas, auditoría y primitivas de Proposal listas para P3.
- **P2-04 · T205:** integración con colaboración P1 y especialistas/GitHub P3 sobre datos reales. Revisa permisos del ejecutor. Hosting con el humano; si falla, Postgres compartido y dos apps locales con sesiones distintas. Instalación/build integrados comprobados.
- **P2-05 · después de T205, opcional:** Ambiguous solo con interacción principal completa, credencial comprobada y elección humana de esta extensión. El equipo elige como máximo una entre Exa y Ambiguous; si elige Exa, tú apoyas integración sin iniciar Ambiguous. Limita a leer documento seleccionado o exportar resumen de reunión tras aprobación explícita. Descubre esquemas MCP reales antes de asumir nombres/campos. Si no existe capacidad o tarda, documenta límite y continúa demo. No duplicar tareas, Kanban ni Charter; conservar ID/URL reales y verificar lectura posterior cuando corresponda.
- **P2-06 · T240–T290:** congelar funciones; terminar pruebas de permisos/concurrencia y dos sesiones; integrar correcciones y README reproducible, dejando reserva final.

Para Ambiguous consulta [sponsors del kit](https://github.com/CopilotKit/agents-everywhere-starter-kit/blob/main/using-sponsor-tools.md), [guía para agentes](https://www.ambiguous.ai/llms.txt), [MCP](https://www.ambiguous.ai/agents/mcp) y [CLI](https://www.ambiguous.ai/agents/cli). No supongas credencial activa ni configuración compartida automática entre CLI y servidor. No incorporar email/CRM ni abrir cuentas extra para este MVP.

## Aceptación y pruebas

1. Dos cuentas Auth0 distintas ven proyecto y cambios persistidos. Sin sesión no se accede a APIs/contexto de agente. Una persona ajena no puede leer una entidad cambiando su ID.
2. Member edita según permisos, pero no aprueba Charter/Proposal, suplanta autor ni cambia roles. RACI no concede privilegios.
3. Acceso directo con clave pública Supabase no lee/modifica tablas/RPC. No hay cliente privilegiado ni secretos en frontend.
4. Dos escrituras con la misma versión producen un éxito y un 409; el formulario conserva texto local. Recargar Charter/RACI devuelve información guardada.
5. Dos aprobaciones simultáneas reclaman una ejecución. P3 prueba resultado externo/reconciliación; tú verificas atomicidad, auditoría y permisos.
6. Paneles integrados, en/es y fechas con zona; ninguna acción heredada guarda tareas fuera de la fuente común.
7. Ejecuta `npm ci`, `verify` heredado y scripts comunes `typecheck`, `test`, `build` documentados en H0. El build web del kit puede comprobarse con `npm run build --workspace web` si ese nombre se conserva. Tests offline no sustituyen login/escritura/lectura reales.

Evita resets de base compartida: usa IDs de prueba por frente y conjunto separado de demo. El repositorio público contiene solo datos de ejemplo identificados. Una caída externa no justifica aparentar que se guardó algo.

## Parte humana y entrega

El humano P2 configura Auth0, cuentas, credenciales, Postgres, hosting y presupuesto; valida el proyecto y revisa cambios comunes antes de integrar. Los agentes implementan módulos, migraciones, validaciones, pruebas y documentación. P3 revisa plataforma/permisos y P1 acepta experiencia. Solicita intervención solo para decisiones/accesos que falten y continúa módulos independientes.

Por hito entrega commit/PR, archivos propios, contrato cambiado, recorrido reproducible, pruebas/resultados, límites y siguiente integración. El README permite a otro equipo ejecutar con sus credenciales, sin pedir claves privadas por chat. Distingue código heredado y trabajo del evento. No termines con autenticación simulada, formularios decorativos o una plataforma que solo funcione en tu sesión.
