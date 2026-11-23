import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { DirectorDocumentStorage } from './director-document.storage.js';

describe('DirectorDocumentStorage', () => {
  it('stores valid PDFs, rejects non-PDF content and enforces the 10 MB limit', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'ideagora-director-docs-'));
    const config = {
      get: vi.fn().mockReturnValue(directory),
    } as unknown as ConfigService;
    const storage = new DirectorDocumentStorage(config);
    const content = Buffer.from('%PDF-1.7\nvalid');
    const validFile = {
      originalname: 'certificado final.pdf',
      mimetype: 'application/pdf',
      size: content.length,
      buffer: content,
    };

    try {
      const saved = await storage.save(validFile);

      expect(saved.fileName).toBe('certificado final.pdf');
      expect(saved.sizeBytes).toBe(validFile.buffer.length);
      expect(await readFile(join(directory, saved.storagePath))).toEqual(
        validFile.buffer,
      );
      await expect(
        storage.save({
          ...validFile,
          mimetype: 'text/plain',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        storage.save({
          ...validFile,
          size: 10 * 1024 * 1024 + 1,
          buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
