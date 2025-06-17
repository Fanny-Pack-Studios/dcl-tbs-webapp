import { Module, Global } from '@nestjs/common';
import { LivekitService } from './livekit.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global() // Make LivekitService available globally
@Module({
  imports: [ConfigModule], // Import ConfigModule to access environment variables
  providers: [
    {
      provide: LivekitService,
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('LIVEKIT_HOST');
        const apiKey = configService.get<string>('LIVEKIT_API_KEY');
        const apiSecret = configService.get<string>('LIVEKIT_API_SECRET');

        if (!host || !apiKey || !apiSecret) {
          console.warn('LiveKit environment variables (LIVEKIT_HOST, LIVEKIT_API_KEY, LIVEKIT_API_SECRET) are not fully set. LiveKit service will not be fully functional.');
          // Return a service that won't connect, or throw an error if you want strict startup
          return new LivekitService(null, null, null);
        }
        return new LivekitService(host, apiKey, apiSecret);
      },
      inject: [ConfigService], // Inject ConfigService into the factory
    },
  ],
  exports: [LivekitService], // Export the service so other modules can use it
})
export class LivekitModule {}
