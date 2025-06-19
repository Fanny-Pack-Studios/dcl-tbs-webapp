import { Injectable } from "@nestjs/common";
import { LivekitService } from "./livekit/livekit.service";

@Injectable()
export class AppService {
  constructor(private readonly livekitService: LivekitService) {}
  getHello(): string {
    return "Hello from NestJS backend!";
  }

  startStreamRoom(
    rtmpUrl: string,
    key: string
  ): Promise<{ room: { sid: string }; egress: { egressId: string } }> {
    return this.livekitService.createRoomAndStartRtmpEgress(rtmpUrl, key);
  }
}
