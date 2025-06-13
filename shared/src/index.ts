export interface Message {
  text: string;
  timestamp: number;
}

// New interfaces for WebSocket signaling
export type SignalingMessageType = 'handshake' | 'handshake-ack';

export interface WebSocketMessage<T = any> {
  type: SignalingMessageType | 'video-frame'; // 'video-frame' is a custom type for screen sharing
  payload: T;
}

export interface HandshakePayload {
  clientId: string; // A unique ID for the client
}

export interface HandshakeAckPayload {
  message: string;
  clientId: string;
}

// New interface for sending video frames over WebSocket
export interface VideoFramePayload {
   string; // Base64 encoded video chunk
}
