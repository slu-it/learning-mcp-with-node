import { Module } from '@nestjs/common';
import { BusinessModule } from '../business/business.module';
import { McpController } from './mcp.controller';
import { McpServerFactory } from './mcp-server.factory';

@Module({
  imports: [BusinessModule],
  controllers: [McpController],
  providers: [McpServerFactory],
})
export class McpModule {}
