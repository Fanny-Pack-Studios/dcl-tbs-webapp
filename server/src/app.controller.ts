import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { AppService } from "./app.service";
import {
  StartRTMPStreamRequest,
  StartRTMPStreamResponse,
  StartStreamRoomRequest,
  StartStreamRoomResponse,
} from "@fullstack-nest-app/shared";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello() {
    return { text: this.appService.getHello(), timestamp: Date.now() };
  }

  @Post("startStreamRoom")
  startStreamRoom(
    @Body() request: StartStreamRoomRequest
  ): Promise<StartStreamRoomResponse> {
    return this.appService.startStreamRoom(request.participantName);
  }

  @Post("startRTMPStream")
  startRTMPStream(
    @Body() request: StartRTMPStreamRequest
  ): Promise<StartRTMPStreamResponse> {
    return this.appService.startRTMPStream(
      request.roomId,
      request.identity,
      request.rtmpURL,
      request.streamKey
    );
  }
}
