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
import { Server, Socket } from 'socket.io'; // Using socket.io for simplicity with NestJS WebSockets
import { HandshakePayload, HandshakeAckPayload, WebSocketMessage, SDPPayload, ICECandidatePayload } from '@fullstack-nest-app/shared';

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
    // You might want to store connected clients here
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // Clean up client-related data
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

  @SubscribeMessage('offer')
  handleOffer(@MessageBody()  WebSocketMessage<SDPPayload>, @ConnectedSocket() client: Socket): void {
    console.log(`Received SDP Offer from client ${client.id}:`, data.payload.sdp.type);
    // In a real application, the server would process this offer,
    // create an answer, and send it back to the client.
    // For now, we just log it as per the request.
    // Example: this.server.emit('offer', data); // If relaying to another client
  }

  @SubscribeMessage('answer')
  handleAnswer(@MessageBody()  WebSocketMessage<SDPPayload>, @ConnectedSocket() client: Socket): void {
    console.log(`Received SDP Answer from client ${client.id}:`, data.payload.sdp.type);
    // Similar to offer, process or relay.
  }

  @SubscribeMessage('candidate')
  handleCandidate(@MessageBody()  WebSocketMessage<ICECandidatePayload>, @ConnectedSocket() client: Socket): void {
    console.log(`Received ICE Candidate from client ${client.id}:`, data.payload.candidate.candidate);
    // Similar to offer/answer, process or relay.
  }
}
