import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module.js";
import { CommercialModule } from "../commercial/commercial.module.js";
import { MediaController } from "./media.controller.js";
import { MediaService } from "./media.service.js";
import { MEDIA_STORAGE_PORT, PLAYBACK_SIGNER_PORT } from "./media.tokens.js";
import { LocalSimulatorMediaAdapter } from "./adapters/local-simulator-media.adapter.js";
import { R2MediaStorageAdapter } from "./adapters/r2-media-storage.adapter.js";
import { JwtPlaybackSignerAdapter } from "./adapters/jwt-playback-signer.adapter.js";
import type { MediaStoragePort } from "./ports/media-storage.port.js";
import type { PlaybackSignerPort } from "./ports/playback-signer.port.js";
import { ENVIRONMENT_CONFIG } from "../../config/tokens.js";
import type { EnvironmentConfig } from "../../config/environment.js";

@Module({
  imports: [AuditModule, CommercialModule],
  controllers: [MediaController],
  providers: [
    MediaService,
    {
      provide: MEDIA_STORAGE_PORT,
      inject: [ENVIRONMENT_CONFIG],
      useFactory: (env: EnvironmentConfig): MediaStoragePort => {
        if (env.mediaStorageProvider === "r2") {
          return new R2MediaStorageAdapter({
            accountId: env.r2AccountId!,
            accessKeyId: env.r2AccessKeyId!,
            secretAccessKey: env.r2SecretAccessKey!,
            bucketName: env.r2BucketName || "giftedpro-staging-media-downloads",
            endpoint: env.r2Endpoint,
          });
        }
        return new LocalSimulatorMediaAdapter();
      },
    },
    {
      provide: PLAYBACK_SIGNER_PORT,
      inject: [ENVIRONMENT_CONFIG],
      useFactory: (env: EnvironmentConfig): PlaybackSignerPort => {
        return new JwtPlaybackSignerAdapter({
          secret:
            env.playbackSigningSecret ||
            "dev-playback-signing-secret-minimum-32-chars-long",
          defaultTtlSeconds: env.playbackTokenTtlSeconds || 900,
        });
      },
    },
  ],
  exports: [MediaService, MEDIA_STORAGE_PORT, PLAYBACK_SIGNER_PORT],
})
export class MediaModule {}
