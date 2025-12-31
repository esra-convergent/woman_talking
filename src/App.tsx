import { useState, useEffect } from 'react';
import { Room } from 'livekit-client';
import { AvatarStudio } from './components/AvatarStudio';

function App() {
  const [room] = useState(() => new Room());
  const [voiceUrl, setVoiceUrl] = useState('');
  const [voiceToken, setVoiceToken] = useState('');
  const [isConnectingVoice, setIsConnectingVoice] = useState(false);

  const handleVoiceConnect = async () => {
    setIsConnectingVoice(true);
    try {
      const response = await fetch('http://localhost:3001/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomName: 'voice-chat-' + Date.now(),
          participantName: 'user-' + Math.random().toString(36).substring(7),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get token');
      }

      const data = await response.json();
      console.log('Server response:', data);
      setVoiceUrl(data.url);
      setVoiceToken(data.token);
    } catch (err) {
      console.error('Failed to connect to voice agent:', err);
      alert('Failed to connect to voice agent. Make sure the server is running.');
      setIsConnectingVoice(false);
    }
  };

  useEffect(() => {
    return () => {
      room.disconnect();
    };
  }, [room]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      {voiceToken ? (
        <AvatarStudio
          serverUrl={voiceUrl}
          token={voiceToken}
        />
      ) : (
        <div style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '48px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
            maxWidth: '450px',
            textAlign: 'center',
            border: '1px solid #e0e0e0'
          }}>
            <h2 style={{
              marginTop: 0,
              marginBottom: '16px',
              fontSize: '24px',
              fontWeight: 600,
              color: '#1a1a1a'
            }}>
              Start Video Call
            </h2>
            <p style={{
              marginBottom: '32px',
              color: '#666',
              fontSize: '15px',
              lineHeight: '1.5'
            }}>
              Connect with an AI-powered avatar for an interactive conversation experience.
            </p>

            <button
              onClick={handleVoiceConnect}
              disabled={isConnectingVoice}
              style={{
                width: '100%',
                padding: '16px 32px',
                background: isConnectingVoice ? '#ccc' : '#2d2d2d',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: isConnectingVoice ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!isConnectingVoice) {
                  e.currentTarget.style.background = '#3d3d3d';
                }
              }}
              onMouseLeave={(e) => {
                if (!isConnectingVoice) {
                  e.currentTarget.style.background = '#2d2d2d';
                }
              }}
            >
              {isConnectingVoice ? 'Connecting...' : 'Start Call'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
