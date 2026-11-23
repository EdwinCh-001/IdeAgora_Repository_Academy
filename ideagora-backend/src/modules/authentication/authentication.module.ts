import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module.js';
import {
  AUTHENTICATION_REPOSITORY,
  PASSWORD_HASHER,
  VERIFICATION_EMAIL_SENDER,
} from './domain/authentication-repository.js';
import { GetRegistrationOptionsUseCase } from './application/get-registration-options.use-case.js';
import { LoginUserUseCase } from './application/login-user.use-case.js';
import { LogoutSessionUseCase } from './application/logout-session.use-case.js';
import { RefreshSessionUseCase } from './application/refresh-session.use-case.js';
import { RegisterUserUseCase } from './application/register-user.use-case.js';
import { ResendVerificationEmailUseCase } from './application/resend-verification-email.use-case.js';
import { VerifyEmailUseCase } from './application/verify-email.use-case.js';
import { AcceptAdminInvitationUseCase } from './application/accept-admin-invitation.use-case.js';
import { BcryptPasswordHasher } from './infraestructure/bcrypt-password-hasher.js';
import { PrismaAuthenticationRepository } from './infraestructure/prisma-authentication.repository.js';
import { SmtpVerificationEmailSender } from './infraestructure/smtp-verification-email.sender.js';
import { AuthenticationController } from './presentation/authentication.controller.js';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.getOrThrow<string>('JWT_SECRET');
        if (Buffer.byteLength(secret, 'utf8') < 32) {
          throw new Error('JWT_SECRET debe tener al menos 32 bytes.');
        }
        return {
          secret,
          signOptions: { expiresIn: '15m' },
        };
      },
    }),
  ],
  controllers: [AuthenticationController],
  providers: [
    LoginUserUseCase,
    RefreshSessionUseCase,
    LogoutSessionUseCase,
    GetRegistrationOptionsUseCase,
    RegisterUserUseCase,
    ResendVerificationEmailUseCase,
    VerifyEmailUseCase,
    AcceptAdminInvitationUseCase,
    SmtpVerificationEmailSender,
    {
      provide: AUTHENTICATION_REPOSITORY,
      useClass: PrismaAuthenticationRepository,
    },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    {
      provide: VERIFICATION_EMAIL_SENDER,
      useExisting: SmtpVerificationEmailSender,
    },
  ],
  exports: [
    JwtModule,
    SmtpVerificationEmailSender,
    AUTHENTICATION_REPOSITORY,
    PASSWORD_HASHER,
  ],
})
export class AuthenticationModule {}
