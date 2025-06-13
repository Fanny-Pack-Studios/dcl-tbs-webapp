import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventsGateway } from './events.gateway'; // Import the new gateway

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, EventsGateway], // Add EventsGateway to providers
})
export class AppModule {}
