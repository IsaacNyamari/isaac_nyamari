/** An error whose message is safe to show to an administrator. */
export class UserError extends Error {
  constructor(message: string, public fieldErrors?: Record<string, string>) {
    super(message);
  }
}

/** Raised when an edit was based on a stale version of a record. */
export class ConflictError extends UserError {
  constructor() {
    super("This item was changed elsewhere after you opened it. Reload to get the latest version — your edits were not saved.");
  }
}

export class NotFoundError extends UserError {
  constructor(what = "Item") {
    super(`${what} not found.`);
  }
}
