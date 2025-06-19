import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { LivekitModule } from "./livekit/livekit.module";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LivekitModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
