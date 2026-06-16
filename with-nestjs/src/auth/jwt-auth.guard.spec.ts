// jose is ESM-only; the guard transitively imports TokenVerifierService (which
// imports jose), so we stub it out to keep this CommonJS Jest run loadable.
jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => 'mock-jwks'),
  jwtVerify: jest.fn(),
}));

import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { SCOPES_KEY } from './decorators/scopes.decorator';
import { TokenVerifierService } from './token-verifier.service';
import { AuthInfo } from './auth-info.interface';

type MetadataMap = {
  [IS_PUBLIC_KEY]?: boolean;
  [SCOPES_KEY]?: string[];
};

function createReflector(metadata: MetadataMap): Reflector {
  return {
    getAllAndOverride: jest.fn((key: keyof MetadataMap) => metadata[key]),
  } as unknown as Reflector;
}

function createContext(headers: Record<string, string>): {
  context: ExecutionContext;
  request: { headers: Record<string, string>; auth?: AuthInfo };
} {
  const request: { headers: Record<string, string>; auth?: AuthInfo } = {
    headers,
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
  return { context, request };
}

function createVerifier(impl: (token: string) => Promise<AuthInfo>): {
  verifier: TokenVerifierService;
  verify: jest.Mock;
} {
  const verify = jest.fn(impl);
  return { verifier: { verify } as unknown as TokenVerifierService, verify };
}

describe('JwtAuthGuard', () => {
  it('allows public routes without invoking the verifier', async () => {
    const { verifier, verify } = createVerifier(() =>
      Promise.reject(new Error('should not be called')),
    );
    const guard = new JwtAuthGuard(
      createReflector({ [IS_PUBLIC_KEY]: true }),
      verifier,
    );
    const { context } = createContext({});

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verify).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when the Authorization header is missing', async () => {
    const { verifier, verify } = createVerifier(() =>
      Promise.resolve({ token: 't', clientId: 'c', scopes: [] }),
    );
    const guard = new JwtAuthGuard(createReflector({}), verifier);
    const { context } = createContext({});

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(verify).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when the header is not a Bearer token', async () => {
    const { verifier } = createVerifier(() =>
      Promise.resolve({ token: 't', clientId: 'c', scopes: [] }),
    );
    const guard = new JwtAuthGuard(createReflector({}), verifier);
    const { context } = createContext({ authorization: 'Basic abc' });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when the verifier rejects', async () => {
    const { verifier, verify } = createVerifier(() =>
      Promise.reject(new Error('invalid token')),
    );
    const guard = new JwtAuthGuard(createReflector({}), verifier);
    const { context } = createContext({ authorization: 'Bearer bad-token' });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(verify).toHaveBeenCalledWith('bad-token');
  });

  it('throws ForbiddenException when a required scope is missing', async () => {
    const { verifier } = createVerifier(() =>
      Promise.resolve({
        token: 't',
        clientId: 'c',
        scopes: ['api:access'],
      }),
    );
    const guard = new JwtAuthGuard(
      createReflector({ [SCOPES_KEY]: ['mcp:tools'] }),
      verifier,
    );
    const { context } = createContext({ authorization: 'Bearer good-token' });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('returns true and attaches request.auth for a valid token with the required scope', async () => {
    const authInfo: AuthInfo = {
      token: 'good-token',
      clientId: 'client-1',
      scopes: ['mcp:tools', 'api:access'],
      expiresAt: 123,
    };
    const { verifier } = createVerifier(() => Promise.resolve(authInfo));
    const guard = new JwtAuthGuard(
      createReflector({ [SCOPES_KEY]: ['mcp:tools'] }),
      verifier,
    );
    const { context, request } = createContext({
      authorization: 'Bearer good-token',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.auth).toEqual(authInfo);
  });
});
