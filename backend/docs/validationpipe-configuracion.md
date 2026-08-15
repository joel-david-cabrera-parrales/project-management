# Pasos para configurar ValidationPipe en el backend (NestJS)

NestJS usa `ValidationPipe` junto con `class-validator` y `class-transformer` para validar y transformar los datos que llegan en las peticiones (body, query params y params). Este proyecto ya los tiene configurados de forma global en `src/main.ts`.

---

## 1. Instalar las dependencias

`ValidationPipe` necesita dos paquetes:

- **class-validator**: define los decoradores de validación (`@IsString()`, `@IsEmail()`, `@IsNumber()`, etc.).
- **class-transformer**: convierte el objeto plano de la petición en instancias de las clases DTO.

```bash
npm install class-validator class-transformer -E
```

En este proyecto ya están instaladas (`class-validator` 0.15.1 y `class-transformer` 0.5.1), por lo que este paso normalmente no es necesario.

---

## 2. Crear el DTO con decoradores de validación

Un **DTO** (Data Transfer Object) es una clase que describe la forma esperada de la petición. Cada propiedad se valida con los decoradores de `class-validator`.

**Ejemplo: src/label/dto/create-label.dto.ts**

```typescript
import { IsString, MinLength, MaxLength, IsUUID } from 'class-validator';

export class CreateLabelDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @IsString()
  @MinLength(4)
  @MaxLength(20)
  color: string;

  @IsString()
  @IsUUID()
  workspaceCode: string;
}
```

Decoradores de uso común:

| Decorador | Descripción |
| --- | --- |
| `@IsString()` / `@IsNumber()` / `@IsBoolean()` | Valida el tipo de dato. |
| `@IsEmail()` | Valida que sea un email válido. |
| `@IsUUID()` / `@IsInt()` / `@IsDateString()` | Valida UUIDs, enteros y fechas en formato string. |
| `@IsArray()` | Valida que el valor sea un arreglo. |
| `@IsOptional()` | Permite que la propiedad sea `undefined` o `null` (típico en DTOs de actualización). |
| `@IsNotEmpty()` | Valida que no esté vacío. |
| `@MinLength()` / `@MaxLength()` | Valida longitud mínima y máxima de strings. |
| `@IsIn(['a', 'b'])` | Valida que el valor esté dentro de una lista. |
| `@Type(() => Clase)` | Convierte un objeto anidado a una instancia de clase (de `class-transformer`). |

Los mensajes de error se pueden personalizar con la opción `message`:

```typescript
@IsString({ message: 'Email must be a string' })
@IsEmail({}, { message: 'Email must be a valid email address' })
```

---

## 3. Configurar el ValidationPipe de forma global

La forma más común es registrarlo como pipe global en **`src/main.ts`**, de modo que aplique a todas las rutas de la aplicación.

**src/main.ts** (configuración actual del proyecto):

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // elimina propiedades que no estén en el DTO
      forbidNonWhitelisted: true, // lanza error si llegan propiedades no declaradas
      transform: true, // convierte el body a instancia del DTO
      transformOptions: { enableImplicitConversion: true }, // convierte tipos simples (string -> number, etc.)
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

### Explicación de las opciones

| Opción | Descripción |
| --- | --- |
| `whitelist: true` | Elimina del objeto todas las propiedades que no tengan decoradores de validación en el DTO. |
| `forbidNonWhitelisted: true` | En lugar de eliminar silenciosamente, lanza un error `400` si llega una propiedad no declarada. Se recomienda usarlo junto a `whitelist`. |
| `transform: true` | Convierte el payload en una instancia de la clase DTO (permite métodos y comportamiento de clase). |
| `transformOptions.enableImplicitConversion` | Convierte los tipos de forma implícita (`"5"` a `5`, `"true"` a `true`). Necesario para `@IsNumber()` cuando el valor viene como string en query params. |

---

## 4. Usar el DTO en el controlador

Declara el tipo del parámetro como el DTO y Nest se encargará de validar y transformar el body automáticamente.

**Ejemplo: src/label/label.controller.ts**

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { CreateLabelDto } from './dto/create-label.dto';

@Controller('labels')
export class LabelController {
  @Post()
  create(@Body() createLabelDto: CreateLabelDto) {
    return createLabelDto;
  }
}
```

También aplica a **query params** y **params**:

```typescript
import { Get, Query, Param } from '@nestjs/common';

@Get()
findAll(@Query('page') page: number) {
  // con enableImplicitConversion, "2" llega como 2
}

@Get(':code')
findOne(@Param('code') code: string) {
  // el tipo debe estar declarado en el DTO/type para aplicar validación
}
```

---

## 5. Respuesta de error

Cuando la validación falla, NestJS devuelve un `400 Bad Request` con el detalle de los errores:

```json
{
  "statusCode": 400,
  "message": [
    "name must be a string",
    "name must be longer than or equal to 1 characters",
    "color must be shorter than or equal to 20 characters",
    "workspaceCode must be a UUID"
  ],
  "error": "Bad Request"
}
```

> En este proyecto la respuesta pasa por el `GlobalExceptionFilter`, que formatea los errores de forma consistente antes de responder al cliente.

---

## 6. (Opcional) Validar propiedades anidadas con `@Type()`

Si un DTO contiene un objeto anidado, se debe indicar su tipo para que `class-validator` pueda validarlo con `@ValidateNested()` y `@Type()`.

**Ejemplo real: src/profile/dto/update-settings.dto.ts**

```typescript
import { IsBoolean, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class EmailNotificationsDto {
  @IsBoolean()
  @IsOptional()
  taskAssigned: boolean;
}

export class UpdateSettingsDto {
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => EmailNotificationsDto)
  email: EmailNotificationsDto;
}
```

---

## 7. Verificar la configuración

1. Ejecuta el backend:

```bash
npm run start:dev
```

2. Envía una petición `POST` con un body inválido (ej. faltando `name`):

```bash
curl -X POST http://localhost:3000/api/v1/labels \
  -H "Content-Type: application/json" \
  -d '{"color": "#EF4444"}'
```

3. Deberías recibir un `400` con el listado de errores de validación.

4. Envía una propiedad no declarada en el DTO (ej. `{"extra": true}`) y verifica que, gracias a `forbidNonWhitelisted`, también responde `400`.

---

## Resumen del flujo

1. `npm install class-validator class-transformer -E` (ya instalado).
2. Crear los DTOs con los decoradores de `class-validator`.
3. Registrar `new ValidationPipe({...})` de forma global en `src/main.ts`.
4. Tipar los parámetros de los controladores (`@Body()`, `@Query()`, `@Param()`) con los DTOs.
5. `npm run start:dev` para verificar las respuestas `400`.
