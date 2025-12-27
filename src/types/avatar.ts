// Phoneme types based on Rhubarb Lip Sync
export type Phoneme = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'X';

// Emotion types
export type Emotion = 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised';

// Avatar layer structure
export interface AvatarLayers {
  head: HTMLImageElement;
  mouths: Record<Phoneme, HTMLImageElement>;
  eyes: {
    open: HTMLImageElement;
    closed: HTMLImageElement;
  };
  eyebrows?: Record<Emotion, HTMLImageElement>;
}

// Phoneme event with timestamp
export interface PhonemeEvent {
  time: number;
  phoneme: Phoneme;
}

// Avatar state
export interface AvatarState {
  currentPhoneme: Phoneme;
  currentEmotion: Emotion;
  isBlinking: boolean;
  eyeOpenness: number; // 0-1
}

// LiveKit data message
export interface AvatarDataMessage {
  type: 'phoneme' | 'emotion' | 'blink';
  value: string;
  timestamp: number;
}
