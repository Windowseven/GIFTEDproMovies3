import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { EventBusService } from "../../infrastructure/events/event-bus.service.js";
import type {
  EntitlementGrantedEvent,
  PaymentSettledEvent,
} from "../../infrastructure/events/commercial.events.js";
import { NotificationsService } from "./notifications.service.js";

@Injectable()
export class NotificationsEventListener implements OnModuleInit {
  private readonly logger = new Logger(NotificationsEventListener.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit(): void {
    // 1. Listen for EntitlementGrantedEvent
    this.eventBus.subscribe<EntitlementGrantedEvent>(
      "entitlement.granted",
      async (event) => {
        await this.handleEntitlementGranted(event);
      },
    );

    // 2. Listen for PaymentSettledEvent
    this.eventBus.subscribe<PaymentSettledEvent>(
      "payment.settled",
      async (event) => {
        await this.handlePaymentSettled(event);
      },
    );
  }

  private async handleEntitlementGranted(
    event: EntitlementGrantedEvent,
  ): Promise<void> {
    try {
      const { customerId, targetKind } = event.payload;
      await this.notificationsService.createNotification(
        customerId,
        "COMMERCIAL_PURCHASE_COMPLETED",
        "Purchase Successful",
        `Your purchase for ${targetKind} is complete and your access is now active.`,
        { ...event.payload },
      );
    } catch (err: unknown) {
      this.logger.error(
        `Failed to create notification for entitlement.granted event: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private async handlePaymentSettled(
    event: PaymentSettledEvent,
  ): Promise<void> {
    try {
      const { customerId, amountTzs, provider } = event.payload;
      await this.notificationsService.createNotification(
        customerId,
        "PAYMENT_CONFIRMED",
        "Payment Received",
        `Your payment of TZS ${amountTzs} via ${provider} was confirmed.`,
        { ...event.payload },
      );
    } catch (err: unknown) {
      this.logger.error(
        `Failed to create notification for payment.settled event: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
