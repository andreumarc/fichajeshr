import {
  Body, Controller, Get, Param, Post, Query, Res, UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WhatsAppService } from './whatsapp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('WhatsApp')
@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly service: WhatsAppService) {}

  // ─── Webhook verification (Meta Cloud API) ─────────────────────
  @Public()
  @Get('webhook')
  @ApiOperation({ summary: 'Meta webhook verification challenge' })
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const result = this.service.verifyWebhook(mode, token, challenge);
    if (result === 403) return res.status(403).send('Forbidden');
    return res.status(200).send(String(result));
  }

  // ─── Inbound messages webhook ──────────────────────────────────
  @Public()
  @Post('webhook')
  @ApiOperation({ summary: 'Receive inbound WhatsApp messages' })
  async handleInbound(@Body() payload: any, @Res() res: Response) {
    // Respond immediately (WhatsApp requires <5s response)
    res.status(200).json({ ok: true });
    await this.service.handleInbound(payload);
  }

  // ─── Admin endpoints ───────────────────────────────────────────
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.RRHH)
  @Get('conversations')
  @ApiOperation({ summary: 'List WhatsApp conversations' })
  getConversations(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.service.getConversations(user.companyId, +page, +limit);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.RRHH)
  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get messages of a conversation' })
  getMessages(
    @Param('id') id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 100,
  ) {
    return this.service.getMessages(id, +page, +limit);
  }
}
