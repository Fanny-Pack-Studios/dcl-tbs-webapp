import { useState } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { Track } from 'livekit-client';

export default function ScreenShareButton() {
  const room = useRoomContext();
  const [sharing, setSharing] = useState(false);

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