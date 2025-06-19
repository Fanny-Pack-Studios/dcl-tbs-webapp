import { IsNotEmpty } from "class-validator";

export class StartStreamRoomRequest {
  @IsNotEmpty()
  rtmpURL!: string;

  @IsNotEmpty()
  streamKey!: string;

  @IsNotEmpty()
  participantName!: string;
}

export class StartStreamRoomResponse {
  @IsNotEmpty()
  roomId!: string;

  @IsNotEmpty()
  egressId!: string;

  @IsNotEmpty()
  token!: string;
}
