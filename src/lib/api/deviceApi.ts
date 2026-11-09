import { apiFetch } from './client';
import { DeviceListResponse } from './types';

export const deviceApi = {
  async listDevices(): Promise<DeviceListResponse> {
    return apiFetch<DeviceListResponse>('/devices');
  },

  async removeDevice(deviceId: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/devices/${encodeURIComponent(deviceId)}`, {
      method: 'DELETE',
    });
  },
};
