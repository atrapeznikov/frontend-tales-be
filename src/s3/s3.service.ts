import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('S3_ENDPOINT');
    const region = this.configService.get<string>('S3_REGION');
    const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'S3_SECRET_ACCESS_KEY',
    );
    this.bucket =
      this.configService.get<string>('S3_BUCKET') ||
      '806c1391-211a9e5f-91c1-412a-b689-4740a680b06e';

    this.s3Client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
      forcePathStyle: true,
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    key: string,
    contentType?: string,
  ): Promise<string> {
    // Prefer a caller-validated content type over the raw client mimetype so a
    // forged mimetype can't influence how the object is served (sniffing/XSS).
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: contentType ?? file.mimetype,
      // Force browsers to render rather than treat as an active document.
      ContentDisposition: 'inline',
      ACL: 'public-read',
    });

    try {
      await this.s3Client.send(command);
      const endpoint = this.configService.get<string>('S3_ENDPOINT');
      return `${endpoint}/${this.bucket}/${key}`;
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to upload file to S3: ${msg}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to delete file from S3: ${msg}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
