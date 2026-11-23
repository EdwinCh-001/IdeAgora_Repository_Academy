import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  DIRECTOR_PROFILE_REPOSITORY,
  type DirectorProfileActor,
  type DirectorProfileRepository,
} from '../domain/director-profile-repository.js';
import {
  DirectorDocumentStorage,
  type UploadedPdfFile,
} from '../infrastructure/director-document.storage.js';

@Injectable()
export class UploadDirectorDocumentUseCase {
  constructor(
    @Inject(DIRECTOR_PROFILE_REPOSITORY)
    private readonly repository: DirectorProfileRepository,
    private readonly storage: DirectorDocumentStorage,
  ) {}

  async execute(
    actor: DirectorProfileActor,
    file: UploadedPdfFile | undefined,
  ) {
    if (!(await this.repository.findForDirector(actor.id))) {
      throw new BadRequestException(
        'Guarda primero tu hoja de vida antes de adjuntar documentos.',
      );
    }

    const savedFile = await this.storage.save(file);
    let profile;
    try {
      profile = await this.repository.addDocument(
        actor.id,
        {
          fileName: savedFile.fileName,
          storagePath: savedFile.storagePath,
          mimeType: 'application/pdf',
          sizeBytes: savedFile.sizeBytes,
        },
        actor,
      );
    } catch (error) {
      await this.storage.remove(savedFile.storagePath);
      throw error;
    }
    if (!profile) {
      await this.storage.remove(savedFile.storagePath);
      throw new BadRequestException(
        'Guarda primero tu hoja de vida antes de adjuntar documentos.',
      );
    }
    return profile;
  }
}
