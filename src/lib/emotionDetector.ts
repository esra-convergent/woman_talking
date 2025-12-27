import { Emotion } from '../types/avatar';

export class EmotionDetector {
  private emotionKeywords: Record<Emotion, string[]> = {
    happy: ['happy', 'joy', 'great', 'wonderful', 'amazing', 'love', 'excellent', 'fantastic', 'good', 'nice', 'haha', 'lol'],
    sad: ['sad', 'sorry', 'unfortunate', 'bad', 'terrible', 'awful', 'disappointed', 'unhappy'],
    angry: ['angry', 'mad', 'furious', 'annoyed', 'frustrated', 'hate'],
    surprised: ['wow', 'amazing', 'incredible', 'unbelievable', 'really', 'omg', 'oh'],
    neutral: []
  };

  /**
   * Detect emotion from text transcript
   */
  detectFromText(text: string): Emotion {
    const lowerText = text.toLowerCase();
    const emotionScores: Record<Emotion, number> = {
      happy: 0,
      sad: 0,
      angry: 0,
      surprised: 0,
      neutral: 0
    };

    // Count keyword matches for each emotion
    for (const [emotion, keywords] of Object.entries(this.emotionKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          emotionScores[emotion as Emotion]++;
        }
      }
    }

    // Analyze punctuation for emotion hints
    if (text.includes('!')) {
      emotionScores.surprised += 0.5;
      emotionScores.happy += 0.3;
    }
    if (text.includes('?')) {
      emotionScores.surprised += 0.3;
    }

    // Find emotion with highest score
    let maxEmotion: Emotion = 'neutral';
    let maxScore = 0;

    for (const [emotion, score] of Object.entries(emotionScores)) {
      if (score > maxScore) {
        maxScore = score;
        maxEmotion = emotion as Emotion;
      }
    }

    return maxScore > 0 ? maxEmotion : 'neutral';
  }

  /**
   * Detect emotion from audio features
   * This is simplified - for production, use a proper emotion detection model
   */
  detectFromAudio(audioFeatures: AudioFeatures): Emotion {
    const { pitch, energy, tempo } = audioFeatures;

    // High pitch + high energy = happy/excited
    if (pitch > 0.7 && energy > 0.6) {
      return 'happy';
    }

    // Low pitch + low energy = sad
    if (pitch < 0.3 && energy < 0.4) {
      return 'sad';
    }

    // High energy + high tempo = angry
    if (energy > 0.7 && tempo > 0.7) {
      return 'angry';
    }

    // Sudden changes = surprised
    if (Math.abs(pitch - 0.5) > 0.3 && energy > 0.5) {
      return 'surprised';
    }

    return 'neutral';
  }

  /**
   * Analyze live audio for emotion
   */
  analyzeLiveAudio(analyser: AnalyserNode): AudioFeatures {
    const bufferLength = analyser.frequencyBinCount;
    const frequencyData = new Uint8Array(bufferLength);
    const timeDomainData = new Uint8Array(bufferLength);

    analyser.getByteFrequencyData(frequencyData);
    analyser.getByteTimeDomainData(timeDomainData);

    // Calculate energy (volume)
    const energy = frequencyData.reduce((sum, val) => sum + val, 0) / bufferLength / 255;

    // Calculate pitch (simplified - find dominant frequency)
    let maxFrequency = 0;
    let maxAmplitude = 0;
    for (let i = 0; i < bufferLength; i++) {
      if (frequencyData[i] > maxAmplitude) {
        maxAmplitude = frequencyData[i];
        maxFrequency = i;
      }
    }
    const pitch = maxFrequency / bufferLength;

    // Calculate tempo (zero-crossing rate)
    let zeroCrossings = 0;
    for (let i = 1; i < timeDomainData.length; i++) {
      if ((timeDomainData[i] - 128) * (timeDomainData[i - 1] - 128) < 0) {
        zeroCrossings++;
      }
    }
    const tempo = zeroCrossings / timeDomainData.length;

    return { pitch, energy, tempo };
  }
}

export interface AudioFeatures {
  pitch: number;      // 0-1
  energy: number;     // 0-1
  tempo: number;      // 0-1
}
