# Asistente de tareas (backend)

## Alcance

El asistente está integrado como `ChatbotModule` en NestJS. Usa flujos guiados deterministas, no un LLM. Su personalidad es cálida y emotiva, con mensajes en español y emojis. Cada conversación se guarda en PostgreSQL y queda asociada al usuario autenticado.

## Endpoints

Todos requieren `Authorization: Bearer <access-token>` y quedan bajo `/api/v1`:

| Método | Ruta | Función |
|---|---|---|
| `GET` | `/chatbot/flows` | Listar los flujos disponibles para el asistente. |
| `POST` | `/chatbot/conversations` | Iniciar una conversación. Body opcional: `{ "flowId": "task-assistant" }`. |
| `GET` | `/chatbot/conversations/:id` | Recuperar estado e historial de una conversación propia. |
| `POST` | `/chatbot/conversations/:id/messages` | Enviar `{ "message": "..." }`. Máximo 2.000 caracteres. |
| `POST` | `/chatbot/conversations/:id/reset` | Reiniciar esa conversación. |

No se recibe un `userId` del cliente: el usuario se obtiene del JWT. Las consultas de conversación siempre filtran por el ID autenticado, por lo que conocer el UUID de otra conversación no permite leerla ni modificarla.

## Flujos disponibles

El flujo `task-assistant` comienza con un menú. Puede:

- Mostrar tareas abiertas asignadas al usuario.
- Crear una tarea indicando workspace, columna, título y descripción opcional. Antes de crearla presenta un resumen y solicita confirmación.
- Marcar como completada una tarea abierta tras localizarla por código/ID y pedir confirmación.
- Asignar una tarea a un miembro del mismo workspace, con confirmación.
- Añadir un comentario a una tarea, con confirmación.
- Explicar las capacidades y los límites del asistente.

Los flujos y transiciones están en `src/chatbot/flows/task-assistant.flow.ts`. La máquina de estados está en `src/chatbot/core/state-machine.service.ts`.

## Seguridad y reutilización

- `TaskChatbotActionsService` es el adaptador allowlist entre las acciones del flujo y los módulos de Task App. No acepta URLs o métodos HTTP definidos por el usuario.
- Reutiliza `WorkspaceService`, `TaskService` y `CommentService`. La resolución de workspace/rol se valida de nuevo antes de las escrituras. El servicio de tareas aplica sus autorizaciones, dispara las notificaciones existentes al completar o asignar, y el servicio de comentarios conserva su validación de membresía.
- No se delegan eliminaciones de tareas/workspaces, gestión de miembros, cambios de rol ni operaciones administrativas.
- La lista de historial se limita a los 200 mensajes más recientes. `userData` e historial son JSONB de la conversación del usuario; no deben añadirse secretos a esos datos.

## Persistencia

`ChatbotConversation` se guarda en `chatbot.conversations`: usuario, flujo, estado actual, datos temporales, historial, flag de finalización y marcas de tiempo. La migración `1793300000000-CreateChatbotConversations` crea el schema/tabla e índices y se registra en `AppModule`; `migrationsRun` la ejecuta en el arranque. No se usa el `Map` volátil del prototipo original.

## Ejemplo de uso

1. Iniciar sesión en Task App y obtener el access token.
2. `POST /api/v1/chatbot/conversations` con `{}`.
3. Conservar el `id` devuelto como ID de conversación.
4. Enviar mensajes a `POST /api/v1/chatbot/conversations/:id/messages` con `{ "message": "Ver mis tareas" }`.
5. Mostrar `responses` y conservar el mismo ID durante todo el flujo.
6. Consultar `GET /api/v1/chatbot/conversations/:id` para restaurar el historial, o llamar al endpoint `reset` para empezar de nuevo.

## Verificación

Las pruebas unitarias cubren la bienvenida, transición del flujo, respuesta amistosa a opciones inválidas, persistencia de mensajes y aislamiento de conversaciones por usuario. El backend se valida con `npm run build` y `npm test -- --runInBand`.
