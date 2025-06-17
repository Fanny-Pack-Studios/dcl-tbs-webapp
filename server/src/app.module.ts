import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { EventsGateway } from "./events.gateway";
import { LivekitModule } from "./livekit/livekit.module"; // New import
import { ConfigModule } from "@nestjs/config"; // New import

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigService available globally
    }),
    LivekitModule, // Import the LivekitModule
  ],
  controllers: [AppController],
  providers: [AppService, EventsGateway],
})
export class AppModule {}
