# Notificaciones en tiempo real con NestJS y Socket.IO

Esta guía describe la implementación del backend de notificaciones en tiempo real y cómo conectarse desde un cliente. REST sigue siendo la fuente persistente; Socket.IO entrega cambios en vivo, pero no reemplaza la lectura por REST.

## 1. Dependencias

El backend usa NestJS 11, por lo que los paquetes de Nest deben mantenerse en la misma versión mayor:

```bash
cd backend
npm install @nestjs/websockets@^11 @nestjs/platform-socket.io@^11 socket.io
```

No uses `--force` para resolver una incompatibilidad de versiones. El gateway implementado está en `src/notification/notification.gateway.ts`.

## 2. Configuración del backend

`NotificationModule` registra el gateway y la capa Socket.IO. La conexión se abre en el namespace:

```text
http://localhost:3000/notifications
```

El namespace de WebSocket no usa el prefijo REST `/api/v1`. La URL en producción usa el host del backend, por ejemplo `https://api.example.com/notifications`.

El origen permitido se obtiene de `HOST_FRONTEND` (o usa `http://localhost:4200` como valor local). Configura esa variable con el origen exacto del portal:

```env
HOST_FRONTEND=http://localhost:4200
```

La aplicación debe tener configurado `JWT_SECRET`, que ya utiliza el módulo de autenticación.

## 3. Autenticación y privacidad

El cliente debe enviar el JWT durante el handshake en `auth.token`. El gateway:

1. Verifica firma y vencimiento usando el `JwtService` del módulo de autenticación.
2. Lee `userCode` del payload JWT actual.
3. Busca al usuario y rechaza cuentas inexistentes, inactivas o bloqueadas.
4. Une el socket únicamente a la sala `user:<id>` derivada por el servidor.
5. Desconecta el socket cuando vence el JWT.

Nunca envíes un `userId` para elegir a qué sala conectarse; tampoco publiques notificaciones a todas las conexiones. CORS limita orígenes del navegador, pero no reemplaza la autenticación.

## 4. Emisión desde el backend

Los casos de uso existentes llaman a `NotificationService.create()`. Este método respeta `notifications.inApp`, guarda primero la notificación y luego emite `notification:new` solo en la sala del destinatario. Si no hay clientes conectados, la notificación sigue guardada y aparecerá al consultar REST.

El gateway está registrado como provider de `NotificationModule`; `NotificationService` usa sus métodos de emisión al crear, leer o borrar notificaciones. Los eventos que ya se emiten son:

| Evento | Payload | Momento |
|---|---|---|
| `notification:new` | objeto de notificación | Nueva notificación persistida |
| `notification:unread-count` | `{ count: number }` | Se crea, lee o elimina una notificación |
| `notification:read` | `{ id, read, readAt }` | Se marca una notificación como leída |
| `notification:read-all` | `{ read: true }` | Se marcan todas como leídas |
| `notification:deleted` | `{ id }` | Se elimina una notificación |

Los eventos de lectura y borrado permiten sincronizar varias pestañas/dispositivos. El cliente puede volver a pedir el listado REST si necesita el estado completo.

## 5. Conexión de un cliente

Instala `socket.io-client` en el proyecto frontend:

```bash
npm install socket.io-client
```

Ejemplo de conexión genérico:

```ts
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/notifications', {
  auth: { token: accessToken },
  transports: ['websocket', 'polling'],
  reconnection: true,
});

socket.on('connect', () => {
  console.log('Conectado a notificaciones', socket.id);
});

socket.on('notification:new', (notification) => {
  // Añadir al listado local y, si corresponde, mostrar un toast.
  console.log('Nueva notificación', notification);
});

socket.on('notification:unread-count', ({ count }) => {
  // Actualizar el badge del menú.
  console.log('No leídas:', count);
});

socket.on('notification:read', ({ id }) => {
  // Actualizar el elemento en el estado local.
  console.log('Marcada como leída:', id);
});

socket.on('notification:read-all', () => {
  // Actualizar el listado local completo.
});

socket.on('notification:deleted', ({ id }) => {
  // Quitar el elemento del estado local.
  console.log('Eliminada:', id);
});

socket.on('connect_error', (error) => {
  // Token inválido/vencido, origen incorrecto o backend inaccesible.
  console.error('No se pudo conectar a notificaciones:', error.message);
});

// Al cerrar sesión o destruir el servicio/componente:
socket.disconnect();
```

No guardes un segundo token para el socket: reutiliza el access token que usa REST y actualiza/reconecta cuando la aplicación renueve ese token.

## 6. Uso recomendado junto a REST

Al iniciar sesión o abrir el área de notificaciones:

1. Llama `GET /api/v1/notifications` para recuperar el listado paginado.
2. Llama `GET /api/v1/notifications/unread-count` para inicializar el badge.
3. Abre el socket con el mismo JWT.
4. Aplica los eventos recibidos al estado local. Si se pierde la conexión o se reconecta, vuelve a sincronizar mediante REST.
5. Para acciones del usuario, continúa usando `PATCH /api/v1/notifications/:id/read`, `PATCH /api/v1/notifications/read-all` y `DELETE /api/v1/notifications/:id`. El servidor persistirá el cambio y lo emitirá a las demás conexiones de esa cuenta.

Socket.IO no garantiza que un cliente desconectado reciba eventos anteriores. La recuperación se hace consultando REST; PostgreSQL es la fuente de verdad.

## 7. Desarrollo y despliegue

- Ejecuta el backend con `npm run start:dev` y el frontend en el origen de `HOST_FRONTEND`.
- Confirma que el proxy/load balancer permita el upgrade de WebSocket. Se deja habilitado polling como fallback.
- Si se ejecuta una sola instancia del backend, no hace falta un adapter adicional.
- Si se ejecutan varias instancias, añade un adapter compartido (normalmente Redis) para propagar los eventos entre procesos y configura afinidad de sesión si se mantiene polling.
- No registres JWT completos en logs ni incluyas secretos en los payloads de notificación.

## 8. Verificación manual

1. Inicia el backend con PostgreSQL y `HOST_FRONTEND` configurados.
2. Inicia sesión y copia el access token desde el flujo autenticado del portal.
3. Conecta un cliente Socket.IO al namespace `/notifications`, enviando `auth: { token }`.
4. Con una segunda sesión/usuario, genera una asignación, finalización, mención o evento de workspace que notifique al primer usuario.
5. Confirma que solo el socket del destinatario recibe `notification:new` y que el contador recibe `notification:unread-count`.
6. Marca o elimina una notificación por REST y verifica que los sockets de ese mismo usuario reciben el evento correspondiente.
7. Prueba un JWT inválido/vencido y confirma que el handshake se rechaza.
