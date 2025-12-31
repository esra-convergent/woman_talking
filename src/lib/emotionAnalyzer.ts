/**
 * ML-Based Emotion Analyzer (Backend-powered)
 * Calls backend API for ML-based emotion detection
 */

export type EmotionType = 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised' | 'idle';

export interface EmotionScore {
  emotion: EmotionType;
  score: number; // 0-1 probability
}

export interface EmotionAnalysisResult {
  dominantEmotion: EmotionType;
  emotions: EmotionScore[]; // All emotions with their scores
  shouldBlend: boolean; // Whether to blend multiple emotions
  blendEmotions?: EmotionScore[]; // Emotions to blend if shouldBlend is true
  confidence: number; // Overall confidence
}

/**
 * ML-based Emotion Analyzer using backend API
 */
export class EmotionAnalyzer {
  private emotionHistory: EmotionAnalysisResult[] = [];
  private readonly HISTORY_SIZE = 3;
  private readonly API_URL = 'http://localhost:3001/api/analyze-emotion';

  // Thresholds
  private readonly BLEND_THRESHOLD = 0.3;

  /**
   * Initialize (instant - backend handles the ML model)
   */
  async initialize(): Promise<void> {
    console.log('✅ Emotion analyzer ready (using backend ML API)');
    return Promise.resolve();
  }

  /**
   * Analyze text using backend ML model
   */
  async analyzeText(text: string): Promise<EmotionAnalysisResult> {
    if (!text || text.trim().length === 0) {
      return {
        dominantEmotion: 'neutral',
        emotions: [{ emotion: 'neutral', score: 1.0 }],
        shouldBlend: false,
        confidence: 1.0
      };
    }

    try {
      console.log('🤖 Sending text to backend ML API:', text.substring(0, 50) + '...');

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      console.log('📊 Backend ML result:', result);

      // Convert backend response to our format
      const analysisResult: EmotionAnalysisResult = {
        dominantEmotion: result.dominantEmotion,
        emotions: result.emotions.map((e: any) => ({
          emotion: e.emotion,
          score: e.score
        })),
        shouldBlend: result.shouldBlend,
        blendEmotions: result.shouldBlend
          ? result.emotions.filter((e: any) => e.score >= this.BLEND_THRESHOLD)
          : undefined,
        confidence: result.confidence
      };

      // Add to history
      this.emotionHistory.push(analysisResult);
      if (this.emotionHistory.length > this.HISTORY_SIZE) {
        this.emotionHistory.shift();
      }

      return analysisResult;
    } catch (err) {
      console.error('❌ Error calling backend ML API:', err);
      console.warn('⚠️ Falling back to neutral emotion');

      // Fallback to neutral
      return {
        dominantEmotion: 'neutral',
        emotions: [{ emotion: 'neutral', score: 1.0 }],
        shouldBlend: false,
        confidence: 0.5
      };
    }
  }

  /**
   * Analyze with context from conversation history
   * Uses smoothing to avoid rapid emotion changes
   */
  async analyzeWithContext(text: string): Promise<EmotionAnalysisResult> {
    const currentResult = await this.analyzeText(text);

    // If we have history, smooth the transition
    if (this.emotionHistory.length >= 2) {
      const previousResult = this.emotionHistory[this.emotionHistory.length - 2];

      // If emotions are very different and current confidence is low, maintain previous
      if (
        currentResult.dominantEmotion !== previousResult.dominantEmotion &&
        currentResult.confidence < 0.4
      ) {
        console.log('🔄 Low confidence, maintaining previous emotion:', previousResult.dominantEmotion);
        return previousResult;
      }
    }

    return currentResult;
  }

  /**
   * Get the best emotion to display (handles blending logic)
   */
  getBestEmotion(result: EmotionAnalysisResult): EmotionType {
    if (result.shouldBlend && result.blendEmotions) {
      console.log('🎨 Blending suggested:', result.blendEmotions.map(e => `${e.emotion}(${(e.score * 100).toFixed(0)}%)`).join(', '));
      // For now, return dominant emotion
      // TODO: Implement actual video blending
      return result.dominantEmotion;
    }

    return result.dominantEmotion;
  }

  /**
   * Check if model is ready
   */
  isModelReady(): boolean {
    return true; // Always ready - backend handles the model
  }

  /**
   * Reset analyzer state
   */
  reset() {
    this.emotionHistory = [];
  }

  /**
   * Get emotion history
   */
  getHistory(): EmotionAnalysisResult[] {
    return [...this.emotionHistory];
  }
}

/**
 * Singleton instance for global use
 */
export const emotionAnalyzer = new EmotionAnalyzer();
