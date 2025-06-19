import { IsNotEmpty } from "class-validator";

export class StartStreamRoomRequest {
  @IsNotEmpty()
  rtmpURL!: string;

  @IsNotEmpty()
  streamKey!: string;
}
