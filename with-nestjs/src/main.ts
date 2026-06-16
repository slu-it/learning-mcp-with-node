import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation drives DTO checks (e.g. POST /api/messaging/send → 400
  // when required fields are missing). `whitelist` strips unknown properties.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = app.get(ConfigService);
  const host = config.get<string>('app.host');
  const port = config.get<number>('app.port') ?? 3000;

  await app.listen(port, host ?? 'localhost');

  const origin = `http://${host}:${port}`;
  console.log(`🚀 MCP Server running on ${origin}`);
  console.log(`📡 MCP endpoint available at ${origin}/mcp`);
  console.log(`📨 REST API available at ${origin}/api`);
  console.log(`❤️  Health check available at ${origin}/health`);
  console.log(
    `🔐 OAuth metadata available at ${origin}/.well-known/oauth-protected-resource`,
  );
}
void bootstrap();
