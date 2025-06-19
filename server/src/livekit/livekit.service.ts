import { Injectable } from "@nestjs/common";
import {
  RoomServiceClient,
  AccessToken,
  Room,
  RoomCompositeEgressRequest,
  EgressClient,
  EgressInfo,
  StreamProtocol,
  StreamOutput,
  EncodingOptionsPreset,
  EncodedFileOutput,
  EncodedFileType,
  EncodedOutputs,
  // Uncomment these if you need to specify codecs or layouts for egress
  // VideoCodec,
  // AudioCodec,
} from "livekit-server-sdk";
import { generateRandomId } from "src/utils/randomId";

@Injectable()
export class LivekitService {
  private roomService: RoomServiceClient;
  private egressClient: EgressClient;
  private readonly livekitHost: string;
  private readonly livekitApiKey: string;
  private readonly livekitApiSecret: string;

  /**
   * Constructor for LivekitService.
   * The host, API key, and API secret are provided by LivekitModule's useFactory.
   * @param host The LiveKit server host (e.g., "http://localhost:7880")
   * @param apiKey The LiveKit API Key
   * @param apiSecret The LiveKit API Secret
   */
  constructor(
    host: string,
    apiKey: string,
    apiSecret: string,
    private outputToFile: boolean = false
  ) {
    this.livekitHost = host;
    this.livekitApiKey = apiKey;
    this.livekitApiSecret = apiSecret;

    this.roomService = new RoomServiceClient(
      this.livekitHost,
      this.livekitApiKey,
      this.livekitApiSecret
    );
    this.egressClient = new EgressClient(
      this.livekitHost,
      this.livekitApiKey,
      this.livekitApiSecret
    );
    console.log(`LiveKit services initialized for host: ${this.livekitHost}`);
  }

  /**
   * Returns the LiveKit RoomServiceClient instance.
   */
  getRoomService(): RoomServiceClient {
    return this.roomService;
  }
  /**
   * Generates a LiveKit access token for a participant.
   * @param roomName The name of the room the participant will join.
   * @param participantIdentity A unique identifier for the participant.
   * @param participantName An optional display name for the participant.
   * @param canPublish Whether the participant can publish audio/video.
   * @param canSubscribe Whether the participant can subscribe to audio/video.
   * @returns A JWT token string.
   */
  async generateToken(
    roomName: string,
    participantIdentity: string,
    participantName?: string,
    canPublish?: boolean,
    canSubscribe?: boolean
  ): Promise<string> {
    const at = new AccessToken(this.livekitApiKey, this.livekitApiSecret, {
      identity: participantIdentity,
      name: participantName,
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: canPublish ?? true,
      canSubscribe: canSubscribe ?? true,
    });

    return at.toJwt();
  }

  async createRoom(roomName: string): Promise<Room> {
    return await this.roomService.createRoom({ name: roomName });
  }

  async createRoomAndGetToken(
    participantName: string
  ): Promise<{ room: Room; token: string }> {
    const room = await this.createRoom(generateRandomId(10));

    const token = await this.generateToken(
      room.name,
      generateRandomId(10),
      participantName
    );

    return { room, token };
  }

  /**
   * Starts an RTMP egress for a LiveKit room, streaming its composite output to a given URL.
   * @param roomName The name of the room to stream from.
   * @param rtmpUrl The RTMP URL to stream to.
   * @returns The EgressInfo object containing details about the started egress.
   */
  async startRtmpEgress(
    roomName: string,
    rtmpUrl: string,
    streamkey: string
  ): Promise<EgressInfo> {
    const streamUrl = `${rtmpUrl}/${streamkey}`;
    console.log("Streaming to url: ", streamUrl);
    const output: EncodedOutputs = {
      stream: new StreamOutput({
        protocol: StreamProtocol.RTMP,
        urls: [streamUrl],
      }),
    };
    if (this.outputToFile) {
      console.log("Outputing to file");
      output.file = new EncodedFileOutput({
        filepath: `/out/out-${generateRandomId(10)}.mp4`,
        fileType: EncodedFileType.MP4,
      });
    }
    return this.egressClient.startRoomCompositeEgress(roomName, output, {
      encodingOptions: EncodingOptionsPreset.H264_720P_30,
      layout: "single-speaker",
    });
  }

  /**
   * Stops an active LiveKit egress.
   * @param egressId The ID of the egress to stop.
   * @returns The EgressInfo object containing details about the stopped egress.
   */
  async stopEgress(egressId: string): Promise<EgressInfo> {
    try {
      const egress = await this.egressClient.stopEgress(egressId);
      console.log(`Stopped egress with ID: ${egressId}`);
      return egress;
    } catch (error) {
      console.error(
        `Error stopping egress with ID '${egressId}':`,
        error.message
      );
      throw error;
    }
  }
}
