import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  UseGuards,
} from "@nestjs/common";
import { DeviceService } from "../services/device.service.js";
import { CurrentUser } from "../decorators/index.js";
import { SessionAuthGuard } from "../guards/session-auth.guard.js";
import type { SafeUser } from "../services/auth.service.js";
import type { DeviceRecord } from "../../../infrastructure/database/schemas/devices.schema.js";

@Controller("devices")
@UseGuards(SessionAuthGuard)
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Get()
  async listDevices(@CurrentUser() user: SafeUser): Promise<{ devices: DeviceRecord[] }> {
    const devices = await this.deviceService.listUserDevices(user.id);
    return { devices };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  async removeDevice(
    @Param("id") id: string,
    @CurrentUser() user: SafeUser,
  ): Promise<{ message: string }> {
    await this.deviceService.removeDevice(user.id, id);
    return { message: "Device removed and associated sessions revoked" };
  }
}
