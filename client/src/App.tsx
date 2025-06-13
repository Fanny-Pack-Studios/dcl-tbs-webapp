import { useState, useRef, useEffect } from 'react';
import { WebSocketMessage, HandshakePayload, HandshakeAckPayload, SDPPayload, ICECandidatePayload, SignalingMessageType } from '@fullstack-nest-app/shared';

function App() {
  const [sharingStatus, setSharingStatus] = useState<'idle' | 'sharing' | 'stopped' | 'error' | 'connecting' | 'handshaking'>('connecting');
  const [wsConnected, setWsConnected] = useState(false);
  const localStream = useRef<MediaStream | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const clientId = useRef<string>(`client-${Math.random().toString(36).substring(2, 9)}`); // Simple unique ID

  // --- WebSocket Connection and Handshake ---
  useEffect(() => {
    setSharingStatus('connecting');
    ws.current = new WebSocket('ws://localhost:3001'); // Connect to NestJS WebSocket server

    ws.current.onopen = () => {
      console.log('WebSocket connected.');
      setWsConnected(true);
      setSharingStatus('handshaking');

      // Send handshake message
      const handshakeMessage: WebSocketMessage<HandshakePayload> = {
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
        case 'offer':
          // Server sent an offer (e.g., if server is initiating or relaying)
          // For this scenario, client sends offer, server receives.
          // If server were to send an offer, client would setRemoteDescription and createAnswer.
          console.log('Received offer from server (not expected in this client-initiates-offer flow):', message.payload);
          break;
        case 'answer':
          // Server sent an answer to our offer
          const answerPayload = message.payload as SDPPayload;
          if (peerConnection.current && peerConnection.current.signalingState !== 'closed') {
            console.log('Setting remote description (answer)...');
            peerConnection.current.setRemoteDescription(new RTCSessionDescription(answerPayload.sdp))
              .then(() => console.log('Remote description (answer) set successfully.'))
              .catch(e => console.error('Error setting remote description (answer):', e));
          }
          break;
        case 'candidate':
          // Server sent an ICE candidate
          const candidatePayload = message.payload as ICECandidatePayload;
          if (peerConnection.current && peerConnection.current.signalingState !== 'closed') {
            console.log('Adding ICE candidate...');
            peerConnection.current.addIceCandidate(new RTCIceCandidate(candidatePayload.candidate))
              .then(() => console.log('ICE candidate added successfully.'))
              .catch(e => console.error('Error adding ICE candidate:', e));
          }
          break;
        default:
          console.warn('Unknown WebSocket message type:', message.type);
      }
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected.');
      setWsConnected(false);
      if (sharingStatus !== 'error' && sharingStatus !== 'stopped') {
        setSharingStatus('error'); // Indicate connection loss
      }
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsConnected(false);
      setSharingStatus('error');
    };

    // Cleanup on component unmount
    return () => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
      stopScreenShare(); // Ensure WebRTC resources are also cleaned up
    };
  }, []); // Empty dependency array means this runs once on mount

  const sendSignalingMessage = (type: SignalingMessageType, payload: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = { type, payload };
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send signaling message:', type);
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

      localStream.current = stream;
      setSharingStatus('sharing');
      console.log('Screen sharing started:', stream);

      peerConnection.current = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }], // Google's public STUN server
      });

      // Add the screen track to the peer connection
      stream.getTracks().forEach(track => {
        peerConnection.current?.addTrack(track, stream);
        console.log('Track added to RTCPeerConnection:', track);
      });

      // Listen for ICE candidates and send them to the server via WebSocket
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('ICE candidate generated:', event.candidate);
          sendSignalingMessage('candidate', { candidate: event.candidate });
        }
      };

      // Listen for connection state changes
      peerConnection.current.onconnectionstatechange = () => {
        console.log('WebRTC connection state:', peerConnection.current?.connectionState);
        if (peerConnection.current?.connectionState === 'disconnected' || peerConnection.current?.connectionState === 'failed') {
          console.warn('WebRTC connection disconnected or failed.');
          stopScreenShare();
        }
      };

      // Create an SDP offer and send it to the server
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      console.log('SDP Offer created:', offer);
      sendSignalingMessage('offer', { sdp: offer });

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
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
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
    </div>
  );
}

export default App;
