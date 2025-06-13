import { useState, useRef, useEffect } from 'react';
import { WebSocketMessage, HandshakeAckPayload, VideoFramePayload, MessagePayload } from '@fullstack-nest-app/shared';

function App() {
  const [sharingStatus, setSharingStatus] = useState<'idle' | 'sharing' | 'stopped' | 'error' | 'connecting' | 'handshaking'>('connecting');
  const [wsConnected, setWsConnected] = useState(false);
  const mediaStream = useRef<MediaStream | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const clientId = useRef<string>(`client-${Math.random().toString(36).substring(2, 9)}`); // Simple unique ID

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // --- WebSocket Connection and Handshake ---
  useEffect(() => {
    setSharingStatus('connecting');
    ws.current = new WebSocket('http://localhost:3001/video'); // Connect to NestJS WebSocket server

    ws.current.onopen = () => {
      console.log('WebSocket connected.');
      setWsConnected(true);
      setSharingStatus('handshaking');

      // Send handshake message
      const handshakeMessage: WebSocketMessage = {
        type: 'handshake',
        payload: { clientId: clientId.current },
      };
      ws.current?.send(JSON.stringify(handshakeMessage));
      console.log('Handshake message sent.');
    };

    ws.current.onmessage = (event) => {
      const message: WebSocketMessage = JSON.parse(event.data);
      console.log('WebSocket message received:', message);

      switch (message.type) {
        case 'handshake-ack':
          const ackPayload = message.payload as HandshakeAckPayload;
          console.log(`Handshake acknowledged by server: ${ackPayload.message}`);
          setSharingStatus('idle'); // Ready to share after handshake
          break;
        case 'video-frame':
          // Server might re-broadcast video frames, or this could be for a different purpose
          // For this example, we're just sending frames from client to server.
          console.log('Received video frame from server (not expected in this client-sends-only flow):', (message.payload as VideoFramePayload).data.length);
          break;
        default:
          console.warn('Unknown WebSocket message type:', message.type);
      }
    };

    ws.current.onclose = (event: CloseEvent) => {
      console.log(`WebSocket disconnected: ${event.reason} - Code: ${event.code}`);
      setWsConnected(false);
      if (sharingStatus !== 'error' && sharingStatus !== 'stopped') {
        setSharingStatus('error'); // Indicate connection loss
      }
      stopScreenShare(); // Clean up media resources
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsConnected(false);
      setSharingStatus('error');
      stopScreenShare(); // Clean up media resources
    };

    // Cleanup on component unmount
    return () => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
      stopScreenShare(); // Ensure media resources are also cleaned up
    };
  }, []); // Empty dependency array means this runs once on mount

  // Helper to send messages over WebSocket
  const sendWebSocketMessage = (type: WebSocketMessage['type'], payload: MessagePayload) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const message = { type, payload };

      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message:', type);
    }
  };

  const startScreenShare = async () => {
    if (!wsConnected || sharingStatus === 'handshaking' || sharingStatus === 'connecting') {
      alert('WebSocket not connected or handshake in progress. Please wait.');
      return;
    }

    setSharingStatus('idle'); // Reset status before attempting to start
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      mediaStream.current = stream;
      setSharingStatus('sharing');
      console.log('Screen sharing started:', stream);

      // Use MediaRecorder to capture video chunks
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'video/webm; codecs=vp8', // Or 'video/mp4' if supported by browser and desired
        videoBitsPerSecond: 1_000_000, // Adjust bitrate as needed (1 Mbps)
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          // Convert Blob to Base64 string to send over WebSocket
          const reader = new FileReader();
          reader.onload = () => {
            const base64data = reader.result as string;
            sendWebSocketMessage('video-frame', {  data: base64data.split(',')[1] }); // Send only the base64 part
          };
          reader.readAsDataURL(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        console.log('MediaRecorder stopped.');
        stopScreenShare(); // Ensure full cleanup if recorder stops for other reasons
      };

      mediaRecorderRef.current.start(1000); // Capture data every 1000ms (1 second)

      // Handle user stopping sharing from the browser's native UI (e.g., "Stop Sharing" button)
      stream.getVideoTracks()[0].onended = () => {
        console.log('Screen sharing stopped by user via browser controls.');
        stopScreenShare();
      };

    } catch (err: any) {
      console.error('Error starting screen share:', err);
      setSharingStatus('error');
      if (err.name === 'NotAllowedError') {
        alert('Permission denied to start screen sharing. Please allow screen sharing in your browser.');
      } else if (err.name === 'NotFoundError') {
        alert('No screen or window found to share. Please ensure you have a display available.');
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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (mediaStream.current) {
      mediaStream.current.getTracks().forEach(track => track.stop());
      mediaStream.current = null;
    }
    setSharingStatus('stopped');
    console.log('Screen sharing stopped.');
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px' }}>
      <h1>Screen Share App</h1>
      {!wsConnected && sharingStatus === 'connecting' && <p>Connecting to server...</p>}
      {wsConnected && sharingStatus === 'handshaking' && <p>Handshaking with server...</p>}
      {wsConnected && sharingStatus === 'idle' && <p>Click the button to start sharing your screen.</p>}
      {wsConnected && sharingStatus === 'error' && <p style={{ color: 'red' }}>Connection error or failed to share.</p>}

      {sharingStatus === 'idle' && wsConnected && (
        <button onClick={startScreenShare}>
          Start Screen Share
        </button>
      )}

      {sharingStatus === 'sharing' && (
        <>
          <p>Sharing your screen...</p>
          <button onClick={stopScreenShare}>
            Stop Screen Share
          </button>
          <p style={{ fontSize: '0.8em', color: '#888', marginTop: '10px' }}>
            (You can also stop sharing from your browser's screen sharing controls)
          </p>
        </>
      )}

      {sharingStatus === 'stopped' && (
        <>
          <p>Screen sharing stopped.</p>
          <button onClick={startScreenShare}>
            Start Screen Share Again
          </button>
        </>
      )}

      {(sharingStatus === 'error' && wsConnected) && (
        <>
          <p style={{ color: 'red' }}>Failed to start screen sharing.</p>
          <button onClick={startScreenShare}>
            Try Again
          </button>
        </>
      )}
      {/* Hidden canvas for potential future frame processing, not strictly needed for MediaRecorder */}
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
    </div>
  );
}

export default App;
