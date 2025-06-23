import {
  LiveKitRoom
} from '@livekit/components-react';
import { useState } from 'react';
import ScreenShareButton from './ScreenShareButton.tsx'
import { StartStreamRoomRequest, StartStreamRoomResponse } from '@fullstack-nest-app/shared';
import { LIVEKIT_URL, SERVER_URL } from './definitions.ts';
export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [identity, setIdentity] = useState<string | null>(null);

  const startStreamingRoom = async () => {
    const request: StartStreamRoomRequest = {
      participantName: 'Screen Sharer',
    }
    const res = await fetch(`${SERVER_URL}/startStreamRoom`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const response: StartStreamRoomResponse = await res.json();
    setToken(response.token);
    setIdentity(response.identity);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Decentraland TBS Screen Share Test</h1>
      {!token && <button onClick={startStreamingRoom}>Join Room</button>}

      {token && identity && (
        <LiveKitRoom
          token={token}
          serverUrl={LIVEKIT_URL}
          connect={true}
          onDisconnected={() => setToken(null)}
          style={{ height: '80vh' }}
        >
          <ScreenShareButton identity={identity} />
        </LiveKitRoom>
      )}
    </div>
  );
}