import type { AuthenticatedRequest } from "../auth/authenticated-request.js";

export type AuditRequestContext = {
  readonly method: string;
  readonly path: string;
  readonly ip: string | null;
  readonly userAgent: string | null;
  readonly requestId: string | null;
};

export function createAuditRequestContext(request: AuthenticatedRequest): AuditRequestContext {
  return {
    method: request.method ?? "UNKNOWN",
    path: request.url ?? "UNKNOWN",
    ip: request.ip ?? null,
    userAgent: getFirstHeaderValue(request.headers["user-agent"]),
    requestId: getFirstHeaderValue(request.headers["x-request-id"]) ?? request.id ?? null
  };
}

function getFirstHeaderValue(value: string | readonly string[] | undefined): string | null {
  if (typeof value === "string") {
    return value;
  }

  return value?.at(0) ?? null;
}
