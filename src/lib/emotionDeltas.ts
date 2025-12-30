/**
 * Emotion Delta Calculator and Manager
 * Calculates and stores landmark deltas for different emotions
 */

import { FaceLandmark, LandmarkExtractor } from './landmarkExtractor';

export interface EmotionDelta {
  emotion: string;
  deltas: FaceLandmark[];
  confidence: number;
}

export interface EmotionLandmarkData {
  emotion: string;
  landmarks: FaceLandmark[];
}

export class EmotionDeltaManager {
  private neutralLandmarks: FaceLandmark[] | null = null;
  private emotionDeltas: Map<string, FaceLandmark[]> = new Map();
  private extractor: LandmarkExtractor;

  constructor() {
    this.extractor = new LandmarkExtractor();
  }

  /**
   * Set the neutral (baseline) landmarks
   */
  setNeutralLandmarks(landmarks: FaceLandmark[]) {
    this.neutralLandmarks = landmarks;
    console.log('✅ Neutral landmarks set:', landmarks.length, 'points');
  }

  /**
   * Calculate deltas for an emotion
   */
  calculateDeltas(emotionLandmarks: FaceLandmark[], emotionName: string): FaceLandmark[] {
    if (!this.neutralLandmarks) {
      throw new Error('Neutral landmarks not set. Call setNeutralLandmarks() first.');
    }

    if (emotionLandmarks.length !== this.neutralLandmarks.length) {
      throw new Error(
        `Landmark count mismatch: neutral=${this.neutralLandmarks.length}, emotion=${emotionLandmarks.length}`
      );
    }

    const deltas = emotionLandmarks.map((emotionLm, i) => {
      const neutralLm = this.neutralLandmarks![i];
      return {
        x: emotionLm.x - neutralLm.x,
        y: emotionLm.y - neutralLm.y,
        z: emotionLm.z - neutralLm.z,
      };
    });

    this.emotionDeltas.set(emotionName, deltas);
    console.log(`✅ Deltas calculated for "${emotionName}":`, deltas.length, 'points');

    return deltas;
  }

  /**
   * Get deltas for a specific emotion
   */
  getDeltas(emotionName: string): FaceLandmark[] | null {
    return this.emotionDeltas.get(emotionName) || null;
  }

  /**
   * Apply deltas to neutral landmarks to get target emotion landmarks
   */
  applyDeltas(
    neutralLandmarks: FaceLandmark[],
    deltas: FaceLandmark[],
    intensity: number = 1.0 // 0 = no emotion, 1 = full emotion
  ): FaceLandmark[] {
    if (neutralLandmarks.length !== deltas.length) {
      throw new Error('Landmark and delta count mismatch');
    }

    return neutralLandmarks.map((neutral, i) => {
      const delta = deltas[i];
      return {
        x: neutral.x + delta.x * intensity,
        y: neutral.y + delta.y * intensity,
        z: neutral.z + delta.z * intensity,
      };
    });
  }

  /**
   * Extract landmarks from a video and calculate deltas automatically
   */
  async extractAndCalculateDeltas(
    video: HTMLVideoElement,
    emotionName: string,
    frameTime: number = 2.0 // Sample from middle of emotion video
  ): Promise<FaceLandmark[]> {
    console.log(`📊 Extracting landmarks for "${emotionName}" at ${frameTime}s`);

    // Extract landmarks from the emotion video
    const result = await this.extractor.extractFromVideoAtTime(video, frameTime);

    if (!result || !result.landmarks) {
      throw new Error(`Failed to extract landmarks from ${emotionName} video`);
    }

    // Calculate deltas
    const deltas = this.calculateDeltas(result.landmarks, emotionName);

    return deltas;
  }

  /**
   * Blend multiple emotions together
   */
  blendEmotions(
    neutralLandmarks: FaceLandmark[],
    emotionWeights: { emotion: string; weight: number }[]
  ): FaceLandmark[] {
    const blendedLandmarks = neutralLandmarks.map((neutral) => ({ ...neutral }));

    for (const { emotion, weight } of emotionWeights) {
      const deltas = this.getDeltas(emotion);
      if (!deltas) continue;

      deltas.forEach((delta, i) => {
        blendedLandmarks[i].x += delta.x * weight;
        blendedLandmarks[i].y += delta.y * weight;
        blendedLandmarks[i].z += delta.z * weight;
      });
    }

    return blendedLandmarks;
  }

  /**
   * Export deltas to JSON for caching
   */
  exportDeltas(): Record<string, FaceLandmark[]> {
    const exported: Record<string, FaceLandmark[]> = {};
    this.emotionDeltas.forEach((deltas, emotion) => {
      exported[emotion] = deltas;
    });
    return exported;
  }

  /**
   * Import pre-calculated deltas from JSON
   */
  importDeltas(deltaData: Record<string, FaceLandmark[]>) {
    Object.entries(deltaData).forEach(([emotion, deltas]) => {
      this.emotionDeltas.set(emotion, deltas);
    });
    console.log('✅ Imported deltas for emotions:', Object.keys(deltaData));
  }

  /**
   * Get all available emotions
   */
  getAvailableEmotions(): string[] {
    return Array.from(this.emotionDeltas.keys());
  }

  /**
   * Check if deltas are loaded for an emotion
   */
  hasDeltas(emotionName: string): boolean {
    return this.emotionDeltas.has(emotionName);
  }

  /**
   * Cleanup resources
   */
  dispose() {
    this.extractor.dispose();
    this.emotionDeltas.clear();
    this.neutralLandmarks = null;
  }
}

/**
 * Pre-calculated emotion deltas (to be populated after first extraction)
 * This avoids re-calculating on every page load
 */
export const EMOTION_DELTAS_CACHE_KEY = 'avatar_emotion_deltas';

export function saveEmotionDeltasToCache(deltas: Record<string, FaceLandmark[]>) {
  try {
    localStorage.setItem(EMOTION_DELTAS_CACHE_KEY, JSON.stringify(deltas));
    console.log('✅ Emotion deltas saved to cache');
  } catch (err) {
    console.warn('Failed to save emotion deltas to cache:', err);
  }
}

export function loadEmotionDeltasFromCache(): Record<string, FaceLandmark[]> | null {
  try {
    const cached = localStorage.getItem(EMOTION_DELTAS_CACHE_KEY);
    if (cached) {
      const deltas = JSON.parse(cached);
      console.log('✅ Emotion deltas loaded from cache');
      return deltas;
    }
  } catch (err) {
    console.warn('Failed to load emotion deltas from cache:', err);
  }
  return null;
}
