import { Injectable, OnModuleInit } from '@nestjs/common';
import { RoomServiceClient, AccessToken, Room } from 'livekit-server-sdk';

@Injectable()
export class LivekitService implements OnModuleInit {
  private roomService: RoomServiceClient | null = null;
  private readonly livekitHost: string;
  private readonly livekitApiKey: string;
  private readonly livekitApiSecret: string;

  constructor(
    livekitHost: string,
    livekitApiKey: string,
    livekitApiSecret: string,
  ) {
    this.livekitHost = livekitHost;
    this.livekitApiKey = livekitApiKey;
    this.livekitApiSecret = livekitApiSecret;
  }

  onModuleInit() {
    if (this.livekitHost && this.livekitApiKey && this.livekitApiSecret) {
      this.roomService = new RoomServiceClient(
        this.livekitHost,
        this.livekitApiKey,
        this.livekitApiSecret,
      );
      console.log(`LiveKit RoomServiceClient initialized for host: ${this.livekitHost}`);
    } else {
      console.warn('LiveKit RoomServiceClient not initialized due to missing environment variables. Please set LIVEKIT_HOST, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.');
    }
  }

  /**
   * Returns the LiveKit RoomServiceClient instance.
   * Throws an error if the service was not initialized due to missing credentials.
   */
  getRoomService(): RoomServiceClient {
    if (!this.roomService) {
      throw new Error('LiveKit RoomServiceClient is not initialized. Check environment variables (LIVEKIT_HOST, LIVEKIT_API_KEY, LIVEKIT_API_SECRET).');
    }
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
  generateToken(
    roomName: string,
    participantIdentity: string,
    participantName?: string,
    canPublish?: boolean,
    canSubscribe?: boolean,
  ): string {
    if (!this.livekitApiKey || !this.livekitApiSecret) {
      throw new Error('LiveKit API key or secret is missing. Cannot generate token.');
    }

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
   * @param roomName The name of the room to create.
   * @returns The created Room object, or null if it already existed.
   */
  async createRoom(roomName: string): Promise<Room | null> {
    try {
      const room = await this.getRoomService().createRoom({ name: roomName });
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
   * Lists all active LiveKit rooms.
   * @returns An array of Room objects.
   */
  async listRooms(): Promise<Room[]> {
    return this.getRoomService().listRooms();
  }
}
