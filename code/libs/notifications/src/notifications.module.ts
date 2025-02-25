import { MailingModule } from '@badman/mailing';
import { Module } from '@nestjs/common';
import { NotificationService } from './services';

@Module({
  imports: [MailingModule],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationsModule {}
