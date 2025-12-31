import { useState, useRef, useEffect } from 'react';
import { Room, RoomEvent, RemoteParticipant, RemoteTrack, RemoteTrackPublication, Track, LocalParticipant } from 'livekit-client';
import { KeywordEmotionAnalyzer } from '../lib/keywordEmotionAnalyzer';

type EmotionMode = 'happy' | 'sad' | 'angry' | 'surprised' | 'neutral';

interface AvatarStudioProps {
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

export function AvatarStudio({ serverUrl, token }: AvatarStudioProps) {
  const [selectedMode, setSelectedMode] = useState<EmotionMode>('neutral');
  const [moodIntensity, setMoodIntensity] = useState<number>(50);
  const [currentEmotion, setCurrentEmotion] = useState<EmotionMode>('neutral');
  const [isConnected, setIsConnected] = useState(false);
  const [isAgentJoined, setIsAgentJoined] = useState(false);
  const [mlModelReady, setMlModelReady] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sessionStart] = useState(Date.now());
  const [showEmotionPanel, setShowEmotionPanel] = useState(false);
  const [mlEmotionData, setMlEmotionData] = useState<{ emotion: string; confidence: number } | null>(null);

  const [room] = useState(() => new Room());
  const videoLayer1Ref = useRef<HTMLVideoElement>(null);
  const videoLayer2Ref = useRef<HTMLVideoElement>(null);
  const activeLayerRef = useRef<1 | 2>(1);
  const emotionAnalyzerRef = useRef<KeywordEmotionAnalyzer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasPlayedHappyOnceRef = useRef<boolean>(false);
  const pendingEmotionRef = useRef<EmotionMode | null>(null);

  const emotionModes: { mode: EmotionMode; label: string; color: string }[] = [
    { mode: 'neutral', label: 'Neutral', color: '#6B7280' },
    { mode: 'happy', label: 'Happy', color: '#10B981' },
    { mode: 'sad', label: 'Sad', color: '#3B82F6' },
    { mode: 'angry', label: 'Angry', color: '#EF4444' },
    { mode: 'surprised', label: 'Surprised', color: '#F59E0B' }
  ];

  // Emotion to video mapping - idle (not talking) versions
  const emotionVideos: Record<string, string> = {
    'neutral': '/emotions/neutral.mp4',
    'happy': '/emotions/happy.mp4',
    'happy2': '/emotions/happy2.mp4', // Loop video for happy
    'sad': '/emotions/sad.mp4',
    'angry': '/emotions/angry.mp4',
    'surprised': '/emotions/surprised.mp4',
  };

  // Talking versions (mouth moving)
  // For now, all emotions use neutral-talking.mp4 when speaking
  const emotionVideosTalking: Record<string, string> = {
    'neutral': '/emotions/neutral-talking.mp4',
    'happy': '/emotions/neutral-talking.mp4', // TODO: Add happy-talking.mp4
    'happy2': '/emotions/neutral-talking.mp4', // TODO: Add happy2-talking.mp4
    'sad': '/emotions/neutral-talking.mp4', // TODO: Add sad-talking.mp4
    'angry': '/emotions/neutral-talking.mp4', // TODO: Add angry-talking.mp4
    'surprised': '/emotions/neutral-talking.mp4', // TODO: Add surprised-talking.mp4
  };

  const CROSSFADE_DURATION = 5; // milliseconds - same as VoiceAgentCrossfade

  // Initialize keyword-based emotion analyzer
  useEffect(() => {
    console.log('🔍 Initializing keyword-based emotion analyzer...');
    const analyzer = new KeywordEmotionAnalyzer();
    analyzer.initialize();
    emotionAnalyzerRef.current = analyzer;
    setMlModelReady(true);
    console.log('✅ Keyword emotion analyzer ready');
  }, []);

  // Preload all emotion videos
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

  // Function to switch emotion using crossfade (same as VoiceAgentCrossfade)
  const switchEmotion = (newEmotion: string) => {
    const layer1 = videoLayer1Ref.current;
    const layer2 = videoLayer2Ref.current;

    if (!layer1 || !layer2) return;

    // Don't switch if already showing this emotion
    if (currentEmotion === newEmotion) {
      return;
    }

    // Reset happy sequence when switching away from happy
    if (currentEmotion === 'happy' && newEmotion !== 'happy') {
      hasPlayedHappyOnceRef.current = false;
    }

    console.log(`🎭 Crossfading: ${currentEmotion} → ${newEmotion} (speaking: ${isSpeakingRef.current})`);

    // Get the inactive layer
    const activeLayer = activeLayerRef.current;
    const inactiveLayer = activeLayer === 1 ? layer2 : layer1;
    const activeVideo = activeLayer === 1 ? layer1 : layer2;

    // Set up the inactive layer with new emotion video
    // Use talking version if currently speaking, otherwise use idle version
    const videoMap = isSpeakingRef.current ? emotionVideosTalking : emotionVideos;

    // For happy emotion, use happy2.mp4 if happy.mp4 has already played once
    let videoKey = newEmotion;
    if (newEmotion === 'happy' && hasPlayedHappyOnceRef.current) {
      videoKey = 'happy2';
    }

    const newVideoUrl = videoMap[videoKey] || emotionVideos['neutral'];

    inactiveLayer.src = newVideoUrl;

    // Frame sync
    const currentProgress = activeVideo.currentTime / activeVideo.duration;

    const handleLoadedMetadata = () => {
      // For emotion videos (not neutral or neutral-talking), start from 1 second
      // to skip the neutral transition at the beginning
      let syncedTime = currentProgress * inactiveLayer.duration;

      if (newEmotion !== 'neutral' && !newVideoUrl.includes('neutral-talking')) {
        // Emotion videos start showing the actual emotion at specific times
        // Happy starts at 3s, happy2 starts at 2s, others at 1s to skip neutral transition
        let emotionStartTime = 1.0;
        if (newEmotion === 'happy' && newVideoUrl.includes('happy2.mp4')) {
          emotionStartTime = 2.0; // happy2 starts at 2s
        } else if (newEmotion === 'happy') {
          emotionStartTime = 3.0; // happy.mp4 needs to skip to 3s
        }
        const emotionDuration = inactiveLayer.duration - emotionStartTime;
        syncedTime = emotionStartTime + (currentProgress * emotionDuration);
        console.log(`⏱️ ${newEmotion} (${videoKey}) start: ${emotionStartTime}s, progress: ${currentProgress.toFixed(2)}, final: ${syncedTime.toFixed(2)}s`);
      }

      inactiveLayer.currentTime = syncedTime;

      // Set loop property: happy.mp4 should NOT loop, happy2.mp4 SHOULD loop
      if (newVideoUrl.includes('happy.mp4') && !newVideoUrl.includes('happy2.mp4')) {
        inactiveLayer.loop = false;
      } else {
        inactiveLayer.loop = true;
      }

      inactiveLayer.play().then(() => {
        // Ultra-fast crossfade
        if (activeLayer === 1) {
          layer1.style.opacity = '0';
          layer2.style.opacity = '1';
          activeLayerRef.current = 2;
        } else {
          layer2.style.opacity = '0';
          layer1.style.opacity = '1';
          activeLayerRef.current = 1;
        }

        setCurrentEmotion(newEmotion as EmotionMode);

        // Pause the hidden video
        setTimeout(() => {
          activeVideo.pause();
        }, CROSSFADE_DURATION);
      }).catch(err => {
        console.error('Failed to play new video:', err);
      });
    };

    if (inactiveLayer.readyState >= 1) {
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

    // Set initial playback position (neutral starts at 0)
    layer1.addEventListener('loadedmetadata', () => {
      layer1.currentTime = 0;
      layer1.play().catch(err => {
        console.error('Failed to autoplay initial video:', err);
      });
    }, { once: true });
  }, []);

  // Monitor video playback and switch happy.mp4 to happy2.mp4 after first play
  useEffect(() => {
    const layer1 = videoLayer1Ref.current;
    const layer2 = videoLayer2Ref.current;
    if (!layer1 || !layer2) return;

    const handleVideoEnded = (event: Event) => {
      const video = event.target as HTMLVideoElement;

      // Check if the video that ended is happy.mp4
      if (video.src.includes('happy.mp4') && !video.src.includes('happy2.mp4')) {
        console.log('🎬 happy.mp4 finished, switching to happy2.mp4 for looping');
        hasPlayedHappyOnceRef.current = true;

        // Directly load happy2.mp4 on the same video element
        video.src = emotionVideos['happy2'];
        video.loop = true; // Enable looping for happy2

        video.addEventListener('loadedmetadata', () => {
          // Start happy2 at 2 seconds
          video.currentTime = 1.0;
          video.play().catch(err => {
            console.error('Failed to play happy2:', err);
          });
        }, { once: true });
      }
    };

    // Ensure happy2 always loops from 2 seconds, not from 0
    const handleTimeUpdate = (event: Event) => {
      const video = event.target as HTMLVideoElement;

      // Only apply to happy2.mp4
      if (video.src.includes('happy2.mp4') && video.currentTime < 2.0) {
        console.log('⏩ Happy2 looped back to 0, resetting to 2s');
        video.currentTime = 2.0;
      }
    };

    // Add event listeners to both video layers
    layer1.addEventListener('ended', handleVideoEnded);
    layer2.addEventListener('ended', handleVideoEnded);
    layer1.addEventListener('timeupdate', handleTimeUpdate);
    layer2.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      layer1.removeEventListener('ended', handleVideoEnded);
      layer2.removeEventListener('ended', handleVideoEnded);
      layer1.removeEventListener('timeupdate', handleTimeUpdate);
      layer2.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  // Connect to LiveKit room
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

        // Enable microphone
        await room.localParticipant.setMicrophoneEnabled(true);
        console.log('Microphone enabled');

      } catch (err) {
        console.error('Failed to connect:', err);
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
        p.identity.includes('agent') || p.identity.includes('emotion-agent')
      );

      if (agent && !isAgentJoined) {
        console.log('✅ Agent joined:', agent.identity);
        setIsAgentJoined(true);
      }
    };

    checkForAgent();

    room.on(RoomEvent.ParticipantConnected, checkForAgent);
    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      if (participant.identity.includes('agent')) {
        setIsAgentJoined(false);
      }
    });

    return () => {
      room.off(RoomEvent.ParticipantConnected, checkForAgent);
    };
  }, [room, isConnected, isAgentJoined]);

  // Listen for agent's audio track and play it
  useEffect(() => {
    if (!isConnected || !isAgentJoined) return;

    const handleTrackSubscribed = async (
      track: RemoteTrack,
      _publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) => {
      if (track.kind !== Track.Kind.Audio) return;
      if (!participant.identity.includes('agent') && !participant.identity.includes('emotion-agent')) return;

      console.log('🎧 Subscribed to agent audio track');

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

      // Analyze audio in real-time to detect speaking
      let animationFrameId: number;
      const analyzeAudio = () => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate average volume
        const volume = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
        const isCurrentlySpeaking = volume > 5; // Threshold for speaking detection

        if (isCurrentlySpeaking) {
          // Agent is speaking - immediately update to speaking state
          setIsSpeaking(true);
          isSpeakingRef.current = true;

          // Clear any pending timeout to switch to idle
          if (speakingTimeoutRef.current) {
            clearTimeout(speakingTimeoutRef.current);
            speakingTimeoutRef.current = null;
          }
        } else {
          // Agent stopped speaking - switch to idle immediately for video
          // but wait before allowing emotion changes
          if (isSpeakingRef.current) {
            // Immediately stop showing talking video
            setIsSpeaking(false);

            // Set a timeout to update the ref (this prevents emotion switches during brief pauses)
            if (!speakingTimeoutRef.current) {
              speakingTimeoutRef.current = setTimeout(() => {
                isSpeakingRef.current = false;
                speakingTimeoutRef.current = null;
              }, 2000); // 2 second delay before allowing NEW emotion switches during pauses
            }

            // Apply any pending emotion immediately when speaking stops
            if (pendingEmotionRef.current) {
              console.log(`✅ Applying pending emotion immediately: ${pendingEmotionRef.current}`);
              switchEmotion(pendingEmotionRef.current);
              pendingEmotionRef.current = null;
            }
          }
        }

        animationFrameId = requestAnimationFrame(analyzeAudio);
      };

      analyzeAudio();

      // Cleanup
      return () => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
        if (speakingTimeoutRef.current) {
          clearTimeout(speakingTimeoutRef.current);
          speakingTimeoutRef.current = null;
        }
      };
    };

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);

    // Check if agent already has audio tracks
    const participants = Array.from(room.remoteParticipants.values());
    const agent = participants.find(p =>
      p.identity.includes('agent') || p.identity.includes('emotion-agent')
    );

    if (agent) {
      agent.audioTrackPublications.forEach((publication) => {
        if (publication.track) {
          handleTrackSubscribed(
            publication.track,
            publication,
            agent
          );
        }
      });
    }

    return () => {
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    };
  }, [room, isConnected, isAgentJoined]);

  // Handle emotion changes from agent
  useEffect(() => {
    if (!isConnected) return;

    const handleAttributesChanged = async (
      changedAttributes: Record<string, string>,
      participant: RemoteParticipant | LocalParticipant
    ) => {
      if (participant instanceof LocalParticipant) return;
      if (!participant.identity.includes('agent') && !participant.identity.includes('emotion-agent')) return;

      if (changedAttributes.emotion) {
        try {
          const emotionData: EmotionData = JSON.parse(changedAttributes.emotion);

          // Use keyword analyzer if ready
          if (emotionAnalyzerRef.current && mlModelReady && emotionData.text) {
            const result = emotionAnalyzerRef.current.analyzeWithContext(emotionData.text);

            const bestEmotion = result.dominantEmotion;

            // Update emotion data for display
            setMlEmotionData({
              emotion: bestEmotion,
              confidence: result.confidence
            });

            // IMPORTANT: Don't switch emotions while the avatar is actively speaking!
            // Only switch emotions when the avatar is idle (not talking)
            if (!isSpeakingRef.current) {
              // Switch emotions:
              // - If selected mode is neutral, always switch to detected emotion
              // - If a specific mode is selected, only show that emotion or neutral
              if (selectedMode === 'neutral') {
                switchEmotion(bestEmotion);
                pendingEmotionRef.current = null; // Clear any pending emotion
              } else if (bestEmotion === selectedMode || bestEmotion === 'neutral') {
                switchEmotion(bestEmotion);
                pendingEmotionRef.current = null; // Clear any pending emotion
              }
            } else {
              // Store the emotion to apply when speaking stops
              console.log(`🚫 Blocking emotion switch to ${bestEmotion} - avatar is speaking. Will apply when idle.`);
              pendingEmotionRef.current = bestEmotion;
            }
          }
        } catch (err) {
          console.error('Failed to parse emotion data:', err);
        }
      }
    };

    room.on(RoomEvent.ParticipantAttributesChanged, handleAttributesChanged);

    return () => {
      room.off(RoomEvent.ParticipantAttributesChanged, handleAttributesChanged);
    };
  }, [room, isConnected, mlModelReady, selectedMode]);

  // Switch between talking and idle videos based on isSpeaking state OR emotion changes
  useEffect(() => {
    if (!videoLayer1Ref.current && !videoLayer2Ref.current) return;

    const activeLayer = activeLayerRef.current;
    const activeVideo = activeLayer === 1 ? videoLayer1Ref.current : videoLayer2Ref.current;
    if (!activeVideo) return;

    // Determine which video URL to use based on BOTH emotion AND speaking state
    const videoMap = isSpeaking ? emotionVideosTalking : emotionVideos;

    // For happy emotion, use happy2.mp4 if happy.mp4 has already played once
    let emotionKey: string = currentEmotion;
    if (currentEmotion === 'happy' && hasPlayedHappyOnceRef.current) {
      emotionKey = 'happy2';
    }

    const targetVideoUrl = videoMap[emotionKey];

    // Only switch if the current video source is different
    if (activeVideo.src && !activeVideo.src.endsWith(targetVideoUrl)) {
      console.log(`🎙️ Video switch: ${currentEmotion} (${isSpeaking ? 'TALKING' : 'IDLE'})`);

      // Quick switch to the correct emotion + talking/idle version
      const inactiveLayer = activeLayer === 1 ? videoLayer2Ref.current : videoLayer1Ref.current;
      if (!inactiveLayer) return;

      // Load the appropriate video (correct emotion + talking/idle state)
      inactiveLayer.src = targetVideoUrl;

      // Sync playback position
      const currentProgress = activeVideo.currentTime / activeVideo.duration;

      const handleLoadedMetadata = () => {
        // For emotion videos (not neutral or neutral-talking), start from 1 second
        let syncedTime = currentProgress * inactiveLayer.duration;

        if (currentEmotion !== 'neutral' && !targetVideoUrl.includes('neutral-talking')) {
          // Emotion videos start showing the actual emotion at specific times
          // Happy starts at 3s, happy2 starts at 2s, others at 1s to skip neutral transition
          let emotionStartTime = 1.0;
          if (currentEmotion === 'happy' && targetVideoUrl.includes('happy2.mp4')) {
            emotionStartTime = 2.0; // happy2 starts at 2s
          } else if (currentEmotion === 'happy') {
            emotionStartTime = 3.0; // happy.mp4 needs to skip to 3s
          }
          const emotionDuration = inactiveLayer.duration - emotionStartTime;
          syncedTime = emotionStartTime + (currentProgress * emotionDuration);
          console.log(`⏱️ ${currentEmotion} (${emotionKey}) start: ${emotionStartTime}s, progress: ${currentProgress.toFixed(2)}, final: ${syncedTime.toFixed(2)}s`);
        }

        inactiveLayer.currentTime = syncedTime;

        // Set loop property: happy.mp4 should NOT loop, happy2.mp4 SHOULD loop
        if (targetVideoUrl.includes('happy.mp4') && !targetVideoUrl.includes('happy2.mp4')) {
          inactiveLayer.loop = false;
        } else {
          inactiveLayer.loop = true;
        }

        inactiveLayer.play().then(() => {
          // Instant switch (5ms crossfade for talking/idle and emotion switches)
          if (activeLayer === 1) {
            videoLayer1Ref.current!.style.opacity = '0';
            videoLayer2Ref.current!.style.opacity = '1';
            activeLayerRef.current = 2;
          } else {
            videoLayer2Ref.current!.style.opacity = '0';
            videoLayer1Ref.current!.style.opacity = '1';
            activeLayerRef.current = 1;
          }

          // Pause the hidden video
          setTimeout(() => {
            activeVideo.pause();
          }, 5);
        });
      };

      if (inactiveLayer.readyState >= 1) {
        handleLoadedMetadata();
      } else {
        inactiveLayer.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
      }
    }
  }, [isSpeaking, currentEmotion, emotionVideos, emotionVideosTalking]);

  // Handle mood intensity changes - switch between neutral and selected emotion
  const handleMoodChange = (intensity: number) => {
    setMoodIntensity(intensity);

    // If intensity > 60%, show the selected emotion
    // Otherwise, show neutral
    if (intensity > 60) {
      if (selectedMode !== 'neutral') {
        switchEmotion(selectedMode);
      }
    } else {
      switchEmotion('neutral');
    }
  };

  return (
    <div style={{
      background: '#ffffff',
      height: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'fixed',
      top: 0,
      left: 0,
      overflow: 'hidden'
    }}>
      {/* Session Timer - Top Center */}
      <div style={{
        position: 'absolute',
        top: '24px',
        fontSize: '16px',
        color: '#1a1a1a',
        fontWeight: 400,
        letterSpacing: '0.5px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}>
        {Math.floor((Date.now() - sessionStart) / 60000).toString().padStart(2, '0')}:
        {(Math.floor((Date.now() - sessionStart) / 1000) % 60).toString().padStart(2, '0')}
      </div>

      {/* Next Call Button - Top Right */}
      <button style={{
        position: 'absolute',
        top: '20px',
        right: '32px',
        padding: '10px 20px',
        background: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 500,
        color: '#1a1a1a',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.15s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#f5f5f5';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'white';
      }}
      >
        Next Call →
      </button>

      {/* Main Video Container */}
      <div style={{
        width: '100%',
        maxWidth: '1000px',
        height: 'calc(100vh - 180px)',
        position: 'relative',
        marginBottom: '60px',
        padding: '0 40px'
      }}>
        {/* Video Container with dual layers */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          background: '#C5C5C5',
          borderRadius: '15px',
          overflow: 'hidden',
          boxShadow: '0 2px 16px rgba(0,0,0,0.08)'
        }}>
          {/* Layer 1 - Base video layer */}
          <video
            ref={videoLayer1Ref}
            autoPlay
            loop
            muted
            playsInline
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              opacity: 1,
              transition: `opacity ${CROSSFADE_DURATION}ms linear`,
              mixBlendMode: 'normal',
              backgroundColor: 'transparent'
            }}
          />

          {/* Layer 2 - Overlay video layer for crossfade */}
          <video
            ref={videoLayer2Ref}
            loop
            muted
            playsInline
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              opacity: 0,
              transition: `opacity ${CROSSFADE_DURATION}ms linear`,
              mixBlendMode: 'normal',
              backgroundColor: 'transparent'
            }}
          />

          {/* Connection Status - Top Right - only show when connecting */}
          {!isAgentJoined && (
            <div style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 193, 7, 0.9)',
              color: '#000',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 500,
              zIndex: 10
            }}>
              Connecting...
            </div>
          )}

          {/* Emotion Indicator - Top Left */}
          {mlModelReady && mlEmotionData && (
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(10px)',
              color: 'white',
              padding: '12px 16px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 600,
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              minWidth: '140px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span style={{
                  textTransform: 'capitalize',
                  fontSize: '16px',
                  color: emotionModes.find(e => e.mode === mlEmotionData.emotion)?.color || '#fff'
                }}>
                  {mlEmotionData.emotion}
                </span>
                <span style={{
                  fontSize: '12px',
                  opacity: 0.8,
                  fontWeight: 500
                }}>
                  {(mlEmotionData.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <div style={{
                height: '3px',
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${mlEmotionData.confidence * 100}%`,
                  background: emotionModes.find(e => e.mode === mlEmotionData.emotion)?.color || '#fff',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div style={{
                fontSize: '10px',
                opacity: 0.6,
                fontWeight: 400,
                textAlign: 'center'
              }}>
                
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div style={{
        position: 'absolute',
        bottom: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        zIndex: 100
      }}>
        {/* Microphone Button */}
        <button style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          border: 'none',
          background: '#1a1a1a',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          boxShadow: 'none'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#2d2d2d';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#1a1a1a';
        }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" x2="12" y1="19" y2="22"/>
          </svg>
        </button>

        {/* Speaker Button */}
        <button style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          border: 'none',
          background: 'white',
          color: '#1a1a1a',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          boxShadow: 'none'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f5f5f5';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'white';
        }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/>
            <path d="M16 9a5 5 0 0 1 0 6"/>
            <path d="M19 7a8 8 0 0 1 0 10"/>
          </svg>
        </button>

        {/* Emotion Selector Button */}
        <button
          onClick={() => setShowEmotionPanel(!showEmotionPanel)}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            border: 'none',
            background: showEmotionPanel ? '#667eea' : 'white',
            color: showEmotionPanel ? 'white' : '#1a1a1a',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            boxShadow: 'none'
          }}
          onMouseEnter={(e) => {
            if (!showEmotionPanel) {
              e.currentTarget.style.background = '#f5f5f5';
            }
          }}
          onMouseLeave={(e) => {
            if (!showEmotionPanel) {
              e.currentTarget.style.background = 'white';
            }
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
            <line x1="9" x2="9.01" y1="9" y2="9"/>
            <line x1="15" x2="15.01" y1="9" y2="9"/>
          </svg>
        </button>

        {/* Settings Button */}
        <button style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          border: 'none',
          background: 'white',
          color: '#1a1a1a',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          boxShadow: 'none'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f5f5f5';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'white';
        }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <path d="M3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/>
            <path d="M9 22v-4h6v4"/>
          </svg>
        </button>

        {/* End Call Button */}
        <button
          onClick={() => {
            room.disconnect();
            window.location.reload();
          }}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            border: 'none',
            background: '#ef4444',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            boxShadow: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#dc2626';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#ef4444';
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/>
            <line x1="22" x2="2" y1="2" y2="22"/>
          </svg>
        </button>
      </div>

      {/* Emotion Selection Panel (Popup) */}
      {showEmotionPanel && (
        <div style={{
          position: 'absolute',
          bottom: '100px',
          background: '#ffffff',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
          minWidth: '300px',
          maxWidth: '380px',
          border: '1px solid #e0e0e0',
          zIndex: 200
        }}>
          <h3 style={{
            margin: '0 0 20px 0',
            color: '#1a1a1a',
            fontSize: '17px',
            fontWeight: 600
          }}>
            Select Emotion Mode
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '10px',
            marginBottom: '24px'
          }}>
            {emotionModes.map((emotion) => (
              <button
                key={emotion.mode}
                onClick={() => {
                  setSelectedMode(emotion.mode);
                  setMoodIntensity(50);
                  switchEmotion('neutral');
                }}
                style={{
                  padding: '14px',
                  background: selectedMode === emotion.mode ? emotion.color : 'white',
                  border: selectedMode === emotion.mode ? `2px solid ${emotion.color}` : '2px solid #e0e0e0',
                  borderRadius: '10px',
                  color: selectedMode === emotion.mode ? 'white' : '#1a1a1a',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: selectedMode === emotion.mode ? 600 : 500,
                  transition: 'all 0.2s',
                  textAlign: 'center',
                  boxShadow: selectedMode === emotion.mode ? `0 2px 8px ${emotion.color}40` : 'none'
                }}
                onMouseEnter={(e) => {
                  if (selectedMode !== emotion.mode) {
                    e.currentTarget.style.background = '#f5f5f5';
                    e.currentTarget.style.borderColor = '#ccc';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedMode !== emotion.mode) {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#e0e0e0';
                  }
                }}
              >
                {emotion.label}
              </button>
            ))}
          </div>

          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '12px',
              color: '#1a1a1a',
              fontSize: '13px',
              fontWeight: 500
            }}>
              <span>Mood Intensity</span>
              <span style={{ fontWeight: 600, color: emotionModes.find(e => e.mode === selectedMode)?.color }}>{moodIntensity}%</span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={moodIntensity}
              onChange={(e) => handleMoodChange(Number(e.target.value))}
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                outline: 'none',
                appearance: 'none',
                background: `linear-gradient(to right, #e0e0e0 0%, #e0e0e0 ${moodIntensity}%, ${emotionModes.find(e => e.mode === selectedMode)?.color} ${moodIntensity}%, ${emotionModes.find(e => e.mode === selectedMode)?.color} 100%)`,
                cursor: 'pointer'
              }}
            />

            <div style={{
              marginTop: '10px',
              fontSize: '12px',
              color: '#666',
              textAlign: 'center',
              fontWeight: 500
            }}>
              {moodIntensity > 60
                ? `Showing ${selectedMode} emotion`
                : 'Showing neutral'}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
