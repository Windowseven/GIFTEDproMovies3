import { HttpException, HttpStatus } from "@nestjs/common";

export class CommercialValidationException extends HttpException {
  constructor(message: string) {
    super(
      {
        code: "COMMERCIAL_VALIDATION_FAILED",
        message,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class AccessPlanCodeConflictException extends HttpException {
  constructor(message = "An access plan with this code already exists.") {
    super(
      {
        code: "ACCESS_PLAN_CODE_ALREADY_EXISTS",
        message,
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class AccessPlanNotFoundException extends HttpException {
  constructor(message = "The requested access plan was not found.") {
    super(
      {
        code: "ACCESS_PLAN_NOT_FOUND",
        message,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class PlanVersionNotFoundException extends HttpException {
  constructor(message = "The requested plan version was not found.") {
    super(
      {
        code: "PLAN_VERSION_NOT_FOUND",
        message,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class PlanVersionConflictException extends HttpException {
  constructor(message = "A plan version with this version number already exists for the access plan.") {
    super(
      {
        code: "PLAN_VERSION_CONFLICT",
        message,
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class OfferCodeConflictException extends HttpException {
  constructor(message = "An offer with this code already exists.") {
    super(
      {
        code: "OFFER_CODE_ALREADY_EXISTS",
        message,
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class OfferNotFoundException extends HttpException {
  constructor(message = "The requested offer was not found.") {
    super(
      {
        code: "OFFER_NOT_FOUND",
        message,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class OfferPolicyValidationException extends HttpException {
  constructor(message: string) {
    super(
      {
        code: "INVALID_OFFER_POLICY",
        message,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class OfferTargetValidationException extends HttpException {
  constructor(message: string) {
    super(
      {
        code: "INVALID_OFFER_TARGET",
        message,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class OfferStatusTransitionException extends HttpException {
  constructor(message: string) {
    super(
      {
        code: "INVALID_OFFER_STATUS_TRANSITION",
        message,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class OrderNotFoundException extends HttpException {
  constructor(message = "The requested order was not found.") {
    super(
      {
        code: "ORDER_NOT_FOUND",
        message,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class OfferNotPurchasableException extends HttpException {
  constructor(message: string) {
    super(
      {
        code: "OFFER_NOT_PURCHASABLE",
        message,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class OrderIdempotencyConflictException extends HttpException {
  constructor(message = "Idempotency key has already been used with a different order payload.") {
    super(
      {
        code: "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD",
        message,
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class OrderAlreadyPaidException extends HttpException {
  constructor(message = "This order has already been paid.") {
    super(
      {
        code: "ORDER_ALREADY_PAID",
        message,
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class OrderNotPayableException extends HttpException {
  constructor(message = "Order is not in a payable state.") {
    super(
      {
        code: "ORDER_NOT_PAYABLE",
        message,
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class ActivePaymentAttemptExistsException extends HttpException {
  constructor(message = "An active unresolved payment attempt already exists for this order.") {
    super(
      {
        code: "ACTIVE_PAYMENT_ATTEMPT_EXISTS",
        message,
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class PaymentAttemptNotFoundException extends HttpException {
  constructor(message = "The requested payment attempt was not found.") {
    super(
      {
        code: "PAYMENT_ATTEMPT_NOT_FOUND",
        message,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class InvalidPaymentAttemptTransitionException extends HttpException {
  constructor(message = "Invalid payment attempt status transition.") {
    super(
      {
        code: "INVALID_PAYMENT_ATTEMPT_TRANSITION",
        message,
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class PaymentAmountMismatchException extends HttpException {
  constructor(message = "Confirmed payment amount does not match expected order amount.") {
    super(
      {
        code: "PAYMENT_AMOUNT_MISMATCH",
        message,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class ProviderReferenceCollisionException extends HttpException {
  constructor(message = "Unable to generate unique provider reference; please retry.") {
    super(
      {
        code: "PROVIDER_REFERENCE_COLLISION",
        message,
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class ProviderReferenceConflictException extends HttpException {
  constructor(message = "Provider reference does not match persisted payment attempt.") {
    super(
      {
        code: "PROVIDER_REFERENCE_CONFLICT",
        message,
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class SettlementConflictException extends HttpException {
  constructor(message = "Settlement invariant conflict or invalid settlement state.") {
    super(
      {
        code: "SETTLEMENT_CONFLICT",
        message,
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class DuplicateEventConflictException extends HttpException {
  constructor(message = "Provider event ID has already been processed for another payment attempt.") {
    super(
      {
        code: "DUPLICATE_EVENT_CONFLICT",
        message,
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class ConcurrentAttemptConflictException extends HttpException {
  constructor(message = "Concurrent attempt sequence conflict; please retry.") {
    super(
      {
        code: "CONCURRENT_ATTEMPT_CONFLICT",
        message,
      },
      HttpStatus.CONFLICT,
    );
  }
}
