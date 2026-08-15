# Filtro Global de Excepciones

Un filtro único que captura todas las excepciones y estandariza las respuestas de error.

## Ubicación

`src/common/filters/global-exception.filter.ts`

## Comportamiento

| Aspecto | Detalle |
|---------|---------|
| Captura | Todas las excepciones (`@Catch()`) |
| Excepciones HTTP | Devuelve el código de estado y mensaje original (`exception.getStatus()` / `exception.getResponse()`) |
| Errores inesperados | Devuelve `500 Internal server error` |
| Desarrollo | Incluye `stack` trace en la respuesta |
| Producción | Omite el stack trace (según `NODE_ENV === 'production'`) |
| Logging | Registra cada error con método, URL, estado, mensaje y stack (`Logger.error`) |

## Formato de respuesta

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "timestamp": "2026-06-25T10:00:00.000Z",
  "path": "/api/v1/auth/login",
  "stack": "Error: ..."  // solo cuando NODE_ENV !== 'production'
}
```

## Código implementado

**src/common/filters/global-exception.filter.ts**

```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    const isProduction = process.env.NODE_ENV === 'production';

    this.logger.error(`${request.method} ${request.url} — ${status} — ${JSON.stringify(message)}`, exception instanceof Error ? exception.stack : '');

    const body: Record<string, unknown> = {
      statusCode: status,
      message: typeof message === 'string' ? message : (message as Record<string, unknown>).message ?? message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (!isProduction && exception instanceof Error) {
      body.stack = exception.stack;
    }

    response.status(status).json(body);
  }
}
```

### Explicación del código

| Parte | Qué hace |
|-------|----------|
| `@Catch()` | Sin argumentos, captura **todas** las excepciones. |
| `switchToHttp()` | Obtiene la respuesta y la petición HTTP de Express. |
| `status` | Usa el estado de la `HttpException` si existe; si no, `500`. |
| `message` | Extrae el cuerpo de la `HttpException` (puede ser `string` u objeto), o `'Internal server error'`. |
| `isProduction` | Oculta el stack trace cuando `NODE_ENV === 'production'`. |
| `logger.error` | Registra método, URL, estado y mensaje, más el stack si hay un `Error`. |
| `body.message` | Si el mensaje es un objeto (ej. respuesta de `ValidationPipe`), extrae su propiedad `message`. |

## Registro

En `src/main.ts`:

```typescript
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

app.useGlobalFilters(new GlobalExceptionFilter());
```

> Se registra **globalmente**, por lo que aplica a todos los controladores y rutas de la aplicación.

## Reproducible en otros proyectos

1. Crea `src/common/filters/global-exception.filter.ts` con el contenido indicado
2. Impórtalo y regístralo en `main.ts` mediante `app.useGlobalFilters()`
3. Opcionalmente extiéndelo con tipos de excepción específicos para manejo personalizado
