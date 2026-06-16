import type { Request } from 'express';

export interface AuthInfo {
  token: string;
  clientId: string;
  scopes: string[];
  expiresAt?: number;
}

/** Express request augmented with the decoded auth info attached by JwtAuthGuard. */
export interface AuthenticatedRequest extends Request {
  auth?: AuthInfo;
}
