/**
 * Keyword-Based Emotion Analyzer
 * Fast, instant emotion detection based on keyword matching
 */

export type EmotionType = 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised';

export interface EmotionAnalysisResult {
  dominantEmotion: EmotionType;
  confidence: number; // 0-1
  matchedKeywords: string[];
}

/**
 * Keyword-based Emotion Analyzer
 * Analyzes text instantly using keyword matching
 */
export class KeywordEmotionAnalyzer {
  // Emotion keyword dictionaries
  private readonly emotionKeywords: Record<EmotionType, string[]> = {
    happy: [
      // Positive emotions
      'happy', 'joy', 'joyful', 'glad', 'pleased', 'delighted', 'cheerful',
      'excited', 'thrilled', 'wonderful', 'fantastic', 'amazing', 'awesome',
      'great', 'excellent', 'perfect', 'love', 'lovely', 'beautiful',
      'brilliant', 'fabulous', 'marvelous', 'superb', 'terrific',
      // Positive actions
      'celebrate', 'celebrating', 'laugh', 'laughing', 'smile', 'smiling',
      'enjoy', 'enjoying', 'fun', 'yay', 'hooray', 'congratulations',
      // Positive expressions
      'haha', 'hehe', 'lol', 'yes!', 'yay!', 'woohoo', 'awesome!',
      'nice', 'good', 'better', 'best', 'win', 'winning', 'success',
      'successful', 'proud', 'grateful', 'thankful', 'blessed',
      // Emojis as words
      '😊', '😃', '😄', '😁', '🎉', '🎊', '❤️', '💕', '🥰', '😍'
    ],

    sad: [
      // Sad emotions
      'sad', 'unhappy', 'down', 'depressed', 'gloomy', 'miserable',
      'sorrowful', 'heartbroken', 'disappointed', 'upset', 'hurt',
      'pain', 'painful', 'crying', 'cry', 'tears', 'weeping',
      // Negative states
      'lonely', 'alone', 'lost', 'hopeless', 'despair', 'grief',
      'regret', 'sorry', 'apologize', 'forgive', 'miss', 'missing',
      'unfortunate', 'unlucky', 'poor', 'pity', 'pathetic',
      // Loss and negative outcomes
      'lose', 'losing', 'lost', 'fail', 'failed', 'failure', 'defeat',
      'give up', 'quit', 'broken', 'ruined', 'destroyed', 'gone',
      // Emojis as words
      '😢', '😭', '😞', '😔', '💔', '😥', '😿'
    ],

    angry: [
      // Anger emotions
      'angry', 'mad', 'furious', 'enraged', 'outraged', 'livid',
      'irate', 'annoyed', 'irritated', 'frustrated', 'aggravated',
      // Strong negative expressions
      'hate', 'hatred', 'despise', 'loathe', 'disgusted', 'disgusting',
      'awful', 'terrible', 'horrible', 'worst', 'stupid', 'dumb',
      'idiot', 'ridiculous', 'absurd', 'crazy', 'insane',
      // Anger actions
      'yell', 'yelling', 'scream', 'screaming', 'shout', 'shouting',
      'fight', 'fighting', 'argue', 'arguing', 'attack', 'attacking',
      // Strong disagreement
      'unacceptable', 'wrong', 'unfair', 'unjust', 'outrageous',
      'offensive', 'insulting', 'disrespectful', 'rude',
      // Swear words and intense expressions
      'damn', 'hell', 'crap', 'bullshit', 'wtf', 'seriously!',
      'are you kidding', 'you\'re joking',
      // Emojis as words
      '😠', '😡', '🤬', '😤', '💢', '👿'
    ],

    surprised: [
      // Surprise emotions
      'surprised', 'shocking', 'shocked', 'astonished', 'amazed',
      'astounding', 'stunning', 'startled', 'bewildered', 'speechless',
      // Unexpected
      'unexpected', 'sudden', 'suddenly', 'unbelievable', 'incredible',
      'extraordinary', 'remarkable', 'unprecedented', 'unusual',
      // Surprise expressions
      'wow', 'oh', 'omg', 'oh my god', 'oh my', 'what!', 'what?!',
      'really!', 'really?', 'seriously?', 'no way', 'can\'t believe',
      'didn\'t expect', 'never thought', 'who knew', 'imagine that',
      // Discovery
      'discover', 'discovered', 'found out', 'realize', 'realized',
      'turns out', 'guess what', 'you won\'t believe',
      // Emojis as words
      '😮', '😯', '😲', '🤯', '😳', '🙀', '‼️', '⁉️'
    ],

    neutral: [
      // Neutral/factual words
      'okay', 'ok', 'alright', 'fine', 'sure', 'yes', 'no',
      'maybe', 'perhaps', 'think', 'believe', 'understand',
      'see', 'know', 'tell', 'explain', 'describe', 'show',
      'like', 'want', 'need', 'help', 'please', 'thanks', 'thank you'
    ]
  };

  /**
   * Initialize (instant - no async needed)
   */
  initialize(): void {
    console.log('✅ Keyword-based emotion analyzer ready');
  }

  /**
   * Analyze text instantly using keyword matching
   */
  analyzeText(text: string): EmotionAnalysisResult {
    if (!text || text.trim().length === 0) {
      return {
        dominantEmotion: 'neutral',
        confidence: 1.0,
        matchedKeywords: []
      };
    }

    // Convert to lowercase for case-insensitive matching
    const lowerText = text.toLowerCase();

    // Count keyword matches for each emotion
    const emotionScores: Record<EmotionType, { count: number; keywords: string[] }> = {
      happy: { count: 0, keywords: [] },
      sad: { count: 0, keywords: [] },
      angry: { count: 0, keywords: [] },
      surprised: { count: 0, keywords: [] },
      neutral: { count: 0, keywords: [] }
    };

    // Check each emotion's keywords
    for (const [emotion, keywords] of Object.entries(this.emotionKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          emotionScores[emotion as EmotionType].count++;
          emotionScores[emotion as EmotionType].keywords.push(keyword);
        }
      }
    }

    // Find dominant emotion (highest score)
    let dominantEmotion: EmotionType = 'neutral';
    let maxScore = 0;
    let matchedKeywords: string[] = [];

    for (const [emotion, data] of Object.entries(emotionScores)) {
      if (data.count > maxScore && emotion !== 'neutral') {
        maxScore = data.count;
        dominantEmotion = emotion as EmotionType;
        matchedKeywords = data.keywords;
      }
    }

    // Calculate confidence based on number of matches
    // More matches = higher confidence
    const confidence = maxScore > 0 ? Math.min(0.5 + (maxScore * 0.2), 1.0) : 0.3;

    const result = {
      dominantEmotion,
      confidence,
      matchedKeywords
    };

    console.log(`🔍 Keyword analysis: "${text.substring(0, 50)}..." → ${dominantEmotion} (${matchedKeywords.length} keywords: ${matchedKeywords.slice(0, 3).join(', ')})`);

    return result;
  }

  /**
   * Analyze with context (same as analyzeText for keyword-based)
   */
  analyzeWithContext(text: string): EmotionAnalysisResult {
    return this.analyzeText(text);
  }

  /**
   * Check if analyzer is ready
   */
  isReady(): boolean {
    return true;
  }

  /**
   * Reset analyzer (no-op for keyword-based)
   */
  reset(): void {
    // Nothing to reset
  }
}

/**
 * Singleton instance for global use
 */
export const keywordEmotionAnalyzer = new KeywordEmotionAnalyzer();
