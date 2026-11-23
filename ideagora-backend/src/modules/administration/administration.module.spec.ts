import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UserManagementController } from './presentation/user-management.controller.js';
import { AdministrationModule } from './administration.module.js';

describe('AdministrationModule', () => {
  it('resolves protected user-management routes and shared authentication services', async () => {
    const originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'test-secret-with-at-least-thirty-two-bytes';

    try {
      const testingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
          AdministrationModule,
        ],
      })
        .overrideProvider(PrismaService)
        .useValue({})
        .compile();

      expect(testingModule.get(UserManagementController)).toBeDefined();
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
