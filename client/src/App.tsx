import { useState, useEffect } from 'react';
import { Message } from '@fullstack-nest-app/shared'; // Import shared interface

function App() {
  const [message, setMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMessage = async () => {
      try {
        // Fetch from /api, which Vite's proxy will redirect to http://localhost:3001
        const response = await fetch('/api');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Message = await response.json(); // Corrected variable name from Message to data
        setMessage(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMessage();
  }, []);

  if (loading) {
    return <div>Loading message from backend...</div>;
  }

  if (error) {
    return <div>Error: {error}. Make sure the NestJS backend is running on port 3001.</div>;
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px' }}>
      <h1>Fullstack NestJS App</h1>
      <p>This is the React frontend communicating with the NestJS backend.</p>
      {message && (
        <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
          <h2>Message from Backend:</h2>
          <p>
            <strong>Text:</strong> "{message.text}"
          </p>
          <p>
            <strong>Timestamp:</strong> {new Date(message.timestamp).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}

export default App;
