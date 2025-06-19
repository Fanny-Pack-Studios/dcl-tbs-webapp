import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { AppService } from "./app.service";
import { StartStreamRoomRequest } from "@fullstack-nest-app/shared";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello() {
    return { text: this.appService.getHello(), timestamp: Date.now() };
  }

  @Post("startStreamRoom")
  startStreamRoom(@Body() request: StartStreamRoomRequest) {
    return this.appService.startStreamRoom(request.rtmpURL, request.streamKey);
  }
}
