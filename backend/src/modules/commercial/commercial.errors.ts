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

