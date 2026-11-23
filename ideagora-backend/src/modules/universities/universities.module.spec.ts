import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { UniversitiesController } from './presentation/universities.controller.js';
import { UniversitiesModule } from './universities.module.js';

describe('UniversitiesModule', () => {
  it('resolves university use cases, guards, and shared authentication services', async () => {
    const originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'test-secret-with-at-least-thirty-two-bytes';

    try {
      const testingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
          UniversitiesModule,
        ],
      })
        .overrideProvider(PrismaService)
        .useValue({})
        .compile();

      expect(testingModule.get(UniversitiesController)).toBeDefined();
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
