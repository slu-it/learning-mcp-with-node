import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TokenVerifierService } from './token-verifier.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { WellKnownController } from './well-known.controller';

@Module({
  providers: [
    TokenVerifierService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  controllers: [WellKnownController],
  exports: [TokenVerifierService],
})
export class AuthModule {}
