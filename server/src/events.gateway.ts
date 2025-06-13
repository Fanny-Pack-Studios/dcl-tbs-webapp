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
import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } from 'wrtc'; // Import WebRTC components
import { HandshakePayload, HandshakeAckPayload, WebSocketMessage, SDPPayload, ICECandidatePayload } from '@fullstack-nest-app/shared';

@WebSocketGateway({
  cors: {
    origin: '*', // Allow all origins for development
  },
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private peerConnections: Map<string, RTCPeerConnection> = new Map(); // Store RTCPeerConnection for each client

  afterInit(server: Server) {
    console.log('WebSocket Gateway initialized');
  }

  handleConnection(@ConnectedSocket() client: Socket, ...args: any[]) {
    console.log(`Client connected: ${client.id}`);
    // RTCPeerConnection will be created when the first 'offer' is received
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    const pc = this.peerConnections.get(client.id);
    if (pc) {
      pc.close();
      this.peerConnections.delete(client.id);
      console.log(`RTCPeerConnection for client ${client.id} closed and removed.`);
    }
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
  async handleOffer(@MessageBody()  WebSocketMessage<SDPPayload>, @ConnectedSocket() client: Socket): Promise<void> {
    console.log(`Received SDP Offer from client ${client.id}:`, data.payload.sdp.type);

    let pc = this.peerConnections.get(client.id);
    if (!pc) {
      // Create a new RTCPeerConnection for this client if it doesn't exist
      pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }], // Use the same STUN server as client
      });
      this.peerConnections.set(client.id, pc);

      // Set up ICE candidate handling for the server's peer connection
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`Server ICE candidate generated for ${client.id}:`, event.candidate.candidate);
          const candidateMessage: WebSocketMessage<ICECandidatePayload> = {
            type: 'candidate',
            payload: { candidate: event.candidate.toJSON() }, // Convert RTCIceCandidate to JSON for sending
          };
          client.emit('candidate', candidateMessage);
        }
      };

      // Listen for incoming tracks (the screen share stream)
      pc.ontrack = (event) => {
        console.log(`Track received from client ${client.id}:`, event.track.kind, event.streams[0].id);
        // At this point, the server is receiving the media stream.
        // You can now process this stream on the server, e.g., save it to a file,
        // re-stream it to other clients, perform analysis, etc.
        event.track.onended = () => {
          console.log(`Track from client ${client.id} ended.`);
        };
      };

      // Log connection state changes
      pc.onconnectionstatechange = () => {
        console.log(`Server WebRTC connection state for ${client.id}:`, pc?.connectionState);
        if (pc?.connectionState === 'disconnected' || pc?.connectionState === 'failed') {
          console.warn(`WebRTC connection for client ${client.id} disconnected or failed.`);
          pc.close();
          this.peerConnections.delete(client.id);
        }
      };
    }

    try {
      // Set the remote description (client's offer)
      await pc.setRemoteDescription(new RTCSessionDescription(data.payload.sdp));
      console.log(`Remote description (offer) set for client ${client.id}.`);

      // Create an answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log(`Local description (answer) created for client ${client.id}.`);

      // Send the answer back to the client
      const answerMessage: WebSocketMessage<SDPPayload> = {
        type: 'answer',
        payload: { sdp: answer.toJSON() }, // Convert RTCSessionDescription to JSON for sending
      };
      client.emit('answer', answerMessage);
      console.log(`Sent SDP Answer to client ${client.id}.`);

    } catch (error) {
      console.error(`Error handling offer from client ${client.id}:`, error);
      // Handle error, potentially close PC
      if (pc && pc.signalingState !== 'closed') {
        pc.close();
      }
      this.peerConnections.delete(client.id);
    }
  }

  @SubscribeMessage('answer')
  handleAnswer(@MessageBody()  WebSocketMessage<SDPPayload>, @ConnectedSocket() client: Socket): void {
    console.log(`Received SDP Answer from client ${client.id}:`, data.payload.sdp.type);
    // In this client-initiates-offer flow, the server sends the answer.
    // Receiving an 'answer' from the client here would typically indicate a different signaling flow
    // (e.g., server initiating the call, or a relay server forwarding an answer from another peer).
    // For now, we just log it as it's not expected in this specific setup.
  }

  @SubscribeMessage('candidate')
  async handleCandidate(@MessageBody()  WebSocketMessage<ICECandidatePayload>, @ConnectedSocket() client: Socket): Promise<void> {
    console.log(`Received ICE Candidate from client ${client.id}:`, data.payload.candidate.candidate);
    const pc = this.peerConnections.get(client.id);
    if (pc && pc.signalingState !== 'closed') {
      try {
        // RTCIceCandidate.candidate can be an empty string if it's the end-of-candidates signal
        if (data.payload.candidate.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(data.payload.candidate));
          console.log(`ICE candidate added for client ${client.id}.`);
        } else {
          console.log(`Received end-of-candidates signal from client ${client.id}.`);
        }
      } catch (error) {
        console.error(`Error adding ICE candidate for client ${client.id}:`, error);
        // This error can happen if a candidate is received before the remote description is set.
        // In a more robust application, you might queue candidates and add them once the remote description is ready.
      }
    } else {
      console.warn(`No active RTCPeerConnection for client ${client.id} to add candidate.`);
    }
  }
}
