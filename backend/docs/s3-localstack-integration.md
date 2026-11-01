# Integración de almacenamiento S3 local con LocalStack

Esta guía explica cómo se configuró S3 compatible en desarrollo mediante LocalStack y cómo lo usa el backend NestJS para guardar fotos de perfil y adjuntos. Está escrita para que la configuración pueda replicarse en otro entorno o proyecto.

## 1. Objetivo y arquitectura

LocalStack emula el servicio S3 de AWS en el equipo local. La aplicación se conecta al endpoint de LocalStack como si fuera AWS S3, sin guardar los archivos nuevos en el disco del backend.

El diseño separa los metadatos del contenido:

- **PostgreSQL** guarda los datos de negocio: nombre original, MIME type, tamaño, quién cargó el adjunto y a qué tarea pertenece. Para las fotos guarda la clave S3 en `profile.photo`.
- **S3** guarda los bytes del archivo. La aplicación conserva la clave del objeto, no una ruta local ni una URL pública del bucket.
- **NestJS** controla autorización y validaciones; al descargar, obtiene el objeto de S3 y lo transmite en la respuesta HTTP.

Las claves nuevas siguen este patrón:

```text
attachments/<código-de-tarea>/<uuid>
profiles/<uuid>
```

En S3, los segmentos anteriores a la última `/` se muestran como prefijos (carpetas virtuales). Los objetos no son públicos: se sirven a través de la API.

## 2. Dependencias

El backend ya incluye el cliente oficial de AWS SDK v3:

```json
"@aws-sdk/client-s3": "3.1161.0"
```

Este paquete proporciona `S3Client` y los comandos `PutObjectCommand`, `GetObjectCommand` y `DeleteObjectCommand`. No se necesita una librería específica de LocalStack: el SDK de AWS se conecta a LocalStack indicando un endpoint alternativo.

En un backend nuevo, instalarlo con:

```bash
npm install @aws-sdk/client-s3
```

La aplicación usa también `@nestjs/config` para leer la configuración desde el entorno. En este repositorio, `AppModule` inicializa la configuración con `ConfigModule.forRoot()` y `CommonModule` importa `ConfigModule` para inyectar `ConfigService`.

## 3. Variables de entorno

Las variables de ejemplo están en la raíz del repositorio, en `.env.example`. Copia ese archivo como `.env` y completa sus valores antes de iniciar Compose.

```env
# Token de LocalStack. Usa el valor correspondiente a tu instalación/licencia.
AWS_LOCAL_TOKEN=<TOKEN_DE_LOCALSTACK>

# Región usada por S3 y LocalStack
AWS_REGION=us-east-1

# LocalStack escucha en el puerto unificado 4566
AWS_STORAGE_SERVICE=s3
AWS_STORAGE_SERVICE_PORT=4566

# Acceso al S3 local desde un proceso NestJS ejecutado en Windows/macOS/Linux host
AWS_S3_ENDPOINT=http://localhost:4566
AWS_S3_BUCKET=app-task-bucket-local
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
```

### Elegir el endpoint correcto

El valor depende de dónde se ejecuta NestJS:

| Dónde corre el backend | Endpoint S3 |
| --- | --- |
| Dentro de Docker Compose | `http://aws-local-s3:4566` |
| Directamente en el equipo (fuera de Docker) | `http://localhost:4566` |

El servicio `backend` de `docker-compose.yml` sobrescribe `AWS_S3_ENDPOINT` a `http://aws-local-s3:4566`, que es el DNS interno de Compose. Esto es necesario porque `localhost` dentro del contenedor `backend` apuntaría al mismo backend y no al contenedor S3.

En AWS real, deja `AWS_S3_ENDPOINT` sin configurar para que el SDK use el endpoint estándar y proporciona credenciales mediante el mecanismo seguro de AWS (rol de IAM, perfil o variables del entorno de despliegue). No uses las credenciales locales `test/test` en producción.

## 4. Configuración de Docker Compose y creación del bucket

El servicio `aws-local-s3` está declarado en el `docker-compose.yml` de la raíz:

```yaml
aws-local-s3:
  container_name: s3-local
  image: localstack/localstack:latest
  ports:
    - "${AWS_STORAGE_SERVICE_PORT}:4566"
  environment:
    - LOCALSTACK_AUTH_TOKEN=${AWS_LOCAL_TOKEN}
    - SERVICES=${AWS_STORAGE_SERVICE}
    - AWS_DEFAULT_REGION=${AWS_REGION}
    - AWS_S3_BUCKET=${AWS_S3_BUCKET:-app-task-bucket-local}
  volumes:
    - "./backend/aws/aws-s3-data:/var/lib/localstack"
    - "/var/run/docker.sock:/var/run/docker.sock"
    - "./backend/aws/localstack-init:/etc/localstack/init/ready.d:ro"
  networks:
    - task_app_net
```

Los volúmenes cumplen funciones distintas:

- `backend/aws/aws-s3-data` persiste el estado de LocalStack entre reinicios del contenedor.
- `backend/aws/localstack-init` monta scripts de inicialización en el directorio `ready.d` de LocalStack.
- El socket de Docker lo usa LocalStack en algunos servicios/emulaciones.

El backend recibe estas variables en Compose:

```yaml
environment:
  - AWS_S3_ENDPOINT=http://aws-local-s3:4566
  - AWS_S3_BUCKET=${AWS_S3_BUCKET:-app-task-bucket-local}
```

### Script de inicialización

El archivo `backend/aws/localstack-init/ready.sh` crea el bucket al quedar listo LocalStack. Si ya existe, no intenta recrearlo:

```bash
#!/bin/bash
set -e

awslocal s3api head-bucket --bucket "$AWS_S3_BUCKET" >/dev/null 2>&1 || \
  awslocal s3 mb "s3://$AWS_S3_BUCKET"
```

El nombre del bucket debe coincidir entre `AWS_S3_BUCKET` del backend y el bucket que crea este script. Si cambias el nombre, usa la misma variable en ambos servicios.

Para iniciar o recrear los servicios después de cambiar Compose o el script:

```powershell
docker compose up -d --force-recreate aws-local-s3 backend
```

Consulta los logs de LocalStack si el bucket no aparece:

```powershell
docker compose logs aws-local-s3
```

> LocalStack puede mostrar un aviso indicando que `awslocal` está deprecado. En la imagen actual el comando puede seguir ejecutándose pese al aviso. `lstk` no necesariamente está instalado dentro del contenedor; si `docker compose exec aws-local-s3 lstk ...` devuelve “executable file not found”, usa `awslocal` como en los ejemplos siguientes.

## 5. Servicio NestJS para objetos S3

El servicio está en `backend/src/common/services/s3/s3.service.ts`. Lee la configuración desde `ConfigService`, crea el cliente una vez y expone las operaciones utilizadas por los casos de uso.

```typescript
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';

@Injectable()
export class S3Service implements OnModuleDestroy {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(config: ConfigService) {
    const endpoint = config.get<string>('AWS_S3_ENDPOINT');
    this.bucketName = config.get<string>('AWS_S3_BUCKET') || 'app-task-bucket-local';
    const accessKeyId = config.get<string>('AWS_ACCESS_KEY_ID') || (endpoint ? 'test' : undefined);
    const secretAccessKey = config.get<string>('AWS_SECRET_ACCESS_KEY') || (endpoint ? 'test' : undefined);

    this.s3Client = new S3Client({
      region: config.get<string>('AWS_REGION') || 'us-east-1',
      endpoint: endpoint || undefined,
      // LocalStack requiere direccionamiento path-style.
      forcePathStyle: Boolean(endpoint),
      // Sin endpoint, el SDK puede usar la cadena de credenciales de AWS.
      ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
    });
  }

  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async getObject(key: string): Promise<{ body: Readable; contentType?: string; contentLength?: number }> {
    const result = await this.s3Client.send(
      new GetObjectCommand({ Bucket: this.bucketName, Key: key }),
    );
    if (!result.Body) throw new Error(`S3 object has no body: ${key}`);

    return {
      body: Readable.from(result.Body as AsyncIterable<Uint8Array>),
      contentType: result.ContentType,
      contentLength: result.ContentLength,
    };
  }

  async getObjectBuffer(key: string): Promise<Buffer> {
    const { body } = await this.getObject(key);
    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async deleteObject(key: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({ Bucket: this.bucketName, Key: key }),
    );
  }

  onModuleDestroy() {
    this.s3Client.destroy();
  }
}
```

### Registro y disponibilidad por módulo

`CommonModule` registra y exporta `S3Service` para que otros módulos lo puedan inyectar:

```typescript
@Module({
  providers: [S3Service /* otros servicios compartidos */],
  imports: [ConfigModule /* otros módulos */],
  exports: [S3Service /* otros servicios compartidos */],
})
export class CommonModule {}
```

Los módulos que utilizan almacenamiento importan `CommonModule`:

- `AttachmentModule`: almacenamiento y eliminación de adjuntos.
- `ProfileModule`: subida y lectura de fotos.
- `AuthModule`: llega a `S3Service` mediante `CommonModule` y lo utiliza para guardar las imágenes obtenidas de Google y Microsoft.

Un servicio no puede inyectarse solo por existir el archivo: debe estar registrado como provider y el módulo que lo exporta debe importarse donde se necesite.

## 6. Uso en el proyecto

### 6.1 Subir un adjunto de tarea

El endpoint es `POST /api/v1/attachment/upload/:taskCode`. Requiere JWT y un formulario `multipart/form-data` con el campo `file`.

En `AttachmentController`, `FileInterceptor` limita el archivo a 100 MiB y filtra los tipos MIME permitidos. Actualmente se aceptan PDF, imágenes PNG/JPEG/GIF/WebP y documentos de Office (Word, Excel y PowerPoint). El límite de tamaño no implica que cualquier extensión esté permitida.

El caso de uso `UploadAttachmentUseCaseImp` primero valida que existan la tarea y el usuario y que el usuario pertenezca al workspace. Después sube el buffer a una clave única y guarda los metadatos en PostgreSQL:

```typescript
const storedName = `attachments/${task.code}/${uuidv4()}`;
await this.s3Service.putObject(storedName, file.buffer, file.mimetype);

const attachment = this.attachmentRepository.create({
  fileName: file.originalname,
  storedName, // Clave S3, no nombre/ruta local
  mimeType: file.mimetype,
  fileSize: file.size,
  task,
  uploadedBy: user,
});

try {
  return await this.attachmentRepository.save(attachment);
} catch (error) {
  // Evita dejar un objeto sin registro si falla la escritura de la BD.
  await this.s3Service.deleteObject(storedName).catch(() => undefined);
  throw error;
}
```

La API devuelve una URL interna, por ejemplo `/api/v1/attachment/file/<código-del-adjunto>`. Al descargar, el controlador valida el acceso al workspace y transmite el objeto S3. Al borrar, el caso de uso marca el registro como no disponible y elimina el objeto.

### 6.2 Subir una foto de perfil

El endpoint es `POST /api/v1/profile/photo`, protegido por JWT, también con `multipart/form-data` y el campo `file`. El interceptor acepta imágenes JPEG, PNG, WebP y GIF, con un máximo de 100 MiB.

`ProfileService.uploadPhoto()` genera una clave `profiles/<uuid>`, sube el buffer con su MIME type y guarda esa clave en `profile.photo`. Si había una foto anterior en S3, intenta borrarla después de guardar la nueva referencia.

La ruta `GET /api/v1/profile/photo/:code` lee la clave guardada en el perfil y transmite el contenido desde S3. Las respuestas de perfil construyen esta URL mediante `toPhotoUrl()`.

### 6.3 Fotos de OAuth

Cuando el flujo crea perfiles nuevos mediante Google o Microsoft, el backend descarga la foto del proveedor y, si la descarga y validación tienen éxito, la guarda en S3 bajo `profiles/`. La base de datos conserva la clave en `profile.photo`.

## 7. Ejemplos de uso

### Usar `S3Service` desde otro provider

```typescript
import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { S3Service } from 'src/common/services/s3/s3.service';

@Injectable()
export class DocumentService {
  constructor(private readonly s3Service: S3Service) {}

  async saveDocument(file: Express.Multer.File, ownerCode: string) {
    const key = `documents/${ownerCode}/${randomUUID()}`;
    await this.s3Service.putObject(key, file.buffer, file.mimetype);
    return { key };
  }

  downloadDocument(key: string) {
    return this.s3Service.getObject(key);
  }

  deleteDocument(key: string) {
    return this.s3Service.deleteObject(key);
  }
}
```

Para usarlo en otro módulo, importa `CommonModule` en ese módulo y agrega `S3Service` al constructor mediante inyección de dependencias. Guarda en la base de datos la clave, no `file.buffer` ni una ruta del equipo.

> El ejemplo muestra únicamente el acceso S3. Un servicio real debe autorizar al usuario antes de descargar o borrar y persistir los metadatos necesarios. Para archivos grandes, no agregues operaciones que acumulen el archivo completo en memoria sin evaluar el consumo de RAM.

### Subida por HTTP con `curl`

La carga requiere un token JWT y `taskCode` válido:

```bash
curl -X POST "http://localhost:3000/api/v1/attachment/upload/<TASK_CODE>" \
  -H "Authorization: Bearer <JWT>" \
  -F "file=@./documento.pdf"
```

Para una foto de perfil:

```bash
curl -X POST "http://localhost:3000/api/v1/profile/photo" \
  -H "Authorization: Bearer <JWT>" \
  -F "file=@./foto.png"
```

También se pueden probar ambas rutas desde Swagger en `http://localhost:3000/api/docs` o desde Postman seleccionando `form-data`, una fila de tipo `File` con clave `file` y el token Bearer.

## 8. Verificar bucket y objetos

Listar los buckets:

```powershell
docker compose exec aws-local-s3 awslocal s3 ls
```

Listar todos los objetos recursivamente (incluye los prefijos `attachments/` y `profiles/`):

```powershell
docker compose exec aws-local-s3 awslocal s3 ls s3://app-task-bucket-local/ --recursive
```

Ejemplo de salida para un adjunto:

```text
2026-11-01 15:13:08     145257 attachments/27546bb9-3364-4290-acc2-64ac936919e4/a538645a-952e-4795-8452-d8f23971a2d5
```

Consultar los metadatos de una clave concreta:

```powershell
docker compose exec aws-local-s3 awslocal s3api head-object `
  --bucket app-task-bucket-local `
  --key "attachments/27546bb9-3364-4290-acc2-64ac936919e4/a538645a-952e-4795-8452-d8f23971a2d5"
```

Si `docker compose exec aws-local-s3 lstk ...` falla indicando que `lstk` no existe, es porque esa CLI no está en el `PATH` de la imagen. Usa `awslocal` en el contenedor. El aviso de deprecación de `awslocal` no necesariamente significa que la operación haya fallado: revisa el resultado que aparece después del aviso.

Verifica también que el backend compile y que las pruebas automatizadas sigan pasando:

```powershell
cd backend
npm run build
npx jest --runInBand
```

## 9. Archivos existentes en `uploads`

La integración no migró automáticamente los datos existentes. Los archivos nuevos se guardan en S3, pero los registros antiguos que referencian nombres locales todavía usan un fallback de lectura contra `uploads/profiles` o `uploads/attachments`.

Por ello:

1. No elimines la carpeta `uploads` mientras existan archivos antiguos que quieras conservar.
2. La compatibilidad de lectura no copia esos archivos al bucket.
3. Para dejar de depender de `uploads`, hace falta una migración explícita: copiar cada archivo a S3, actualizar `profile.photo` o `Attachment.storedName`, comprobar la lectura desde la API y solo entonces retirar el fallback y los archivos locales.

## 10. Límites y consideraciones operativas

- El límite actual de Multer es **100 MiB** (`100 * 1024 * 1024 = 104 857 600 bytes`) tanto para adjuntos como para fotos. El endpoint de adjuntos también restringe los MIME types permitidos.
- Multer utiliza el buffer del archivo y el caso de uso lo envía a S3. Una carga de 100 MiB puede consumir aproximadamente ese volumen de memoria por solicitud; con varias cargas concurrentes, considera streaming directo a S3 o URLs prefirmadas.
- `depends_on` ordena el arranque de Compose, pero no garantiza por sí solo que LocalStack ya acepte operaciones S3 cuando NestJS empieza. Si aparece un error temporal de conexión al iniciar, revisa `docker compose logs aws-local-s3` y reinicia el backend cuando LocalStack esté listo.
- El volumen `backend/aws/aws-s3-data` conserva los datos entre recreaciones del contenedor. No lo borres si necesitas conservar el bucket local.
- El endpoint de foto está marcado como público; los adjuntos, en cambio, requieren JWT y validación de pertenencia al workspace.
- El nombre de `localstack/localstack:latest` puede cambiar de comportamiento con futuras versiones. Para entornos reproducibles, fija una versión de imagen probada.

## 11. Referencias del código

| Propósito | Archivo |
| --- | --- |
| Cliente S3 de NestJS | `backend/src/common/services/s3/s3.service.ts` |
| Registro compartido del servicio | `backend/src/common/common.module.ts` |
| Configuración de LocalStack y backend | `docker-compose.yml` |
| Creación automática del bucket | `backend/aws/localstack-init/ready.sh` |
| Ejemplo `.env` | `.env.example` |
| Subida de adjuntos | `backend/src/attachment/use-cases/upload-attachment.use-case.ts` |
| Descarga de adjuntos | `backend/src/attachment/attachment.controller.ts` |
| Borrado de adjuntos | `backend/src/attachment/use-cases/delete-attachment.use-case.ts` |
| Subida y lectura de foto | `backend/src/profile/profile.service.ts` |
| Endpoint de foto | `backend/src/profile/profile-photo.controller.ts` |
| Descarga de foto Google | `backend/src/auth/auth.service.ts` |
| Descarga de foto Microsoft | `backend/src/auth/use-cases/authenticate-with-microsoft.use-case.ts` |
