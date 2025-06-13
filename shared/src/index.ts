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
  payload: HandshakeAckPayload;
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
