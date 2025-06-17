import { Module, Global } from "@nestjs/common";
import { LivekitService } from "./livekit.service";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: LivekitService,
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>("LIVEKIT_HOST");
        const apiKey = configService.get<string>("LIVEKIT_API_KEY");
        const apiSecret = configService.get<string>("LIVEKIT_API_SECRET");

        if (!host || !apiKey || !apiSecret) {
          console.warn(
            "LiveKit environment variables (LIVEKIT_HOST, LIVEKIT_API_KEY, LIVEKIT_API_SECRET) are not fully set. LiveKit service will not be fully functional."
          );
          throw new Error("LiveKit service was not properly set up");
        }
        return new LivekitService(host, apiKey, apiSecret);
      },
      inject: [ConfigService],
    },
  ],
  exports: [LivekitService],
})
export class LivekitModule {}
