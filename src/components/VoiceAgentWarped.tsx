import { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, RemoteParticipant, RemoteTrack, RemoteTrackPublication, Track, LocalParticipant } from 'livekit-client';
import { LandmarkExtractor } from '../lib/landmarkExtractor';
import { EmotionDeltaManager, loadEmotionDeltasFromCache, saveEmotionDeltasToCache } from '../lib/emotionDeltas';
import { ImageWarper } from '../lib/imageWarper';
import type { FaceLandmark } from '../lib/landmarkExtractor';

interface VoiceAgentWarpedProps {
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

export function VoiceAgentWarped({
  serverUrl,
  token
}: VoiceAgentWarpedProps) {
  const [room] = useState(() => new Room());
  const [isConnected, setIsConnected] = useState(false);
  const [isAgentJoined, setIsAgentJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<string>('neutral');
  const [isInitialized, setIsInitialized] = useState(false);
  const [initProgress, setInitProgress] = useState<string>('Initializing...');

  // Refs for video and rendering
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);

  // Landmark warping refs
  const landmarkExtractorRef = useRef<LandmarkExtractor | null>(null);
  const deltaManagerRef = useRef<EmotionDeltaManager | null>(null);
  const imageWarperRef = useRef<ImageWarper | null>(null);
  const neutralLandmarksRef = useRef<FaceLandmark[] | null>(null);
  const targetEmotionRef = useRef<string>('neutral');
  const transitionProgressRef = useRef<number>(1.0);

  // Emotion video paths
  const emotionVideos: Record<string, string> = {
    'neutral': '/emotions/neutral.mp4',
    'happy': '/emotions/happy.mp4',
    'sad': '/emotions/sad.mp4',
    'angry': '/emotions/angry.mp4',
    'surprised': '/emotions/surprised.mp4',
    'idle': '/emotions/idle.mp4',
  };

  // Initialize landmark warping system
  useEffect(() => {
    const initializeWarping = async () => {
      try {
        setInitProgress('Loading landmark extractor...');

        // Initialize systems
        const extractor = new LandmarkExtractor();
        const deltaManager = new EmotionDeltaManager();

        landmarkExtractorRef.current = extractor;
        deltaManagerRef.current = deltaManager;

        // Try to load cached deltas
        setInitProgress('Loading emotion deltas from cache...');
        const cachedDeltas = loadEmotionDeltasFromCache();

        if (cachedDeltas && Object.keys(cachedDeltas).length > 0) {
          deltaManager.importDeltas(cachedDeltas);
          console.log('✅ Loaded emotion deltas from cache');
          setInitProgress('Loaded cached emotion data');

          // CRITICAL: Still need to extract neutral landmarks even when using cache!
          setInitProgress('Extracting neutral landmarks...');
          await extractNeutralLandmarks(extractor, deltaManager);
        } else {
          setInitProgress('Calculating emotion deltas (this may take a moment)...');

          // Extract landmarks from emotion videos
          await extractEmotionDeltas(extractor, deltaManager);

          // Save to cache
          const deltas = deltaManager.exportDeltas();
          saveEmotionDeltasToCache(deltas);
        }

        setInitProgress('Ready!');
        setIsInitialized(true);
        console.log('✅ Warping system initialized');

      } catch (err) {
        console.error('Failed to initialize warping system:', err);
        setError('Failed to initialize face warping system');
      }
    };

    initializeWarping();

    return () => {
      landmarkExtractorRef.current?.dispose();
      deltaManagerRef.current?.dispose();
    };
  }, []);

  // Extract only neutral landmarks (used when loading from cache)
  const extractNeutralLandmarks = async (
    extractor: LandmarkExtractor,
    deltaManager: EmotionDeltaManager
  ) => {
    const neutralVideo = document.createElement('video');
    neutralVideo.src = emotionVideos.neutral;
    neutralVideo.crossOrigin = 'anonymous';

    await new Promise<void>((resolve) => {
      neutralVideo.onloadeddata = () => resolve();
      neutralVideo.load();
    });

    console.log('📊 Extracting neutral landmarks...');
    const neutralResult = await extractor.extractFromVideoAtTime(neutralVideo, 1.0);

    if (!neutralResult) {
      throw new Error('Failed to extract neutral landmarks');
    }

    deltaManager.setNeutralLandmarks(neutralResult.landmarks);
    neutralLandmarksRef.current = neutralResult.landmarks;
    console.log('✅ Neutral landmarks extracted:', neutralResult.landmarks.length, 'points');
  };

  // Extract emotion deltas from videos
  const extractEmotionDeltas = async (
    extractor: LandmarkExtractor,
    deltaManager: EmotionDeltaManager
  ) => {
    // First, extract neutral landmarks
    await extractNeutralLandmarks(extractor, deltaManager);

    // Extract deltas for each emotion
    const emotions = ['happy', 'sad', 'angry', 'surprised'];

    for (const emotion of emotions) {
      console.log(`📊 Extracting ${emotion} landmarks...`);
      setInitProgress(`Analyzing ${emotion} emotion...`);

      const emotionVideo = document.createElement('video');
      emotionVideo.src = emotionVideos[emotion];
      emotionVideo.crossOrigin = 'anonymous';

      await new Promise<void>((resolve) => {
        emotionVideo.onloadeddata = () => resolve();
        emotionVideo.load();
      });

      await deltaManager.extractAndCalculateDeltas(emotionVideo, emotion, 2.5);
    }

    console.log('✅ All emotion deltas extracted');
  };

  // Render loop: warp video frames in real-time
  useEffect(() => {
    if (!isInitialized) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize image warper
    const warper = new ImageWarper(canvas.width, canvas.height);
    imageWarperRef.current = warper;

    let lastTime = 0;
    const targetFPS = 30; // Lower FPS for performance
    const frameInterval = 1000 / targetFPS;

    const renderLoop = (currentTime: number) => {
      const elapsed = currentTime - lastTime;

      if (elapsed > frameInterval) {
        lastTime = currentTime - (elapsed % frameInterval);

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          const deltaManager = deltaManagerRef.current;

          // Debug: Log state occasionally
          if (Math.random() < 0.01) {
            console.log('🔍 Render state:', {
              deltaManagerExists: !!deltaManager,
              neutralLandmarksExist: !!neutralLandmarksRef.current,
              neutralLandmarkCount: neutralLandmarksRef.current?.length,
              targetEmotion: targetEmotionRef.current,
              transitionProgress: transitionProgressRef.current
            });
          }

          // Use pre-extracted neutral landmarks (no real-time detection)
          if (deltaManager && neutralLandmarksRef.current) {
            try {
              // Get target emotion deltas
              const targetEmotion = targetEmotionRef.current;

              // Special case: neutral = no warping, just show video
              if (targetEmotion === 'neutral') {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              } else {
                const deltas = deltaManager.getDeltas(targetEmotion);

                // Debug: Log delta retrieval
                if (Math.random() < 0.05) {
                  console.log('📊 Delta check:', {
                    targetEmotion,
                    deltasExist: !!deltas,
                    deltaCount: deltas?.length,
                    neutralCount: neutralLandmarksRef.current.length
                  });
                }

                if (deltas && deltas.length === neutralLandmarksRef.current.length) {
                  // Smooth transition animation
                  const transitionSpeed = 0.08;
                  if (transitionProgressRef.current < 1.0) {
                    transitionProgressRef.current = Math.min(
                      1.0,
                      transitionProgressRef.current + transitionSpeed
                    );
                  }

                  // Apply deltas to neutral landmarks to get target
                  const targetLandmarks = deltaManager.applyDeltas(
                    neutralLandmarksRef.current,
                    deltas,
                    transitionProgressRef.current // Use transition progress for smooth interpolation
                  );

                  // Debug: Log warping info occasionally
                  if (Math.random() < 0.01) { // Log ~1% of frames
                    console.log('🔧 Warping frame:', {
                      emotion: targetEmotion,
                      transitionProgress: transitionProgressRef.current.toFixed(2),
                      neutralLandmarkCount: neutralLandmarksRef.current.length,
                      targetLandmarkCount: targetLandmarks.length,
                      sampleDelta: {
                        x: (targetLandmarks[0].x - neutralLandmarksRef.current[0].x).toFixed(4),
                        y: (targetLandmarks[0].y - neutralLandmarksRef.current[0].y).toFixed(4)
                      }
                    });
                  }

                  // Warp the frame (from neutral to target)
                  const warpedCanvas = warper.warpFrame(
                    video,
                    neutralLandmarksRef.current,
                    targetLandmarks,
                    1.0 // Always at full strength since we're interpolating in applyDeltas
                  );

                  // Draw to display canvas
                  ctx.clearRect(0, 0, canvas.width, canvas.height);
                  ctx.drawImage(warpedCanvas, 0, 0);
                } else {
                  // No valid deltas, draw original video
                  ctx.clearRect(0, 0, canvas.width, canvas.height);
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                }
              }
            } catch (err) {
              console.error('Warping error:', err);
              // Fallback to original video on error
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            }
          } else {
            // Not initialized yet, draw original video
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    // Start render loop
    animationFrameRef.current = requestAnimationFrame(renderLoop);

    // Load and play neutral video
    video.src = emotionVideos.neutral;
    video.play().catch(err => {
      console.error('Failed to autoplay video:', err);
    });

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isInitialized]);

  // Handle emotion changes
  const switchEmotion = (newEmotion: string) => {
    console.log(`🎭 switchEmotion called with: "${newEmotion}"`);
    console.log(`   Current emotion: "${currentEmotion}"`);
    console.log(`   Delta manager exists:`, !!deltaManagerRef.current);
    console.log(`   Available emotions:`, deltaManagerRef.current?.getAvailableEmotions());

    // Special case: neutral has no deltas (it's the baseline)
    if (newEmotion === 'neutral') {
      console.log(`✅ Switching to neutral (baseline, no deltas)`);
      targetEmotionRef.current = 'neutral';
      transitionProgressRef.current = 0;
      setCurrentEmotion(newEmotion);
      return;
    }

    if (!deltaManagerRef.current?.hasDeltas(newEmotion)) {
      console.warn(`❌ No deltas available for emotion: ${newEmotion}`);
      return;
    }

    console.log(`✅ Switching emotion: ${currentEmotion} → ${newEmotion}`);
    targetEmotionRef.current = newEmotion;
    transitionProgressRef.current = 0; // Start transition animation
    setCurrentEmotion(newEmotion);
  };

  // Connect to LiveKit room (same as original)
  useEffect(() => {
    const connect = async () => {
      try {
        console.log('Connecting to room...');

        if (!token || typeof token !== 'string') {
          throw new Error('Invalid token received');
        }

        await room.connect(serverUrl, token, {
          autoSubscribe: true,
        });

        console.log('Connected to room:', room.name);
        setIsConnected(true);
        setError(null);

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

  // Listen for agent's audio (same as original)
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
      if (!mediaStreamTrack) return;

      const mediaStream = new MediaStream([mediaStreamTrack]);

      const audioElement = new Audio();
      audioElement.srcObject = mediaStream;
      audioElement.autoplay = true;
      audioElement.play().catch(err => {
        console.error('❌ Audio play failed:', err);
      });
      document.body.appendChild(audioElement);

      const audioContext = new AudioContext();
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const source = audioContext.createMediaStreamSource(mediaStream);
      const analyser = audioContext.createAnalyser();

      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      let frameCount = 0;
      const analyzeAudio = () => {
        frameCount++;

        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        const volume = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
        const isCurrentlySpeaking = volume > 5;
        setIsSpeaking(isCurrentlySpeaking);

        if (frameCount % 60 === 0) {
          console.log('📈 Current volume:', volume.toFixed(2), 'Speaking:', isCurrentlySpeaking);
        }

        requestAnimationFrame(analyzeAudio);
      };

      analyzeAudio();
    };

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);

    return () => {
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
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

      console.log('🔔 Participant attributes changed:', changedAttributes);

      if (changedAttributes.emotion) {
        try {
          const emotionData: EmotionData = JSON.parse(changedAttributes.emotion);
          console.log('🎭 Received emotion from agent:', emotionData.emotion);
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
  }, [isConnected, isAgentJoined, room, currentEmotion]);

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
          <h2 style={{ margin: 0 }}>Voice AI Agent (Landmark Warping)</h2>
          <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '14px' }}>
            {!isInitialized ? initProgress :
             !isConnected ? 'Connecting...' :
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
        {/* Hidden video element - source for warping */}
        <video
          ref={videoRef}
          loop
          muted
          playsInline
          autoPlay
          style={{ display: 'none' }}
        />

        {/* Canvas - displays warped frames */}
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          style={{
            maxWidth: '100%',
            height: 'auto',
            opacity: isInitialized && isAgentJoined ? 1 : 0.5,
            borderRadius: '12px',
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
            Speaking...
          </div>
        )}
      </div>

      {/* Manual emotion test controls */}
      {isInitialized && (
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
            {['neutral', 'happy', 'sad', 'angry', 'surprised'].map((emotion) => (
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
        </div>
      )}

      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: isAgentJoined ? '#e8f5e9' : '#fff3e0',
        borderRadius: '8px',
        fontSize: '14px'
      }}>
        <strong>Status:</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li>Warping: {isInitialized ? '✅ Ready' : '⏳ Initializing...'}</li>
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
