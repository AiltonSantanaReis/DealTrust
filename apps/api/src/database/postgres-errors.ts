export function isUniqueViolation(error: unknown): boolean {
  return hasPostgresErrorCode(error, "23505");
}

export function isForeignKeyViolation(error: unknown): boolean {
  return hasPostgresErrorCode(error, "23503");
}

export function isCheckViolation(error: unknown): boolean {
  return hasPostgresErrorCode(error, "23514");
}

function hasPostgresErrorCode(error: unknown, code: string, depth = 0): boolean {
  if (depth > 3 || typeof error !== "object" || error === null) {
    return false;
  }

  return (
    ("code" in error && (error as { readonly code?: unknown }).code === code) ||
    ("cause" in error &&
      hasPostgresErrorCode((error as { readonly cause?: unknown }).cause, code, depth + 1))
  );
}
