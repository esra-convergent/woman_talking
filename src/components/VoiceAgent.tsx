import { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, RemoteParticipant, RemoteTrack, RemoteTrackPublication, Track, LocalParticipant } from 'livekit-client';

interface VoiceAgentProps {
  serverUrl: string;
  token: string;
}

interface EmotionData {
  type: 'emotion';
  emotion: string;
  source: 'user' | 'agent';
  text: string;
  timestamp: number;
  confidence: number;
}

export function VoiceAgent({
  serverUrl,
  token
}: VoiceAgentProps) {
  const [room] = useState(() => new Room());
  const [isConnected, setIsConnected] = useState(false);
  const [isAgentJoined, setIsAgentJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<string>('neutral');

  const videoRef = useRef<HTMLVideoElement>(null);
  const nextVideoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);

  // Emotion to video mapping
  const emotionVideos: Record<string, string> = {
    'neutral': '/emotions/neutral.mp4',
    'happy': '/emotions/happy.mp4',
    'sad': '/emotions/sad.mp4',
    'angry': '/emotions/angry.mp4',
    'surprised': '/emotions/surprised.mp4',
    'idle': '/emotions/idle.mp4',
    'thinking': '/emotions/idle.mp4', // Alias for idle
  };

  // Function to switch emotion with ULTRA FAST crossfade (barely visible)
  const switchEmotion = async (newEmotion: string) => {
    const currentVideo = videoRef.current;
    const nextVideo = nextVideoRef.current;

    if (!currentVideo || !nextVideo) return;

    const videoUrl = emotionVideos[newEmotion] || emotionVideos['neutral'];

    // Don't switch if already showing this emotion
    if (currentEmotion === newEmotion) {
      console.log(`🎭 Already showing ${newEmotion}, skipping`);
      return;
    }

    console.log(`🎭 Switching emotion: ${currentEmotion} → ${newEmotion}`);

    try {
      // Preload new video in background
      nextVideo.src = videoUrl;
      await nextVideo.play();

      // ULTRA FAST crossfade - 100ms (just enough to hide the cut)
      currentVideo.style.transition = 'opacity 0.1s linear';
      nextVideo.style.transition = 'opacity 0.1s linear';

      // Switch visibility instantly
      currentVideo.style.opacity = '0';
      nextVideo.style.opacity = '1';

      // After crossfade, swap videos
      setTimeout(() => {
        currentVideo.src = videoUrl;
        currentVideo.style.opacity = '1';
        currentVideo.play();
        nextVideo.style.opacity = '0';
        nextVideo.pause();
      }, 100); // 100ms - super fast!

      setCurrentEmotion(newEmotion);
    } catch (err) {
      console.error('Failed to switch emotion video:', err);
    }
  };

  // Initialize idle video playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      console.log('Video element not ready yet');
      return;
    }

    console.log('Setting up idle video animation');

    // Load initial emotion video
    video.src = emotionVideos['neutral'];

    // Ensure video plays on load
    video.play().catch(err => {
      console.error('Failed to autoplay video:', err);
      // User interaction might be needed to play
    });

    return () => {
      video.pause();
    };
  }, []);

  // Connect to LiveKit room
  useEffect(() => {
    const connect = async () => {
      try {
        console.log('Connecting to room...');
        console.log('Server URL:', serverUrl);
        console.log('Token type:', typeof token);
        console.log('Token value:', token);

        if (!token || typeof token !== 'string') {
          throw new Error('Invalid token received');
        }

        await room.connect(serverUrl, token, {
          autoSubscribe: true,
        });

        console.log('Connected to room:', room.name);
        setIsConnected(true);
        setError(null); // Clear any previous errors on successful connection

        // Enable microphone
        await room.localParticipant.setMicrophoneEnabled(true);
        console.log('Microphone enabled');

      } catch (err) {
        console.error('Failed to connect:', err);
        setError('Failed to connect to room');
      }
    };

    if (token) {
      connect();
    }

    return () => {
      room.disconnect();
    };
  }, [room, serverUrl, token]);

  // Monitor for agent participant joining
  useEffect(() => {
    if (!isConnected) return;

    const checkForAgent = () => {
      const participants = Array.from(room.remoteParticipants.values());
      const agent = participants.find(p =>
        p.identity.includes('agent') ||
        p.identity.includes('emotion-agent')
      );

      if (agent && !isAgentJoined) {
        console.log('Agent joined:', agent.identity);
        setIsAgentJoined(true);
      }
    };

    const handleParticipantConnected = (participant: RemoteParticipant) => {
      console.log('Participant connected:', participant.identity);
      checkForAgent();
    };

    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
    checkForAgent(); // Check immediately in case agent already joined

    return () => {
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
    };
  }, [isConnected, isAgentJoined, room]);

  // Listen for agent's audio and animate avatar
  useEffect(() => {
    if (!isConnected || !isAgentJoined) return;

    const handleTrackSubscribed = async (
      track: RemoteTrack,
      _publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) => {
      // Only process audio from the agent
      if (track.kind !== Track.Kind.Audio) return;
      if (!participant.identity.includes('agent') && !participant.identity.includes('emotion-agent')) return;

      console.log('Subscribed to agent audio track');

      // Get the MediaStreamTrack from the RemoteAudioTrack
      const mediaStreamTrack = track.mediaStreamTrack;
      if (!mediaStreamTrack) {
        console.error('❌ No MediaStreamTrack available');
        return;
      }

      // Create MediaStream from the track
      const mediaStream = new MediaStream([mediaStreamTrack]);
      console.log('✅ MediaStream created from track');

      // Create audio element for playback
      const audioElement = new Audio();
      audioElement.srcObject = mediaStream;
      audioElement.autoplay = true;
      audioElement.play().then(() => {
        console.log('✅ Audio element playing');
      }).catch(err => {
        console.error('❌ Audio play failed:', err);
      });
      document.body.appendChild(audioElement);

      // Create audio context for analysis
      const audioContext = new AudioContext();
      console.log('Audio context state:', audioContext.state);

      // Resume audio context if suspended
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          console.log('✅ Audio context resumed');
        });
      }

      // Create source from the MediaStream (NOT the audio element)
      const source = audioContext.createMediaStreamSource(mediaStream);
      const analyser = audioContext.createAnalyser();

      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      // Note: We don't connect to destination because the audio element handles playback

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      console.log('✅ Audio analyser setup complete');

      // Analyze audio to detect when agent is speaking
      let frameCount = 0;
      const analyzeAudio = () => {
        frameCount++;

        if (!analyserRef.current) {
          console.error('❌ No analyser reference!');
          return;
        }

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Check if audio is playing (volume above threshold)
        const volume = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
        const isCurrentlySpeaking = volume > 5;
        setIsSpeaking(isCurrentlySpeaking);

        // Log volume every 60 frames to see if we're getting audio data
        if (frameCount % 60 === 0) {
          console.log('📈 Current volume:', volume.toFixed(2), 'Speaking:', isCurrentlySpeaking);
        }

        animationFrameRef.current = requestAnimationFrame(analyzeAudio);
      };

      console.log('🚀 Starting audio analysis for speaking detection...');
      analyzeAudio();
    };

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);

    return () => {
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [isConnected, isAgentJoined, room]);

  // Listen for emotion updates from agent via participant attributes
  useEffect(() => {
    if (!isConnected || !isAgentJoined) return;

    const handleAttributesChanged = (
      changedAttributes: Record<string, string>,
      participant: RemoteParticipant | LocalParticipant
    ) => {
      // Only process from remote agent participants
      if (participant instanceof LocalParticipant) return;
      if (!participant.identity.includes('agent') && !participant.identity.includes('emotion-agent')) return;

      if (changedAttributes.emotion) {
        try {
          const emotionData: EmotionData = JSON.parse(changedAttributes.emotion);
          console.log('🎭 Received emotion from agent:', emotionData.emotion);

          // Switch to appropriate emotion video
          switchEmotion(emotionData.emotion.toLowerCase());
        } catch (err) {
          console.error('Failed to parse emotion data:', err);
        }
      }
    };

    room.on(RoomEvent.ParticipantAttributesChanged, handleAttributesChanged);

    return () => {
      room.off(RoomEvent.ParticipantAttributesChanged, handleAttributesChanged);
    };
  }, [isConnected, isAgentJoined, room]);

  const handleDisconnect = () => {
    room.disconnect();
    setIsConnected(false);
    setIsAgentJoined(false);
  };

  if (error) {
    return (
      <div style={{
        padding: '20px',
        background: '#fee',
        border: '1px solid #f66',
        borderRadius: '8px',
        color: '#c33'
      }}>
        Error: {error}
      </div>
    );
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '40px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px'
      }}>
        <div>
          <h2 style={{ margin: 0 }}>Voice AI Agent</h2>
          <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '14px' }}>
            {!isConnected ? 'Connecting...' :
             !isAgentJoined ? 'Waiting for agent...' :
             'Agent ready - speak to interact'}
          </p>
        </div>
        {isConnected && (
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
        )}
      </div>

      <div style={{
        background: '#f5f5f5',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        position: 'relative'
      }}>
        {/* Main video element */}
        <video
          ref={videoRef}
          loop
          muted
          playsInline
          autoPlay
          style={{
            maxWidth: '100%',
            height: 'auto',
            opacity: isAgentJoined ? 1 : 0.5,
            borderRadius: '12px',
            position: 'relative',
            zIndex: 1
          }}
        />

        {/* Second video for ultra-fast crossfade */}
        <video
          ref={nextVideoRef}
          loop
          muted
          playsInline
          style={{
            maxWidth: '100%',
            height: 'auto',
            borderRadius: '12px',
            position: 'absolute',
            top: 0,
            left: 0,
            opacity: 0,
            zIndex: 0
          }}
        />

        {/* Emotion indicator - very subtle, only for debugging */}
        {/* Remove this div entirely if you don't want to see emotion labels */}
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'rgba(0, 0, 0, 0.3)',
          color: 'rgba(255, 255, 255, 0.6)',
          padding: '4px 10px',
          borderRadius: '12px',
          fontSize: '10px',
          fontWeight: 500,
          textTransform: 'capitalize',
          opacity: 0.5,
          pointerEvents: 'none'
        }}>
          {currentEmotion}
        </div>

        {isSpeaking && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(102, 126, 234, 0.9)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: 600
          }}>
            🎤 Speaking...
          </div>
        )}
      </div>

      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: isAgentJoined ? '#e8f5e9' : '#fff3e0',
        borderRadius: '8px',
        fontSize: '14px'
      }}>
        <strong>Status:</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li>Room: {isConnected ? '✅ Connected' : '⏳ Connecting...'}</li>
          <li>Agent: {isAgentJoined ? '✅ Active' : '⏳ Waiting...'}</li>
          <li>Microphone: {isConnected ? '✅ Enabled' : '⏳ Pending'}</li>
        </ul>
        {isAgentJoined && (
          <p style={{ margin: '12px 0 0 0', fontStyle: 'italic' }}>
            Start speaking to have a conversation with the AI agent!
          </p>
        )}
      </div>
    </div>
  );
}
