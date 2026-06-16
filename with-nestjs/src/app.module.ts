import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { BusinessModule } from './business/business.module';
import { AuthModule } from './auth/auth.module';
import { McpModule } from './mcp/mcp.module';
import { RestModule } from './rest/rest.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // Global config: every module can inject ConfigService for the `app.*` namespace.
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    BusinessModule,
    // AuthModule registers the global JwtAuthGuard (APP_GUARD) and serves the
    // unauthenticated OAuth well-known metadata endpoints.
    AuthModule,
    McpModule,
    RestModule,
    HealthModule,
  ],
})
export class AppModule {}
