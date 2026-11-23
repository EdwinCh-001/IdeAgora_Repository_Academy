import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DirectorProfileController } from './presentation/director-profile.controller.js';
import { DirectorProfileReviewController } from './presentation/director-profile-review.controller.js';
import { ProfilesModule } from './profiles.module.js';

describe('ProfilesModule', () => {
  it('resolves director profile and local-review controllers', async () => {
    const originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'test-secret-with-at-least-thirty-two-bytes';

    try {
      const testingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
          ProfilesModule,
        ],
      })
        .overrideProvider(PrismaService)
        .useValue({})
        .compile();

      expect(testingModule.get(DirectorProfileController)).toBeDefined();
      expect(
        testingModule.get(DirectorProfileReviewController),
      ).toBeDefined();
      expect(testingModule.get(JwtAuthGuard)).toBeDefined();
      await testingModule.close();
    } finally {
      if (originalSecret === undefined) {
        delete process.env.JWT_SECRET;
      } else {
        process.env.JWT_SECRET = originalSecret;
      }
    }
  });
});
