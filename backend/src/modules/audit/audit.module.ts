import { Global, Module } from "@nestjs/common";
import { AUDIT_SERVICE } from "./audit.tokens.js";
import { AuditService } from "./audit.service.js";

@Global()
@Module({
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
