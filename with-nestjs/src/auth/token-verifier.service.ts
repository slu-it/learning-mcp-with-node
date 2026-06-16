import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { AuthInfo } from './auth-info.interface';

@Injectable()
export class TokenVerifierService {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly issuer: string;
  private readonly audience: string;

  constructor(private readonly configService: ConfigService) {
    const authHost = this.configService.get<string>('app.auth.host');
    const authPort = this.configService.get<number>('app.auth.port');
    const realm = this.configService.get<string>('app.auth.realm');

    const authBaseUrl = `http://${authHost}:${authPort}/realms/${realm}`;
    const jwksUrl = `${authBaseUrl}/protocol/openid-connect/certs`;

    // Build the remote JWKS once and reuse it across verifications.
    this.jwks = createRemoteJWKSet(new URL(jwksUrl));
    this.issuer = authBaseUrl.endsWith('/')
      ? authBaseUrl.slice(0, -1)
      : authBaseUrl;
    this.audience =
      this.configService.get<string>('app.audience') ??
      'learning-mcp-with-node';
  }

  async verify(token: string): Promise<AuthInfo> {
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: this.audience,
      });
      return {
        token,
        clientId: (payload.azp ?? payload.client_id) as string,
        scopes:
          typeof payload.scope === 'string' ? payload.scope.split(' ') : [],
        expiresAt: payload.exp,
      };
    } catch (err) {
      console.error('auth error', err);
      throw err;
    }
  }
}
