import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { DatabaseService } from "../../infrastructure/database/database.service.js";

@ApiTags("foundation health")
@Controller("health")
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get("live")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Check whether the process is responsive" })
  @ApiResponse({
    status: 200,
    description: "The process is alive.",
    schema: {
      type: "object",
      required: ["success", "data"],
      properties: {
        success: { type: "boolean", enum: [true] },
        data: {
          type: "object",
          required: ["status"],
          properties: { status: { type: "string", enum: ["alive"] } },
        },
      },
    },
  })
  live(): { status: "alive" } {
    return { status: "alive" };
  }

  @Get("ready")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Check whether essential database access is ready" })
  @ApiResponse({
    status: 200,
    description: "The application is ready.",
    schema: {
      type: "object",
      required: ["success", "data"],
      properties: {
        success: { type: "boolean", enum: [true] },
        data: {
          type: "object",
          required: ["status"],
          properties: { status: { type: "string", enum: ["ready"] } },
        },
      },
    },
  })
  @ApiResponse({ status: 503, description: "The database is unavailable." })
  async ready(): Promise<{ status: "ready" }> {
    try {
      await this.database.checkReadiness();
      return { status: "ready" };
    } catch {
      throw new ServiceUnavailableException();
    }
  }
}
