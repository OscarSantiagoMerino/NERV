# MVP revisado — ~110 minutos de construcción restantes

Propuesta externa, no adoptada aún por el equipo. Complementa (no reemplaza)
[`../plan/PLAN-MAESTRO.md`](../plan/PLAN-MAESTRO.md) — ese documento asume 300 minutos
con velocidad pareja entre las tres personas; esto recorta el alcance para el tiempo
real restante y para un equipo con velocidades desiguales (no todos usan agentes de
código con la misma fluidez).

## Por qué recortar así

Con tiempo reducido y velocidad desigual, el riesgo no es "pocas funcionalidades" sino
que la única integración difícil no funcione en vivo. Todo lo no esencial se recorta
para que la persona más rápida tenga el máximo tiempo posible en ese único flujo
crítico, y las otras dos tengan tareas pequeñas que sí puedan terminar.

## Mantener — lo mínimo que prueba el tema y ataca la rúbrica

- Un solo proyecto precargado/sembrado; sin flujo de creación, sin multiproyecto.
- Charter: vista de solo lectura (sin flujo de edición/aprobación).
- Kanban: 3 columnas, ~6 tareas sembradas ligadas a issues reales de GitHub; cambio de
  columna con botón (sin drag-and-drop).
- UN especialista (solo riesgos/control — se descartan planeación y coordinación) que
  lee issues reales de GitHub y propone una mitigación.
- Botón de aprobar humano → crea UNA issue real en GitHub. Este es el momento central
  de la demo; protegerlo por encima de todo lo demás.
- Chat: un solo registro compartido, actualización al refrescar, sin sincronización en
  tiempo real.

## Recortar por completo

- Reuniones, mapa conceptual, editor RACI completo, i18n.
- Auth0 + Postgres/Supabase → reemplazar por un selector de identidad falso ("elige tu
  nombre") + almacenamiento en memoria o un solo archivo SQLite. Dos pestañas del
  navegador bastan como prueba de "colaboración" en la demo.
- Tres especialistas → uno. Dashboard de KPIs/histórico. Drag-and-drop.
- Ambiguous AI, Exa — sin tiempo; no tienen costo en la rúbrica si se omiten.

## Reparto de roles (por velocidad, no por el P1/P2/P3 original)

| Persona | Tarea | Por qué |
|---|---|---|
| La más rápida con agentes de código | GitHub real → especialista propone → aprobar → issue real creada | Es el único flujo difícil y de alto valor; todo depende de que funcione en vivo |
| Persona 2 | Solo vistas estáticas de Kanban + Charter | Mucho scaffold reutilizable, tolera ritmo más lento, desacoplado del agente |
| Persona 3 | Solo registro de chat + selector de identidad | Igual de simple y aislado, copiable del starter kit sin iteración profunda |

## Prompt de instalación (para quien vaya a preparar su entorno)

Ver mensaje completo compartido por chat — clona
`https://github.com/CopilotKit/agents-everywhere-starter-kit`, `npm ci`, copia
`.env.example` a `.env` con placeholders, y luego lee
`docs/plan/PLAN-MAESTRO.md` y `docs/plan/RECURSOS-Y-ARRANQUE.md` antes de escribir
código de producto.
