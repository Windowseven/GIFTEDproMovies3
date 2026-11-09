import { apiFetch } from './client';
import {
  DownloadAuthorizeResult,
  DownloadLicensesResponse,
  ReportDownloadDeliveryResult,
} from './types';

export interface AuthorizeDownloadParams {
  contentId?: string;
  editionId?: string;
  episodeId?: string;
  djId?: string;
  deviceId?: string;
}

export const downloadApi = {
  async authorizeDownload(params: AuthorizeDownloadParams): Promise<DownloadAuthorizeResult> {
    return apiFetch<DownloadAuthorizeResult>('/download/authorize', {
      method: 'POST',
      body: params,
    });
  },

  async reportDelivery(
    attemptId: string,
    status: 'COMPLETED' | 'FAILED',
    failureReason?: string,
  ): Promise<ReportDownloadDeliveryResult> {
    return apiFetch<ReportDownloadDeliveryResult>('/download/report-delivery', {
      method: 'POST',
      body: { attemptId, status, failureReason },
    });
  },

  async getLicenses(): Promise<DownloadLicensesResponse> {
    return apiFetch<DownloadLicensesResponse>('/download/licenses');
  },

  async getHistory(page = 1, limit = 20): Promise<{ items: unknown[]; pagination: unknown }> {
    return apiFetch(`/download/history?page=${page}&limit=${limit}`);
  },
};
