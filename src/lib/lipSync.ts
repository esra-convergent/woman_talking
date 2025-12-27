import { Phoneme, PhonemeEvent } from '../types/avatar';

/**
 * Simple phoneme mapper based on Rhubarb Lip Sync mouth shapes
 * Maps text characters to mouth shapes for basic lip sync
 */
export class LipSyncEngine {
  private phonemeMap: Record<string, Phoneme> = {
    // A - Open mouth (a, i)
    'a': 'A', 'i': 'A',

    // B - Lips together (m, b, p)
    'm': 'B', 'b': 'B', 'p': 'B',

    // C - Mouth slightly open (e)
    'e': 'C',

    // D - Tongue/teeth (t, d, s, z)
    't': 'D', 'd': 'D', 's': 'D', 'z': 'D',

    // E - Lips rounded (o)
    'o': 'E',

    // F - Bottom lip/teeth (f, v)
    'f': 'F', 'v': 'F',

    // G - Throat/back (k, g)
    'k': 'G', 'g': 'G',

    // H - Aspirated (h)
    'h': 'H',

    // X - Closed/rest
    ' ': 'X', '.': 'X', ',': 'X'
  };

  /**
   * Convert text to phoneme events with timing
   */
  textToPhonemes(text: string, duration: number): PhonemeEvent[] {
    const chars = text.toLowerCase().split('');
    const phonemes: PhonemeEvent[] = [];
    const timePerChar = duration / chars.length;

    chars.forEach((char, index) => {
      const phoneme = this.phonemeMap[char] || 'X';
      phonemes.push({
        time: index * timePerChar,
        phoneme
      });
    });

    return phonemes;
  }

  /**
   * Analyze audio and extract phonemes using Web Audio API
   * This is a simplified version - for production, integrate with Rhubarb Lip Sync
   */
  async analyzeAudio(audioBuffer: AudioBuffer): Promise<PhonemeEvent[]> {
    const duration = audioBuffer.duration;
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);

    const phonemes: PhonemeEvent[] = [];
    const windowSize = Math.floor(sampleRate * 0.05); // 50ms windows
    const hopSize = Math.floor(windowSize / 2);

    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      const window = channelData.slice(i, i + windowSize);
      const energy = this.calculateEnergy(window);
      const time = i / sampleRate;

      // Simple energy-based phoneme detection
      let phoneme: Phoneme;
      if (energy < 0.01) {
        phoneme = 'X'; // Silence
      } else if (energy > 0.5) {
        phoneme = 'A'; // High energy - open mouth
      } else if (energy > 0.3) {
        phoneme = 'E'; // Medium-high - rounded
      } else {
        phoneme = 'C'; // Medium - slightly open
      }

      phonemes.push({ time, phoneme });
    }

    return this.smoothPhonemes(phonemes);
  }

  /**
   * Analyze live audio stream
   */
  analyzeLiveAudio(analyser: AnalyserNode, callback: (phoneme: Phoneme) => void) {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const analyze = () => {
      analyser.getByteFrequencyData(dataArray);

      const energy = dataArray.reduce((sum, val) => sum + val, 0) / bufferLength / 255;

      let phoneme: Phoneme;
      if (energy < 0.05) {
        phoneme = 'X';
      } else if (energy > 0.4) {
        phoneme = 'A';
      } else if (energy > 0.25) {
        phoneme = 'E';
      } else {
        phoneme = 'C';
      }

      callback(phoneme);
      requestAnimationFrame(analyze);
    };

    analyze();
  }

  private calculateEnergy(samples: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }

  /**
   * Analyze frequency data from an analyser and return appropriate phoneme
   */
  analyzeAudioData(dataArray: Uint8Array): Phoneme {
    // Calculate overall energy
    const energy = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length / 255;

    if (energy < 0.05) {
      return 'X'; // Silence
    }

    // Split frequency bands for more accurate phoneme detection
    const binCount = dataArray.length;
    const lowBand = dataArray.slice(0, Math.floor(binCount * 0.2));
    const midBand = dataArray.slice(Math.floor(binCount * 0.2), Math.floor(binCount * 0.5));
    const highBand = dataArray.slice(Math.floor(binCount * 0.5), binCount);

    const lowEnergy = lowBand.reduce((sum, val) => sum + val, 0) / lowBand.length / 255;
    const midEnergy = midBand.reduce((sum, val) => sum + val, 0) / midBand.length / 255;
    const highEnergy = highBand.reduce((sum, val) => sum + val, 0) / highBand.length / 255;

    // Phoneme detection based on frequency distribution
    // A - Wide open (high overall energy, strong low frequencies) - "ah" sound
    if (energy > 0.4 && lowEnergy > 0.3) {
      return 'A';
    }

    // E - Rounded lips (medium-high energy, strong mid frequencies) - "ee", "oh" sounds
    if (energy > 0.25 && midEnergy > lowEnergy && midEnergy > highEnergy) {
      return 'E';
    }

    // F - Lip/teeth contact (high frequencies dominate) - "f", "v" sounds
    if (highEnergy > midEnergy * 1.5 && highEnergy > 0.15) {
      return 'F';
    }

    // B - Lips together (low frequencies, medium energy) - "m", "b", "p" sounds
    if (lowEnergy > midEnergy * 1.3 && energy > 0.15 && energy < 0.35) {
      return 'B';
    }

    // D - Teeth showing (balanced mid-high) - "t", "d", "s" sounds
    if (midEnergy > 0.2 && highEnergy > 0.15) {
      return 'D';
    }

    // C - Medium open (default for moderate speech)
    if (energy > 0.1) {
      return 'C';
    }

    // X - Rest/closed
    return 'X';
  }

  private smoothPhonemes(phonemes: PhonemeEvent[]): PhonemeEvent[] {
    // Remove very short phoneme changes
    const smoothed: PhonemeEvent[] = [];
    let currentPhoneme = phonemes[0];
    let phonemeStartTime = 0;

    for (let i = 1; i < phonemes.length; i++) {
      if (phonemes[i].phoneme !== currentPhoneme.phoneme) {
        const duration = phonemes[i].time - phonemeStartTime;
        if (duration > 0.05) { // Only keep phonemes longer than 50ms
          smoothed.push(currentPhoneme);
        }
        currentPhoneme = phonemes[i];
        phonemeStartTime = phonemes[i].time;
      }
    }

    smoothed.push(currentPhoneme);
    return smoothed;
  }
}
