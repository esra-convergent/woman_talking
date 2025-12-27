import { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, DataPacket_Kind, RemoteParticipant } from 'livekit-client';
import { AvatarRenderer } from '../lib/avatarRenderer';
import { LipSyncEngine } from '../lib/lipSync';
import { EmotionDetector } from '../lib/emotionDetector';
import { AvatarDataMessage, Phoneme, Emotion } from '../types/avatar';

interface LiveAvatarProps {
  room: Room;
  participant?: RemoteParticipant;
  avatarPath?: string;
  enableLocalAudio?: boolean;
}

export function LiveAvatar({
  room,
  participant,
  avatarPath = '/avatars/default',
  enableLocalAudio = false
}: LiveAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<AvatarRenderer | null>(null);
  const lipSyncRef = useRef<LipSyncEngine>(new LipSyncEngine());
  const emotionDetectorRef = useRef<EmotionDetector>(new EmotionDetector());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize avatar renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new AvatarRenderer(canvas);
    rendererRef.current = renderer;

    renderer.loadAvatar(avatarPath)
      .then(() => {
        renderer.start();
        setIsReady(true);
      })
      .catch((err) => {
        console.error('Failed to load avatar:', err);
        setError('Failed to load avatar assets');
      });

    return () => {
      renderer.stop();
    };
  }, [avatarPath]);

  // Setup audio analysis for local participant
  useEffect(() => {
    if (!enableLocalAudio || !isReady) return;

    const setupAudioAnalysis = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();

        analyser.fftSize = 2048;
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        // Analyze audio and update phonemes
        lipSyncRef.current.analyzeLiveAudio(analyser, (phoneme: Phoneme) => {
          rendererRef.current?.setPhoneme(phoneme);

          // Broadcast phoneme to other participants
          room.localParticipant.publishData(
            new TextEncoder().encode(JSON.stringify({
              type: 'phoneme',
              value: phoneme,
              timestamp: Date.now()
            } as AvatarDataMessage)),
            { reliable: false }
          );
        });

        // Detect and broadcast emotions
        const emotionInterval = setInterval(() => {
          if (analyserRef.current) {
            const features = emotionDetectorRef.current.analyzeLiveAudio(analyserRef.current);
            const emotion = emotionDetectorRef.current.detectFromAudio(features);
            rendererRef.current?.setEmotion(emotion);

            room.localParticipant.publishData(
              new TextEncoder().encode(JSON.stringify({
                type: 'emotion',
                value: emotion,
                timestamp: Date.now()
              } as AvatarDataMessage)),
              { reliable: true }
            );
          }
        }, 1000);

        return () => {
          clearInterval(emotionInterval);
          stream.getTracks().forEach(track => track.stop());
          audioContext.close();
        };

      } catch (err) {
        console.error('Failed to setup audio analysis:', err);
        setError('Failed to access microphone');
      }
    };

    setupAudioAnalysis();
  }, [enableLocalAudio, isReady, room]);

  // Listen for remote participant data
  useEffect(() => {
    if (!participant || !isReady) return;

    const handleData = (payload: Uint8Array) => {
      try {
        const text = new TextDecoder().decode(payload);
        const message: AvatarDataMessage = JSON.parse(text);

        switch (message.type) {
          case 'phoneme':
            rendererRef.current?.setPhoneme(message.value as Phoneme);
            break;
          case 'emotion':
            rendererRef.current?.setEmotion(message.value as Emotion);
            break;
        }
      } catch (err) {
        console.error('Failed to parse data message:', err);
      }
    };

    room.on(RoomEvent.DataReceived, handleData);

    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [participant, isReady, room]);

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
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          maxWidth: '100%',
          height: 'auto',
          opacity: isReady ? 1 : 0.5,
          transition: 'opacity 0.3s'
        }}
      />
      {!isReady && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px'
        }}>
          Loading avatar...
        </div>
      )}
    </div>
  );
}
