import { Module } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { MetaWhatsAppAdapter } from './adapters/meta-whatsapp.adapter';
import { WHATSAPP_ADAPTER } from './adapters/whatsapp-adapter.interface';
import { TimeEntriesModule } from '../time-entries/time-entries.module';

@Module({
  imports: [TimeEntriesModule],
  controllers: [WhatsAppController],
  providers: [
    WhatsAppService,
    {
      provide: WHATSAPP_ADAPTER,
      useClass: MetaWhatsAppAdapter,
    },
  ],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
