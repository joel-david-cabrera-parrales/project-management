# Pasos para configurar las variables de entorno en el backend (NestJS)

Este documento explica cómo configurar las variables de entorno del backend usando `@nestjs/config`. El proyecto ya tiene instalado el paquete (`@nestjs/config` v4.0.4) y ya cuenta con un archivo de ejemplo `.env.example` que sirve como plantilla.

---

## 1. Requisitos previos

- Node.js (v18 o superior).
- npm.
- (Opcional) Docker para levantar PostgreSQL y pgAdmin con `docker-compose`.
- (Opcional) CLI de NestJS para generar módulos.

---

## 2. Instalar la dependencia

Si el paquete `@nestjs/config` no está instalado, instálalo desde la raíz del backend:

```bash
npm install @nestjs/config -E
```

En este proyecto ya está instalado, por lo que este paso normalmente no es necesario.

---

## 3. Crear el archivo `.env`

El backend incluye un archivo `.env.example` con todas las variables que usa la aplicación. Copia ese archivo a `.env`:

**PowerShell / CMD (Windows):**

```bash
copy .env.example .env
```

**Linux / macOS:**

```bash
cp .env.example .env
```

> **Importante:** el archivo `.env` contiene secretos (contraseñas, claves JWT, credenciales de Google y del mailer), por lo que **no debe subirse al repositorio**. El `.gitignore` del backend ya lo excluye.

---

## 4. Configurar el `ConfigModule` en `app.module.ts`

En **`src/app.module.ts`**, importa `ConfigModule` y llámalo con `ConfigModule.forRoot()`. Esto carga automáticamente el archivo `.env` de la raíz del backend y lo expone en `process.env`.

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    // ...resto de módulos
  ],
})
export class AppModule {}
```

Opciones útiles de `ConfigModule.forRoot()`:

| Opción | Descripción |
| --- | --- |
| `isGlobal: true` | Hace que `ConfigModule` esté disponible en todos los módulos sin necesidad de importarlo en cada uno. |
| `envFilePath` | Ruta(s) del archivo `.env` (por defecto `.env` en la raíz). |
| `ignoreEnvFile` | Si es `true`, ignora el archivo `.env` (útil en producción). |
| `validationSchema` | Esquema de validación con Joi. |

---

## 5. Definir las variables de entorno

A continuación se describen todas las variables que usa el proyecto, agrupadas según su propósito (contenido del `.env.example`).

### 5.1 Sistema

```env
NODE_ENV=development
HOST_FRONTEND="http://localhost:4200"
APP_NAME="Task App"
PORT=3000
HOST_API=http://localhost:3000/api/v1
TRUST_PROXY=loopback
```

| Variable | Uso |
| --- | --- |
| `NODE_ENV` | Permite condicionar Swagger (solo se habilita fuera de producción) y los mensajes de error del filtro global. |
| `HOST_FRONTEND` | URL del frontend para CORS (`src/main.ts`) y para construir enlaces en los correos. |
| `APP_NAME` | Nombre de la aplicación usado en las plantillas de correo. |
| `PORT` | Puerto donde escucha el servidor (`src/main.ts`). |
| `HOST_API` | URL base de la API usada para generar URLs de fotos/adjuntos (`src/common/helpers/photo-url.helper.ts`). |
| `TRUST_PROXY` | Valor de `trust proxy` configurado en `src/main.ts` (por defecto `loopback`). |

### 5.2 Base de datos (TypeORM)

```env
TORM_PG_HOST=localhost
TORM_PG_DATABASE=clon_trello
TORM_PG_USER_DB=postgres
TORM_PG_PASSWORD_DB=postgres
TORM_PG_PORT=5434
```

Estas variables se usan en `TypeOrmModule.forRoot()` dentro de `src/app.module.ts`:

```typescript
TypeOrmModule.forRoot({
  type: 'postgres',
  host: process.env.TORM_PG_HOST,
  database: process.env.TORM_PG_DATABASE,
  username: process.env.TORM_PG_USER_DB,
  password: process.env.TORM_PG_PASSWORD_DB,
  port: Number(process.env.TORM_PG_PORT),
  autoLoadEntities: true,
  synchronize: true, // cambiar a false en producción
}),
```

### 5.3 JWT

```env
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRES_IN=8h
REFRESH_TOKEN_EXPIRES_IN=30d
```

| Variable | Uso |
| --- | --- |
| `JWT_SECRET` | Secreto para firmar y verificar tokens (`src/auth/auth.module.ts` y `src/auth/strategies/jwt.strategy.ts`). |
| `JWT_EXPIRES_IN` | Tiempo de expiración del access token (ej. `8h`, `15m`). |
| `REFRESH_TOKEN_EXPIRES_IN` | Tiempo de expiración del refresh token (ej. `30d`). |

> **Seguridad:** usa un secreto largo y aleatorio, no el valor del ejemplo.

### 5.4 Mailer (Nodemailer)

```env
MAILER_HOST=smtp.gmail.com
MAILER_PORT=465
MAILER_USER=your-email@gmail.com
MAILER_SECRET=your-gmail-app-password
```

Se usan en `MailerModule.forRoot()` dentro de `src/app.module.ts`:

```typescript
MailerModule.forRoot({
  transport: {
    host: process.env.MAILER_HOST,
    port: Number(process.env.MAILER_PORT),
    secure: true, // true para 465, false para otros puertos
    auth: {
      user: process.env.MAILER_USER,
      pass: process.env.MAILER_SECRET,
    },
  },
  defaults: {
    from: `"Task App Support" <${process.env.MAILER_USER}>`,
  },
}),
```

> Para Gmail se recomienda usar una **contraseña de aplicación** (App Password), no la contraseña normal de la cuenta.

### 5.5 Variables de desarrollo (Docker Compose)

```env
PG_ADMIN_EMAIL=admin@example.com
PGADMIN_PASSWORD=your-pgadmin-password

POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=clon_trello
```

Estas variables alimentan el `docker-compose.yaml` para levantar los contenedores de **PostgreSQL** (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`) y **pgAdmin** (`PG_ADMIN_EMAIL`, `PGADMIN_PASSWORD`).

Para levantar la infraestructura:

```bash
docker-compose up -d
```

### 5.6 Google OAuth

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback
```

Se usan en la estrategia de Google (`src/auth/strategies/google.strategy.ts`):

```typescript
clientID: configService.get('GOOGLE_CLIENT_ID') || '',
clientSecret: configService.get('GOOGLE_CLIENT_SECRET') || '',
callbackURL: configService.get('GOOGLE_CALLBACK_URL') || '',
```

---

## 6. Leer las variables de entorno

Hay dos formas de acceder a las variables dentro del código:

### 6.1 Usando `ConfigService` (recomendado)

`ConfigService` permite tipar y validar valores, y es más fácil de testear.

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MiServicio {
  constructor(private readonly configService: ConfigService) {}

  obtenerFrontendUrl(): string {
    return this.configService.get('HOST_FRONTEND') || 'http://localhost:4200';
  }
}
```

Si `ConfigModule` no está configurado con `isGlobal: true`, importa `ConfigModule` en el módulo que use el servicio.

### 6.2 Usando `process.env` directamente

El proyecto lo usa en `src/app.module.ts`, `src/main.ts` y en varios use-cases:

```typescript
const frontendUrl = process.env.HOST_FRONTEND || 'http://localhost:4200';
```

> `process.env` solo funciona después de que `ConfigModule.forRoot()` haya cargado el archivo `.env` (o usando la variable `@nestjs/config` que ya lo inyecta). En `main.ts` funciona porque `bootstrap()` se ejecuta después del arranque de Nest.

---

## 7. (Opcional) Validar las variables de entorno con Joi

Puedes agregar validación para fallar rápido si falta alguna variable. Instala Joi:

```bash
npm install joi -E
```

Y configúralo en `app.module.ts`:

```typescript
import * as Joi from 'joi';

ConfigModule.forRoot({
  validationSchema: Joi.object({
    NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
    PORT: Joi.number().default(3000),
    JWT_SECRET: Joi.string().required(),
    MAILER_USER: Joi.string().required(),
  }),
}),
```

---

## 8. Verificar la configuración

1. Asegúrate de tener la base de datos disponible (Docker o local).
2. Ejecuta el backend en modo desarrollo:

```bash
npm run start:dev
```

3. Al arrancar deberías ver en consola:

```
Application is running on port: 3000
```

Si el archivo `.env` no existe o una variable obligatoria falta, verás errores de conexión a la base de datos o valores `undefined` en la configuración.

---

## Resumen del flujo

1. `npm install @nestjs/config -E` (ya instalado).
2. `copy .env.example .env`.
3. Configurar `ConfigModule.forRoot()` en `src/app.module.ts`.
4. Completar cada variable según el contexto (sistema, DB, JWT, mailer, Docker, Google).
5. Leerlas con `ConfigService` (recomendado) o `process.env`.
6. `npm run start:dev` para verificar.
