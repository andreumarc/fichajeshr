import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private config: ConfigService) {
    const host = config.get('SMTP_HOST');
    const user = config.get('SMTP_USER');
    const pass = config.get('SMTP_PASS');

    if (host && user && pass && host !== 'smtp.example.com') {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(config.get('SMTP_PORT') ?? '587'),
        secure: false,
        auth: { user, pass },
      });
      this.logger.log('Mail transport configured');
    } else {
      this.logger.warn('SMTP not configured — emails will only be logged to console');
    }
  }

  async sendWelcomeEmployee(opts: {
    to: string;
    firstName: string;
    companyName: string;
    tempPassword: string;
    loginUrl: string;
  }) {
    const subject = `Bienvenido/a a ${opts.companyName} — Tu acceso al portal`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
        <div style="background:#1e3a5f;padding:32px 40px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px">Fichaje App</h1>
          <p style="color:#93c5fd;margin:6px 0 0;font-size:13px">Control Horario</p>
        </div>
        <div style="padding:32px 40px;background:#fff;border:1px solid #e2e8f0;border-top:none">
          <p style="margin:0 0 16px">Hola <strong>${opts.firstName}</strong>,</p>
          <p style="margin:0 0 16px;color:#475569">
            Se ha creado tu cuenta en el portal de <strong>${opts.companyName}</strong>.
            Aquí tienes tus credenciales de acceso:
          </p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;margin:20px 0">
            <p style="margin:0 0 8px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;font-weight:600">
              Usuario (email)
            </p>
            <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#1e293b">${opts.to}</p>
            <p style="margin:0 0 8px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;font-weight:600">
              Contraseña provisional
            </p>
            <p style="margin:0;font-size:22px;font-weight:800;color:#1e3a5f;letter-spacing:.1em;font-family:monospace">
              ${opts.tempPassword}
            </p>
          </div>
          <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin-bottom:24px">
            <p style="margin:0;font-size:13px;color:#92400e">
              ⚠️ Al iniciar sesión por primera vez se te pedirá que cambies esta contraseña.
            </p>
          </div>
          <a href="${opts.loginUrl}"
             style="display:inline-block;background:#1e3a5f;color:#fff;text-decoration:none;
                    padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px">
            Acceder al portal →
          </a>
          <p style="margin:24px 0 0;font-size:12px;color:#94a3b8">
            Si tienes problemas, contacta con el administrador de tu empresa.
          </p>
        </div>
        <div style="padding:16px 40px;background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;text-align:center">
          <p style="margin:0;font-size:11px;color:#94a3b8">© Fichaje App · Control Horario Empresarial</p>
        </div>
      </div>
    `;

    await this.send({ to: opts.to, subject, html });
  }

  async sendPasswordReset(opts: {
    to: string;
    firstName: string;
    tempPassword: string;
    loginUrl: string;
  }) {
    const subject = 'Fichaje App — Nueva contraseña provisional';
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
        <div style="background:#1e3a5f;padding:32px 40px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px">Fichaje App</h1>
        </div>
        <div style="padding:32px 40px;background:#fff;border:1px solid #e2e8f0;border-top:none">
          <p style="margin:0 0 16px">Hola <strong>${opts.firstName}</strong>,</p>
          <p style="margin:0 0 16px;color:#475569">
            El administrador ha generado una nueva contraseña provisional para tu cuenta:
          </p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;margin:20px 0;text-align:center">
            <p style="margin:0 0 8px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;font-weight:600">
              Nueva contraseña provisional
            </p>
            <p style="margin:0;font-size:24px;font-weight:800;color:#1e3a5f;letter-spacing:.12em;font-family:monospace">
              ${opts.tempPassword}
            </p>
          </div>
          <a href="${opts.loginUrl}"
             style="display:inline-block;background:#1e3a5f;color:#fff;text-decoration:none;
                    padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px">
            Cambiar contraseña →
          </a>
        </div>
      </div>
    `;

    await this.send({ to: opts.to, subject, html });
  }

  private async send(opts: { to: string; subject: string; html: string }) {
    const from = this.config.get('SMTP_FROM') ?? 'FichajeHR <noreply@fichajeshr.app>';
    if (!this.transporter) {
      // Dev mode: log to console instead
      this.logger.log(`📧 [EMAIL NOT SENT — configure SMTP]\n  To: ${opts.to}\n  Subject: ${opts.subject}`);
      return;
    }
    try {
      await this.transporter.sendMail({ from, to: opts.to, subject: opts.subject, html: opts.html });
      this.logger.log(`Email sent to ${opts.to}: ${opts.subject}`);
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${opts.to}`, err.message);
    }
  }
}
