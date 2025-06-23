import { Injectable } from "@nestjs/common";
import { LivekitService } from "./livekit/livekit.service";
import {
  StartRTMPStreamResponse,
  StartStreamRoomResponse,
} from "@fullstack-nest-app/shared";

@Injectable()
export class AppService {
  constructor(private readonly livekitService: LivekitService) {}
  getHello(): string {
    return "Hello from NestJS backend!";
  }

  async startStreamRoom(
    participantName: string
  ): Promise<StartStreamRoomResponse> {
    const result =
      await this.livekitService.createRoomAndGetToken(participantName);
    return {
      roomName: result.room.name,
      token: result.token,
      identity: result.identity,
    };
  }

  async startRTMPStream(
    roomName: string,
    identity: string,
    rtmpURL: string,
    streamKey: string
  ): Promise<StartRTMPStreamResponse> {
    return await this.livekitService.startRtmpEgress(
      roomName,
      identity,
      rtmpURL,
      streamKey
    );
  }
}
