import {
  Controller,
  Get,
  Header,
  Param,
  StreamableFile,
} from '@nestjs/common';
import { AdminProfilePhotoStorage } from '../infraestructure/admin-profile-photo.storage.js';

@Controller('public/admin-profile-photos')
export class AdminProfilePhotosController {
  constructor(private readonly photoStorage: AdminProfilePhotoStorage) {}

  @Get(':filename')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  async getPhoto(
    @Param('filename') filename: string,
  ): Promise<StreamableFile> {
    const photo = await this.photoStorage.read(filename);
    return new StreamableFile(photo.content, { type: photo.contentType });
  }
}
