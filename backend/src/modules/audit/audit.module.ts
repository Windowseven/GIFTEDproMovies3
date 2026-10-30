import { Global, Module } from "@nestjs/common";
import { AUDIT_SERVICE } from "./audit.tokens.js";
import { AuditService } from "./audit.service.js";
import { AuditController } from "./audit.controller.js";

@Global()
@Module({
  controllers: [AuditController],
  providers: [
    {
      provide: AUDIT_SERVICE,
      useClass: AuditService,
    },
    AuditService,
  ],
  exports: [AUDIT_SERVICE, AuditService],
})
export class AuditModule {}

