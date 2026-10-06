import { HttpException, HttpStatus } from "@nestjs/common";

export class InvalidContentTypeException extends HttpException {
  constructor(message = "The specified content item does not support this operation.") {
    super(
      {
        code: "INVALID_CONTENT_TYPE",
        message,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class InvalidHierarchyException extends HttpException {
  constructor(message = "The parent entity does not match the required catalog hierarchy.") {
    super(
      {
        code: "INVALID_HIERARCHY",
        message,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class InvalidLifecycleTransitionException extends HttpException {
  constructor(message = "The requested status transition is not permitted from the current state.") {
    super(
      {
        code: "INVALID_LIFECYCLE_TRANSITION",
        message,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class PublicationReadinessFailedException extends HttpException {
  constructor(
    details: string[],
    message = "Content is not ready for publication.",
  ) {
    super(
      {
        code: "PUBLICATION_READINESS_FAILED",
        message,
        details,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class DefaultEditionRequiredException extends HttpException {
  constructor(message = "A published movie must have an active, verified default edition.") {
    super(
      {
        code: "DEFAULT_EDITION_REQUIRED",
        message,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class SeriesInitialContentRequiredException extends HttpException {
  constructor(
    message = "Initial series publication requires Season 1 and Episode 1 with ready media.",
  ) {
    super(
      {
        code: "SERIES_INITIAL_CONTENT_REQUIRED",
        message,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class RejectionReasonRequiredException extends HttpException {
  constructor(message = "A written rejection reason is required.") {
    super(
      {
        code: "REJECTION_REASON_REQUIRED",
        message,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class TaxonomyInUseException extends HttpException {
  constructor(
    message = "Cannot delete taxonomy item because it is referenced by catalog content. Deactivate it instead.",
  ) {
    super(
      {
        code: "TAXONOMY_IN_USE",
        message,
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class SlugCollisionException extends HttpException {
  constructor(message = "A catalog item with this slug already exists.") {
    super(
      {
        code: "SLUG_ALREADY_EXISTS",
        message,
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class ContentNotFoundException extends HttpException {
  constructor(message = "The requested catalog item was not found.") {
    super(
      {
        code: "NOT_FOUND",
        message,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}
