import {
  HandshakeAckMessage,
  HandshakeAckPayload,
  HandshakeMessage,
  VideoFrameMessage,
} from "@fullstack-nest-app/shared";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

@WebSocketGateway({
  cors: {
    origin: "*", // Allow all origins for development
  },
  namespace: "video",
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  afterInit(server: Server) {
    console.log("WebSocket Gateway initialized");
  }

  handleConnection(client: Socket, ...args: any[]) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage("handshake")
  handleHandshake(
    @MessageBody() message: HandshakeMessage,
    @ConnectedSocket() client: Socket
  ): void {
    console.log(
      `Received handshake from client ${client.id}:`,
      message.payload
    );

    const ackPayload: HandshakeAckPayload = {
      message: `Handshake acknowledged for client ${client.id}`,
      clientId: client.id,
    };
    const ackMessage: HandshakeAckMessage = {
      type: "handshake-ack",
      payload: ackPayload,
    };

    client.emit("handshake-ack", ackMessage); // Send acknowledgment back to the specific client
    console.log(`Sent handshake-ack to client ${client.id}`);
  }

  @SubscribeMessage("video-frame")
  async handleVideoFrame(
    @MessageBody() data: VideoFrameMessage,
    @ConnectedSocket() client: Socket
  ) {
    // In a real application, you'd process this frame (e.g., save, re-broadcast)
    // For now, just log its size.
    // data.payload.data will now be a Node.js Buffer (which has a .length property)

    const buffer = data.payload.data as Buffer;

    console.log(
      `Received video frame from client ${client.id}, ${buffer.length} bytes`
    );
    // Example: Re-broadcast to all other connected clients (if this were a multi-viewer app)
    // client.broadcast.emit('video-frame', data);
  }
}
