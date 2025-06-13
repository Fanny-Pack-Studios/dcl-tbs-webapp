import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { HandshakePayload, HandshakeAckPayload, WebSocketMessage, VideoFramePayload } from '@fullstack-nest-app/shared';

@WebSocketGateway({
  cors: {
    origin: '*', // Allow all origins for development
  },
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  afterInit(server: Server) {
    console.log('WebSocket Gateway initialized');
  }

  handleConnection(@ConnectedSocket() client: Socket, ...args: any[]) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('handshake')
  handleHandshake(@MessageBody()  WebSocketMessage<HandshakePayload>, @ConnectedSocket() client: Socket): void {
    console.log(`Received handshake from client ${client.id}:`, data.payload);

    const ackPayload: HandshakeAckPayload = {
      message: `Handshake acknowledged for client ${client.id}`,
      clientId: client.id,
    };
    const ackMessage: WebSocketMessage<HandshakeAckPayload> = {
      type: 'handshake-ack',
      payload: ackPayload,
    };

    client.emit('handshake-ack', ackMessage); // Send acknowledgment back to the specific client
    console.log(`Sent handshake-ack to client ${client.id}`);
  }

  @SubscribeMessage('video-frame')
  handleVideoFrame(@MessageBody()  WebSocketMessage<VideoFramePayload>, @ConnectedSocket() client: Socket): void {
    // In a real application, you'd process this frame (e.g., save, re-broadcast)
    // For now, just log its size.
    console.log(`Received video frame from client ${client.id}, size: ${data.payload.data.length} bytes`);
    // Example: Re-broadcast to all other connected clients (if this were a multi-viewer app)
    // client.broadcast.emit('video-frame', data);
  }
}
