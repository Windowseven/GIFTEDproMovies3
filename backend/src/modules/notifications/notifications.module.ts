import { Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service.js";
import { NotificationsController } from "./notifications.controller.js";
import { NotificationsEventListener } from "./notifications-event.listener.js";

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsEventListener],
  exports: [NotificationsService],
})
export class NotificationsModule {}
