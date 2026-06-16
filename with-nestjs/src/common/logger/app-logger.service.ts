import { Injectable } from '@nestjs/common';

@Injectable()
export class AppLoggerService {
  log(message: string): void {
    console.info(message);
  }
}
