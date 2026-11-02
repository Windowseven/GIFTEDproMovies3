import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser, Public, RequireCapability, Roles } from "../identity/decorators/index.js";
import { SessionAuthGuard } from "../identity/guards/session-auth.guard.js";
import { RolesGuard } from "../identity/guards/roles.guard.js";
import { CapabilitiesGuard } from "../identity/guards/capabilities.guard.js";
import { MediaService } from "./media.service.js";
import { CreateUploadIntentDto, type UploadIntentResult } from "./dto/upload-intent.dto.js";
import { UploadCompleteDto } from "./dto/upload-complete.dto.js";
import { TranscodeWebhookDto } from "./dto/transcode-webhook.dto.js";
import { PlaybackAuthorizeDto, type PlaybackAuthorizeResult } from "./dto/playback-authorize.dto.js";
import type { StaffPreviewTokenResult } from "./dto/staff-preview-token.dto.js";
import { DownloadAuthorizeDto, type DownloadAuthorizeResult } from "./dto/download-authorize.dto.js";
import { MediaSupersedeDto, type MediaSupersedeResult } from "./dto/media-supersede.dto.js";
import { ReportDownloadDeliveryDto, type ReportDownloadDeliveryResult } from "./dto/report-download-delivery.dto.js";
import {
  DownloadHistoryQueryDto,
  type DownloadHistoryResponse,
  type DownloadLicensesResponse,
} from "./dto/download-history-query.dto.js";

@Controller()
@UseGuards(SessionAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post("media/upload-intent")
  @UseGuards(RolesGuard)
  @Roles("media_team", "admin")
  @HttpCode(HttpStatus.OK)
  async createUploadIntent(
    @CurrentUser("id") actorId: string,
    @Body() dto: CreateUploadIntentDto,
  ): Promise<UploadIntentResult> {
    return this.mediaService.createUploadIntent(actorId, dto);
  }

  @Post("media/upload-complete")
  @UseGuards(RolesGuard)
  @Roles("media_team", "admin")
  @HttpCode(HttpStatus.OK)
  async completeUpload(
    @CurrentUser("id") actorId: string,
    @Body() dto: UploadCompleteDto,
  ): Promise<{ success: boolean; targetId: string; status: string }> {
    return this.mediaService.completeUpload(actorId, dto);
  }

  @Public()
  @Post("media/webhooks/transcode")
  @HttpCode(HttpStatus.OK)
  async handleTranscodeWebhook(
    @Body() dto: TranscodeWebhookDto,
    @Headers("x-transcode-signature") signatureHeader?: string,
    @Headers("x-transcode-secret") secretHeader?: string,
  ): Promise<{ success: boolean; status: string }> {
    return this.mediaService.processTranscodeWebhook(dto, signatureHeader, secretHeader);
  }

  @Post("playback/authorize")
  @UseGuards(RolesGuard)
  @Roles("customer")
  @HttpCode(HttpStatus.OK)
  async authorizePlayback(
    @CurrentUser("id") customerId: string,
    @Body() dto: PlaybackAuthorizeDto,
  ): Promise<PlaybackAuthorizeResult> {
    return this.mediaService.authorizePlayback(customerId, dto);
  }

  @Post("download/authorize")
  @UseGuards(RolesGuard)
  @Roles("customer")
  @HttpCode(HttpStatus.OK)
  async authorizeDownload(
    @CurrentUser("id") customerId: string,
    @Body() dto: DownloadAuthorizeDto,
  ): Promise<DownloadAuthorizeResult> {
    return this.mediaService.authorizeDownload(customerId, dto);
  }

  @Post("staff/media/:editionId/preview-token")
  @UseGuards(RolesGuard, CapabilitiesGuard)
  @Roles("media_team", "admin")
  @RequireCapability("MEDIA_PREVIEW")
  @HttpCode(HttpStatus.OK)
  async createStaffPreviewToken(
    @CurrentUser("id") staffUserId: string,
    @Param("editionId", new ParseUUIDPipe({ version: "4" })) editionId: string,
  ): Promise<StaffPreviewTokenResult> {
    return this.mediaService.createStaffPreviewToken(staffUserId, editionId);
  }

  @Post("media/supersede")
  @UseGuards(RolesGuard)
  @Roles("media_team", "admin")
  @HttpCode(HttpStatus.OK)
  async supersedeMediaAsset(
    @CurrentUser("id") actorId: string,
    @Body() dto: MediaSupersedeDto,
  ): Promise<MediaSupersedeResult> {
    return this.mediaService.supersedeMediaAsset(actorId, dto);
  }

  @Post("download/report-delivery")
  @UseGuards(RolesGuard)
  @Roles("customer")
  @HttpCode(HttpStatus.OK)
  async reportDownloadDelivery(
    @CurrentUser("id") customerId: string,
    @Body() dto: ReportDownloadDeliveryDto,
  ): Promise<ReportDownloadDeliveryResult> {
    return this.mediaService.reportDownloadDelivery(customerId, dto);
  }

  @Get("download/history")
  @UseGuards(RolesGuard)
  @Roles("customer")
  @HttpCode(HttpStatus.OK)
  async getDownloadHistory(
    @CurrentUser("id") customerId: string,
    @Query() query: DownloadHistoryQueryDto,
  ): Promise<DownloadHistoryResponse> {
    return this.mediaService.getDownloadHistory(customerId, query);
  }

  @Get("download/licenses")
  @UseGuards(RolesGuard)
  @Roles("customer")
  @HttpCode(HttpStatus.OK)
  async getDownloadLicenses(
    @CurrentUser("id") customerId: string,
  ): Promise<DownloadLicensesResponse> {
    return this.mediaService.getDownloadLicenses(customerId);
  }
}

