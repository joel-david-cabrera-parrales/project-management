# Integración paso a paso de Microsoft OAuth

Esta guía documenta la integración de inicio de sesión con Microsoft en Task App. Se
admiten cuentas personales Microsoft (Outlook/Hotmail) y cuentas de trabajo o escuela de
Microsoft Entra ID. El backend usa una estrategia Passport distinta de Google, comparte
la inicialización de usuario mediante un caso de uso y emite el JWT propio de Task App.

## 1. Registrar la aplicación en Microsoft Entra

1. Abre [Microsoft Entra admin center](https://entra.microsoft.com/) y ve a **App
   registrations > New registration**.
2. Asigna un nombre para la aplicación.
3. En **Supported account types**, selecciona **Accounts in any organizational
   directory and personal Microsoft accounts**. Esta selección permite ambos tipos.
4. En **Redirect URI**, selecciona **Web** y agrega la URL de callback del backend:
   - Desarrollo: `http://localhost:3000/api/v1/auth/microsoft/callback`
   - Producción: `https://<dominio-api>/api/v1/auth/microsoft/callback`
5. Al crear el registro, copia el **Application (client) ID**.
6. En **Certificates & secrets**, crea un **Client secret** y guarda su valor. Microsoft
   solo muestra el valor completo al crearlo; no lo publiques ni lo incluyas en el
   frontend.
7. Para cuentas organizacionales y personales se utiliza el tenant `common`; no hace
   falta restringir el acceso a un tenant único.

## 2. Configurar variables de entorno

Agrega estas variables al `.env` del backend. También están listadas como placeholders
en `backend/.env.example`:

```env
MICROSOFT_CLIENT_ID=your-microsoft-application-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_TENANT_ID=common
MICROSOFT_CALLBACK_URL=http://localhost:3000/api/v1/auth/microsoft/callback
SESSION_SECRET=replace-with-a-long-random-session-secret
```

`SESSION_SECRET` debe ser un secreto aleatorio largo. El backend lo requiere cuando
Microsoft está habilitado: Passport guarda y valida el parámetro OAuth `state` en una
sesión para proteger el callback contra CSRF. En producción, usa HTTPS y no compartas
este secreto entre entornos.

## 3. Dependencias y sesión OAuth

La estrategia Microsoft usa `passport-oauth2` y consulta Microsoft Graph con el access
token obtenido en el intercambio OAuth. La dependencia y sus tipos se declaran en
`backend/package.json`.

`backend/src/main.ts` habilita `express-session` si está configurado
`MICROSOFT_CLIENT_ID`. La estrategia configura `state: true`; por tanto, el middleware de
sesión debe ejecutarse antes de las rutas Passport. El store predeterminado de Express es
en memoria y solo es adecuado para desarrollo o una única instancia. Para varias
instancias, configura un store compartido (por ejemplo, Redis) antes de desplegar.

## 4. Estrategia Passport de Microsoft

La estrategia está en `backend/src/auth/strategies/microsoft.strategy.ts` y se registra
en `AuthModule` bajo el nombre `microsoft`. A diferencia de Google, consulta el perfil
mediante Microsoft Graph:

```text
GET https://graph.microsoft.com/v1.0/me
Authorization: Bearer <access-token>
```

Los endpoints OAuth se construyen con `MICROSOFT_TENANT_ID` y la versión v2.0:

```text
https://login.microsoftonline.com/common/oauth2/v2.0/authorize
https://login.microsoftonline.com/common/oauth2/v2.0/token
```

Se solicitan los scopes `openid profile email User.Read`. La estrategia extrae el ID
estable de Microsoft Graph y el nombre. Para el correo prefiere `mail`, después una
dirección de `otherMails` y finalmente un `userPrincipalName` que parezca una dirección
de correo normal. No acepta UPNs internos de invitado que incluyan `#EXT#`. Si Graph no
devuelve un ID y una dirección utilizable, la autenticación se rechaza. Los tokens de
Microsoft no se guardan en la base de datos; solo se usa el access token para consultar
`/me`.

## 5. Campos de identidad y migración

La entidad `backend/src/auth/entities/auth.entity.ts` incorpora `microsoftId` único e
`isMicrosoftAccount`. En producción, aplica una migración equivalente a:

```sql
ALTER TABLE auth.user_profile
  ADD COLUMN "microsoftId" text UNIQUE,
  ADD COLUMN "isMicrosoftAccount" boolean NOT NULL DEFAULT false;
```

Haz una copia de seguridad y confirma el nombre del esquema/tabla de tu instalación antes
de ejecutar SQL manualmente. En desarrollo, si TypeORM tiene `synchronize` habilitado,
puede actualizar el esquema al iniciar; no dependas de esa opción en producción.

## 6. Caso de uso para buscar o crear el usuario

La implementación se divide entre:

- `backend/src/auth/classes/authenticate-with-microsoft.class.ts`: contrato de entrada y
  salida del caso de uso.
- `backend/src/auth/use-cases/authenticate-with-microsoft.use-case.ts`: busca por
  `microsoftId`; si no existe, crea el perfil y el usuario, marca
  `isMicrosoftAccount = true` y envía el correo de bienvenida. Si la cuenta ya existe,
  sincroniza el email fiable de Microsoft en el usuario y el perfil, siempre que no esté
  ocupado por otra cuenta.
- `backend/src/auth/auth.module.ts`: registra el caso de uso como provider.
- `backend/src/auth/auth.service.ts`: delega la operación al caso de uso y añade el
  indicador Microsoft al JWT social.

No se enlaza automáticamente un usuario existente por coincidencia de email. El correo
por sí solo no se trata como prueba suficiente para unir identidades: si ya hay una
cuenta con ese email, el caso de uso rechaza la operación. Para permitir esa situación
habría que añadir un flujo de vinculación iniciado por el usuario tras autenticarse.

## 7. Rutas y callback en el backend

`backend/src/auth/auth.controller.ts` expone:

- `GET /api/v1/auth/microsoft`: inicia el redireccionamiento a Microsoft.
- `GET /api/v1/auth/microsoft/callback`: recibe la respuesta OAuth, invoca el caso de
  uso, crea el JWT de Task App y redirige al frontend.

El callback comparte la ruta de frontend que ya usa Google:

```text
<HOST_FRONTEND>/auth/callback?token=<jwt-de-task-app>
```

La app no usa el access token de Microsoft como sesión de Task App.

## 8. Botones de inicio de sesión y registro

En el portal Angular se añadieron botones a:

- `user-web-portal/src/app/auth/pages/login/login.ts` y `login.html`.
- `user-web-portal/src/app/auth/pages/signup/signup.ts` y `signup.html`.

Ambos navegan al endpoint del backend `/auth/microsoft`. El callback existente en
`user-web-portal/src/app/auth/pages/google-callback/google-callback.ts` procesa el JWT
de la misma manera para Google y Microsoft, así que no se necesita una ruta adicional
del frontend.

## 9. Probar la integración

1. Reemplaza los placeholders de Microsoft en `.env` por credenciales del registro.
2. Confirma que la URI de callback del portal Entra coincida exactamente con
   `MICROSOFT_CALLBACK_URL`, incluyendo protocolo, puerto y prefijo `/api/v1`.
3. Aplica la migración SQL si el esquema de la base de datos no se actualiza
   automáticamente en desarrollo.
4. Inicia backend y frontend.
5. En login o registro, selecciona **Microsoft** y autentícate con una cuenta personal.
6. Repite con una cuenta de trabajo/escuela de un tenant distinto.
7. Comprueba que el usuario quede creado y que el navegador termine en el workspace con
   el JWT de Task App.
8. Repite el login con la misma identidad: debe recuperar el usuario existente, no crear
   otro.
9. Prueba una identidad Microsoft cuyo email ya pertenezca a un usuario registrado por
   otro método: debe rechazarse el auto-enlace.

Para desarrollo local, una respuesta correcta termina redirigiendo aproximadamente a:

```text
http://localhost:4200/auth/callback?token=<jwt>
```

## Flujo resumido

```text
Angular -> GET /auth/microsoft -> Passport redirige a Microsoft
Microsoft -> callback del backend con authorization code
Backend -> intercambia el code, consulta Graph /me y valida state de sesión
Backend -> caso de uso: encuentra o crea usuario Microsoft
Backend -> emite JWT propio y redirige a /auth/callback?token=...
Angular -> guarda JWT, carga perfil y navega al workspace
```
