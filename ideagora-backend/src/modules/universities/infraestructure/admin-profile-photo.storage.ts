import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const MIME_TYPES = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
} as const;

export interface UploadedImageFile {
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class AdminProfilePhotoStorage {
  private readonly directory: string;

  constructor(config: ConfigService) {
    this.directory = resolve(
      config.get<string>('UPLOADS_DIR') ??
        join(process.cwd(), 'uploads', 'admin-profile-photos'),
    );
  }

  async save(file: UploadedImageFile | undefined): Promise<{ url: string }> {
    if (!file || file.size === 0) {
      throw new BadRequestException('Selecciona una fotografía de perfil.');
    }
    if (
      file.size > 5 * 1024 * 1024 ||
      file.buffer.byteLength > 5 * 1024 * 1024
    ) {
      throw new BadRequestException(
        'La fotografía de perfil no puede superar 5 MB.',
      );
    }

    const extension = this.getValidatedExtension(file);
    const filename = `${randomUUID()}.${extension}`;
    await mkdir(this.directory, { recursive: true });
    await writeFile(join(this.directory, filename), file.buffer, {
      flag: 'wx',
      mode: 0o644,
    });

    return { url: `/public/admin-profile-photos/${filename}` };
  }

  async read(filename: string): Promise<{
    content: Buffer;
    contentType: string;
  }> {
    if (
      !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\.(?:jpg|png|webp)$/i.test(
        filename,
      )
    ) {
      throw new NotFoundException('Fotografía no encontrada.');
    }

    try {
      return {
        content: await readFile(join(this.directory, filename)),
        contentType:
          MIME_TYPES[
            extname(filename).slice(1).toLowerCase() as keyof typeof MIME_TYPES
          ],
      };
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        throw new NotFoundException('Fotografía no encontrada.');
      }
      throw error;
    }
  }

  private getValidatedExtension(file: UploadedImageFile): keyof typeof MIME_TYPES {
    const isJpeg =
      file.mimetype === MIME_TYPES.jpg &&
      file.buffer.length >= 3 &&
      file.buffer[0] === 0xff &&
      file.buffer[1] === 0xd8 &&
      file.buffer[2] === 0xff;
    const isPng =
      file.mimetype === MIME_TYPES.png &&
      file.buffer.length >= 8 &&
      file.buffer.subarray(0, 8).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      );
    const isWebp =
      file.mimetype === MIME_TYPES.webp &&
      file.buffer.length >= 12 &&
      file.buffer.toString('ascii', 0, 4) === 'RIFF' &&
      file.buffer.toString('ascii', 8, 12) === 'WEBP';

    if (isJpeg) return 'jpg';
    if (isPng) return 'png';
    if (isWebp) return 'webp';
    throw new BadRequestException(
      'La foto debe ser una imagen JPG, PNG o WebP válida.',
    );
  }
}
