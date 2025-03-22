export class IndexerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IndexerError";
  }
}

export class DatabaseError extends IndexerError {
  constructor(message: string, cause?: unknown) {
    super(`Database error: ${message}${cause ? ` - ${String(cause)}` : ""}`);
    this.name = "DatabaseError";
  }
}

export class EventDecodingError extends IndexerError {
  constructor(message: string, eventData?: unknown) {
    super(
      `Event decoding error: ${message}${
        eventData ? `\nEvent data: ${JSON.stringify(eventData)}` : ""
      }`
    );
    this.name = "EventDecodingError";
  }
}

export class ConfigurationError extends IndexerError {
  constructor(message: string) {
    super(`Configuration error: ${message}`);
    this.name = "ConfigurationError";
  }
}
