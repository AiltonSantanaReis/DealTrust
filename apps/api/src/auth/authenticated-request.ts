import type { AuthUser } from "@dealtrust/contracts";

export type AuthenticatedRequest = {
  readonly headers: {
    readonly authorization?: string | readonly string[];
  };
  user?: AuthUser;
};
