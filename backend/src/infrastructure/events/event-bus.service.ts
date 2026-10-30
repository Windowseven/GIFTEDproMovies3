import { Injectable, Logger, type OnModuleDestroy } from "@nestjs/common";
import { EventEmitter } from "node:events";
import type { DomainEvent } from "./domain-event.base.js";

export type EventHandler<T extends DomainEvent = DomainEvent> = (
  event: T,
) => Promise<void> | void;

@Injectable()
export class EventBusService implements OnModuleDestroy {
  private readonly logger = new Logger(EventBusService.name);
  private readonly emitter = new EventEmitter({ captureRejections: true });

  constructor() {
    this.emitter.setMaxListeners(50);
    this.emitter.on("error", (err) => {
      this.logger.error(
        `Unhandled error in event emitter: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
    });
  }

  /**
   * Publishes an event asynchronously outside of the calling execution / transaction boundary.
   * Dispatched using setImmediate to ensure transaction commit precedes event side-effects.
   * Fail-safe: listener errors are logged and isolated; they never crash the publisher.
   */
  publish<T extends DomainEvent>(event: T): void {
    setImmediate(() => {
      try {
        this.emitter.emit(event.eventName, event);
      } catch (err: unknown) {
        this.logger.error(
          `Synchronous dispatch error on event [${event.eventName}]: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });
  }

  /**
   * Subscribes a listener to a specific event name.
   * Wraps handler with fail-safe error isolation.
   * Returns an unsubscribe function.
   */
  subscribe<T extends DomainEvent>(
    eventName: string,
    handler: EventHandler<T>,
  ): () => void {
    const safeHandler = async (event: T) => {
      try {
        await handler(event);
      } catch (err: unknown) {
        this.logger.error(
          `Error in event listener for [${eventName}]: ${err instanceof Error ? err.message : String(err)}`,
          err instanceof Error ? err.stack : undefined,
        );
      }
    };

    this.emitter.on(eventName, safeHandler);
    return () => {
      this.emitter.off(eventName, safeHandler);
    };
  }

  onModuleDestroy(): void {
    this.emitter.removeAllListeners();
  }
}
