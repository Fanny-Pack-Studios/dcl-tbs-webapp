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
  // Uncomment these if you need to specify codecs or layouts for egress
  // VideoCodec,
  // AudioCodec,
} from "livekit-server-sdk";
import { generate } from "rxjs";
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
   * @param host The LiveKit server host (e.g., "http://localhost:7800")
   * @param apiKey The LiveKit API Key
   * @param apiSecret The LiveKit API Secret
   */
  constructor(host: string, apiKey: string, apiSecret: string) {
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

  /**
   * Starts an RTMP egress for a LiveKit room, streaming its composite output to a given URL.
   * @param roomName The name of the room to stream from.
   * @param rtmpUrl The RTMP URL to stream to.
   * @returns The EgressInfo object containing details about the started egress.
   */
  async startRtmpEgress(
    room: Room,
    rtmpUrl: string,
    streamkey: string
  ): Promise<EgressInfo> {
    return this.egressClient.startRoomCompositeEgress(
      room.name,
      new StreamOutput({
        protocol: StreamProtocol.RTMP,
        urls: [`${rtmpUrl}/${streamkey}`],
      }),
      { encodingOptions: EncodingOptionsPreset.H264_720P_30 }
    );
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

  /**
   * Creates a LiveKit room and immediately starts an RTMP egress from it.
   * The room will support WebRTC ingress by default.
   * @param streamKey The name of the room (used as stream key).
   * @param rtmpUrl The RTMP URL to stream the room's composite output to.
   * @returns An object containing the created Room (or null if it existed) and the started EgressInfo.
   */
  async createRoomAndStartRtmpEgress(
    name: string,
    rtmpUrl: string,
    streamKey: string
  ): Promise<{ room: Room; egress: EgressInfo; token: string }> {
    var roomId = generateRandomId(10);
    const room = await this.createRoom(roomId);

    const egress = await this.startRtmpEgress(room, rtmpUrl, streamKey);

    const token = await this.generateToken(
      room.name,
      generateRandomId(10),
      name
    );

    return { room, egress, token };
  }
}
