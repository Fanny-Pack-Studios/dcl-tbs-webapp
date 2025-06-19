import { IsNotEmpty } from "class-validator";

export class StartStreamRoomRequest {
  @IsNotEmpty()
  participantName!: string;
}

export class StartStreamRoomResponse {
  @IsNotEmpty()
  roomName!: string;

  @IsNotEmpty()
  token!: string;
}

export class StartRTMPStreamRequest {
  @IsNotEmpty()
  rtmpURL!: string;

  @IsNotEmpty()
  streamKey!: string;

  @IsNotEmpty()
  roomId!: string;
}

export class StartRTMPStreamResponse {
  @IsNotEmpty()
  egressId!: string;
}
