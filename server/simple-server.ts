import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateToken } from './token-generator';
import { HfInference } from '@huggingface/inference';

// Get current directory for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from python_agent/.env.local
config({ path: join(__dirname, '..', 'python_agent', '.env.local') });

const app = express();
const PORT = 3001;

// LiveKit configuration from environment
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'ws://localhost:7880';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

app.use(cors());
app.use(express.json());

// Generate token endpoint
app.post('/api/token', async (req, res) => {
  const { roomName, participantName } = req.body;

  if (!roomName || !participantName) {
    return res.status(400).json({
      error: 'roomName and participantName are required'
    });
  }

  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    return res.status(500).json({
      error: 'LiveKit credentials not configured'
    });
  }

  try {
    const token = await generateToken(roomName, participantName, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

    console.log('Generated token for room:', roomName);
    console.log('Token type:', typeof token);
    console.log('Token value:', token);

    res.json({
      token,
      url: LIVEKIT_URL,
      roomName,
      participantName
    });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({
      error: 'Failed to generate token'
    });
  }
});

// Initialize HuggingFace Inference client with API token
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

if (!HUGGINGFACE_API_KEY) {
  console.warn('⚠️  HUGGINGFACE_API_KEY not found in environment!');
  console.warn('⚠️  Add it to python_agent/.env.local: HUGGINGFACE_API_KEY=hf_...');
} else {
  console.log('✅ HuggingFace API key loaded:', HUGGINGFACE_API_KEY.substring(0, 10) + '...');
}

const hf = new HfInference(HUGGINGFACE_API_KEY);

// Emotion analysis endpoint
app.post('/api/analyze-emotion', async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({
      error: 'text is required'
    });
  }

  try {
    console.log('🤖 Analyzing emotion for text:', text.substring(0, 50) + '...');

    // Use HuggingFace Inference client (proper way)
    const result = await hf.textClassification({
      model: 'bhadresh-savani/distilbert-base-uncased-emotion',
      inputs: text,
      provider: 'hf-inference',
    });

    console.log('📊 Raw emotion result:', result);

    // Map emotion labels to our emotion types
    // This model detects: sadness, joy, love, anger, fear, surprise
    const emotionMap: Record<string, string> = {
      'joy': 'happy',
      'love': 'happy',
      'sadness': 'sad',
      'anger': 'angry',
      'fear': 'sad',
      'surprise': 'surprised'
    };

    // Process results - HuggingFace returns array of arrays for this model
    const emotionScores = Array.isArray(result[0]) ? result[0] : result;
    const mappedEmotions = emotionScores.map((item: any) => ({
      emotion: emotionMap[item.label?.toLowerCase()] || 'neutral',
      score: item.score,
      original_label: item.label
    }));

    // Sort by score
    mappedEmotions.sort((a: any, b: any) => b.score - a.score);

    const analysisResult = {
      dominantEmotion: mappedEmotions[0].emotion,
      confidence: mappedEmotions[0].score,
      emotions: mappedEmotions,
      shouldBlend: mappedEmotions.length > 1 && mappedEmotions[1].score > 0.3
    };

    console.log('✅ Emotion analysis complete:', analysisResult.dominantEmotion, `(${(analysisResult.confidence * 100).toFixed(0)}%)`);

    res.json(analysisResult);
  } catch (error) {
    console.error('Error analyzing emotion:', error);
    res.status(500).json({
      error: 'Failed to analyze emotion',
      fallback: {
        dominantEmotion: 'neutral',
        confidence: 0.5,
        emotions: [{ emotion: 'neutral', score: 1.0 }],
        shouldBlend: false
      }
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Token server running on http://localhost:${PORT}`);
  console.log(`📡 LiveKit server: ${LIVEKIT_URL}`);
  console.log(`🤖 ML Emotion API: http://localhost:${PORT}/api/analyze-emotion\n`);
  console.log('Endpoints:');
  console.log('  POST /api/token - Generate LiveKit token');
  console.log('  POST /api/analyze-emotion - Analyze text emotion (ML-powered)\n');
});
