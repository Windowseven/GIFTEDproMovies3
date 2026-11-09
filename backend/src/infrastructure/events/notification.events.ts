import type { DomainEvent } from "./domain-event.base.js";
import type { NotificationRecord } from "../database/schemas/notifications.schema.js";

export class NotificationCreatedEvent implements DomainEvent {
  readonly eventName = "notification.created";
  readonly occurredAt: Date;

  constructor(public readonly payload: NotificationRecord) {
    this.occurredAt = new Date();
  }
}
