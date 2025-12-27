import { useState, useEffect } from 'react';
import { Room } from 'livekit-client';
import { LiveAvatar } from './components/LiveAvatar';
import { AvatarTest } from './components/AvatarTest';
import { VoiceAgent } from './components/VoiceAgent';

type AppMode = 'test' | 'livekit' | 'voice';

function App() {
  const [mode, setMode] = useState<AppMode>('voice');
  const [room] = useState(() => new Room());
  const [isConnected, setIsConnected] = useState(false);
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [voiceUrl, setVoiceUrl] = useState('');
  const [voiceToken, setVoiceToken] = useState('');
  const [isConnectingVoice, setIsConnectingVoice] = useState(false);

  const handleConnect = async () => {
    try {
      await room.connect(url, token);
      setIsConnected(true);
    } catch (err) {
      console.error('Failed to connect:', err);
      alert('Failed to connect to room');
    }
  };

  const handleDisconnect = () => {
    room.disconnect();
    setIsConnected(false);
  };

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
      console.log('Token from server:', data.token);
      console.log('Token type:', typeof data.token);
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
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          marginBottom: '32px'
        }}>
          <button
            onClick={() => setMode('voice')}
            style={{
              padding: '10px 20px',
              background: mode === 'voice' ? 'white' : 'rgba(255,255,255,0.2)',
              color: mode === 'voice' ? '#667eea' : 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Voice AI
          </button>
          <button
            onClick={() => setMode('test')}
            style={{
              padding: '10px 20px',
              background: mode === 'test' ? 'white' : 'rgba(255,255,255,0.2)',
              color: mode === 'test' ? '#667eea' : 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Test Mode
          </button>
          <button
            onClick={() => setMode('livekit')}
            style={{
              padding: '10px 20px',
              background: mode === 'livekit' ? 'white' : 'rgba(255,255,255,0.2)',
              color: mode === 'livekit' ? '#667eea' : 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            LiveKit Mode
          </button>
        </div>

        <h1 style={{
          color: 'white',
          textAlign: 'center',
          marginBottom: '40px',
          fontSize: '3em',
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
        }}>
          Woman Talks - Live Avatar
        </h1>

        {mode === 'voice' ? (
          voiceToken ? (
            <VoiceAgent
              serverUrl={voiceUrl}
              token={voiceToken}
            />
          ) : (
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '40px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              maxWidth: '500px',
              margin: '0 auto'
            }}>
              <h2 style={{ marginTop: 0, marginBottom: '24px' }}>Voice AI Agent</h2>
              <p style={{ marginBottom: '24px', color: '#666' }}>
                Talk to an AI assistant with real-time voice conversation and animated avatar.
              </p>

              <button
                onClick={handleVoiceConnect}
                disabled={isConnectingVoice}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '18px',
                  fontWeight: 600,
                  cursor: isConnectingVoice ? 'not-allowed' : 'pointer',
                  opacity: isConnectingVoice ? 0.5 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {isConnectingVoice ? 'Connecting...' : 'Start Conversation'}
              </button>

              <div style={{
                marginTop: '24px',
                padding: '16px',
                background: '#f5f5f5',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#666'
              }}>
                <strong>Requirements:</strong>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                  <li>Token server running on port 3001</li>
                  <li>Python agent running and connected to LiveKit</li>
                  <li>Microphone access enabled</li>
                </ul>
              </div>
            </div>
          )
        ) : mode === 'test' ? (
          <AvatarTest />
        ) : !isConnected ? (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '40px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            maxWidth: '500px',
            margin: '0 auto'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '24px' }}>Connect to LiveKit</h2>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                Server URL
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="wss://your-livekit-server.com"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                Access Token
              </label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Your LiveKit token"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              onClick={handleConnect}
              disabled={!url || !token}
              style={{
                width: '100%',
                padding: '16px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: 600,
                cursor: url && token ? 'pointer' : 'not-allowed',
                opacity: url && token ? 1 : 0.5,
                transition: 'transform 0.2s',
              }}
              onMouseDown={(e) => {
                if (url && token) {
                  e.currentTarget.style.transform = 'scale(0.98)';
                }
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              Connect
            </button>

            <div style={{
              marginTop: '24px',
              padding: '16px',
              background: '#f5f5f5',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#666'
            }}>
              <strong>Note:</strong> You need a LiveKit server and access token.
              For testing, you can use the LiveKit Cloud or run a local server.
            </div>
          </div>
        ) : (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '40px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '32px'
            }}>
              <h2 style={{ margin: 0 }}>Your Live Avatar</h2>
              <button
                onClick={handleDisconnect}
                style={{
                  padding: '12px 24px',
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Disconnect
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px'
            }}>
              <div>
                <h3>Your Avatar</h3>
                <LiveAvatar
                  room={room}
                  enableLocalAudio={true}
                />
                <p style={{ marginTop: '16px', color: '#666', fontSize: '14px' }}>
                  Speak into your microphone to animate the avatar
                </p>
              </div>

              {room.remoteParticipants.size > 0 && (
                <div>
                  <h3>Remote Participants</h3>
                  {Array.from(room.remoteParticipants.values()).map((participant) => (
                    <div key={participant.sid} style={{ marginBottom: '24px' }}>
                      <h4>{participant.identity}</h4>
                      <LiveAvatar
                        room={room}
                        participant={participant}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{
          marginTop: '40px',
          textAlign: 'center',
          color: 'white',
          opacity: 0.8
        }}>
          <p>Built with React, TypeScript, and LiveKit</p>
        </div>
      </div>
    </div>
  );
}

export default App;
