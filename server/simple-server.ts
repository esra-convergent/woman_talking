import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateToken } from './token-generator';

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

app.listen(PORT, () => {
  console.log(`\n🚀 Token server running on http://localhost:${PORT}`);
  console.log(`📡 LiveKit server: ${LIVEKIT_URL}\n`);
  console.log('Usage:');
  console.log('  POST http://localhost:3001/api/token');
  console.log('  Body: { "roomName": "my-room", "participantName": "user" }\n');
});
