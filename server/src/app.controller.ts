import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Message } from '@fullstack-nest-app/shared'; // Import shared interface

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): Message {
    return {
      text: this.appService.getHello(),
      timestamp: Date.now(),
    };
  }
}
