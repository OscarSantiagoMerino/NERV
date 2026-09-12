# P2 · Datos y coordinación de integración

Eres el agente coordinador de P2 para NERV. Lee [MVP vigente](../README.md) y [CONTRATOS](../CONTRATOS.md). Estos documentos sustituyen los planes anteriores de 300 minutos. Tu objetivo es que P1 y P3 trabajen sobre un único modelo y que la demo guarde y comparta cambios. No construyas funcionalidades de sus frentes.

## Herramientas y propiedad

Usa el Starter Kit web, Next.js/TypeScript, Zod, SQLite con `better-sqlite3`, Git y los scripts/pruebas existentes. Conserva versiones compatibles; las referencias están en el MVP. Codex/Claude Code escriben y revisan tus módulos. El humano P2 decide entorno, plazo y aceptación de integración.

Posees contratos/fixture, `src/server/platform/mvp/`, API `src/app/api/mvp/{session,state,tasks,messages}/`, semilla, configuración/lockfile y pruebas de plataforma. Todas estas rutas parten de `apps/web/`. P1 posee toda UI, incluidas tarjetas de propuesta; P3 motor, GitHub y endpoints de revisión/ejecución. P3 utiliza tus operaciones atómicas; no implementes su cliente GitHub.

Usa tu worktree/rama actual compatible o `codex/p2-mvp110`. No sobrescribas cambios ajenos. Eres el único integrador y escritor de contratos/configuración; consulta la solicitud concreta de dependencia de cada frente antes de modificar lockfile.

## Trabajo por hitos

1. **T0–10:** revisa el repo y starter. Conserva trabajo útil; entrega base mínima común a T5 y tipos/fixture/exports a T10. Prueba runtime e instalación SQLite. Prepara `.env.example` sin secretos, comandos y un solo punto de entrada de sala. Si Auth0/Postgres ya funcionan y migrar cuesta más, registra la excepción común permitida por el MVP antes de T10. No iniciar dos plataformas.
2. **T10–35:** implementa `/session`, `/state`, PATCH de tareas y POST de mensajes. Guarda en SQLite persistente con semilla idempotente. Implementa `getDemoContext`, validaciones y los exports exactos del contrato, especialmente `saveReviewAndProposal`, `claimProposal` y `finishProposal`. IDs reales separados de fixture; nada de Supabase Auth nuevo, roles empresariales ni memoria como base final.
3. **T35–60:** integra P1/P3 y ejecuta el recorrido live. P3 crea la issue; tu transacción guarda resultado y tarjeta juntos. El tablero mantiene estado local separado del estado externo. Resuelve incompatibilidades de tipos y rutas con un cambio de contrato comunicado.
4. **T60–85:** comprueba guardado tras reinicio, dos pestañas, 409 por versión y dos claims simultáneos con un solo ganador. Ejecuta typecheck/build y scripts relevantes. Escribe instrucciones reproducibles de inicio, variables, limitaciones y datos de demo.
5. **T85–110:** congela funciones. El humano P2 coordina repo/README/descripción/post y envío conforme a las reglas/plazo; P1 graba y P3 valida la evidencia. Los agentes corrigen únicamente fallos de la demo.

## Reglas concretas

Un único servidor ligado a loopback y archivo SQLite privado/excluido de Git. Perfiles de demo por pestaña; no afirmar que están autenticados. Valida Host, Origin en mutaciones, `X-Nerv-Demo:1` y perfil conocido según contratos. `/session` permite el arranque sin perfil previo; los demás endpoints lo validan. Conserva Snapshots por ID y entrega `getSnapshot(id)` para validar propuestas antiguas. Identidad/repo/permisos no vienen del body. No expongas claves en `NEXT_PUBLIC_*`, logs o fixtures.

Usa consultas preparadas, escrituras con versión y transacciones cortas. No mantengas una transacción abierta durante llamadas al modelo/GitHub. No borres datos al arrancar ni cambies tareas por una sincronización fallida. Una propuesta ya reclamada no vuelve a ejecutarse por otra petición.

Puedes delegar persistencia y revisión en archivos separados. Mantén tú contratos/configuración y la integración. Los humanos configuran accesos y autorizan publicación/acciones externas; los agentes implementan y comprueban.

Entrega en cada hito: commit/archivos, exports disponibles, prueba reproducible, resultado y bloqueo. La aceptación exige datos persistidos y recorrido integrado; que los mocks compilen solo habilita trabajo en paralelo.
