import { Injectable } from '@nestjs/common';
import {
  RoomServiceClient,
  AccessToken,
  Room,
  EgressServiceClient,
  RoomCompositeEgressRequest,
  EgressInfo,
  // Uncomment these if you need to specify codecs or layouts for egress
  // VideoCodec,
  // AudioCodec,
} from 'livekit-server-sdk';

@Injectable()
export class LivekitService {
  private roomService: RoomServiceClient;
  private egressService: EgressServiceClient;
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
      this.livekitApiSecret,
    );
    this.egressService = new EgressServiceClient(
      this.livekitHost,
      this.livekitApiKey,
      this.livekitApiSecret,
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
   * Returns the LiveKit EgressServiceClient instance.
   */
  getEgressService(): EgressServiceClient {
    return this.egressService;
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
  generateToken(
    roomName: string,
    participantIdentity: string,
    participantName?: string,
    canPublish?: boolean,
    canSubscribe?: boolean,
  ): string {
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

  /**
   * Creates a LiveKit room. If the room already exists, it will log a message.
   * LiveKit rooms inherently support WebRTC ingress for participants.
   * @param roomName The name of the room to create.
   * @returns The created Room object, or null if it already existed.
   */
  async createRoom(roomName: string): Promise<Room | null> {
    try {
      const room = await this.roomService.createRoom({ name: roomName });
      console.log(`LiveKit room '${room.name}' created.`);
      return room;
    } catch (error) {
      // LiveKit throws an error if room already exists, which is often fine.
      if (error.message.includes('room already exists')) {
        console.log(`LiveKit room '${roomName}' already exists.`);
        return null; // Indicate that no new room was created
      }
      console.error(`Error creating LiveKit room '${roomName}':`, error.message);
      throw error;
    }
  }

  /**
   * Starts an RTMP egress for a LiveKit room, streaming its composite output to a given URL.
   * @param roomName The name of the room to stream from.
   * @param rtmpUrl The RTMP URL to stream to.
   * @returns The EgressInfo object containing details about the started egress.
   */
  async startRtmpEgress(roomName: string, rtmpUrl: string): Promise<EgressInfo> {
    const request: RoomCompositeEgressRequest = {
      roomName: roomName,
      rtmp: {
        urls: [rtmpUrl],
      },
      // Optional: Configure video/audio output for the composite stream
      // video: {
      //   width: 1280,
      //   height: 720,
      //   depth: 24,
      //   framerate: 30,
      //   bitrate: 4500,
      //   keyFrameInterval: 1,
      //   codec: VideoCodec.VP8, // or H264
      // },
      // audio: {
      //   bitrate: 128,
      //   channels: 2,
      //   codec: AudioCodec.OPUS, // or AAC
      // },
      // layout: 'speaker-dark-sidebar', // Example layout
    };

    try {
      const egress = await this.egressService.startRoomCompositeEgress(request);
      console.log(`Started RTMP egress for room '${roomName}' to '${rtmpUrl}'. Egress ID: ${egress.egressId}`);
      return egress;
    } catch (error) {
      console.error(`Error starting RTMP egress for room '${roomName}' to '${rtmpUrl}':`, error.message);
      throw error;
    }
  }

  /**
   * Stops an active LiveKit egress.
   * @param egressId The ID of the egress to stop.
   * @returns The EgressInfo object containing details about the stopped egress.
   */
  async stopEgress(egressId: string): Promise<EgressInfo> {
    try {
      const egress = await this.egressService.stopEgress(egressId);
      console.log(`Stopped egress with ID: ${egressId}`);
      return egress;
    } catch (error) {
      console.error(`Error stopping egress with ID '${egressId}':`, error.message);
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
  async createRoomAndStartRtmpEgress(streamKey: string, rtmpUrl: string): Promise<{ room: Room | null, egress: EgressInfo }> {
    // 1. Create the room (if it doesn't exist).
    // LiveKit rooms inherently support WebRTC ingress from participants.
    const room = await this.createRoom(streamKey);

    // 2. Start RTMP egress from the room.
    const egress = await this.startRtmpEgress(streamKey, rtmpUrl);

    return { room, egress };
  }
}
