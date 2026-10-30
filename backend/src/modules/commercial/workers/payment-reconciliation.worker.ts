import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { DRIZZLE_DATABASE } from "../../../infrastructure/database/database.tokens.js";
import type { ApplicationDatabase } from "../../../infrastructure/database/database.module.js";
import { ENVIRONMENT_CONFIG } from "../../../config/tokens.js";
import type { EnvironmentConfig } from "../../../config/environment.js";
import { CommercialRepository } from "../commercial.repository.js";
import { PaymentService } from "../payment.service.js";

export interface ReconciliationCycleResult {
  readonly examined: number;
  readonly reconciled: number;
  readonly errors: number;
}

@Injectable()
export class PaymentReconciliationWorker
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(PaymentReconciliationWorker.name);
  private readonly workerId: string;
  private readonly pollIntervalMs: number;
  private readonly staleThresholdMinutes: number;
  private readonly batchSize: number;
  private readonly isWorkerEnabled: boolean;

  private pollTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private isShuttingDown = false;

  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: ApplicationDatabase,
    private readonly repository: CommercialRepository,
    private readonly paymentService: PaymentService,
    @Inject(ENVIRONMENT_CONFIG)
    config: EnvironmentConfig,
  ) {
    this.workerId = `rec-worker-${randomUUID().slice(0, 8)}`;
    this.pollIntervalMs = config.paymentReconciliationPollIntervalMs ?? 10_000;
    this.staleThresholdMinutes = config.paymentReconciliationStaleThresholdMinutes ?? 15;
    this.batchSize = config.paymentReconciliationBatchSize ?? 10;
    this.isWorkerEnabled = config.paymentReconciliationWorkerEnabled ?? false;
  }

  onApplicationBootstrap(): void {
    if (!this.isWorkerEnabled) {
      this.logger.log("PaymentReconciliationWorker: background polling is disabled");
      return;
    }

    this.logger.log(
      {
        workerId: this.workerId,
        pollIntervalMs: this.pollIntervalMs,
        staleThresholdMinutes: this.staleThresholdMinutes,
        batchSize: this.batchSize,
      },
      "PaymentReconciliationWorker: starting background reconciliation worker",
    );

    this.scheduleNextPoll();
  }

  async onApplicationShutdown(): Promise<void> {
    this.isShuttingDown = true;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    let waitCount = 0;
    while (this.isProcessing && waitCount < 25) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      waitCount++;
    }
  }

  private scheduleNextPoll(): void {
    if (this.isShuttingDown) return;
    this.pollTimer = setTimeout(async () => {
      try {
        await this.reconcileStalePendingAttemptsOnce();
      } catch (err: unknown) {
        this.logger.error(
          { errorMessage: err instanceof Error ? err.message : "Unknown error" },
          "PaymentReconciliationWorker: unhandled error in polling loop",
        );
      } finally {
        this.scheduleNextPoll();
      }
    }, this.pollIntervalMs);
  }

  /**
   * Deterministically executes one reconciliation cycle.
   * Discovers stale PENDING/UNKNOWN attempts with provider references,
   * queries the gateway port, and safely updates them.
   */
  async reconcileStalePendingAttemptsOnce(
    options: { overrideThresholdMinutes?: number; overrideBatchSize?: number } = {},
  ): Promise<ReconciliationCycleResult> {
    if (this.isProcessing) {
      return { examined: 0, reconciled: 0, errors: 0 };
    }

    this.isProcessing = true;
    let reconciled = 0;
    let errors = 0;

    const thresholdMinutes = options.overrideThresholdMinutes ?? this.staleThresholdMinutes;
    const batchSize = options.overrideBatchSize ?? this.batchSize;

    try {
      const staleAttempts = await this.repository.findStaleUnresolvedPaymentAttempts(
        this.db,
        thresholdMinutes,
        batchSize,
      );

      const examined = staleAttempts.length;

      for (const attempt of staleAttempts) {
        if (this.isShuttingDown) break;

        try {
          const result = await this.paymentService.reconcilePaymentAttempt(
            attempt.id,
            "SYSTEM_RECONCILIATION_WORKER",
          );

          if (result.reconciled) {
            reconciled++;
            this.logger.log(
              {
                attemptId: attempt.id,
                orderId: attempt.orderId,
                priorStatus: result.priorStatus,
                currentStatus: result.currentStatus,
                gatewayStatus: result.gatewayStatus,
              },
              "PaymentReconciliationWorker: successfully reconciled stale attempt",
            );
          }
        } catch (attemptErr: unknown) {
          errors++;
          this.logger.error(
            {
              attemptId: attempt.id,
              orderId: attempt.orderId,
              errorMessage: attemptErr instanceof Error ? attemptErr.message : "Unknown error",
            },
            "PaymentReconciliationWorker: failed to reconcile individual attempt",
          );
        }
      }

      return { examined, reconciled, errors };
    } finally {
      this.isProcessing = false;
    }
  }
}
