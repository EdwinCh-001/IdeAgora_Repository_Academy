import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  DIRECTOR_PROFILE_REPOSITORY,
  type DirectorProfileRepository,
} from '../domain/director-profile-repository.js';
import { DirectorDocumentStorage } from '../infrastructure/director-document.storage.js';

@Injectable()
export class DownloadReviewDirectorDocumentUseCase {
  constructor(
    @Inject(DIRECTOR_PROFILE_REPOSITORY)
    private readonly repository: DirectorProfileRepository,
    private readonly storage: DirectorDocumentStorage,
  ) {}

  async execute(
    administratorId: string,
    profileId: string,
    documentId: string,
  ) {
    const document = await this.repository.findDocumentForAdministrator(
      administratorId,
      profileId,
      documentId,
    );
    if (!document) {
      throw new NotFoundException('Documento no encontrado.');
    }
    return {
      fileName: document.fileName,
      content: await this.storage.read(document.storagePath),
    };
  }
}
