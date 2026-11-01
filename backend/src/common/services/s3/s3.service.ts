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
      forcePathStyle: Boolean(endpoint),
      ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
    });
  }

  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.s3Client.send(
      new PutObjectCommand({ Bucket: this.bucketName, Key: key, Body: body, ContentType: contentType }),
    );
  }

  async getObject(key: string): Promise<{ body: Readable; contentType?: string; contentLength?: number }> {
    const result = await this.s3Client.send(new GetObjectCommand({ Bucket: this.bucketName, Key: key }));
    if (!result.Body) throw new Error(`S3 object has no body: ${key}`);
    const body = Readable.from(result.Body as AsyncIterable<Uint8Array>);
    return { body, contentType: result.ContentType, contentLength: result.ContentLength };
  }

  async getObjectBuffer(key: string): Promise<Buffer> {
    const { body } = await this.getObject(key);
    const chunks: Buffer[] = [];
    for await (const chunk of body) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return Buffer.concat(chunks);
  }

  async deleteObject(key: string): Promise<void> {
    await this.s3Client.send(new DeleteObjectCommand({ Bucket: this.bucketName, Key: key }));
  }

  onModuleDestroy() {
    this.s3Client.destroy();
  }
}
