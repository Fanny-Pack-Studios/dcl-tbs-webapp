import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { LivekitService } from "./livekit/livekit.service"; // Import LivekitService to check initialization

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api"); // All API routes will be prefixed with /api
  await app.listen(3001); // Server runs on port 3001
  console.log(`Server is running on: ${await app.getUrl()}`);

  // Optional: Access LivekitService to confirm initialization or perform initial tasks
  try {
    const livekitService = app.get(LivekitService);
    if (livekitService.getRoomService()) {
      console.log("LiveKit SDK client successfully initialized and ready to connect to LiveKit server.");
    } else {
      console.warn("LiveKit SDK client not fully initialized. Check environment variables (LIVEKIT_HOST, LIVEKIT_API_KEY, LIVEKIT_API_SECRET).");
    }
  } catch (error) {
    console.error("Failed to get LivekitService. Is LivekitModule correctly imported?", error.message);
  }
}
bootstrap();
