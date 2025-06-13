export interface Message {
  text: string;
  timestamp: number;
}

// New interfaces for WebSocket signaling
export type SignalingMessageType = 'handshake' | 'handshake-ack' | 'offer' | 'answer' | 'candidate';

export interface WebSocketMessage<T = any> {
  type: SignalingMessageType;
  payload: T;
}

export interface HandshakePayload {
  clientId: string; // A unique ID for the client
}

export interface HandshakeAckPayload {
  message: string;
  clientId: string;
}

export interface SDPPayload {
  sdp: RTCSessionDescriptionInit;
}

export interface ICECandidatePayload {
  candidate: RTCIceCandidateInit;
}
