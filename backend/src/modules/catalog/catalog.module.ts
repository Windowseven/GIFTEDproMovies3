import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { CatalogRepository } from "./repositories/catalog.repository.js";
import { PolymorphicCatalogService } from "./services/polymorphic-catalog.service.js";
import { ContentLifecycleService } from "./services/content-lifecycle.service.js";
import { TaxonomyService } from "./services/taxonomy.service.js";
import { SystemSettingsService } from "./services/system-settings.service.js";
import { CatalogController } from "./controllers/catalog.controller.js";
import { TaxonomyController } from "./controllers/taxonomy.controller.js";

@Module({
  imports: [NotificationsModule],
  controllers: [CatalogController, TaxonomyController],
  providers: [
    CatalogRepository,
    PolymorphicCatalogService,
    ContentLifecycleService,
    TaxonomyService,
    SystemSettingsService,
  ],
  exports: [
    CatalogRepository,
    PolymorphicCatalogService,
    ContentLifecycleService,
    TaxonomyService,
    SystemSettingsService,
  ],
})
export class CatalogModule {}
