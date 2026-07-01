import type { AuthUser } from "@dealtrust/contracts";

export type AuthenticatedRequest = {
  readonly headers: Record<string, string | readonly string[] | undefined>;
  readonly id?: string;
  readonly ip?: string;
  readonly method?: string;
  readonly url?: string;
  user?: AuthUser;
};
