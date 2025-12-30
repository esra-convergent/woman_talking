import { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, RemoteParticipant, RemoteTrack, RemoteTrackPublication, Track, LocalParticipant } from 'livekit-client';

interface VoiceAgentCrossfadeProps {
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

export function VoiceAgentCrossfade({
  serverUrl,
  token
}: VoiceAgentCrossfadeProps) {
  const [room] = useState(() => new Room());
  const [isConnected, setIsConnected] = useState(false);
  const [isAgentJoined, setIsAgentJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<string>('neutral');

  // Dual video layer refs for crossfade
  const videoLayer1Ref = useRef<HTMLVideoElement>(null);
  const videoLayer2Ref = useRef<HTMLVideoElement>(null);
  const activeLayerRef = useRef<1 | 2>(1); // Track which layer is currently visible

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

  // Transition modes - Near-instant crossfade: 20ms (imperceptible to human eye)
  const CROSSFADE_DURATION = 10; // milliseconds - effectively instant
  const USE_INSTANT_CUT = false; // Set to true for instant cuts instead of crossfade

  // Preload all emotion videos on component mount
  useEffect(() => {
    console.log('🎬 Preloading emotion videos...');
    const preloadPromises = Object.entries(emotionVideos).map(([emotion, url]) => {
      return new Promise((resolve) => {
        const video = document.createElement('video');
        video.src = url;
        video.preload = 'auto';
        video.addEventListener('loadeddata', () => {
          console.log(`✅ Preloaded: ${emotion}`);
          resolve(null);
        });
        video.addEventListener('error', () => {
          console.warn(`⚠️ Failed to preload: ${emotion}`);
          resolve(null);
        });
      });
    });

    Promise.all(preloadPromises).then(() => {
      console.log('✅ All emotion videos preloaded');
    });
  }, []);

  // Function to switch emotion using ultra-fast crossfade with frame sync
  const switchEmotion = (newEmotion: string) => {
    const layer1 = videoLayer1Ref.current;
    const layer2 = videoLayer2Ref.current;

    if (!layer1 || !layer2) return;

    // Don't switch if already showing this emotion
    if (currentEmotion === newEmotion) {
      console.log(`🎭 Already showing ${newEmotion}, skipping`);
      return;
    }

    console.log(`🎭 Crossfading: ${currentEmotion} → ${newEmotion}`);

    // Get the inactive layer (the one we'll fade in)
    const activeLayer = activeLayerRef.current;
    const inactiveLayer = activeLayer === 1 ? layer2 : layer1;
    const activeVideo = activeLayer === 1 ? layer1 : layer2;

    // Set up the inactive layer with new emotion video
    const newVideoUrl = emotionVideos[newEmotion] || emotionVideos['neutral'];
    inactiveLayer.src = newVideoUrl;

    // FRAME SYNC: Try to match the current playback position for smoother transition
    // If current video is at 2.3s and duration is 5s, start new video at ~2.3s too
    const currentProgress = activeVideo.currentTime / activeVideo.duration;

    // Wait for metadata to load so we can set currentTime
    const handleLoadedMetadata = () => {
      // Start new video at similar position in its loop
      const syncedTime = currentProgress * inactiveLayer.duration;
      inactiveLayer.currentTime = syncedTime;

      console.log(`⏱️ Frame sync: ${activeVideo.currentTime.toFixed(2)}s → ${syncedTime.toFixed(2)}s`);

      // Start playing the new video (it's still invisible)
      inactiveLayer.play().then(() => {
        console.log(`✅ New video playing: ${newEmotion}`);

        // Apply transition (instant cut or crossfade)
        if (USE_INSTANT_CUT) {
          // INSTANT CUT: No fade, just swap
          if (activeLayer === 1) {
            layer1.style.transition = 'none';
            layer2.style.transition = 'none';
            layer1.style.opacity = '0';
            layer2.style.opacity = '1';
            activeLayerRef.current = 2;
          } else {
            layer1.style.transition = 'none';
            layer2.style.transition = 'none';
            layer2.style.opacity = '0';
            layer1.style.opacity = '1';
            activeLayerRef.current = 1;
          }
        } else {
          // ULTRA-FAST CROSSFADE
          if (activeLayer === 1) {
            layer1.style.opacity = '0';
            layer2.style.opacity = '1';
            activeLayerRef.current = 2;
          } else {
            layer2.style.opacity = '0';
            layer1.style.opacity = '1';
            activeLayerRef.current = 1;
          }
        }

        // Update state
        setCurrentEmotion(newEmotion);

        // After transition completes, pause the now-hidden video to save resources
        setTimeout(() => {
          activeVideo.pause();
        }, CROSSFADE_DURATION);
      }).catch(err => {
        console.error('Failed to play new video:', err);
      });
    };

    // Listen for metadata to be loaded
    if (inactiveLayer.readyState >= 1) {
      // Metadata already loaded
      handleLoadedMetadata();
    } else {
      inactiveLayer.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
    }
  };

  // Initialize first video on layer 1
  useEffect(() => {
    const layer1 = videoLayer1Ref.current;
    if (!layer1) return;

    console.log('Setting up initial video on layer 1');
    layer1.src = emotionVideos['neutral'];
    layer1.play().catch(err => {
      console.error('Failed to autoplay initial video:', err);
    });
  }, []);

  // Connect to LiveKit room
  useEffect(() => {
    const connect = async () => {
      try {
        console.log('Connecting to room...');
        console.log('Server URL:', serverUrl);
        console.log('Token type:', typeof token);

        if (!token || typeof token !== 'string') {
          throw new Error('Invalid token received');
        }

        await room.connect(serverUrl, token, {
          autoSubscribe: true,
        });

        console.log('Connected to room:', room.name);
        setIsConnected(true);
        setError(null);

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
    checkForAgent();

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
      if (track.kind !== Track.Kind.Audio) return;
      if (!participant.identity.includes('agent') && !participant.identity.includes('emotion-agent')) return;

      console.log('Subscribed to agent audio track');

      const mediaStreamTrack = track.mediaStreamTrack;
      if (!mediaStreamTrack) {
        console.error('❌ No MediaStreamTrack available');
        return;
      }

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

      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          console.log('✅ Audio context resumed');
        });
      }

      const source = audioContext.createMediaStreamSource(mediaStream);
      const analyser = audioContext.createAnalyser();

      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

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

        const volume = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
        const isCurrentlySpeaking = volume > 5;
        setIsSpeaking(isCurrentlySpeaking);

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

  // Listen for emotion updates from agent
  useEffect(() => {
    if (!isConnected || !isAgentJoined) return;

    const handleAttributesChanged = (
      changedAttributes: Record<string, string>,
      participant: RemoteParticipant | LocalParticipant
    ) => {
      if (participant instanceof LocalParticipant) return;
      if (!participant.identity.includes('agent') && !participant.identity.includes('emotion-agent')) return;

      if (changedAttributes.emotion) {
        try {
          const emotionData: EmotionData = JSON.parse(changedAttributes.emotion);
          console.log('🎭 Received emotion from agent:', emotionData.emotion);

          // Switch to appropriate emotion video with crossfade
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
          <h2 style={{ margin: 0 }}>Voice AI Agent (Crossfade)</h2>
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
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Dual video layer system for crossfade */}
        <video
          ref={videoLayer1Ref}
          loop
          muted
          playsInline
          autoPlay
          style={{
            position: 'absolute',
            maxWidth: '100%',
            height: 'auto',
            borderRadius: '12px',
            opacity: 1,
            transition: `opacity ${CROSSFADE_DURATION}ms ease-in-out`,
            zIndex: 2
          }}
        />
        <video
          ref={videoLayer2Ref}
          loop
          muted
          playsInline
          style={{
            position: 'absolute',
            maxWidth: '100%',
            height: 'auto',
            borderRadius: '12px',
            opacity: 0,
            transition: `opacity ${CROSSFADE_DURATION}ms ease-in-out`,
            zIndex: 1
          }}
        />

        {/* Emotion indicator */}
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
          pointerEvents: 'none',
          zIndex: 3
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
            fontWeight: 600,
            zIndex: 3
          }}>
            🎤 Speaking...
          </div>
        )}
      </div>

      {/* Manual emotion test controls */}
      <div style={{
        marginTop: '16px',
        padding: '16px',
        background: '#f5f5f5',
        borderRadius: '8px'
      }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600 }}>
          Test Emotions (Manual Controls)
        </h4>
        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          {['neutral', 'happy', 'sad', 'angry', 'surprised', 'idle'].map((emotion) => (
            <button
              key={emotion}
              onClick={() => switchEmotion(emotion)}
              style={{
                padding: '8px 16px',
                background: currentEmotion === emotion ? '#667eea' : 'white',
                color: currentEmotion === emotion ? 'white' : '#333',
                border: '2px solid #667eea',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.2s'
              }}
            >
              {emotion}
            </button>
          ))}
        </div>
        <p style={{ margin: '12px 0 0 0', fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
          Click buttons to test {CROSSFADE_DURATION}ms crossfade transitions with frame sync
        </p>
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
          <li>Transition: ✅ Smooth crossfade ({CROSSFADE_DURATION}ms)</li>
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
