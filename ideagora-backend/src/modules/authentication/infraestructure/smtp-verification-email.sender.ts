import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { VerificationEmailSender } from '../domain/authentication-repository.js';
import type { AdminInvitationEmailSender } from '../../universities/domain/university-repository.js';
import type { UserStatusEmailSender } from '../../administration/domain/user-management-repository.js';

@Injectable()
export class SmtpVerificationEmailSender
  implements
    VerificationEmailSender,
    AdminInvitationEmailSender,
    UserStatusEmailSender
{
  private readonly logger = new Logger(SmtpVerificationEmailSender.name);

  constructor(private readonly config: ConfigService) {}

  async sendVerificationEmail(input: {
    email: string;
    firstName: string;
    token: string;
  }): Promise<void> {
    const frontendUrl = (
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173'
    ).replace(/\/+$/, '');
    const verificationUrl = `${frontendUrl}/?verify=${encodeURIComponent(input.token)}`;
    const safeFirstName = input.firstName.replace(
      /[&<>"']/g,
      (character) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[character] ?? character,
    );

    await this.sendEmail({
      to: input.email,
      subject: 'Verifica tu correo institucional | IdeAgora',
      text: `Hola ${input.firstName}, confirma tu correo institucional en este enlace: ${verificationUrl}. El enlace vence en 24 horas.`,
      html: `<p>Hola ${safeFirstName},</p><p>Confirma tu correo institucional para activar tu cuenta de IdeAgora.</p><p><a href="${verificationUrl}">Verificar correo</a></p><p>Este enlace vence en 24 horas.</p>`,
    });
  }

  async sendAdminInvitationEmail(input: {
    email: string;
    firstName: string;
    universityName: string;
    token: string;
  }): Promise<void> {
    const frontendUrl = (
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173'
    ).replace(/\/+$/, '');
    const setupUrl = `${frontendUrl}/?admin-setup=${encodeURIComponent(input.token)}`;
    const escapeHtml = (value: string) =>
      value.replace(/[&<>"']/g, (character) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[character] ?? character,
      );
    const firstName = escapeHtml(input.firstName);
    const universityName = escapeHtml(input.universityName);
    await this.sendEmail({
      to: input.email,
      subject: `Invitación de administración | ${input.universityName}`,
      text: `Hola ${input.firstName}, fuiste invitado a administrar ${input.universityName} en IdeAgora. Acepta el cargo y asigna tu contraseña: ${setupUrl}. El enlace vence en 72 horas.`,
      html: `<p>Hola ${firstName},</p><p>Fuiste invitado a representar a <strong>${universityName}</strong> como administrador local en IdeAgora.</p><p><a href="${setupUrl}">Aceptar el cargo y asignar contraseña</a></p><p>Este enlace vence en 72 horas.</p>`,
    });
  }

  async sendStatusChangeEmail(
    input: Parameters<UserStatusEmailSender['sendStatusChangeEmail']>[0],
  ): Promise<void> {
    const escapeHtml = (value: string) =>
      value.replace(/[&<>"']/g, (character) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[character] ?? character,
      );
    const suspended = input.status === 'SUSPENDED';
    const statusText = suspended ? 'suspendida' : 'reactivada';
    const duration = suspended
      ? input.endsAt
        ? `hasta el ${input.endsAt.toLocaleString('es-EC', {
            timeZone: 'America/Guayaquil',
          })}`
        : 'de forma permanente'
      : '';
    const firstName = escapeHtml(input.firstName);
    const reason = escapeHtml(input.reason);
    const actorName = escapeHtml(input.actorName);
    const durationText = escapeHtml(duration);
    await this.sendEmail({
      to: input.email,
      subject: `Tu cuenta fue ${statusText} | IdeAgora`,
      text: `Hola ${input.firstName}, tu cuenta de IdeAgora fue ${statusText}${duration ? ` ${duration}` : ''}. Motivo: ${input.reason}. Acción realizada por: ${input.actorName}.`,
      html: `<p>Hola ${firstName},</p><p>Tu cuenta de IdeAgora fue <strong>${statusText}</strong>${duration ? ` ${durationText}` : ''}.</p><p><strong>Motivo:</strong> ${reason}</p><p>Acción realizada por: ${actorName}.</p>`,
    });
  }

  private async sendEmail(message: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<void> {
    const host = this.config.get<string>('MAIL_HOST');
    const username = this.config.get<string>('MAIL_USER');
    const password = this.config.get<string>('MAIL_PASSWORD');
    const from = this.config.get<string>('MAIL_FROM') ?? username;
    if (!host || !username || !password || !from) {
      throw new InternalServerErrorException(
        'El servicio de correo no está configurado.',
      );
    }

    const port = Number(this.config.get<string>('MAIL_PORT') ?? 587);
    const secure =
      this.config.get<string>('MAIL_SECURE') === 'true' || port === 465;
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user: username, pass: password },
    });
    try {
      await transporter.sendMail({ from, ...message });
    } catch (error) {
      const responseCode =
        error instanceof Error &&
        'responseCode' in error &&
        typeof error.responseCode === 'number'
          ? error.responseCode
          : undefined;
      this.logger.error(
        `SMTP delivery failed${responseCode ? ` (response ${responseCode})` : ''}.`,
      );
      if (responseCode === 550) {
        throw new BadGatewayException(
          'El proveedor SMTP rechazó el envío. Verifica que MAIL_FROM use un dominio aprobado y que el destinatario esté permitido en modo de prueba.',
        );
      }
      throw new ServiceUnavailableException(
        'No se pudo entregar el correo. Revisa la configuración del proveedor SMTP e inténtalo nuevamente.',
      );
    }
  }
}
