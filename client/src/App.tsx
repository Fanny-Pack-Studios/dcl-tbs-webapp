import { useState, useRef, useEffect } from "react";
import { io, Socket } from "socket.io-client"; // Import io and Socket
import {
  WebSocketMessage,
  HandshakePayload,
  HandshakeAckPayload,
  VideoFramePayload,
  MessagePayload,
} from "@fullstack-nest-app/shared";

function App() {
  const [sharingStatus, setSharingStatus] = useState<
    "idle" | "sharing" | "stopped" | "error" | "connecting" | "handshaking"
  >("connecting");
  const [wsConnected, setWsConnected] = useState(false);
  const mediaStream = useRef<MediaStream | null>(null);
  const socket = useRef<Socket | null>(null); // Changed from ws to socket
  const clientId = useRef<string>(
    `client-${Math.random().toString(36).substring(2, 9)}`,
  ); // Simple unique ID

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // --- Socket.IO Connection and Handshake ---
  useEffect(() => {
    setSharingStatus("connecting");
    // Connect to NestJS WebSocket server with the specified namespace
    socket.current = io("http://localhost:3001/video");

    socket.current.on("connect", () => {
      console.log("Socket.IO connected.");
      setWsConnected(true);
      setSharingStatus("handshaking");

      // Send handshake message
      const handshakeMessage: HandshakePayload = { clientId: clientId.current };
      sendWebSocketMessage("handshake", handshakeMessage);
      console.log("Handshake message sent.");
    });

    socket.current.on("handshake-ack", (message: HandshakeAckPayload) => {
      // Note: With Socket.IO, if the server's @MessageBody() expects the full WebSocketMessage,
      // then the message received here would be { type: 'handshake-ack', payload: HandshakeAckPayload }.
      // Assuming the server sends just the payload for 'handshake-ack' for simplicity here.
      // If not, you'd access message.payload.
      console.log(`Handshake acknowledged by server: ${message.message}`);
      setSharingStatus("idle"); // Ready to share after handshake
    });

    socket.current.on("video-frame", (message: VideoFramePayload) => {
      // Server might re-broadcast video frames, or this could be for a different purpose
      // For this example, we're just sending frames from client to server.
      console.log(
        "Received video frame from server (not expected in this client-sends-only flow):",
        message.data.length,
      );
    });

    socket.current.on("disconnect", (reason) => {
      console.log(`Socket.IO disconnected: ${reason}`);
      setWsConnected(false);
      if (sharingStatus !== "error" && sharingStatus !== "stopped") {
        setSharingStatus("error"); // Indicate connection loss
      }
      stopScreenShare(); // Clean up media resources
    });

    socket.current.on("connect_error", (error) => {
      console.error("Socket.IO connection error:", error);
      setWsConnected(false);
      setSharingStatus("error");
      stopScreenShare(); // Clean up media resources
    });

    // Cleanup on component unmount
    return () => {
      if (socket.current && socket.current.connected) {
        socket.current.disconnect();
      }
      stopScreenShare(); // Ensure media resources are also cleaned up
    };
  }, []); // Empty dependency array means this runs once on mount

  // Helper to send messages over Socket.IO
  const sendWebSocketMessage = (
    type: WebSocketMessage["type"],
    payload: MessagePayload,
  ) => {
    if (socket.current && socket.current.connected) {
      // The server's @MessageBody() expects the full WebSocketMessage object as the payload
      // of the Socket.IO event.
      const message = { type, payload };
      socket.current.emit(type, message);
    } else {
      console.warn("Socket.IO not connected, cannot send message:", type);
    }
  };

  const startScreenShare = async () => {
    if (
      !wsConnected ||
      sharingStatus === "handshaking" ||
      sharingStatus === "connecting"
    ) {
      alert("Socket.IO not connected or handshake in progress. Please wait.");
      return;
    }

    setSharingStatus("idle"); // Reset status before attempting to start
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      mediaStream.current = stream;
      setSharingStatus("sharing");
      console.log("Screen sharing started:", stream);

      // Use MediaRecorder to capture video chunks
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: "video/webm; codecs=vp8", // Or 'video/mp4' if supported by browser and desired
        videoBitsPerSecond: 1_000_000, // Adjust bitrate as needed (1 Mbps)
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          // Send Blob directly over Socket.IO
          // Socket.IO will automatically convert Blob to ArrayBuffer for transmission
          sendWebSocketMessage("video-frame", { data: event.data });
        }
      };

      mediaRecorderRef.current.onstop = () => {
        console.log("MediaRecorder stopped.");
        stopScreenShare(); // Ensure full cleanup if recorder stops for other reasons
      };

      mediaRecorderRef.current.start(1000); // Capture data every 1000ms (1 second)

      // Handle user stopping sharing from the browser's native UI (e.g., "Stop Sharing" button)
      stream.getVideoTracks()[0].onended = () => {
        console.log("Screen sharing stopped by user via browser controls.");
        stopScreenShare();
      };
    } catch (err: any) {
      console.error("Error starting screen share:", err);
      setSharingStatus("error");
      if (err.name === "NotAllowedError") {
        alert(
          "Permission denied to start screen sharing. Please allow screen sharing in your browser.",
        );
      } else if (err.name === "NotFoundError") {
        alert(
          "No screen or window found to share. Please ensure you have a display available.",
        );
      } else {
        alert(`An unexpected error occurred: ${err.message}`);
      }
    }
  };

  const stopScreenShare = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (mediaStream.current) {
      mediaStream.current.getTracks().forEach((track) => track.stop());
      mediaStream.current = null;
    }
    setSharingStatus("stopped");
    console.log("Screen sharing stopped.");
  };

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "20px" }}>
      <h1>Screen Share App</h1>
      {!wsConnected && sharingStatus === "connecting" && (
        <p>Connecting to server...</p>
      )}
      {wsConnected && sharingStatus === "handshaking" && (
        <p>Handshaking with server...</p>
      )}
      {wsConnected && sharingStatus === "idle" && (
        <p>Click the button to start sharing your screen.</p>
      )}
      {wsConnected && sharingStatus === "error" && (
        <p style={{ color: "red" }}>Connection error or failed to share.</p>
      )}

      {sharingStatus === "idle" && wsConnected && (
        <button onClick={startScreenShare}>Start Screen Share</button>
      )}

      {sharingStatus === "sharing" && (
        <>
          <p>Sharing your screen...</p>
          <button onClick={stopScreenShare}>Stop Screen Share</button>
          <p style={{ fontSize: "0.8em", color: "#888", marginTop: "10px" }}>
            (You can also stop sharing from your browser's screen sharing
            controls)
          </p>
        </>
      )}

      {sharingStatus === "stopped" && (
        <>
          <p>Screen sharing stopped.</p>
          <button onClick={startScreenShare}>Start Screen Share Again</button>
        </>
      )}

      {sharingStatus === "error" && wsConnected && (
        <>
          <p style={{ color: "red" }}>Failed to start screen sharing.</p>
          <button onClick={startScreenShare}>Try Again</button>
        </>
      )}
      {/* Hidden canvas for potential future frame processing, not strictly needed for MediaRecorder */}
      <canvas ref={canvasRef} style={{ display: "none" }}></canvas>
    </div>
  );
}

export default App;
