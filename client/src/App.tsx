import { useState, useRef } from 'react';
// The Message interface is no longer needed as we are not fetching messages
// import { Message } from '@fullstack-nest-app/shared';

function App() {
  const [sharingStatus, setSharingStatus] = useState<'idle' | 'sharing' | 'stopped' | 'error'>('idle');
  const localStream = useRef<MediaStream | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);

  const startScreenShare = async () => {
    setSharingStatus('idle'); // Reset status before attempting to start
    try {
      // Request screen capture (video only for simplicity, audio can be added)
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });

      localStream.current = stream;
      setSharingStatus('sharing');
      console.log('Screen sharing started:', stream);

      // --- WebRTC setup (simplified for now, assuming server is ready to receive) ---
      // In a real application, you would typically create an RTCPeerConnection
      // and exchange SDP offers/answers and ICE candidates with a remote peer
      // via a signaling server.
      peerConnection.current = new RTCPeerConnection();

      // Add the screen track to the peer connection
      stream.getTracks().forEach(track => {
        peerConnection.current?.addTrack(track, stream);
        console.log('Track added to RTCPeerConnection:', track);
      });

      // Optional: Listen for ICE candidates (to be sent to the remote peer/server)
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('ICE candidate generated:', event.candidate);
          // In a real app, you'd send this candidate to the remote peer/server
        }
      };

      // Optional: Listen for connection state changes
      peerConnection.current.onconnectionstatechange = () => {
        console.log('WebRTC connection state:', peerConnection.current?.connectionState);
      };

      // Handle user stopping sharing from the browser's native UI (e.g., "Stop Sharing" button)
      stream.getVideoTracks()[0].onended = () => {
        console.log('Screen sharing stopped by user via browser controls.');
        stopScreenShare();
      };

      // In a real app, you'd create an SDP offer here and send it to the server:
      // const offer = await peerConnection.current.createOffer();
      // await peerConnection.current.setLocalDescription(offer);
      // console.log('SDP Offer created:', offer);
      // Send 'offer' to your signaling server...

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
      // Stop all tracks in the stream
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }
    if (peerConnection.current) {
      // Close the RTCPeerConnection
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setSharingStatus('stopped');
    console.log('Screen sharing stopped.');
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px' }}>
      <h1>Screen Share App</h1>
      <p>Click the button to start sharing your screen.</p>

      {sharingStatus === 'idle' && (
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

      {sharingStatus === 'error' && (
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
