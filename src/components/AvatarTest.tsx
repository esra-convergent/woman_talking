import { useEffect, useRef, useState } from 'react';
import { AvatarRenderer } from '../lib/avatarRenderer';
import { Phoneme, Emotion } from '../types/avatar';

/**
 * Standalone avatar tester - no LiveKit required
 * Use this to test your avatar assets before integrating with LiveKit
 */
export function AvatarTest() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<AvatarRenderer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [currentPhoneme, setCurrentPhoneme] = useState<Phoneme>('X');
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>('neutral');

  const phonemes: Phoneme[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'X'];
  const emotions: Emotion[] = ['neutral', 'happy', 'sad', 'angry', 'surprised'];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new AvatarRenderer(canvas);
    rendererRef.current = renderer;

    renderer.loadAvatar('/avatars/default')
      .then(() => {
        renderer.start();
        setIsReady(true);
      })
      .catch((err) => {
        console.error('Failed to load avatar:', err);
        alert('Failed to load avatar. Check console for details.');
      });

    return () => {
      renderer.stop();
    };
  }, []);

  const handlePhonemeChange = (phoneme: Phoneme) => {
    setCurrentPhoneme(phoneme);
    rendererRef.current?.setPhoneme(phoneme);
  };

  const handleEmotionChange = (emotion: Emotion) => {
    setCurrentEmotion(emotion);
    rendererRef.current?.setEmotion(emotion);
  };

  const runPhonemeSequence = () => {
    let index = 0;
    const interval = setInterval(() => {
      if (index >= phonemes.length) {
        clearInterval(interval);
        handlePhonemeChange('X');
        return;
      }
      handlePhonemeChange(phonemes[index]);
      index++;
    }, 300);
  };

  const simulateSpeech = () => {
    const sequence: Phoneme[] = ['X', 'H', 'E', 'X', 'B', 'A', 'X', 'D', 'E', 'X'];
    let index = 0;
    const interval = setInterval(() => {
      if (index >= sequence.length) {
        clearInterval(interval);
        handlePhonemeChange('X');
        return;
      }
      handlePhonemeChange(sequence[index]);
      index++;
    }, 200);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{
          color: 'white',
          textAlign: 'center',
          marginBottom: '40px',
          fontSize: '2.5em'
        }}>
          Avatar Tester
        </h1>

        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '40px'
          }}>
            {/* Avatar Display */}
            <div>
              <h2 style={{ marginTop: 0 }}>Avatar Preview</h2>
              <div style={{
                background: '#f5f5f5',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '400px'
              }}>
                <canvas
                  ref={canvasRef}
                  style={{
                    maxWidth: '100%',
                    height: 'auto',
                    opacity: isReady ? 1 : 0.3
                  }}
                />
              </div>

              {!isReady && (
                <p style={{ textAlign: 'center', color: '#666', marginTop: '16px' }}>
                  Loading avatar assets...
                </p>
              )}

              <div style={{ marginTop: '20px' }}>
                <button
                  onClick={runPhonemeSequence}
                  disabled={!isReady}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    cursor: isReady ? 'pointer' : 'not-allowed',
                    opacity: isReady ? 1 : 0.5,
                    marginBottom: '8px'
                  }}
                >
                  Test All Phonemes
                </button>
                <button
                  onClick={simulateSpeech}
                  disabled={!isReady}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#764ba2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    cursor: isReady ? 'pointer' : 'not-allowed',
                    opacity: isReady ? 1 : 0.5
                  }}
                >
                  Simulate Speech
                </button>
              </div>
            </div>

            {/* Controls */}
            <div>
              <h2 style={{ marginTop: 0 }}>Controls</h2>

              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>
                  Phonemes (Mouth Shapes)
                </h3>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                  Current: <strong>{currentPhoneme}</strong>
                </p>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px'
                }}>
                  {phonemes.map((phoneme) => (
                    <button
                      key={phoneme}
                      onClick={() => handlePhonemeChange(phoneme)}
                      disabled={!isReady}
                      style={{
                        padding: '12px',
                        background: currentPhoneme === phoneme ? '#667eea' : '#f0f0f0',
                        color: currentPhoneme === phoneme ? 'white' : '#333',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: isReady ? 'pointer' : 'not-allowed',
                        opacity: isReady ? 1 : 0.5,
                        transition: 'all 0.2s'
                      }}
                    >
                      {phoneme}
                    </button>
                  ))}
                </div>
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  background: '#f5f5f5',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#666'
                }}>
                  <strong>Phoneme Guide:</strong><br />
                  A=wide open, B=lips together, C=slightly open,<br />
                  D=teeth, E=rounded, F=lip/teeth, G=throat,<br />
                  H=aspirated, X=closed/rest
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>
                  Emotions
                </h3>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                  Current: <strong>{currentEmotion}</strong>
                </p>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {emotions.map((emotion) => (
                    <button
                      key={emotion}
                      onClick={() => handleEmotionChange(emotion)}
                      disabled={!isReady}
                      style={{
                        padding: '12px',
                        background: currentEmotion === emotion ? '#764ba2' : '#f0f0f0',
                        color: currentEmotion === emotion ? 'white' : '#333',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: isReady ? 'pointer' : 'not-allowed',
                        opacity: isReady ? 1 : 0.5,
                        textTransform: 'capitalize'
                      }}
                    >
                      {emotion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{
            marginTop: '32px',
            padding: '16px',
            background: '#e3f2fd',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            <strong>Tip:</strong> Use this tester to verify your avatar assets work correctly
            before connecting to LiveKit. Click individual phonemes to see each mouth shape,
            or use the test buttons to see animations.
          </div>
        </div>
      </div>
    </div>
  );
}
