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
  payload: VideoFramePayload;
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
  data: Blob | Buffer; // This is blob in the client side, but buffer on the server side
}
