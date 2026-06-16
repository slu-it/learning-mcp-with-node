import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { SCOPES_KEY } from './decorators/scopes.decorator';
import { TokenVerifierService } from './token-verifier.service';
import { AuthInfo, AuthenticatedRequest } from './auth-info.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly verifier: TokenVerifierService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing or invalid Authorization header',
      );
    }
    const token = authHeader.slice('Bearer '.length);

    let authInfo: AuthInfo;
    try {
      authInfo = await this.verifier.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    const requiredScopes =
      this.reflector.getAllAndOverride<string[]>(SCOPES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    const hasAllScopes = requiredScopes.every((scope) =>
      authInfo.scopes.includes(scope),
    );
    if (!hasAllScopes) {
      throw new ForbiddenException('Insufficient scope');
    }

    request.auth = authInfo;
    return true;
  }
}
