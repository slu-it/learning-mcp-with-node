import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from './decorators/public.decorator';

@Controller('.well-known')
export class WellKnownController {
  constructor(private readonly configService: ConfigService) {}

  private get authBaseUrl(): string {
    const authHost = this.configService.get<string>('app.auth.host');
    const authPort = this.configService.get<number>('app.auth.port');
    const realm = this.configService.get<string>('app.auth.realm');
    return `http://${authHost}:${authPort}/realms/${realm}`;
  }

  private get mcpServerUrl(): string {
    const host = this.configService.get<string>('app.host');
    const port = this.configService.get<number>('app.port');
    return `http://${host}:${port}`;
  }

  @Public()
  @Get('oauth-protected-resource')
  protectedResource() {
    return {
      resource: this.mcpServerUrl,
      authorization_servers: [this.authBaseUrl],
      scopes_supported: ['mcp:tools', 'offline_access'],
      resource_name: 'learning-mcp-with-node',
    };
  }

  @Public()
  @Get('oauth-authorization-server')
  authorizationServer() {
    const authBaseUrl = this.authBaseUrl;
    return {
      issuer: authBaseUrl,
      authorization_endpoint: `${authBaseUrl}/protocol/openid-connect/auth`,
      token_endpoint: `${authBaseUrl}/protocol/openid-connect/token`,
      jwks_uri: `${authBaseUrl}/protocol/openid-connect/certs`,
      response_types_supported: ['code'],
    };
  }
}
