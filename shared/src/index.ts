export type WebSocketMessage =
  | HandshakeMessage
  | HandshakeAckMessage
  | VideoFrameMessage;

export type HandshakeMessage = { type: "handshake"; payload: HandshakePayload };

export type HandshakeAckMessage = {
  type: "handshake-ack";
  payload: HandshakeAckPayload;
};

export type VideoFrameMessage = {
  type: "video-frame";
  payload: VideoFramePayload; // Corrected this line
};

export type MessagePayload =
  | HandshakePayload
  | VideoFramePayload
  | HandshakeAckPayload;
export interface HandshakePayload {
  clientId: string;
}

export interface HandshakeAckPayload {
  message: string;
  clientId: string;
}

export interface VideoFramePayload {
  data: string; // Base64 encoded video chunk
}
