import {
  LiveKitRoom
} from '@livekit/components-react';
import { useState } from 'react';
import ScreenShareButton from './ScreenShareButton.tsx'
import { StartStreamRoomRequest, StartStreamRoomResponse } from '@fullstack-nest-app/shared';

const LIVEKIT_URL = 'ws://localhost:7800';
const SERVER_URL = 'http://localhost:3001';

export default function App() {
  const [token, setToken] = useState<string | null>(null);

  const startStreamingRoom = async () => {
    const request: StartStreamRoomRequest = {
      rtmpURL: 'rtmp://rtmp-server:1935/live',
      streamKey: 'test',
      participantName: 'Screen Sharer',
    }
    const res = await fetch(`${SERVER_URL}/api/startStreamRoom`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const response: StartStreamRoomResponse = await res.json();
    setToken(response.token);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Decentraland TBS Screen Share Test</h1>
      {!token && <button onClick={startStreamingRoom}>Join Room</button>}

      {token && (
        <LiveKitRoom
          token={token}
          serverUrl={LIVEKIT_URL}
          connect={true}
          onDisconnected={() => setToken(null)}
          style={{ height: '80vh' }}
        >
          <ScreenShareButton />
        </LiveKitRoom>
      )}
    </div>
  );
}