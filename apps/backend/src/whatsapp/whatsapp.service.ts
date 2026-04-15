import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimeEntriesService } from '../time-entries/time-entries.service';
import { ConfigService } from '@nestjs/config';
import {
  IWhatsAppAdapter,
  WHATSAPP_ADAPTER,
} from './adapters/whatsapp-adapter.interface';
import { WhatsAppConversationState, WhatsAppMessageDirection, WhatsAppMessageType } from '@prisma/client';
import * as dayjs from 'dayjs';

// ─── intent keyword map (Spanish + English) ───────────────────
const INTENT_MAP: Record<string, string> = {
  // CHECK_IN
  entrada: 'CHECK_IN', entrar: 'CHECK_IN', 'clock in': 'CHECK_IN', inicio: 'CHECK_IN',
  // CHECK_OUT
  salida: 'CHECK_OUT', salir: 'CHECK_OUT', 'clock out': 'CHECK_OUT', fin: 'CHECK_OUT',
  // BREAK_START
  pausa: 'BREAK_START', descanso: 'BREAK_START', 'pausa inicio': 'BREAK_START',
  // BREAK_END
  'fin pausa': 'BREAK_END', 'reanudar': 'BREAK_END', retomar: 'BREAK_END', volver: 'BREAK_END',
  // STATUS
  estado: 'STATUS', status: 'STATUS', situacion: 'STATUS', situación: 'STATUS',
  // HOURS
  'mis horas': 'HOURS', horas: 'HOURS', tiempo: 'HOURS',
  // CANCEL
  cancelar: 'CANCEL', cancel: 'CANCEL',
};

const CONTEXT_TTL_MINUTES = 5;

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private prisma: PrismaService,
    private timeEntries: TimeEntriesService,
    private config: ConfigService,
    @Inject(WHATSAPP_ADAPTER) private wa: IWhatsAppAdapter,
  ) {}

  // ─── Webhook verification ─────────────────────────────────────
  verifyWebhook(mode?: string, token?: string, challenge?: string): string | number {
    const expected = this.config.get('WHATSAPP_VERIFY_TOKEN');
    if (mode === 'subscribe' && token === expected && challenge) {
      return challenge;
    }
    return 403;
  }

  // ─── Main inbound handler ─────────────────────────────────────
  async handleInbound(payload: any): Promise<void> {
    try {
      const messages = this.extractMessages(payload);
      for (const msg of messages) {
        await this.processMessage(msg);
      }
    } catch (err: any) {
      this.logger.error('Error processing WhatsApp inbound', err?.message);
    }
  }

  // ─── Process single message ───────────────────────────────────
  private async processMessage(msg: {
    messageId: string;
    from: string;
    type: string;
    text?: string;
    latitude?: number;
    longitude?: number;
    rawPayload: any;
  }) {
    const phone = this.normalizePhone(msg.from);

    // Mark as read (fire-and-forget)
    this.wa.markRead(msg.messageId).catch(() => {});

    // ─── Find employee by phone ───
    const employee = await this.prisma.employee.findFirst({
      where: {
        OR: [{ phone }, { phone: msg.from }],
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    if (!employee) {
      await this.saveMessage({
        direction: WhatsAppMessageDirection.INBOUND,
        type: WhatsAppMessageType.TEXT,
        fromPhone: phone,
        body: msg.text,
        rawPayload: msg.rawPayload,
      });
      await this.wa.sendText(
        phone,
        'No encontré tu número en el sistema. Contacta con tu responsable para verificar tu teléfono.',
      );
      return;
    }

    // ─── Get or create conversation ───
    let conversation = await this.prisma.whatsAppConversation.findUnique({
      where: { phone },
    });

    if (!conversation) {
      conversation = await this.prisma.whatsAppConversation.create({
        data: {
          companyId: employee.companyId,
          employeeId: employee.id,
          phone,
          state: WhatsAppConversationState.IDLE,
          lastMessageAt: new Date(),
          messageCount: 1,
        },
      });
    } else {
      conversation = await this.prisma.whatsAppConversation.update({
        where: { phone },
        data: { lastMessageAt: new Date(), messageCount: { increment: 1 } },
      });
    }

    // ─── Save inbound message ───
    const savedMsg = await this.saveMessage({
      direction: WhatsAppMessageDirection.INBOUND,
      type: msg.type === 'location' ? WhatsAppMessageType.LOCATION : WhatsAppMessageType.TEXT,
      fromPhone: phone,
      body: msg.text,
      latitude: msg.latitude,
      longitude: msg.longitude,
      conversationId: conversation.id,
      employeeId: employee.id,
      companyId: employee.companyId,
      rawPayload: msg.rawPayload,
    });

    // ─── STATE MACHINE ────────────────────────────────────────
    const state = conversation.state;

    // --- LOCATION message ---
    if (msg.type === 'location' && msg.latitude && msg.longitude) {
      if (
        state === WhatsAppConversationState.AWAITING_LOCATION &&
        conversation.pendingIntent &&
        conversation.contextExpiresAt &&
        conversation.contextExpiresAt > new Date()
      ) {
        // Complete the pending clock action
        await this.completePendingClock(
          employee,
          conversation,
          msg.latitude,
          msg.longitude,
          phone,
        );
      } else if (
        state === WhatsAppConversationState.AWAITING_LOCATION &&
        conversation.contextExpiresAt &&
        conversation.contextExpiresAt <= new Date()
      ) {
        // Context expired
        await this.resetConversation(phone);
        const outMsg = 'Tu sesión expiró (5 min). Vuelve a escribir la acción: Entrada, Salida, Pausa o Fin pausa.';
        await this.sendAndSave(phone, outMsg, conversation.id, employee.id, employee.companyId);
      } else {
        const outMsg = 'No hay acción pendiente. Escribe: Entrada, Salida, Pausa, Fin pausa, Estado o Mis horas.';
        await this.sendAndSave(phone, outMsg, conversation.id, employee.id, employee.companyId);
      }
      return;
    }

    // --- TEXT message ---
    const rawText = (msg.text ?? '').trim();
    const intent = this.parseIntent(rawText);

    // CANCEL
    if (intent === 'CANCEL') {
      await this.resetConversation(phone);
      const outMsg = 'Acción cancelada. Escribe Entrada, Salida, Pausa o Fin pausa cuando quieras fichar.';
      await this.sendAndSave(phone, outMsg, conversation.id, employee.id, employee.companyId);
      return;
    }

    // STATUS
    if (intent === 'STATUS') {
      const status = await this.timeEntries.getCurrentStatus(employee.id);
      const statusText = this.formatStatus(status, employee.firstName);
      await this.sendAndSave(phone, statusText, conversation.id, employee.id, employee.companyId);
      return;
    }

    // HOURS
    if (intent === 'HOURS') {
      const summary = await this.timeEntries.getDailySummary(
        employee.id,
        dayjs().format('YYYY-MM-DD'),
      );
      const text = `📊 *Hoy, ${dayjs().format('DD/MM')}*\n🕐 Trabajado: ${summary.netWorkedHours}h netas\n☕ Pausa: ${summary.totalBreakMinutes} min\n📈 Total bruto: ${summary.totalWorkedHours}h`;
      await this.sendAndSave(phone, text, conversation.id, employee.id, employee.companyId);
      return;
    }

    // INCIDENT (freeform text starting with "Incidencia")
    if (rawText.toLowerCase().startsWith('incidencia')) {
      const description = rawText.replace(/^incidencia\s*/i, '').trim() || 'Incidencia reportada por WhatsApp';
      await this.prisma.incident.create({
        data: {
          companyId: employee.companyId,
          employeeId: employee.id,
          type: 'OTHER',
          status: 'OPEN',
          description,
          occurredAt: new Date(),
          createdBy: employee.id,
        },
      });
      const outMsg = `✅ Incidencia registrada: "${description}". Tu responsable la revisará.`;
      await this.sendAndSave(phone, outMsg, conversation.id, employee.id, employee.companyId);
      return;
    }

    // CLOCK INTENTS — require location
    if (['CHECK_IN', 'CHECK_OUT', 'BREAK_START', 'BREAK_END'].includes(intent ?? '')) {
      const company = await this.prisma.company.findUnique({ where: { id: employee.companyId } });
      const geoPolicy = (company?.settings as any)?.whatsappGeoPolicy ?? 'REQUIRE'; // REQUIRE | ALLOW_PENDING

      if (geoPolicy === 'ALLOW_PENDING') {
        // Register without GPS and mark PENDING_GEO_VALIDATION
        await this.executeClockAction(employee, intent!, null, null, phone, conversation.id);
        return;
      }

      // Request location
      const actionLabel = this.intentLabel(intent!);
      const contextExpiresAt = new Date(Date.now() + CONTEXT_TTL_MINUTES * 60 * 1000);

      await this.prisma.whatsAppConversation.update({
        where: { phone },
        data: {
          state: WhatsAppConversationState.AWAITING_LOCATION,
          pendingIntent: intent,
          contextExpiresAt,
        },
      });

      const outMsg = `📍 Para registrar *${actionLabel}*, comparte tu ubicación en este chat.\n\nTienes ${CONTEXT_TTL_MINUTES} minutos o escribe *Cancelar* para cancelar.`;
      await this.sendAndSave(phone, outMsg, conversation.id, employee.id, employee.companyId);
      return;
    }

    // Already awaiting location and got unrecognized text
    if (state === WhatsAppConversationState.AWAITING_LOCATION) {
      const remaining = conversation.contextExpiresAt
        ? Math.max(0, Math.round((conversation.contextExpiresAt.getTime() - Date.now()) / 60000))
        : 0;

      if (remaining > 0) {
        const outMsg = `📍 Comparte tu ubicación para completar la acción (${remaining} min restantes) o escribe *Cancelar*.`;
        await this.sendAndSave(phone, outMsg, conversation.id, employee.id, employee.companyId);
      } else {
        await this.resetConversation(phone);
        const outMsg = 'Tu sesión expiró. Escribe: Entrada, Salida, Pausa, Fin pausa, Estado o Mis horas.';
        await this.sendAndSave(phone, outMsg, conversation.id, employee.id, employee.companyId);
      }
      return;
    }

    // Unknown
    const helpMsg = `Hola ${employee.firstName} 👋 Puedes escribir:\n• *Entrada* — registrar entrada\n• *Salida* — fichar salida\n• *Pausa* — iniciar pausa\n• *Fin pausa* — reanudar trabajo\n• *Estado* — ver tu situación actual\n• *Mis horas* — ver horas de hoy\n• *Incidencia [descripción]* — reportar incidencia`;
    await this.sendAndSave(phone, helpMsg, conversation.id, employee.id, employee.companyId);
  }

  // ─── Complete pending clock after location received ───────────
  private async completePendingClock(
    employee: any,
    conversation: any,
    latitude: number,
    longitude: number,
    phone: string,
  ) {
    const intent = conversation.pendingIntent!;
    await this.executeClockAction(employee, intent, latitude, longitude, phone, conversation.id);
    await this.resetConversation(phone);
  }

  // ─── Execute clock action via TimeEntriesService ──────────────
  private async executeClockAction(
    employee: any,
    intent: string,
    latitude: number | null,
    longitude: number | null,
    phone: string,
    conversationId: string,
  ) {
    const meta = { ip: 'whatsapp', userAgent: 'WhatsApp Bot' };
    const dto: any = {
      latitude,
      longitude,
      deviceType: 'UNKNOWN',
      clockMethod: 'EMPLOYEE_CODE',
      notes: 'Fichaje por WhatsApp',
    };

    try {
      let entry: any;
      switch (intent) {
        case 'CHECK_IN':   entry = await this.timeEntries.clockIn(employee.id, employee.companyId, dto, meta); break;
        case 'CHECK_OUT':  entry = await this.timeEntries.clockOut(employee.id, employee.companyId, dto, meta); break;
        case 'BREAK_START':entry = await this.timeEntries.breakStart(employee.id, employee.companyId, dto, meta); break;
        case 'BREAK_END':  entry = await this.timeEntries.breakEnd(employee.id, employee.companyId, dto, meta); break;
        default: throw new Error(`Unknown intent: ${intent}`);
      }

      const time = dayjs(entry.timestamp).format('HH:mm');
      const zoneStr =
        entry.isWithinZone === false
          ? `\n⚠️ Fuera del radio permitido (${Math.round(entry.distanceToCenter ?? 0)}m)`
          : entry.isWithinZone === true
          ? '\n✅ Dentro de zona'
          : '';
      const outMsg = `✅ *${this.intentLabel(intent)}* registrada a las ${time}${zoneStr}`;
      await this.sendAndSave(phone, outMsg, conversationId, employee.id, employee.companyId);
    } catch (err: any) {
      const errMsg = err?.response?.message ?? err?.message ?? 'Error desconocido';
      const outMsg = `❌ No se pudo registrar: ${errMsg}`;
      await this.sendAndSave(phone, outMsg, conversationId, employee.id, employee.companyId);
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private async resetConversation(phone: string) {
    await this.prisma.whatsAppConversation.update({
      where: { phone },
      data: {
        state: WhatsAppConversationState.IDLE,
        pendingIntent: null,
        pendingContext: undefined,
        contextExpiresAt: null,
      },
    });
  }

  private async sendAndSave(
    phone: string,
    body: string,
    conversationId: string,
    employeeId: string,
    companyId: string,
  ) {
    const result = await this.wa.sendText(phone, body);
    await this.saveMessage({
      direction: WhatsAppMessageDirection.OUTBOUND,
      type: WhatsAppMessageType.TEXT,
      toPhone: phone,
      body,
      conversationId,
      employeeId,
      companyId,
      providerMessageId: result.messageId,
    });
  }

  private async saveMessage(data: {
    direction: WhatsAppMessageDirection;
    type: WhatsAppMessageType;
    fromPhone?: string;
    toPhone?: string;
    body?: string;
    latitude?: number;
    longitude?: number;
    conversationId?: string;
    employeeId?: string;
    companyId?: string;
    intentParsed?: string;
    rawPayload?: any;
    providerMessageId?: string;
  }) {
    return this.prisma.whatsAppMessage.create({
      data: {
        direction: data.direction,
        type: data.type,
        fromPhone: data.fromPhone,
        toPhone: data.toPhone,
        body: data.body,
        latitude: data.latitude,
        longitude: data.longitude,
        conversationId: data.conversationId,
        employeeId: data.employeeId,
        companyId: data.companyId,
        intentParsed: data.intentParsed,
        rawPayload: data.rawPayload,
        providerMessageId: data.providerMessageId,
      },
    });
  }

  private parseIntent(text: string): string {
    const normalized = text.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (const [keyword, intent] of Object.entries(INTENT_MAP)) {
      const normKw = keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (normalized === normKw || normalized.startsWith(normKw)) return intent;
    }
    return 'UNKNOWN';
  }

  private intentLabel(intent: string): string {
    const labels: Record<string, string> = {
      CHECK_IN: 'Entrada',
      CHECK_OUT: 'Salida',
      BREAK_START: 'Inicio de pausa',
      BREAK_END: 'Fin de pausa',
    };
    return labels[intent] ?? intent;
  }

  private formatStatus(status: any, firstName: string): string {
    const states: Record<string, string> = {
      NOT_CLOCKED_IN: `❌ Hola ${firstName}, todavía no has fichado entrada hoy.`,
      WORKING: `🟢 ${firstName}, estás trabajando.\nÚltimo movimiento: ${status.lastEntry?.type ?? ''} a las ${dayjs(status.lastEntry?.timestamp).format('HH:mm')}.`,
      ON_BREAK: `☕ ${firstName}, estás en pausa desde las ${dayjs(status.lastEntry?.timestamp).format('HH:mm')}.`,
      CLOCKED_OUT: `🔵 ${firstName}, tu jornada de hoy ya está cerrada.`,
    };
    return states[status.status] ?? `Estado: ${status.status}`;
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '').replace(/^0+/, '').replace(/^34/, '');
  }

  private extractMessages(payload: any): Array<{
    messageId: string;
    from: string;
    type: string;
    text?: string;
    latitude?: number;
    longitude?: number;
    rawPayload: any;
  }> {
    const results: any[] = [];
    try {
      const entries = payload?.entry ?? [];
      for (const entry of entries) {
        const changes = entry?.changes ?? [];
        for (const change of changes) {
          const messages = change?.value?.messages ?? [];
          for (const m of messages) {
            results.push({
              messageId: m.id,
              from: m.from,
              type: m.type,
              text: m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title,
              latitude: m.location?.latitude,
              longitude: m.location?.longitude,
              rawPayload: m,
            });
          }
        }
      }
    } catch {}
    return results;
  }

  // ─── Admin queries ─────────────────────────────────────────────
  async getConversations(companyId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.whatsAppConversation.findMany({
        where: { companyId },
        include: {
          employee: { select: { firstName: true, lastName: true, employeeCode: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { lastMessageAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.whatsAppConversation.count({ where: { companyId } }),
    ]);
    return { data, total, page, limit };
  }

  async getMessages(conversationId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.whatsAppMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.whatsAppMessage.count({ where: { conversationId } }),
    ]);
    return { data, total, page, limit };
  }
}
