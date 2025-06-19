import { useState } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { StartRTMPStreamRequest } from '@fullstack-nest-app/shared';
import { RTMP_BASE_URL, RTMP_STREAM_KEY, SERVER_URL } from './definitions';

export default function ScreenShareButton() {
  const room = useRoomContext();
  const [sharing, setSharing] = useState(false);

  const startRTMPStream = async () => {
    try {
      const request: StartRTMPStreamRequest = {
        roomId: room.name,
        rtmpURL: RTMP_BASE_URL,
        streamKey: RTMP_STREAM_KEY
      }
      const result: Response = await fetch(`${SERVER_URL}/api/startRTMPStream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      console.log('START RTMP RESPONSE: ', await result.json());

    } catch (err) {
      console.error('Error starting RTMP stream:', err);
    }
  }

  const startSharing = async () => {
    try {
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      const [track] = stream.getVideoTracks();
      await room.localParticipant.publishTrack(track, {
        name: 'screen',
        source: Track.Source.ScreenShare,
      });

      setSharing(true);

      track.addEventListener('ended', () => {
        room.localParticipant.unpublishTrack(track);
        setSharing(false);
        console.log('Screen sharing stopped by the user');
      });

      await duration(2000);

      await startRTMPStream()
    } catch (err) {
      console.error('Error sharing screen:', err);
    }
  };

  return (
    <div style={{ marginTop: '1rem' }}>
      {!sharing && <button onClick={startSharing}>Start Screen Share</button>}
      {sharing && <p>✅ You are sharing your screen</p>}
    </div>
  );
}

function duration(time: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}
