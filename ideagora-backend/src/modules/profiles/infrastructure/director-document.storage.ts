import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const PDF_MIME_TYPE = 'application/pdf';

export interface UploadedPdfFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface SavedDirectorDocument {
  storagePath: string;
  fileName: string;
  sizeBytes: number;
}

@Injectable()
export class DirectorDocumentStorage {
  private readonly directory: string;

  constructor(config: ConfigService) {
    this.directory = resolve(
      config.get<string>('DIRECTOR_DOCUMENTS_DIR') ??
        join(process.cwd(), 'uploads', 'director-documents'),
    );
  }

  async save(file: UploadedPdfFile | undefined): Promise<SavedDirectorDocument> {
    if (!file || file.size === 0 || file.buffer.byteLength === 0) {
      throw new BadRequestException('Selecciona un documento PDF.');
    }
    if (file.size !== file.buffer.byteLength) {
      throw new BadRequestException('El archivo recibido está incompleto.');
    }
    if (file.size > MAX_FILE_SIZE || file.buffer.byteLength > MAX_FILE_SIZE) {
      throw new BadRequestException(
        'El documento no puede superar 10 MB.',
      );
    }
    if (
      file.mimetype !== PDF_MIME_TYPE ||
      file.buffer.subarray(0, 5).toString('ascii') !== '%PDF-'
    ) {
      throw new BadRequestException(
        'El archivo debe ser un documento PDF válido.',
      );
    }

    const storagePath = `${randomUUID()}.pdf`;
    const fileName = this.sanitizeFileName(file.originalname);
    await mkdir(this.directory, { recursive: true });
    await writeFile(join(this.directory, storagePath), file.buffer, {
      flag: 'wx',
      mode: 0o600,
    });
    return {
      storagePath,
      fileName,
      sizeBytes: file.buffer.byteLength,
    };
  }

  async read(storagePath: string): Promise<Buffer> {
    this.assertStoragePath(storagePath);
    try {
      return await readFile(join(this.directory, storagePath));
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        throw new NotFoundException('Documento no encontrado.');
      }
      throw error;
    }
  }

  async remove(storagePath: string): Promise<void> {
    this.assertStoragePath(storagePath);
    await rm(join(this.directory, storagePath), { force: true });
  }

  private sanitizeFileName(originalName: string): string {
    const name = originalName
      .replace(/\\/g, '/')
      .split('/')
      .pop()
      ?.replace(/[^a-zA-Z0-9._ -]/g, '_')
      .trim()
      .slice(0, 255);
    return name || 'documento.pdf';
  }

  private assertStoragePath(storagePath: string): void {
    if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\.pdf$/i.test(storagePath)) {
      throw new NotFoundException('Documento no encontrado.');
    }
  }
}
