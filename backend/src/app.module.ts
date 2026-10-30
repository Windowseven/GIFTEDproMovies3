import { Module } from "@nestjs/common";
import { EnvironmentModule } from "./config/environment.module.js";
import { DatabaseModule } from "./infrastructure/database/database.module.js";
import { EmailModule } from "./infrastructure/email/email.module.js";
import { AuditModule } from "./modules/audit/audit.module.js";
import { EventsModule } from "./infrastructure/events/events.module.js";
import { IdentityModule } from "./modules/identity/identity.module.js";
import { NotificationsModule } from "./modules/notifications/notifications.module.js";
import { HealthModule } from "./modules/health/health.module.js";
import { CatalogModule } from "./modules/catalog/catalog.module.js";
import { CommercialModule } from "./modules/commercial/commercial.module.js";
import { MediaModule } from "./modules/media/media.module.js";

@Module({
  imports: [
    EnvironmentModule,
    DatabaseModule,
    EmailModule,
    EventsModule,
    AuditModule,
    IdentityModule,
    NotificationsModule,
    HealthModule,
    CatalogModule,
    CommercialModule,
    MediaModule,
  ],
})
export class AppModule {}
