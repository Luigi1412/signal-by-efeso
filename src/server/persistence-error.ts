import "server-only";

export class PersistenceUnavailableError extends Error {
  constructor(message = "SIGNAL persistence is unavailable.") {
    super(message);
    this.name = "PersistenceUnavailableError";
  }
}

export function isPersistenceUnavailable(error: unknown): error is PersistenceUnavailableError {
  return error instanceof PersistenceUnavailableError;
}
